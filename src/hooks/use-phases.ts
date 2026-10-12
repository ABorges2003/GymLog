import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import { getBodyWeightEntries } from "@/db/repositories/body-weight";
import { getPhaseById, getPhases } from "@/db/repositories/body-weight-phases";
import type { BodyWeightEntry } from "@/lib/body-weight";
import type { Phase } from "@/lib/body-weight-phases";

// All body weight phases, the most recent first. Reloads on focus.
export function usePhases() {
  const db = useSQLiteContext();
  const [phases, setPhases] = useState<Phase[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getPhases(db)
        .then((result) => {
          if (active) setPhases(result);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [db]),
  );

  return { phases, error };
}

// One phase and every body weight entry (the screen picks the ones inside
// the phase). Reloads on focus, so edits show up when coming back.
export function usePhase(id: string) {
  const db = useSQLiteContext();
  const [data, setData] = useState<{
    phase: Phase;
    entries: BodyWeightEntry[];
  } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getPhaseById(db, id), getBodyWeightEntries(db)])
        .then(([phase, entries]) => {
          if (!active) return;
          if (phase) setData({ phase, entries });
          else setNotFound(true);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [db, id]),
  );

  return { data, notFound, error };
}
