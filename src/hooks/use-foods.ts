import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import { getFoods } from "@/db/repositories/diet";
import type { Food } from "@/types/diet";

// The user's foods (not archived); reloads every time the screen gets focus.
export function useFoods() {
  const db = useSQLiteContext();
  const [foods, setFoods] = useState<Food[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getFoods(db)
        .then((result) => {
          if (active) setFoods(result);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [db]),
  );

  return { foods, error };
}
