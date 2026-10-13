import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import {
  addWater,
  getWaterGoalMl,
  getWaterMl,
  setWaterGoalMl,
  setWaterMl,
} from "@/db/repositories/diet";

// Water drunk on a day (null while loading) and the daily goal. Reloads on
// focus and when the day changes.
export function useWaterDay(date: string) {
  const db = useSQLiteContext();
  const [ml, setMl] = useState<number | null>(null);
  const [goalMl, setGoalMl] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getWaterMl(db, date), getWaterGoalMl(db)])
        .then(([total, goal]) => {
          if (!active) return;
          setMl(total);
          setGoalMl(goal);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [db, date]),
  );

  // Adds (or, if negative, takes away) water.
  const add = useCallback(
    async (deltaMl: number) => setMl(await addWater(db, date, deltaMl)),
    [db, date],
  );

  // Sets the day's total, to correct it.
  const set = useCallback(
    async (total: number) => {
      await setWaterMl(db, date, total);
      setMl(await getWaterMl(db, date));
    },
    [db, date],
  );

  // null removes the goal.
  const setGoal = useCallback(
    async (goal: number | null) => {
      await setWaterGoalMl(db, goal);
      setGoalMl(await getWaterGoalMl(db));
    },
    [db],
  );

  return { ml, goalMl, error, add, set, setGoal };
}
