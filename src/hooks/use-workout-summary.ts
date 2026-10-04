import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";

import {
  getFinishedExerciseEntries,
  getWorkoutDetail,
} from "@/db/repositories/workouts";
import {
  buildProgressHistory,
  summarizeWorkout,
  type ProgressChange,
  type WorkoutSummary,
} from "@/lib/progress";
import type { WorkoutDetail } from "@/types/workout";

type Summary = {
  detail: WorkoutDetail;
  totals: WorkoutSummary;
  changes: ProgressChange[];
};

// Totals and progressions of a finished workout.
export function useWorkoutSummary(id: string) {
  const db = useSQLiteContext();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getWorkoutDetail(db, id), getFinishedExerciseEntries(db)])
      .then(([detail, entries]) => {
        if (!active) return;
        if (!detail) {
          setError("Este treino já não existe.");
          return;
        }
        const group = buildProgressHistory(entries).find(
          (item) => item.workoutId === id,
        );
        setSummary({
          detail,
          totals: summarizeWorkout(detail.exercises),
          changes: group?.changes ?? [],
        });
      })
      .catch((e: unknown) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [db, id]);

  return { summary, error };
}
