import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";

import { cleanupPlanner, getEventsFrom } from "@/db/repositories/planner";
import { toDateKey } from "@/lib/dates";
import {
  setUpNotifications,
  syncEventReminders,
} from "@/notifications/agenda-reminders";

// Work done once each time the app opens: deletes old tasks and events (see
// cleanupPlanner) and rebuilds the agenda reminders, so they match the
// events even after a backup was restored on a new phone. Renders nothing.
// Must be inside SQLiteProvider.
export function AppStartup() {
  const db = useSQLiteContext();

  useEffect(() => {
    setUpNotifications();
    const today = toDateKey(new Date());
    cleanupPlanner(db, today)
      .then(() => getEventsFrom(db, today))
      .then((events) => syncEventReminders(events))
      .catch(() => {
        // Not worth bothering the user: it runs again at the next start.
      });
  }, [db]);

  return null;
}
