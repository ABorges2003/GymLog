import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { toExercise, type ExerciseRow } from "@/db/repositories/exercises";
import { sortRoutines, uniqueMuscleGroups } from "@/lib/routines";
import { DEFAULT_SETS, normalizeSet } from "@/lib/sets";
import type { MuscleGroup } from "@/types/exercise";
import type { PlannedSet, SetType } from "@/types/set";
import type {
  Progression,
  Routine,
  RoutineExercise,
  RoutineSummary,
} from "@/types/routine";

type RoutineRow = {
  id: string;
  name: string;
  created_at: string;
};

function toRoutine(row: RoutineRow): Routine {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

// All routines, the most recently done first (see sortRoutines), with their
// exercise count and muscle groups.
export async function getRoutineSummaries(
  db: SQLiteDatabase,
): Promise<RoutineSummary[]> {
  const routines = await db.getAllAsync<RoutineRow>(
    "SELECT id, name, created_at FROM routines",
  );
  const exercises = await db.getAllAsync<{
    routine_id: string;
    muscle_group: MuscleGroup;
  }>(
    `SELECT re.routine_id, e.muscle_group
     FROM routine_exercises re
     JOIN exercises e ON e.id = re.exercise_id
     ORDER BY re.routine_id, re.position`,
  );
  const lastDone = await db.getAllAsync<{
    routine_id: string;
    last_done_at: string;
  }>(
    `SELECT routine_id, MAX(finished_at) AS last_done_at
     FROM workouts
     WHERE routine_id IS NOT NULL AND finished_at IS NOT NULL
     GROUP BY routine_id`,
  );

  return sortRoutines(
    routines.map((row) => {
      const muscleGroups = exercises
        .filter((exercise) => exercise.routine_id === row.id)
        .map((exercise) => exercise.muscle_group);
      return {
        ...toRoutine(row),
        exerciseCount: muscleGroups.length,
        muscleGroups: uniqueMuscleGroups(muscleGroups),
        lastDoneAt:
          lastDone.find((item) => item.routine_id === row.id)?.last_done_at ??
          null,
      };
    }),
  );
}

export async function getRoutineById(
  db: SQLiteDatabase,
  id: string,
): Promise<Routine | null> {
  const row = await db.getFirstAsync<RoutineRow>(
    "SELECT id, name, created_at FROM routines WHERE id = ?",
    id,
  );
  return row ? toRoutine(row) : null;
}

// All routine names, to check for duplicates.
export async function getRoutineNames(
  db: SQLiteDatabase,
): Promise<{ id: string; name: string }[]> {
  return db.getAllAsync<{ id: string; name: string }>(
    "SELECT id, name FROM routines",
  );
}

// Creates an empty routine and returns its id.
export async function createRoutine(
  db: SQLiteDatabase,
  name: string,
  now: Date = new Date(),
): Promise<string> {
  const id = randomUUID();
  await db.runAsync(
    "INSERT INTO routines (id, name, created_at) VALUES (?, ?, ?)",
    id,
    name.trim(),
    now.toISOString(),
  );
  return id;
}

export async function renameRoutine(
  db: SQLiteDatabase,
  id: string,
  name: string,
): Promise<void> {
  await db.runAsync(
    "UPDATE routines SET name = ? WHERE id = ?",
    name.trim(),
    id,
  );
}

// Deletes a routine and its exercises (ON DELETE CASCADE). Workouts done with
// it are kept; their routine_id becomes NULL (ON DELETE SET NULL).
export async function deleteRoutine(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM routines WHERE id = ?", id);
}

// The routine's exercises in order (archived exercises included).
export async function getRoutineExercises(
  db: SQLiteDatabase,
  routineId: string,
): Promise<RoutineExercise[]> {
  const rows = await db.getAllAsync<
    ExerciseRow & {
      routine_exercise_id: string;
      position: number;
      progression: Progression | null;
    }
  >(
    `SELECT re.id AS routine_exercise_id, re.position, re.progression,
            e.id, e.name, e.muscle_group, e.equipment, e.is_archived, e.is_favorite
     FROM routine_exercises re
     JOIN exercises e ON e.id = re.exercise_id
     WHERE re.routine_id = ?
     ORDER BY re.position`,
    routineId,
  );
  const sets = await db.getAllAsync<{
    routine_exercise_id: string;
    set_type: SetType;
    reps: number | null;
    weight_kg: number | null;
    to_failure: number;
    assisted_reps: number | null;
  }>(
    `SELECT rs.routine_exercise_id, rs.set_type, rs.reps, rs.weight_kg, rs.to_failure,
            rs.assisted_reps
     FROM routine_sets rs
     JOIN routine_exercises re ON re.id = rs.routine_exercise_id
     WHERE re.routine_id = ?
     ORDER BY rs.position`,
    routineId,
  );
  return rows.map((row) => ({
    id: row.routine_exercise_id,
    position: row.position,
    exercise: toExercise(row),
    sets: sets
      .filter((set) => set.routine_exercise_id === row.routine_exercise_id)
      .map((set) => ({
        setType: set.set_type,
        reps: set.reps,
        weightKg: set.weight_kg,
        toFailure: set.to_failure === 1,
        ...(set.assisted_reps ? { assistedReps: set.assisted_reps } : {}),
      })),
    progression: row.progression,
  }));
}

// One exercise of a routine, with its set structure.
export async function getRoutineExerciseById(
  db: SQLiteDatabase,
  routineExerciseId: string,
): Promise<RoutineExercise | null> {
  const row = await db.getFirstAsync<{ routine_id: string }>(
    "SELECT routine_id FROM routine_exercises WHERE id = ?",
    routineExerciseId,
  );
  if (!row) return null;
  const all = await getRoutineExercises(db, row.routine_id);
  return all.find((item) => item.id === routineExerciseId) ?? null;
}

async function insertRoutineSets(
  db: SQLiteDatabase,
  routineExerciseId: string,
  sets: PlannedSet[],
): Promise<void> {
  for (const [index, values] of sets.entries()) {
    const set = normalizeSet(values);
    await db.runAsync(
      `INSERT INTO routine_sets (id, routine_exercise_id, position, set_type, reps, weight_kg, to_failure, assisted_reps)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(),
      routineExerciseId,
      index + 1,
      set.setType,
      set.reps,
      set.weightKg,
      set.toFailure ? 1 : 0,
      set.assistedReps ?? null,
    );
  }
}

// Replaces the planned sets of a routine exercise.
export async function setRoutineExerciseSets(
  db: SQLiteDatabase,
  routineExerciseId: string,
  sets: PlannedSet[],
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      "DELETE FROM routine_sets WHERE routine_exercise_id = ?",
      routineExerciseId,
    );
    await insertRoutineSets(txn, routineExerciseId, sets);
  });
}

// Adds exercises at the end of the routine, in the given order, each with
// the default set structure. Exercises already in the routine are skipped.
// No transaction of its own, so it can run inside another one.
export async function insertRoutineExercises(
  db: SQLiteDatabase,
  routineId: string,
  exerciseIds: string[],
): Promise<void> {
  const last = await db.getFirstAsync<{ position: number | null }>(
    "SELECT MAX(position) AS position FROM routine_exercises WHERE routine_id = ?",
    routineId,
  );
  const existing = await db.getAllAsync<{ exercise_id: string }>(
    "SELECT exercise_id FROM routine_exercises WHERE routine_id = ?",
    routineId,
  );
  const skip = new Set(existing.map((row) => row.exercise_id));
  let position = last?.position ?? 0;
  for (const exerciseId of exerciseIds) {
    if (skip.has(exerciseId)) continue;
    position += 1;
    const routineExerciseId = randomUUID();
    await db.runAsync(
      "INSERT INTO routine_exercises (id, routine_id, exercise_id, position) VALUES (?, ?, ?, ?)",
      routineExerciseId,
      routineId,
      exerciseId,
      position,
    );
    await insertRoutineSets(db, routineExerciseId, DEFAULT_SETS);
  }
}

export async function addExercisesToRoutine(
  db: SQLiteDatabase,
  routineId: string,
  exerciseIds: string[],
): Promise<void> {
  await db.withExclusiveTransactionAsync((txn) =>
    insertRoutineExercises(txn, routineId, exerciseIds),
  );
}

export async function removeRoutineExercise(
  db: SQLiteDatabase,
  routineExerciseId: string,
): Promise<void> {
  await db.runAsync(
    "DELETE FROM routine_exercises WHERE id = ?",
    routineExerciseId,
  );
}

// Swaps an exercise with the one above (-1) or below (+1). Does nothing at the edges.
export async function moveRoutineExercise(
  db: SQLiteDatabase,
  routineId: string,
  routineExerciseId: string,
  direction: -1 | 1,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const rows = await txn.getAllAsync<{ id: string; position: number }>(
      "SELECT id, position FROM routine_exercises WHERE routine_id = ? ORDER BY position",
      routineId,
    );
    const index = rows.findIndex((row) => row.id === routineExerciseId);
    const other = rows[index + direction];
    if (index === -1 || !other) return;

    const current = rows[index];
    await txn.runAsync(
      "UPDATE routine_exercises SET position = ? WHERE id = ?",
      other.position,
      current.id,
    );
    await txn.runAsync(
      "UPDATE routine_exercises SET position = ? WHERE id = ?",
      current.position,
      other.id,
    );
  });
}

// Sets or clears the note for the next time this exercise is done.
export async function setRoutineExerciseProgression(
  db: SQLiteDatabase,
  routineExerciseId: string,
  progression: Progression | null,
): Promise<void> {
  await db.runAsync(
    "UPDATE routine_exercises SET progression = ? WHERE id = ?",
    progression,
    routineExerciseId,
  );
}

// Updates the values (reps, weight, failure, reps with help) of a routine exercise's sets, matched by
// position (1, 2, 3...). Does not change the structure. No transaction of its
// own, so it can run inside another one.
export async function updateRoutineSetValues(
  db: SQLiteDatabase,
  routineExerciseId: string,
  sets: PlannedSet[],
): Promise<void> {
  for (const [index, values] of sets.entries()) {
    const set = normalizeSet(values);
    await db.runAsync(
      "UPDATE routine_sets SET reps = ?, weight_kg = ?, to_failure = ?, assisted_reps = ? WHERE routine_exercise_id = ? AND position = ?",
      set.reps,
      set.weightKg,
      set.toFailure ? 1 : 0,
      set.assistedReps ?? null,
      routineExerciseId,
      index + 1,
    );
  }
}
