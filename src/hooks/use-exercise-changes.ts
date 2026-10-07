import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";

import { getFinishedExerciseEntries } from "@/db/repositories/workouts";
import { buildExerciseChanges, type ExerciseChange } from "@/lib/progress";

// Progressions and regressions of one exercise in one routine, newest first.
// Only loads while `enabled` (e.g. while the popup is open).
export function useExerciseChanges(
  exerciseId: string,
  routineId: string | null,
  enabled: boolean,
) {
  const db = useSQLiteContext();
  const [changes, setChanges] = useState<ExerciseChange[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setChanges(null);
    getFinishedExerciseEntries(db)
      .then((entries) => {
        if (active)
          setChanges(buildExerciseChanges(entries, exerciseId, routineId));
      })
      .catch((e: unknown) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [db, exerciseId, routineId, enabled]);

  return { changes, error };
}
