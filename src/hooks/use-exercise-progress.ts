import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";

import { getExerciseById } from "@/db/repositories/exercises";
import { getFinishedExerciseEntries } from "@/db/repositories/workouts";
import { buildExerciseProgress, type ProgressPoint } from "@/lib/progress";
import type { Exercise } from "@/types/exercise";

// An exercise and its best set in each finished workout, oldest first.
export function useExerciseProgress(exerciseId: string) {
  const db = useSQLiteContext();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [points, setPoints] = useState<ProgressPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getExerciseById(db, exerciseId),
      getFinishedExerciseEntries(db),
    ])
      .then(([result, entries]) => {
        if (!active) return;
        if (!result) {
          setError("Este exercício já não existe.");
          return;
        }
        setExercise(result);
        setPoints(buildExerciseProgress(entries, exerciseId));
      })
      .catch((e: unknown) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [db, exerciseId]);

  return { exercise, points, error };
}
