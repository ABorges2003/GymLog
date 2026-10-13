import { addDaysToKey, dateFromKey, toDateKey } from "@/lib/dates";
import type {
  AgendaEvent,
  AgendaEventInput,
  RecurringTask,
  ReminderMinutes,
} from "@/types/planner";

export const TASK_TITLE_MAX_LENGTH = 100;
export const EVENT_TITLE_MAX_LENGTH = 80;
export const EVENT_NOTES_MAX_LENGTH = 500;

export const REMINDER_LABELS: Record<ReminderMinutes, string> = {
  15: "15 min antes",
  60: "1 hora antes",
  1440: "1 dia antes",
};

// Automatic clean-up: done tasks are kept 30 days (enough to look back on the
// last month), tasks never done 90 days (forgotten by then), past events 12
// months (e.g. to see when the last yearly check-up was).
export const KEEP_DONE_TASKS_DAYS = 30;
export const KEEP_OPEN_TASKS_DAYS = 90;
export const KEEP_PAST_EVENTS_MONTHS = 12;

// Trimmed title, or null when empty or too long.
export function cleanTitle(text: string, maxLength: number): string | null {
  const title = text.trim().replace(/\s+/g, " ");
  return title === "" || title.length > maxLength ? null : title;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(time: string): boolean {
  return TIME_PATTERN.test(time);
}

const pad = (value: number) => String(value).padStart(2, "0");

// Local time of a date as "HH:MM".
export function toTimeKey(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// When the event starts, as a local date and time.
export function eventStart(event: Pick<AgendaEvent, "date" | "time">): Date {
  const start = dateFromKey(event.date);
  const [hours, minutes] = event.time.split(":").map(Number);
  start.setHours(hours, minutes, 0, 0);
  return start;
}

// When the reminder of an event goes off, or null without one.
export function reminderAt(
  event: Pick<AgendaEvent, "date" | "time" | "remindMinutes">,
): Date | null {
  if (event.remindMinutes === null) return null;
  return new Date(eventStart(event).getTime() - event.remindMinutes * 60_000);
}

// The event with a clean title and notes, or the reason it can't be saved.
export function validateEvent(
  input: AgendaEventInput,
): { ok: true; event: AgendaEventInput } | { ok: false; error: string } {
  const title = cleanTitle(input.title, EVENT_TITLE_MAX_LENGTH);
  if (title === null) return { ok: false, error: "Escreve um título." };
  if (!isValidTime(input.time)) return { ok: false, error: "Hora inválida." };
  const notes = (input.notes ?? "").trim();
  if (notes.length > EVENT_NOTES_MAX_LENGTH) {
    return { ok: false, error: "As notas são demasiado longas." };
  }
  return {
    ok: true,
    event: { ...input, title, notes: notes === "" ? null : notes },
  };
}

// Events grouped by day, in the order given (the list is already sorted).
export function groupEventsByDate<T extends Pick<AgendaEvent, "date">>(
  events: T[],
): { date: string; events: T[] }[] {
  const groups: { date: string; events: T[] }[] = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    if (last && last.date === event.date) last.events.push(event);
    else groups.push({ date: event.date, events: [event] });
  }
  return groups;
}

// Dates before which the clean-up deletes things (see KEEP_*).
export function cleanupCutoffs(today: string): {
  doneTasksBefore: string;
  openTasksBefore: string;
  eventsBefore: string;
} {
  const yearAgo = dateFromKey(today);
  yearAgo.setMonth(yearAgo.getMonth() - KEEP_PAST_EVENTS_MONTHS);
  return {
    doneTasksBefore: addDaysToKey(today, -KEEP_DONE_TASKS_DAYS),
    openTasksBefore: addDaysToKey(today, -KEEP_OPEN_TASKS_DAYS),
    eventsBefore: toDateKey(yearAgo),
  };
}

const REMINDER_WHEN: Record<ReminderMinutes, string> = {
  15: "Daqui a 15 min",
  60: "Daqui a 1 hora",
  1440: "Amanhã",
};

// Text of an event's reminder: when it is, then the notes if any.
// e.g. "Daqui a 1 hora, às 15:30" + "\nLevar o cartão".
export function reminderBody(
  event: Pick<AgendaEvent, "time" | "notes" | "remindMinutes">,
): string {
  const when =
    event.remindMinutes === null
      ? ""
      : `${REMINDER_WHEN[event.remindMinutes]}, `;
  const notes = event.notes ? `\n${event.notes}` : "";
  return `${when}às ${event.time}${notes}`;
}

// Defaults for a new event: the given day, at the next full hour (09:00 when
// that would be tomorrow), with a reminder an hour before.
export function newEventDefaults(
  date: string,
  now: Date = new Date(),
): AgendaEventInput {
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);
  const time = next.getDate() === now.getDate() ? toTimeKey(next) : "09:00";
  return { date, time, title: "", notes: null, remindMinutes: 60 };
}

// Days of the week for repeating tasks, as Date.getDay() numbers (0 = Sunday),
// listed from Monday like a Portuguese calendar.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const WEEKDAY_EVERY = [
  "Todos os domingos",
  "Todas as segundas",
  "Todas as terças",
  "Todas as quartas",
  "Todas as quintas",
  "Todas as sextas",
  "Todos os sábados",
];

export const EVERY_DAY = 0b1111111;
export const WORK_DAYS = 0b0111110;
export const WEEKEND = 0b1000001;

export function hasWeekday(weekdays: number, day: number): boolean {
  return (weekdays & (1 << day)) !== 0;
}

export function toggleWeekday(weekdays: number, day: number): number {
  return weekdays ^ (1 << day);
}

// Whether a repeating task falls on a day (its weekday, within its dates).
export function repeatsOn(
  task: Pick<RecurringTask, "weekdays" | "startDate" | "endDate">,
  date: string,
): boolean {
  return (
    date >= task.startDate &&
    (task.endDate === null || date <= task.endDate) &&
    hasWeekday(task.weekdays, dateFromKey(date).getDay())
  );
}

// e.g. "Todos os dias", "Dias úteis", "Todos os sábados" or "Ter e Qui".
export function describeWeekdays(weekdays: number): string {
  if (weekdays === EVERY_DAY) return "Todos os dias";
  if (weekdays === WORK_DAYS) return "Dias úteis";
  if (weekdays === WEEKEND) return "Fins de semana";
  const days = WEEK_ORDER.filter((day) => hasWeekday(weekdays, day));
  if (days.length === 1) return WEEKDAY_EVERY[days[0]];
  const names = days.map((day) => WEEKDAY_SHORT[day]);
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}
