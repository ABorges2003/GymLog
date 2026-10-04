import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { toExercise, type ExerciseRow } from "@/db/repositories/exercises";
import {
  getRoutineExerciseById,
  getRoutineExercises,
  updateRoutineSetValues,
} from "@/db/repositories/routines";
import { setTypeHasReps } from "@/lib/sets";
import { buildWorkoutSets, mergeIntoPlanned } from "@/lib/workouts";
import type { Progression } from "@/types/routine";
import type { PlannedSet, SetType } from "@/types/set";
import type { Workout, WorkoutDetail, WorkoutExercise } from "@/types/workout";

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

type WorkoutSetRow = {
  id: string;
  workout_exercise_id: string;
  position: number;
  set_type: SetType;
  reps: number | null;
  weight_kg: number | null;
};

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

// Starts a workout from a routine: copies its exercises and planned sets
// (the routine holds the values of the last finished workout).
// If a workout is already in progress, returns its id instead: there is never
// more than one active workout.
export async function startWorkoutFromRoutine(
  db: SQLiteDatabase,
  routineId: string,
  now: Date = new Date(),
): Promise<string> {
  // Filled inside the transaction (TypeScript can't see a callback assign a plain variable).
  const result: { workoutId?: string } = {};
  await db.withExclusiveTransactionAsync(async (txn) => {
    const active = await getActiveWorkout(txn);
    if (active) {
      result.workoutId = active.id;
      return;
    }

    const workoutId = randomUUID();
    await txn.runAsync(
      "INSERT INTO workouts (id, started_at, routine_id) VALUES (?, ?, ?)",
      workoutId,
      now.toISOString(),
      routineId,
    );

    const routineExercises = await getRoutineExercises(txn, routineId);
    for (const [index, item] of routineExercises.entries()) {
      const workoutExerciseId = randomUUID();
      await txn.runAsync(
        "INSERT INTO workout_exercises (id, workout_id, exercise_id, position) VALUES (?, ?, ?, ?)",
        workoutExerciseId,
        workoutId,
        item.exercise.id,
        index + 1,
      );

      const sets = buildWorkoutSets(item.sets);
      for (const [setIndex, set] of sets.entries()) {
        await txn.runAsync(
          `INSERT INTO workout_sets (id, workout_exercise_id, position, set_type, reps, weight_kg)
           VALUES (?, ?, ?, ?, ?, ?)`,
          randomUUID(),
          workoutExerciseId,
          setIndex + 1,
          set.setType,
          set.reps,
          set.weightKg,
        );
      }
    }
    result.workoutId = workoutId;
  });
  if (!result.workoutId) {
    throw new Error("Workout was not started");
  }
  return result.workoutId;
}

// A workout with its routine name, exercises and sets, in order.
export async function getWorkoutDetail(
  db: SQLiteDatabase,
  id: string,
): Promise<WorkoutDetail | null> {
  const row = await db.getFirstAsync<
    WorkoutRow & { routine_name: string | null }
  >(
    `SELECT w.id, w.started_at, w.finished_at, w.notes, w.routine_id,
            r.name AS routine_name
     FROM workouts w
     LEFT JOIN routines r ON r.id = w.routine_id
     WHERE w.id = ?`,
    id,
  );
  if (!row) return null;

  const exercises = await db.getAllAsync<
    ExerciseRow & {
      workout_exercise_id: string;
      position: number;
      routine_exercise_id: string | null;
      progression: Progression | null;
    }
  >(
    `SELECT we.id AS workout_exercise_id, we.position,
            re.id AS routine_exercise_id, re.progression,
            e.id, e.name, e.muscle_group, e.equipment, e.is_archived, e.is_favorite
     FROM workout_exercises we
     JOIN workouts w ON w.id = we.workout_id
     JOIN exercises e ON e.id = we.exercise_id
     LEFT JOIN routine_exercises re
       ON re.routine_id = w.routine_id AND re.exercise_id = we.exercise_id
     WHERE we.workout_id = ?
     ORDER BY we.position`,
    id,
  );
  const sets = await db.getAllAsync<WorkoutSetRow>(
    `SELECT ws.id, ws.workout_exercise_id, ws.position, ws.set_type, ws.reps, ws.weight_kg
     FROM workout_sets ws
     JOIN workout_exercises we ON we.id = ws.workout_exercise_id
     WHERE we.workout_id = ?
     ORDER BY ws.position`,
    id,
  );

  return {
    workout: toWorkout(row),
    routineName: row.routine_name,
    exercises: exercises.map((exercise): WorkoutExercise => ({
      id: exercise.workout_exercise_id,
      position: exercise.position,
      exercise: toExercise(exercise),
      sets: sets
        .filter(
          (set) => set.workout_exercise_id === exercise.workout_exercise_id,
        )
        .map((set) => ({
          id: set.id,
          position: set.position,
          setType: set.set_type,
          reps: set.reps,
          weightKg: set.weight_kg,
        })),
      routineExerciseId: exercise.routine_exercise_id,
      progression: exercise.progression,
    })),
  };
}

// Changes a logged set. Warm-ups and feeders never keep reps.
export async function updateWorkoutSet(
  db: SQLiteDatabase,
  setId: string,
  { setType, reps, weightKg }: PlannedSet,
): Promise<void> {
  await db.runAsync(
    "UPDATE workout_sets SET set_type = ?, reps = ?, weight_kg = ? WHERE id = ?",
    setType,
    setTypeHasReps(setType) ? reps : null,
    weightKg,
    setId,
  );
}

// Adds a set at the end of an exercise, copying the last one (or an empty top set).
export async function addWorkoutSet(
  db: SQLiteDatabase,
  workoutExerciseId: string,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const last = await txn.getFirstAsync<WorkoutSetRow>(
      `SELECT id, workout_exercise_id, position, set_type, reps, weight_kg
       FROM workout_sets
       WHERE workout_exercise_id = ?
       ORDER BY position DESC
       LIMIT 1`,
      workoutExerciseId,
    );
    await txn.runAsync(
      `INSERT INTO workout_sets (id, workout_exercise_id, position, set_type, reps, weight_kg)
       VALUES (?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      workoutExerciseId,
      (last?.position ?? 0) + 1,
      last?.set_type ?? "top",
      last?.reps ?? null,
      last?.weight_kg ?? null,
    );
  });
}

export async function deleteWorkoutSet(
  db: SQLiteDatabase,
  setId: string,
): Promise<void> {
  await db.runAsync("DELETE FROM workout_sets WHERE id = ?", setId);
}

// Finishes a workout and copies the values done into its routine, so the
// routine (and the next workout) show the current weights. The routine's
// structure is not changed. Does nothing if the workout is already finished.
export async function finishWorkout(
  db: SQLiteDatabase,
  id: string,
  now: Date = new Date(),
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const result = await txn.runAsync(
      "UPDATE workouts SET finished_at = ? WHERE id = ? AND finished_at IS NULL",
      now.toISOString(),
      id,
    );
    if (result.changes === 0) return;

    const detail = await getWorkoutDetail(txn, id);
    for (const item of detail?.exercises ?? []) {
      if (!item.routineExerciseId) continue;
      const routineExercise = await getRoutineExerciseById(
        txn,
        item.routineExerciseId,
      );
      if (!routineExercise) continue;
      await updateRoutineSetValues(
        txn,
        item.routineExerciseId,
        mergeIntoPlanned(routineExercise.sets, item.sets),
      );
    }
  });
}

// Deletes a workout; its exercises and sets are deleted by ON DELETE CASCADE.
export async function deleteWorkout(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM workouts WHERE id = ?", id);
}
