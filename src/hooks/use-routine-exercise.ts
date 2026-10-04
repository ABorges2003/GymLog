import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";

import {
  getRoutineExerciseById,
  setRoutineExerciseSets,
} from "@/db/repositories/routines";
import type { RoutineExercise } from "@/types/routine";
import type { PlannedSet } from "@/types/set";

// One exercise of a routine, to edit its planned sets.
export function useRoutineExercise(id: string) {
  const db = useSQLiteContext();
  const [item, setItem] = useState<RoutineExercise | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getRoutineExerciseById(db, id)
      .then((result) => {
        if (!active) return;
        if (result) {
          setItem(result);
        } else {
          setNotFound(true);
        }
      })
      .catch((e: unknown) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [db, id]);

  const saveSets = useCallback(
    (sets: PlannedSet[]) => setRoutineExerciseSets(db, id, sets),
    [db, id],
  );

  return { item, notFound, error, saveSets };
}
