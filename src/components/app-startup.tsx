import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";

import { cleanupPlanner, getEventsFrom } from "@/db/repositories/planner";
import { useToday } from "@/hooks/use-today";
import {
  setUpNotifications,
  syncEventReminders,
} from "@/notifications/agenda-reminders";

// Work done each time the app opens, and again on each new day: deletes old
// tasks and events (see cleanupPlanner) and rebuilds the agenda reminders,
// so they match the events even after a backup was restored on a new phone.
// Renders nothing. Must be inside SQLiteProvider.
export function AppStartup() {
  const db = useSQLiteContext();
  // Also runs again on a new day if the app stayed open (or in the
  // background) overnight.
  const today = useToday();

  useEffect(() => {
    setUpNotifications();
  }, []);

  useEffect(() => {
    cleanupPlanner(db, today)
      .then(() => getEventsFrom(db, today))
      .then((events) => syncEventReminders(events))
      .catch(() => {
        // Not worth bothering the user: it runs again at the next start.
      });
  }, [db, today]);

  return null;
}
