import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import {
  deleteWorkout,
  getFinishedExerciseEntries,
} from "@/db/repositories/workouts";
import { buildProgressHistory, type ProgressGroup } from "@/lib/progress";

// Workouts with progressions or regressions, newest first. Reloads on focus.
export function useProgressHistory() {
  const db = useSQLiteContext();
  const [history, setHistory] = useState<ProgressGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async () => buildProgressHistory(await getFinishedExerciseEntries(db)),
    [db],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load()
        .then((result) => {
          if (active) setHistory(result);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  // Deletes the whole workout; comparisons are worked out again without it.
  const removeWorkout = useCallback(
    async (workoutId: string) => {
      await deleteWorkout(db, workoutId);
      setHistory(await load());
    },
    [db, load],
  );

  return { history, error, removeWorkout };
}
