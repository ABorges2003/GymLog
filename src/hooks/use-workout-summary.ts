import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import { setRoutineExerciseSets } from "@/db/repositories/routines";
import {
  getFinishedExerciseEntries,
  getRoutineStructureChanges,
  getWorkoutDetail,
  type RoutineStructureChange,
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
  // Exercises whose sets were changed during the workout (see
  // getRoutineStructureChanges).
  structureChanges: RoutineStructureChange[];
};

// Totals and progressions of a finished workout.
export function useWorkoutSummary(id: string) {
  const db = useSQLiteContext();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Only the history of this workout's exercises is needed.
    getWorkoutDetail(db, id)
      .then(async (detail) => {
        if (!detail) return { detail, entries: [], structureChanges: [] };
        const entries = await getFinishedExerciseEntries(
          db,
          detail.exercises.map((item) => item.exercise.id),
        );
        const structureChanges = await getRoutineStructureChanges(db, detail);
        return { detail, entries, structureChanges };
      })
      .then(({ detail, entries, structureChanges }) => {
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
          structureChanges,
        });
      })
      .catch((e: unknown) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [db, id]);

  // Saves the sets of the workout as the routine's sets for that exercise.
  const keepStructure = useCallback(
    (change: RoutineStructureChange) =>
      setRoutineExerciseSets(db, change.routineExerciseId, change.sets),
    [db],
  );

  return { summary, error, keepStructure };
}
