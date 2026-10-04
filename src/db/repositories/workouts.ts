import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { Workout } from "@/types/workout";

type WorkoutRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  routine_id: string | null;
};

function toWorkout(row: WorkoutRow): Workout {
  return {
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    notes: row.notes,
    routineId: row.routine_id,
  };
}

const WORKOUT_COLUMNS = "id, started_at, finished_at, notes, routine_id";

// The workout in progress (finished_at is null), if any.
export async function getActiveWorkout(
  db: SQLiteDatabase,
): Promise<Workout | null> {
  const row = await db.getFirstAsync<WorkoutRow>(
    `SELECT ${WORKOUT_COLUMNS}
     FROM workouts
     WHERE finished_at IS NULL
     ORDER BY started_at DESC
     LIMIT 1`,
  );
  return row ? toWorkout(row) : null;
}

// Starts a new workout. If one is already in progress, returns that one:
// there is never more than one active workout.
export async function startWorkout(
  db: SQLiteDatabase,
  now: Date = new Date(),
): Promise<Workout> {
  // Filled inside the transaction (TypeScript can't see a callback assign a plain variable).
  const result: { workout?: Workout } = {};
  await db.withExclusiveTransactionAsync(async (txn) => {
    const active = await getActiveWorkout(txn);
    if (active) {
      result.workout = active;
      return;
    }
    const id = randomUUID();
    const startedAt = now.toISOString();
    await txn.runAsync(
      "INSERT INTO workouts (id, started_at) VALUES (?, ?)",
      id,
      startedAt,
    );
    result.workout = {
      id,
      startedAt,
      finishedAt: null,
      notes: null,
      routineId: null,
    };
  });
  if (!result.workout) {
    throw new Error("Workout was not started");
  }
  return result.workout;
}

export async function finishWorkout(
  db: SQLiteDatabase,
  id: string,
  now: Date = new Date(),
): Promise<void> {
  await db.runAsync(
    "UPDATE workouts SET finished_at = ? WHERE id = ? AND finished_at IS NULL",
    now.toISOString(),
    id,
  );
}

// Deletes a workout; its exercises and sets are deleted by ON DELETE CASCADE.
export async function deleteWorkout(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM workouts WHERE id = ?", id);
}
