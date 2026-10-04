import type { SQLiteDatabase } from "expo-sqlite";

import {
  addExercisesToRoutine,
  createRoutine,
  deleteRoutine,
  getRoutineById,
  getRoutineExerciseById,
  getRoutineExercises,
  getRoutineSummaries,
  moveRoutineExercise,
  removeRoutineExercise,
  renameRoutine,
  setRoutineExerciseProgression,
  setRoutineExerciseSets,
} from "@/db/repositories/routines";
import { DEFAULT_SETS } from "@/lib/sets";
import { createTestDatabase } from "@/test-utils/sqlite";

// expo-crypto is a native module; use Node's UUIDs in tests.
jest.mock("expo-crypto", () => ({
  randomUUID: () => require("node:crypto").randomUUID(),
}));

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createTestDatabase();
});

describe("routines repository", () => {
  it("creates, renames and lists routines sorted by name", async () => {
    const push = await createRoutine(db, "  Push  ");
    await createRoutine(db, "Pernas");
    await renameRoutine(db, push, "Ombros e Peito");

    const routines = await getRoutineSummaries(db);
    expect(routines.map((routine) => routine.name)).toEqual([
      "Ombros e Peito",
      "Pernas",
    ]);
    expect(routines[0]).toMatchObject({ exerciseCount: 0, muscleGroups: [] });
  });

  it("summarises exercises and muscle groups in routine order", async () => {
    const id = await createRoutine(db, "Push");
    await db.execAsync(`
      INSERT INTO exercises (id, name, muscle_group) VALUES
        ('e1', 'Supino', 'chest'),
        ('e2', 'Press Militar', 'shoulders'),
        ('e3', 'Aberturas', 'chest');
    `);
    for (const [exerciseId, position] of [
      ["e2", 2],
      ["e1", 1],
      ["e3", 3],
    ] as const) {
      await db.runAsync(
        "INSERT INTO routine_exercises (id, routine_id, exercise_id, position) VALUES (?, ?, ?, ?)",
        `re-${exerciseId}`,
        id,
        exerciseId,
        position,
      );
    }

    const [routine] = await getRoutineSummaries(db);
    expect(routine).toMatchObject({
      exerciseCount: 3,
      muscleGroups: ["chest", "shoulders"],
    });
  });

  it("deleting a routine keeps the workouts done with it", async () => {
    const id = await createRoutine(db, "Push");
    await db.runAsync(
      "INSERT INTO workouts (id, started_at, routine_id) VALUES ('w1', '2026-10-04T10:00:00Z', ?)",
      id,
    );

    await deleteRoutine(db, id);

    expect(await getRoutineById(db, id)).toBeNull();
    const workout = await db.getFirstAsync<{ routine_id: string | null }>(
      "SELECT routine_id FROM workouts WHERE id = 'w1'",
    );
    expect(workout).toEqual({ routine_id: null });
  });

  describe("routine exercises", () => {
    let routineId: string;
    const names = async () =>
      (await getRoutineExercises(db, routineId)).map(
        (item) => item.exercise.name,
      );

    beforeEach(async () => {
      routineId = await createRoutine(db, "Push");
      await db.execAsync(`
        INSERT INTO exercises (id, name, muscle_group) VALUES
          ('e1', 'Supino', 'chest'),
          ('e2', 'Press Militar', 'shoulders'),
          ('e3', 'Tríceps Polia', 'triceps');
      `);
    });

    it("adds exercises at the end, in the given order", async () => {
      await addExercisesToRoutine(db, routineId, ["e2", "e1"]);
      await addExercisesToRoutine(db, routineId, ["e3"]);
      expect(await names()).toEqual([
        "Press Militar",
        "Supino",
        "Tríceps Polia",
      ]);
    });

    it("moves exercises up and down, and ignores moves past the edges", async () => {
      await addExercisesToRoutine(db, routineId, ["e1", "e2", "e3"]);
      const [first, , last] = await getRoutineExercises(db, routineId);

      await moveRoutineExercise(db, routineId, last.id, -1);
      expect(await names()).toEqual([
        "Supino",
        "Tríceps Polia",
        "Press Militar",
      ]);

      await moveRoutineExercise(db, routineId, first.id, -1);
      await moveRoutineExercise(db, routineId, first.id, 1);
      expect(await names()).toEqual([
        "Tríceps Polia",
        "Supino",
        "Press Militar",
      ]);
    });

    it("gives new routine exercises the default set structure", async () => {
      await addExercisesToRoutine(db, routineId, ["e1"]);
      const [item] = await getRoutineExercises(db, routineId);
      expect(item.sets).toEqual(DEFAULT_SETS);
    });

    it("replaces the planned sets of one routine exercise", async () => {
      await addExercisesToRoutine(db, routineId, ["e1", "e2"]);
      const [first, second] = await getRoutineExercises(db, routineId);
      const planned = [
        { setType: "warmup" as const, reps: 15, weightKg: 40 },
        { setType: "top" as const, reps: 6, weightKg: 102.5 },
        { setType: "top" as const, reps: null, weightKg: null },
      ];

      await setRoutineExerciseSets(db, first.id, planned);

      expect(await getRoutineExerciseById(db, first.id)).toMatchObject({
        sets: planned,
      });
      // The other exercise keeps its sets.
      expect(await getRoutineExerciseById(db, second.id)).toMatchObject({
        sets: DEFAULT_SETS,
      });
    });

    it("rejects invalid planned values", async () => {
      await addExercisesToRoutine(db, routineId, ["e1"]);
      const [item] = await getRoutineExercises(db, routineId);
      await expect(
        setRoutineExerciseSets(db, item.id, [
          { setType: "top", reps: 0, weightKg: 100 },
        ]),
      ).rejects.toThrow();
      // The transaction was rolled back: the old sets are still there.
      expect((await getRoutineExerciseById(db, item.id))?.sets).toEqual(
        DEFAULT_SETS,
      );
    });

    it("removing an exercise from the routine also removes its sets", async () => {
      await addExercisesToRoutine(db, routineId, ["e1"]);
      const [item] = await getRoutineExercises(db, routineId);

      await removeRoutineExercise(db, item.id);

      const sets = await db.getFirstAsync<{ n: number }>(
        "SELECT COUNT(*) AS n FROM routine_sets",
      );
      expect(sets?.n).toBe(0);
    });

    it("sets, changes and clears the note for next week", async () => {
      await addExercisesToRoutine(db, routineId, ["e1"]);
      const [item] = await getRoutineExercises(db, routineId);
      expect(item.progression).toBeNull();

      await setRoutineExerciseProgression(db, item.id, "increase");
      expect((await getRoutineExerciseById(db, item.id))?.progression).toBe(
        "increase",
      );

      await setRoutineExerciseProgression(db, item.id, "keep");
      expect((await getRoutineExerciseById(db, item.id))?.progression).toBe(
        "keep",
      );

      await setRoutineExerciseProgression(db, item.id, null);
      expect(
        (await getRoutineExerciseById(db, item.id))?.progression,
      ).toBeNull();
    });

    it("removes an exercise from the routine only", async () => {
      await addExercisesToRoutine(db, routineId, ["e1", "e2"]);
      const [first] = await getRoutineExercises(db, routineId);

      await removeRoutineExercise(db, first.id);

      expect(await names()).toEqual(["Press Militar"]);
      const exercise = await db.getFirstAsync(
        "SELECT id FROM exercises WHERE id = 'e1'",
      );
      expect(exercise).not.toBeNull();
    });
  });
});
