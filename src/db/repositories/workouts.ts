import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { toExercise, type ExerciseRow } from "@/db/repositories/exercises";
import {
  getRoutineExerciseById,
  getRoutineExercises,
  insertRoutineExercises,
  updateRoutineSetValues,
} from "@/db/repositories/routines";
import type { ExerciseEntry, LoggedSet } from "@/lib/progress";
import { DEFAULT_SETS, normalizeSet, setTypeHasAssistedReps } from "@/lib/sets";
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
  to_failure: number;
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
        // planned_* keep the starting values, the "before" of this workout.
        await txn.runAsync(
          `INSERT INTO workout_sets
             (id, workout_exercise_id, position, set_type, reps, weight_kg, to_failure, assisted_reps, planned_reps, planned_weight_kg)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          randomUUID(),
          workoutExerciseId,
          setIndex + 1,
          set.setType,
          set.reps,
          set.weightKg,
          set.toFailure ? 1 : 0,
          set.assistedReps ?? null,
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
  const sets = await db.getAllAsync<
    WorkoutSetRow & { assisted_reps: number | null }
  >(
    `SELECT ws.id, ws.workout_exercise_id, ws.position, ws.set_type, ws.reps, ws.weight_kg,
            ws.to_failure, ws.assisted_reps
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
          toFailure: set.to_failure === 1,
          assistedReps: set.assisted_reps,
        })),
      routineExerciseId: exercise.routine_exercise_id,
      progression: exercise.progression,
    })),
  };
}

// Reps a set had with help (null removes them).
export async function setAssistedReps(
  db: SQLiteDatabase,
  setId: string,
  reps: number | null,
): Promise<void> {
  await db.runAsync(
    "UPDATE workout_sets SET assisted_reps = ? WHERE id = ?",
    reps,
    setId,
  );
}

// Changes a logged set (see normalizeSet). Reps done with help are kept only
// on top sets.
export async function updateWorkoutSet(
  db: SQLiteDatabase,
  setId: string,
  values: PlannedSet,
): Promise<void> {
  const { setType, reps, weightKg, toFailure } = normalizeSet(values);
  await db.runAsync(
    `UPDATE workout_sets
     SET set_type = ?, reps = ?, weight_kg = ?, to_failure = ?,
         assisted_reps = CASE WHEN ? THEN assisted_reps ELSE NULL END
     WHERE id = ?`,
    setType,
    reps,
    weightKg,
    toFailure ? 1 : 0,
    setTypeHasAssistedReps(setType) ? 1 : 0,
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
      `SELECT id, workout_exercise_id, position, set_type, reps, weight_kg, to_failure
       FROM workout_sets
       WHERE workout_exercise_id = ?
       ORDER BY position DESC
       LIMIT 1`,
      workoutExerciseId,
    );
    await txn.runAsync(
      `INSERT INTO workout_sets (id, workout_exercise_id, position, set_type, reps, weight_kg, to_failure)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      workoutExerciseId,
      (last?.position ?? 0) + 1,
      last?.set_type ?? "top",
      last?.reps ?? null,
      last?.weight_kg ?? null,
      last?.to_failure ?? 0,
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

// Every exercise done in a finished workout, with its sets, to work out
// progressions (see buildProgressHistory).
export async function getFinishedExerciseEntries(
  db: SQLiteDatabase,
): Promise<ExerciseEntry[]> {
  const rows = await db.getAllAsync<{
    workout_exercise_id: string;
    workout_id: string;
    started_at: string;
    routine_id: string | null;
    routine_name: string | null;
    exercise_id: string;
    exercise_name: string;
  }>(
    `SELECT we.id AS workout_exercise_id, w.id AS workout_id, w.started_at,
            w.routine_id, r.name AS routine_name, e.id AS exercise_id, e.name AS exercise_name
     FROM workout_exercises we
     JOIN workouts w ON w.id = we.workout_id
     JOIN exercises e ON e.id = we.exercise_id
     LEFT JOIN routines r ON r.id = w.routine_id
     WHERE w.finished_at IS NOT NULL
     ORDER BY w.started_at, we.position`,
  );
  const sets = await db.getAllAsync<
    WorkoutSetRow & {
      planned_reps: number | null;
      planned_weight_kg: number | null;
      assisted_reps: number | null;
    }
  >(
    `SELECT ws.id, ws.workout_exercise_id, ws.position, ws.set_type, ws.reps, ws.weight_kg,
            ws.to_failure, ws.planned_reps, ws.planned_weight_kg, ws.assisted_reps
     FROM workout_sets ws
     JOIN workout_exercises we ON we.id = ws.workout_exercise_id
     JOIN workouts w ON w.id = we.workout_id
     WHERE w.finished_at IS NOT NULL
     ORDER BY ws.position`,
  );

  const done = new Map<string, LoggedSet[]>();
  const planned = new Map<string, PlannedSet[]>();
  for (const set of sets) {
    const id = set.workout_exercise_id;
    done.set(id, [
      ...(done.get(id) ?? []),
      {
        setType: set.set_type,
        reps: set.reps,
        weightKg: set.weight_kg,
        toFailure: set.to_failure === 1,
        assistedReps: set.assisted_reps,
      },
    ]);
    planned.set(id, [
      ...(planned.get(id) ?? []),
      {
        setType: set.set_type,
        reps: set.planned_reps,
        weightKg: set.planned_weight_kg,
        toFailure: false,
      },
    ]);
  }

  return rows.map((row) => ({
    workoutId: row.workout_id,
    startedAt: row.started_at,
    routineId: row.routine_id,
    routineName: row.routine_name,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    sets: done.get(row.workout_exercise_id) ?? [],
    plannedSets: planned.get(row.workout_exercise_id) ?? [],
  }));
}

// Adds exercises at the end of a workout in progress, each with the default
// set structure (W, F, F, T, B, empty). They are also added to the workout's
// routine, so they are there next time.
export async function addExercisesToWorkout(
  db: SQLiteDatabase,
  workoutId: string,
  exerciseIds: string[],
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const workout = await txn.getFirstAsync<{ routine_id: string | null }>(
      "SELECT routine_id FROM workouts WHERE id = ?",
      workoutId,
    );
    if (!workout) return;
    if (workout.routine_id) {
      await insertRoutineExercises(txn, workout.routine_id, exerciseIds);
    }

    const last = await txn.getFirstAsync<{ position: number | null }>(
      "SELECT MAX(position) AS position FROM workout_exercises WHERE workout_id = ?",
      workoutId,
    );
    let position = last?.position ?? 0;
    for (const exerciseId of exerciseIds) {
      position += 1;
      const workoutExerciseId = randomUUID();
      await txn.runAsync(
        "INSERT INTO workout_exercises (id, workout_id, exercise_id, position) VALUES (?, ?, ?, ?)",
        workoutExerciseId,
        workoutId,
        exerciseId,
        position,
      );
      for (const [index, set] of buildWorkoutSets(DEFAULT_SETS).entries()) {
        await txn.runAsync(
          `INSERT INTO workout_sets
             (id, workout_exercise_id, position, set_type, reps, weight_kg, planned_reps, planned_weight_kg)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          randomUUID(),
          workoutExerciseId,
          index + 1,
          set.setType,
          set.reps,
          set.weightKg,
          set.reps,
          set.weightKg,
        );
      }
    }
  });
}
