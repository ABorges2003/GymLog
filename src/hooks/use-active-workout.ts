import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import {
  deleteWorkout,
  finishWorkout,
  getActiveWorkout,
  startWorkout,
} from "@/db/repositories/workouts";
import type { Workout } from "@/types/workout";

// The workout in progress, if any. `loading` is true until the first load ends.
export function useActiveWorkout() {
  const db = useSQLiteContext();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getActiveWorkout(db)
        .then((result) => {
          if (active) setWorkout(result);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const start = useCallback(async () => {
    setWorkout(await startWorkout(db));
  }, [db]);

  const finish = useCallback(async () => {
    if (!workout) return;
    await finishWorkout(db, workout.id);
    setWorkout(null);
  }, [db, workout]);

  const cancel = useCallback(async () => {
    if (!workout) return;
    await deleteWorkout(db, workout.id);
    setWorkout(null);
  }, [db, workout]);

  return { workout, loading, error, start, finish, cancel };
}
