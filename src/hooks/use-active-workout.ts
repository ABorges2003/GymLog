import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import { setRoutineExerciseProgression } from "@/db/repositories/routines";
import {
  addWorkoutSet,
  deleteWorkout,
  deleteWorkoutSet,
  finishWorkout,
  getActiveWorkout,
  getWorkoutDetail,
  startWorkoutFromRoutine,
  updateWorkoutSet,
} from "@/db/repositories/workouts";
import type { Progression } from "@/types/routine";
import type { PlannedSet } from "@/types/set";
import type { WorkoutDetail } from "@/types/workout";

// The workout in progress with its exercises and sets, if any.
// `loading` is true until the first load ends.
export function useActiveWorkout() {
  const db = useSQLiteContext();
  const [detail, setDetail] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const active = await getActiveWorkout(db);
    return active ? getWorkoutDetail(db, active.id) : null;
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load()
        .then((result) => {
          if (active) setDetail(result);
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
    }, [load]),
  );

  const start = useCallback(
    async (routineId: string) => {
      const workoutId = await startWorkoutFromRoutine(db, routineId);
      setDetail(await getWorkoutDetail(db, workoutId));
    },
    [db],
  );

  const finish = useCallback(async () => {
    if (!detail) return;
    await finishWorkout(db, detail.workout.id);
    setDetail(null);
  }, [db, detail]);

  const cancel = useCallback(async () => {
    if (!detail) return;
    await deleteWorkout(db, detail.workout.id);
    setDetail(null);
  }, [db, detail]);

  const reload = useCallback(async () => setDetail(await load()), [load]);

  // Saved on every valid change while typing; the screen keeps its own text,
  // so there is no reload here.
  const updateSet = useCallback(
    (setId: string, values: PlannedSet) => updateWorkoutSet(db, setId, values),
    [db],
  );

  const addSet = useCallback(
    async (workoutExerciseId: string) => {
      await addWorkoutSet(db, workoutExerciseId);
      await reload();
    },
    [db, reload],
  );

  const deleteSet = useCallback(
    async (setId: string) => {
      await deleteWorkoutSet(db, setId);
      await reload();
    },
    [db, reload],
  );

  // The note is stored in the routine, for the next workout.
  const setProgression = useCallback(
    async (routineExerciseId: string, progression: Progression | null) => {
      await setRoutineExerciseProgression(db, routineExerciseId, progression);
      await reload();
    },
    [db, reload],
  );

  return {
    detail,
    loading,
    error,
    start,
    finish,
    cancel,
    updateSet,
    addSet,
    deleteSet,
    setProgression,
  };
}
