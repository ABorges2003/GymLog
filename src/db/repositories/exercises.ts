import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { Equipment, Exercise, MuscleGroup } from "@/types/exercise";

type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  equipment: Equipment | null;
  is_archived: number;
  is_favorite: number;
};

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
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
    `SELECT id, name, muscle_group, equipment, is_archived, is_favorite
     FROM exercises
     WHERE ? = 1 OR is_archived = 0`,
    includeArchived ? 1 : 0,
  );
  return rows.map(toExercise);
}

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
    `SELECT id, name, muscle_group, equipment, is_archived, is_favorite
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

// All exercise names, archived ones included, to check for duplicates.
export async function getExerciseNames(
  db: SQLiteDatabase,
): Promise<{ id: string; name: string; isArchived: boolean }[]> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    is_archived: number;
  }>("SELECT id, name, is_archived FROM exercises");
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    isArchived: row.is_archived === 1,
  }));
}

type ExerciseValues = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment | null;
};

// Creates an exercise and returns its id. is_custom is no longer used (see migration v3).
export async function createExercise(
  db: SQLiteDatabase,
  { name, muscleGroup, equipment }: ExerciseValues,
): Promise<string> {
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO exercises (id, name, muscle_group, equipment, is_custom, is_archived, is_favorite)
     VALUES (?, ?, ?, ?, 1, 0, 0)`,
    id,
    name.trim(),
    muscleGroup,
    equipment,
  );
  return id;
}

// Updates an exercise's name, muscle group and equipment.
export async function updateExercise(
  db: SQLiteDatabase,
  id: string,
  { name, muscleGroup, equipment }: ExerciseValues,
): Promise<void> {
  await db.runAsync(
    `UPDATE exercises
     SET name = ?, muscle_group = ?, equipment = ?
     WHERE id = ?`,
    name.trim(),
    muscleGroup,
    equipment,
    id,
  );
}

// True if any workout or routine uses this exercise.
export async function isExerciseInUse(
  db: SQLiteDatabase,
  exerciseId: string,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ inUse: number }>(
    `SELECT EXISTS (SELECT 1 FROM workout_exercises WHERE exercise_id = ?)
         OR EXISTS (SELECT 1 FROM routine_exercises WHERE exercise_id = ?) AS inUse`,
    exerciseId,
    exerciseId,
  );
  return row?.inUse === 1;
}

export type RemoveResult = "deleted" | "archived";

// Deletes an unused exercise. One already used in a workout or routine is
// archived instead, so history stays intact.
export async function removeExercise(
  db: SQLiteDatabase,
  id: string,
): Promise<RemoveResult> {
  let result: RemoveResult = "deleted";
  await db.withExclusiveTransactionAsync(async (txn) => {
    if (await isExerciseInUse(txn, id)) {
      await txn.runAsync(
        "UPDATE exercises SET is_archived = 1 WHERE id = ?",
        id,
      );
      result = "archived";
    } else {
      await txn.runAsync("DELETE FROM exercises WHERE id = ?", id);
    }
  });
  return result;
}
