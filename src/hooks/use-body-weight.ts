import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import {
  deleteBodyWeight,
  getBodyWeightEntries,
  saveBodyWeight,
} from "@/db/repositories/body-weight";
import type { BodyWeightEntry } from "@/lib/body-weight";

// Body weight entries (oldest first) with save and delete. Reloads on focus.
export function useBodyWeight() {
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<BodyWeightEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setEntries(await getBodyWeightEntries(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getBodyWeightEntries(db)
        .then((result) => {
          if (active) setEntries(result);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const save = useCallback(
    async (date: string, weightKg: number) => {
      await saveBodyWeight(db, date, weightKg);
      await reload();
    },
    [db, reload],
  );

  const remove = useCallback(
    async (date: string) => {
      await deleteBodyWeight(db, date);
      await reload();
    },
    [db, reload],
  );

  return { entries, error, save, remove };
}
