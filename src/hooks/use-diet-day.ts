import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import {
  deleteFoodEntry,
  getDayEntries,
  getDietGoals,
} from "@/db/repositories/diet";
import type { DietGoals, FoodEntry } from "@/types/diet";

type DietDay = {
  entries: FoodEntry[];
  goals: DietGoals | null;
};

// What was eaten on a day and the goals. Reloads on focus
// and when the day changes.
export function useDietDay(date: string) {
  const db = useSQLiteContext();
  const [day, setDay] = useState<DietDay | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<DietDay> => {
    const [entries, goals] = await Promise.all([
      getDayEntries(db, date),
      getDietGoals(db),
    ]);
    return { entries, goals };
  }, [db, date]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load()
        .then((result) => {
          if (active) setDay(result);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  const reload = useCallback(async () => setDay(await load()), [load]);

  const deleteEntry = useCallback(
    async (id: string) => {
      await deleteFoodEntry(db, id);
      await reload();
    },
    [db, reload],
  );

  return { day, error, deleteEntry };
}
