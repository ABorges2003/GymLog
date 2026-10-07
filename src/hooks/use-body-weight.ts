import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import {
  deleteBodyWeight,
  getBodyWeightEntries,
  saveBodyWeight,
} from "@/db/repositories/body-weight";
import { getSetting, setSetting } from "@/db/repositories/settings";
import type { BodyWeightEntry } from "@/lib/body-weight";

// Body weight entries (oldest first) and the goal, with save and delete.
// Reloads on focus.
export function useBodyWeight() {
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<BodyWeightEntry[] | null>(null);
  const [goalKg, setGoalKg] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setEntries(await getBodyWeightEntries(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        getBodyWeightEntries(db),
        getSetting(db, "body_weight_goal_kg"),
      ])
        .then(([result, goal]) => {
          if (!active) return;
          setEntries(result);
          setGoalKg(goal === null ? null : Number(goal));
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

  // null removes the goal.
  const saveGoal = useCallback(
    async (value: number | null) => {
      await setSetting(
        db,
        "body_weight_goal_kg",
        value === null ? null : String(value),
      );
      setGoalKg(value);
    },
    [db],
  );

  return { entries, goalKg, error, save, remove, saveGoal };
}
