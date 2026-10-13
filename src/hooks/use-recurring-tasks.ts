import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import { getRecurringTasks } from "@/db/repositories/planner";
import type { RecurringTask } from "@/types/planner";

// Repeating tasks still going on (null while loading); reloads every time
// the screen gets focus, e.g. after creating or editing one.
export function useRecurringTasks() {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<RecurringTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getRecurringTasks(db)
        .then((result) => {
          if (active) setTasks(result);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [db]),
  );

  return { tasks, error };
}
