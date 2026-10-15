import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import { getEventsBefore, getEventsFrom } from "@/db/repositories/planner";
import { useToday } from "@/hooks/use-today";
import type { AgendaEvent } from "@/types/planner";

type Events = {
  // From today on, soonest first.
  coming: AgendaEvent[];
  // Before today, most recent first (kept 12 months, see cleanupPlanner).
  past: AgendaEvent[];
};

// The agenda (null while loading); reloads every time the screen gets focus,
// e.g. after adding or editing an event, and when the date changes.
export function useAgendaEvents() {
  const db = useSQLiteContext();
  const [events, setEvents] = useState<Events | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Coming and past events split again when the date changes.
  const today = useToday();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getEventsFrom(db, today), getEventsBefore(db, today)])
        .then(([coming, past]) => {
          if (active) setEvents({ coming, past });
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [db, today]),
  );

  return { events, error };
}
