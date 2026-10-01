import type { SQLiteDatabase } from "expo-sqlite";

import type { Equipment, Exercise, MuscleGroup } from "@/types/exercise";

type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment | null;
  is_custom: number;
  is_archived: number;
  is_favorite: number;
};

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    isCustom: row.is_custom === 1,
    isArchived: row.is_archived === 1,
    isFavorite: row.is_favorite === 1,
  };
}

type GetExercisesOptions = {
  includeArchived?: boolean;
};

export async function getExercises(
  db: SQLiteDatabase,
  { includeArchived = false }: GetExercisesOptions = {},
): Promise<Exercise[]> {
  const rows = await db.getAllAsync<ExerciseRow>(
    `SELECT id, name, muscle_group, equipment, is_custom, is_archived, is_favorite
     FROM exercises
     WHERE ? = 1 OR is_archived = 0`,
    includeArchived ? 1 : 0,
  );
  return rows.map(toExercise);
}

// Any exercise can be a favorite, including built-in ones.
export async function setExerciseFavorite(
  db: SQLiteDatabase,
  id: string,
  isFavorite: boolean,
): Promise<void> {
  await db.runAsync(
    "UPDATE exercises SET is_favorite = ? WHERE id = ?",
    isFavorite ? 1 : 0,
    id,
  );
}

export async function getExerciseById(
  db: SQLiteDatabase,
  id: string,
): Promise<Exercise | null> {
  const row = await db.getFirstAsync<ExerciseRow>(
    `SELECT id, name, muscle_group, equipment, is_custom, is_archived, is_favorite
     FROM exercises
     WHERE id = ?`,
    id,
  );
  return row ? toExercise(row) : null;
}

// Number of workouts that include this exercise.
export async function countWorkoutsWithExercise(
  db: SQLiteDatabase,
  exerciseId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT workout_id) AS count
     FROM workout_exercises
     WHERE exercise_id = ?`,
    exerciseId,
  );
  return row?.count ?? 0;
}
