import type { SQLiteDatabase } from "expo-sqlite";

import {
  createExercise,
  getExerciseById,
  getExercises,
  isExerciseInUse,
  removeExercise,
  updateExercise,
} from "@/db/repositories/exercises";
import { createTestDatabase } from "@/test-utils/sqlite";

// expo-crypto is a native module; use Node's UUIDs in tests.
jest.mock("expo-crypto", () => ({
  randomUUID: () => require("node:crypto").randomUUID(),
}));

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createTestDatabase();
});

async function addToWorkout(exerciseId: string) {
  await db.runAsync(
    "INSERT INTO workouts (id, started_at) VALUES ('w1', '2026-10-02T10:00:00Z')",
  );
  await db.runAsync(
    "INSERT INTO workout_exercises (id, workout_id, exercise_id, position) VALUES ('we1', 'w1', ?, 1)",
    exerciseId,
  );
}

describe("exercises repository", () => {
  it("starts with no exercises", async () => {
    expect(await getExercises(db)).toEqual([]);
  });

  it("creates and updates an exercise", async () => {
    const id = await createExercise(db, {
      name: "  Remada Baixa  ",
      muscleGroup: "back",
      equipment: "cable",
    });
    expect(await getExerciseById(db, id)).toMatchObject({
      name: "Remada Baixa",
      muscleGroup: "back",
      equipment: "cable",
      isArchived: false,
      isFavorite: false,
    });

    await updateExercise(db, id, {
      name: "Remada Unilateral",
      muscleGroup: "back",
      equipment: null,
    });
    expect(await getExerciseById(db, id)).toMatchObject({
      name: "Remada Unilateral",
      equipment: null,
    });
  });

  it("deletes an exercise that was never used", async () => {
    const id = await createExercise(db, {
      name: "Teste",
      muscleGroup: "chest",
      equipment: null,
    });
    expect(await isExerciseInUse(db, id)).toBe(false);

    expect(await removeExercise(db, id)).toBe("deleted");
    expect(await getExerciseById(db, id)).toBeNull();
  });

  it("archives an exercise used in a workout instead of deleting it", async () => {
    const id = await createExercise(db, {
      name: "Supino",
      muscleGroup: "chest",
      equipment: "barbell",
    });
    await addToWorkout(id);
    expect(await isExerciseInUse(db, id)).toBe(true);

    expect(await removeExercise(db, id)).toBe("archived");
    expect(await getExerciseById(db, id)).toMatchObject({ isArchived: true });
    // Hidden from lists, still available with includeArchived.
    expect(await getExercises(db)).toEqual([]);
    expect(await getExercises(db, { includeArchived: true })).toHaveLength(1);
  });
});
