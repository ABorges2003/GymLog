import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import {
  countWorkoutsWithExercise,
  getExerciseById,
  setExerciseFavorite,
} from "@/db/repositories/exercises";
import type { Exercise } from "@/types/exercise";

type ExerciseDetail = {
  exercise: Exercise;
  workoutCount: number;
};

// Loads one exercise (and how many workouts use it). Reloads on focus so
// edits made on other screens show up when coming back.
export function useExercise(id: string) {
  const db = useSQLiteContext();
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([getExerciseById(db, id), countWorkoutsWithExercise(db, id)])
        .then(([exercise, workoutCount]) => {
          if (!active) return;
          if (exercise) {
            setDetail({ exercise, workoutCount });
          } else {
            setNotFound(true);
          }
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [db, id]),
  );

  const setFavoriteInState = useCallback((isFavorite: boolean) => {
    setDetail((current) =>
      current
        ? { ...current, exercise: { ...current.exercise, isFavorite } }
        : current,
    );
  }, []);

  // Updates the screen right away, then saves. Reverts if saving fails.
  const toggleFavorite = useCallback(() => {
    if (!detail) return;
    const isFavorite = !detail.exercise.isFavorite;
    setFavoriteInState(isFavorite);
    setExerciseFavorite(db, id, isFavorite).catch(() => {
      setFavoriteInState(!isFavorite);
    });
  }, [db, id, detail, setFavoriteInState]);

  return { detail, notFound, error, toggleFavorite };
}
