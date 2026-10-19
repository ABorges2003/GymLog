// Local notifications for agenda events: scheduled on the phone itself, so
// they go off with the app closed and without internet. Each reminder uses
// the event's id, so editing, deleting or importing a backup always finds
// the right one to replace or cancel.
import { isRunningInExpoGo } from "expo";
import type * as NotificationsModule from "expo-notifications";

import { reminderAt, reminderBody } from "@/lib/planner";
import type { AgendaEvent } from "@/types/planner";

// Expo Go on Android throws as soon as expo-notifications is imported, so it
// is only loaded in real builds (APK or development build). In Expo Go the
// reminders are simply off; everything else works.
const Notifications: typeof NotificationsModule | null = isRunningInExpoGo()
  ? null
  : // eslint-disable-next-line @typescript-eslint/no-require-imports -- must stay a lazy require (see above)
    (require("expo-notifications") as typeof NotificationsModule);

const CHANNEL_ID = "agenda";
const ID_PREFIX = "agenda-";

const reminderId = (eventId: string) => `${ID_PREFIX}${eventId}`;

// Whether this build can show reminders (not in Expo Go).
export function remindersAvailable(): boolean {
  return Notifications !== null;
}

// Shows reminders even while the app is open. Call once at start-up.
export function setUpNotifications(): void {
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Android groups notifications in channels the user can tune in Settings.
async function ensureChannel(): Promise<void> {
  if (!Notifications) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Agenda",
    description: "Avisos dos eventos da agenda",
    importance: Notifications.AndroidImportance.HIGH,
  });
}

// Asks for permission to notify (Android 13+) only when not granted yet.
// Returns whether reminders can be shown.
export async function requestReminderPermission(): Promise<boolean> {
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function cancelEventReminder(eventId: string): Promise<void> {
  await Notifications?.cancelScheduledNotificationAsync(reminderId(eventId));
}

// Schedules (or reschedules) the event's reminder. Nothing is scheduled
// without a reminder or when its time has already passed.
export async function scheduleEventReminder(
  event: AgendaEvent,
  now: Date = new Date(),
): Promise<void> {
  if (!Notifications) return;
  await cancelEventReminder(event.id);
  const at = reminderAt(event);
  if (!at || at.getTime() <= now.getTime()) return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: reminderId(event.id),
    content: { title: event.title, body: reminderBody(event) },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
      channelId: CHANNEL_ID,
    },
  });
}

// Makes the scheduled reminders match the given events exactly: used at
// start-up and after importing a backup.
export async function syncEventReminders(
  events: AgendaEvent[],
  now: Date = new Date(),
): Promise<void> {
  if (!Notifications) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.identifier.startsWith(ID_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier,
      );
    }
  }
  for (const event of events) await scheduleEventReminder(event, now);
}

export type ReminderResult =
  | "none"
  | "scheduled"
  | "no-permission"
  | "unavailable"
  | "failed";

// After an event is saved: schedules its reminder, asking for permission the
// first time. Never throws, so a reminder problem never loses the event.
export async function applyEventReminder(
  event: AgendaEvent,
): Promise<ReminderResult> {
  try {
    if (event.remindMinutes === null) {
      await cancelEventReminder(event.id);
      return "none";
    }
    if (!remindersAvailable()) return "unavailable";
    if (!(await requestReminderPermission())) return "no-permission";
    await scheduleEventReminder(event);
    return "scheduled";
  } catch {
    return "failed";
  }
}
