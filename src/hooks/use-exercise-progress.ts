import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useState } from "react";

import { getExerciseById } from "@/db/repositories/exercises";
import { getFinishedExerciseEntries } from "@/db/repositories/workouts";
import {
  buildExerciseProgress,
  routinesOfExercise,
  type ExerciseEntry,
} from "@/lib/progress";
import type { Exercise } from "@/types/exercise";

// An exercise, the routines it was done in, and its best set in each finished
// workout of the selected routine (oldest first). Progress is per routine.
// `initialRoutineId`: the routine to show first; if omitted, the one where
// the exercise was done most recently.
export function useExerciseProgress(
  exerciseId: string,
  initialRoutineId?: string,
) {
  const db = useSQLiteContext();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [entries, setEntries] = useState<ExerciseEntry[] | null>(null);
  const [selected, setSelected] = useState<string | null | undefined>(
    initialRoutineId,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getExerciseById(db, exerciseId),
      getFinishedExerciseEntries(db),
    ])
      .then(([result, allEntries]) => {
        if (!active) return;
        if (!result) {
          setError("Este exercício já não existe.");
          return;
        }
        setExercise(result);
        setEntries(allEntries);
      })
      .catch((e: unknown) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [db, exerciseId]);

  const routines = useMemo(
    () => (entries ? routinesOfExercise(entries, exerciseId) : []),
    [entries, exerciseId],
  );
  // undefined = not chosen yet: use the most recent routine.
  const routineId =
    selected === undefined ? (routines[0]?.routineId ?? null) : selected;
  const points = useMemo(
    () =>
      entries ? buildExerciseProgress(entries, exerciseId, routineId) : null,
    [entries, exerciseId, routineId],
  );

  return {
    exercise,
    routines,
    routineId,
    selectRoutine: setSelected,
    points,
    error,
  };
}
