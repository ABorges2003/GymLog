import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import { getFinishedExerciseEntries } from "@/db/repositories/workouts";
import { exercisesWithChanges } from "@/lib/progress";

// progressKey()s of the given exercises that have history (at least one
// progression or regression), to colour their history icon. Only those
// exercises are loaded. Null while loading. Reloads on focus.
export function useExercisesWithHistory(exerciseIds: string[]) {
  const db = useSQLiteContext();
  const [ids, setIds] = useState<Set<string> | null>(null);
  // A string, so a new array with the same ids doesn't reload.
  const key = [...new Set(exerciseIds)].sort().join(",");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const wanted = key === "" ? [] : key.split(",");
      getFinishedExerciseEntries(db, wanted)
        .then((entries) => {
          if (active) setIds(exercisesWithChanges(entries));
        })
        // The icon just stays grey if this fails.
        .catch(() => {});
      return () => {
        active = false;
      };
    }, [db, key]),
  );

  return ids;
}
