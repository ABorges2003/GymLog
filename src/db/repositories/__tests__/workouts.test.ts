import type { SQLiteDatabase } from "expo-sqlite";

import {
  deleteWorkout,
  finishWorkout,
  getActiveWorkout,
  startWorkout,
} from "@/db/repositories/workouts";
import { createTestDatabase } from "@/test-utils/sqlite";

// expo-crypto is a native module; use Node's UUIDs in tests.
jest.mock("expo-crypto", () => ({
  randomUUID: () => require("node:crypto").randomUUID(),
}));

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createTestDatabase();
});

describe("workouts repository", () => {
  it("has no active workout at first", async () => {
    expect(await getActiveWorkout(db)).toBeNull();
  });

  it("starts a workout and returns it as active", async () => {
    const now = new Date("2026-10-04T17:30:00.000Z");
    const workout = await startWorkout(db, now);

    expect(workout).toMatchObject({
      startedAt: "2026-10-04T17:30:00.000Z",
      finishedAt: null,
    });
    expect(await getActiveWorkout(db)).toEqual(workout);
  });

  it("never has two active workouts", async () => {
    const first = await startWorkout(db);
    const second = await startWorkout(db);

    expect(second.id).toBe(first.id);
    const count = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM workouts",
    );
    expect(count?.n).toBe(1);
  });

  it("finishing a workout leaves no active workout", async () => {
    const workout = await startWorkout(db);
    await finishWorkout(db, workout.id, new Date("2026-10-04T18:45:00.000Z"));

    expect(await getActiveWorkout(db)).toBeNull();
    const row = await db.getFirstAsync<{ finished_at: string }>(
      "SELECT finished_at FROM workouts WHERE id = ?",
      workout.id,
    );
    expect(row?.finished_at).toBe("2026-10-04T18:45:00.000Z");
  });

  it("deleting a workout also deletes its exercises and sets", async () => {
    const workout = await startWorkout(db);
    await db.execAsync(`
      INSERT INTO exercises (id, name, muscle_group) VALUES ('e1', 'Supino', 'chest');
      INSERT INTO workout_exercises (id, workout_id, exercise_id, position)
        VALUES ('we1', '${workout.id}', 'e1', 1);
      INSERT INTO workout_sets (id, workout_exercise_id, position, set_type, reps, weight_kg)
        VALUES ('s1', 'we1', 1, 'top', 6, 100);
    `);

    await deleteWorkout(db, workout.id);

    const left = await db.getFirstAsync<{ n: number }>(
      `SELECT (SELECT COUNT(*) FROM workouts)
            + (SELECT COUNT(*) FROM workout_exercises)
            + (SELECT COUNT(*) FROM workout_sets) AS n`,
    );
    expect(left?.n).toBe(0);
  });
});
