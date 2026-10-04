import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import {
  deleteRoutine,
  getRoutineById,
  getRoutineExercises,
  moveRoutineExercise,
  removeRoutineExercise,
  setRoutineExerciseProgression,
} from "@/db/repositories/routines";
import type { Progression, Routine, RoutineExercise } from "@/types/routine";

// One routine and its exercises; reloads on focus so edits made on other
// screens (rename, add exercises) show up when coming back.
export function useRoutine(id: string) {
  const db = useSQLiteContext();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [result, routineExercises] = await Promise.all([
      getRoutineById(db, id),
      getRoutineExercises(db, id),
    ]);
    return { result, routineExercises };
  }, [db, id]);

  const apply = useCallback(
    ({ result, routineExercises }: Awaited<ReturnType<typeof load>>) => {
      if (result) {
        setRoutine(result);
        setExercises(routineExercises);
      } else {
        setNotFound(true);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load()
        .then((data) => {
          if (active) apply(data);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [load, apply]),
  );

  const reload = useCallback(async () => apply(await load()), [load, apply]);

  const remove = useCallback(() => deleteRoutine(db, id), [db, id]);

  const removeExercise = useCallback(
    async (routineExerciseId: string) => {
      await removeRoutineExercise(db, routineExerciseId);
      await reload();
    },
    [db, reload],
  );

  const moveExercise = useCallback(
    async (routineExerciseId: string, direction: -1 | 1) => {
      await moveRoutineExercise(db, id, routineExerciseId, direction);
      await reload();
    },
    [db, id, reload],
  );

  const setProgression = useCallback(
    async (routineExerciseId: string, progression: Progression | null) => {
      await setRoutineExerciseProgression(db, routineExerciseId, progression);
      await reload();
    },
    [db, reload],
  );

  return {
    routine,
    exercises,
    notFound,
    error,
    remove,
    removeExercise,
    moveExercise,
    setProgression,
  };
}
