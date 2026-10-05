import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import { getFinishedExerciseEntries } from "@/db/repositories/workouts";
import { exercisesWithChanges } from "@/lib/progress";

// Ids of the exercises that have history (at least one progression or
// regression), to colour their history icon. Null while loading.
// Reloads on focus.
export function useExercisesWithHistory() {
  const db = useSQLiteContext();
  const [ids, setIds] = useState<Set<string> | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getFinishedExerciseEntries(db)
        .then((entries) => {
          if (active) setIds(exercisesWithChanges(entries));
        })
        // The icon just stays grey if this fails.
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [db]),
  );

  return ids;
}
