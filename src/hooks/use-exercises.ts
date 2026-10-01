import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import { getExercises, setExerciseFavorite } from "@/db/repositories/exercises";
import type { Exercise } from "@/types/exercise";

// Loads the active (non-archived) exercises and reloads them every time the
// screen gets focus, so changes made on other screens show up when coming back.
export function useExercises() {
  const db = useSQLiteContext();
  const [exercises, setExercises] = useState<Exercise[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getExercises(db)
        .then((result) => {
          if (active) setExercises(result);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const setFavoriteInState = useCallback((id: string, isFavorite: boolean) => {
    setExercises((current) =>
      current
        ? current.map((exercise) =>
            exercise.id === id ? { ...exercise, isFavorite } : exercise,
          )
        : current,
    );
  }, []);

  // Updates the screen right away, then saves. Reverts if saving fails.
  const toggleFavorite = useCallback(
    (exercise: Exercise) => {
      const isFavorite = !exercise.isFavorite;
      setFavoriteInState(exercise.id, isFavorite);
      setExerciseFavorite(db, exercise.id, isFavorite).catch(() => {
        setFavoriteInState(exercise.id, !isFavorite);
      });
    },
    [db, setFavoriteInState],
  );

  return { exercises, error, toggleFavorite };
}
