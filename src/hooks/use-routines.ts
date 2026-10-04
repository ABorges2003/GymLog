import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import { getRoutineSummaries } from "@/db/repositories/routines";
import type { RoutineSummary } from "@/types/routine";

// All routines; reloads every time the screen gets focus.
export function useRoutines() {
  const db = useSQLiteContext();
  const [routines, setRoutines] = useState<RoutineSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getRoutineSummaries(db)
        .then((result) => {
          if (active) setRoutines(result);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [db]),
  );

  return { routines, error };
}
