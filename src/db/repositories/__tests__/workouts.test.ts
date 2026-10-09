import type { SQLiteDatabase } from "expo-sqlite";

import {
  addExercisesToRoutine,
  createRoutine,
  getRoutineExercises,
  setRoutineExerciseProgression,
  setRoutineExerciseSets,
} from "@/db/repositories/routines";
import {
  addExercisesToWorkout,
  addWorkoutSet,
  deleteWorkout,
  deleteWorkoutSet,
  finishWorkout,
  getActiveWorkout,
  getFinishedExerciseEntries,
  getWorkoutDetail,
  setAssistedReps,
  startWorkoutFromRoutine,
  updateWorkoutSet,
} from "@/db/repositories/workouts";
import { buildProgressHistory } from "@/lib/progress";
import { createTestDatabase } from "@/test-utils/sqlite";
import type { PlannedSet } from "@/types/set";

// expo-crypto is a native module; use Node's UUIDs in tests.
jest.mock("expo-crypto", () => ({
  randomUUID: () => require("node:crypto").randomUUID(),
}));

let db: SQLiteDatabase;
let routineId: string;

const benchSets: PlannedSet[] = [
  { setType: "warmup", reps: null, weightKg: 40, toFailure: false },
  { setType: "feeder", reps: null, weightKg: 70, toFailure: false },
  { setType: "top", reps: 6, weightKg: 100, toFailure: false },
  { setType: "backoff", reps: 8, weightKg: 85, toFailure: false },
];

beforeEach(async () => {
  db = await createTestDatabase();
  await db.execAsync(`
    INSERT INTO exercises (id, name, muscle_group) VALUES
      ('bench', 'Supino', 'chest'),
      ('press', 'Press Militar', 'shoulders');
  `);
  routineId = await createRoutine(db, "Push");
  await addExercisesToRoutine(db, routineId, ["bench", "press"]);
  const [bench] = await getRoutineExercises(db, routineId);
  await setRoutineExerciseSets(db, bench.id, benchSets);
});

// Values of each set of the first exercise of a workout.
async function benchValues(workoutId: string) {
  const detail = await getWorkoutDetail(db, workoutId);
  return detail?.exercises[0].sets.map(
    ({ setType, reps, weightKg, toFailure }) => ({
      setType,
      reps,
      weightKg,
      toFailure,
    }),
  );
}

describe("workouts repository", () => {
  it("carries a back-off to failure from the routine and back", async () => {
    const [bench] = await getRoutineExercises(db, routineId);
    await setRoutineExerciseSets(db, bench.id, [
      { setType: "top", reps: 6, weightKg: 100, toFailure: false },
      { setType: "backoff", reps: null, weightKg: 85, toFailure: true },
    ]);
    const workoutId = await startWorkoutFromRoutine(db, routineId);
    expect((await benchValues(workoutId))?.[1]).toEqual({
      setType: "backoff",
      reps: null,
      weightKg: 85,
      toFailure: true,
    });

    // Today the back-off was done with 9 reps instead.
    const sets = (await getWorkoutDetail(db, workoutId))!.exercises[0].sets;
    await updateWorkoutSet(db, sets[1].id, {
      setType: "backoff",
      reps: 9,
      weightKg: 85,
      toFailure: false,
    });
    await finishWorkout(db, workoutId);

    const [after] = await getRoutineExercises(db, routineId);
    expect(after.sets[1]).toEqual({
      setType: "backoff",
      reps: 9,
      weightKg: 85,
      toFailure: false,
    });
  });

  it("keeps reps done with help only on top sets", async () => {
    const workoutId = await startWorkoutFromRoutine(db, routineId);
    const top = (await getWorkoutDetail(db, workoutId))!.exercises[0].sets[2];
    await setAssistedReps(db, top.id, 2);
    await updateWorkoutSet(db, top.id, {
      setType: "backoff",
      reps: 6,
      weightKg: 100,
      toFailure: false,
    });
    const detail = await getWorkoutDetail(db, workoutId);
    expect(detail?.exercises[0].sets[2].assistedReps).toBeNull();
  });

  it("saves and removes the reps done with help of a set", async () => {
    const workoutId = await startWorkoutFromRoutine(db, routineId);
    const assisted = async () =>
      (await getWorkoutDetail(db, workoutId))?.exercises[0].sets.map(
        (set) => set.assistedReps,
      );
    expect(await assisted()).toEqual([null, null, null, null]);

    const top = (await getWorkoutDetail(db, workoutId))!.exercises[0].sets[2];
    await setAssistedReps(db, top.id, 2.5);
    expect(await assisted()).toEqual([null, null, 2.5, null]);

    // A set that becomes a feeder has no reps, so none with help either.
    await updateWorkoutSet(db, top.id, {
      setType: "feeder",
      reps: null,
      weightKg: 100,
      toFailure: false,
    });
    expect(await assisted()).toEqual([null, null, null, null]);

    await updateWorkoutSet(db, top.id, {
      setType: "top",
      reps: 6,
      weightKg: 100,
      toFailure: false,
    });
    await setAssistedReps(db, top.id, 2);
    await updateWorkoutSet(db, top.id, {
      setType: "top",
      reps: 7,
      weightKg: 100,
      toFailure: false,
    });
    expect(await assisted()).toEqual([null, null, 2, null]);

    await setAssistedReps(db, top.id, null);
    expect(await assisted()).toEqual([null, null, null, null]);
  });

  it("keeps the 'maybe' note", async () => {
    const [bench] = await getRoutineExercises(db, routineId);
    await setRoutineExerciseProgression(db, bench.id, "maybe");
    const workoutId = await startWorkoutFromRoutine(db, routineId);
    const detail = await getWorkoutDetail(db, workoutId);
    expect(detail?.exercises[0].progression).toBe("maybe");
  });

  it("has no active workout at first", async () => {
    expect(await getActiveWorkout(db)).toBeNull();
  });

  it("starts a workout with the routine's exercises and planned values", async () => {
    const now = new Date("2026-10-04T17:30:00.000Z");
    const workoutId = await startWorkoutFromRoutine(db, routineId, now);

    const detail = await getWorkoutDetail(db, workoutId);
    expect(detail).toMatchObject({
      workout: {
        startedAt: "2026-10-04T17:30:00.000Z",
        finishedAt: null,
        routineId,
      },
      routineName: "Push",
    });
    expect(detail?.exercises.map((item) => item.exercise.name)).toEqual([
      "Supino",
      "Press Militar",
    ]);
    expect(await benchValues(workoutId)).toEqual(benchSets);
    // The second exercise has the default structure without values.
    expect(detail?.exercises[1].sets.map((set) => set.weightKg)).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
    expect((await getActiveWorkout(db))?.id).toBe(workoutId);
  });

  it("pre-fills sets with the values of the last workout of the routine", async () => {
    const first = await startWorkoutFromRoutine(db, routineId);
    // Last week: the top set went up to 102.5 kg for 5 reps.
    await db.runAsync(
      `UPDATE workout_sets SET weight_kg = 102.5, reps = 5
       WHERE set_type = 'top' AND workout_exercise_id IN
         (SELECT id FROM workout_exercises WHERE workout_id = ?)`,
      first,
    );
    await finishWorkout(db, first);

    const second = await startWorkoutFromRoutine(db, routineId);

    expect(await benchValues(second)).toEqual([
      { setType: "warmup", reps: null, weightKg: 40, toFailure: false },
      { setType: "feeder", reps: null, weightKg: 70, toFailure: false },
      { setType: "top", reps: 5, weightKg: 102.5, toFailure: false },
      { setType: "backoff", reps: 8, weightKg: 85, toFailure: false },
    ]);
  });

  it("finishing copies the values done into the routine", async () => {
    const workoutId = await startWorkoutFromRoutine(db, routineId);
    const [, , top] = (await getWorkoutDetail(db, workoutId))!.exercises[0]
      .sets;
    await updateWorkoutSet(db, top.id, {
      setType: "top",
      reps: 4.5,
      weightKg: 102.5,
      toFailure: false,
    });

    await finishWorkout(db, workoutId);

    const [bench] = await getRoutineExercises(db, routineId);
    expect(bench.sets[2]).toEqual({
      setType: "top",
      reps: 4.5,
      weightKg: 102.5,
      toFailure: false,
    });
  });

  it("cancelling does not change the routine", async () => {
    const workoutId = await startWorkoutFromRoutine(db, routineId);
    const [, , top] = (await getWorkoutDetail(db, workoutId))!.exercises[0]
      .sets;
    await updateWorkoutSet(db, top.id, {
      setType: "top",
      reps: 4,
      weightKg: 110,
      toFailure: false,
    });

    await deleteWorkout(db, workoutId);

    const [bench] = await getRoutineExercises(db, routineId);
    expect(bench.sets).toEqual(benchSets);
  });

  it("the next workout respects routine changes made after finishing", async () => {
    const first = await startWorkoutFromRoutine(db, routineId);
    await finishWorkout(db, first);
    const [bench] = await getRoutineExercises(db, routineId);
    const raised = benchSets.map((set) =>
      set.setType === "top" ? { ...set, weightKg: 105 } : set,
    );
    await setRoutineExerciseSets(db, bench.id, raised);

    const second = await startWorkoutFromRoutine(db, routineId);

    expect(await benchValues(second)).toEqual(raised);
  });

  it("lists exercises of finished workouts only, for the progress history", async () => {
    const finished = await startWorkoutFromRoutine(
      db,
      routineId,
      new Date("2026-10-01T18:00:00.000Z"),
    );
    await finishWorkout(db, finished);
    await startWorkoutFromRoutine(db, routineId); // still in progress

    const entries = await getFinishedExerciseEntries(db);

    expect(entries.map((entry) => entry.exerciseName)).toEqual([
      "Supino",
      "Press Militar",
    ]);
    expect(entries[0]).toMatchObject({
      workoutId: finished,
      startedAt: "2026-10-01T18:00:00.000Z",
      routineName: "Push",
      exerciseId: "bench",
      sets: benchSets,
    });
  });

  it("the very first workout of a routine already shows progressions", async () => {
    // A fresh install: no workout was ever finished.
    const workoutId = await startWorkoutFromRoutine(db, routineId);
    const [, , top] = (await getWorkoutDetail(db, workoutId))!.exercises[0]
      .sets;
    await updateWorkoutSet(db, top.id, {
      setType: "top",
      reps: 5,
      weightKg: 102.5,
      toFailure: false,
    });
    await finishWorkout(db, workoutId);

    const entries = await getFinishedExerciseEntries(db);
    expect(entries[0].plannedSets).toEqual(benchSets);

    const [group] = buildProgressHistory(entries);
    expect(group.changes).toEqual([
      {
        exerciseId: "bench",
        exerciseName: "Supino",
        direction: "up",
        previous: { weightKg: 100, reps: 6 },
        current: { weightKg: 102.5, reps: 5 },
      },
    ]);
  });

  it("adds exercises during a workout, and to its routine", async () => {
    await db.execAsync(
      "INSERT INTO exercises (id, name, muscle_group) VALUES ('fly', 'Aberturas', 'chest')",
    );
    const workoutId = await startWorkoutFromRoutine(db, routineId);

    await addExercisesToWorkout(db, workoutId, ["fly"]);

    const detail = await getWorkoutDetail(db, workoutId);
    expect(detail?.exercises.map((item) => item.exercise.name)).toEqual([
      "Supino",
      "Press Militar",
      "Aberturas",
    ]);
    expect(detail?.exercises[2].sets.map((set) => set.setType)).toEqual([
      "warmup",
      "feeder",
      "feeder",
      "top",
      "backoff",
    ]);
    // Linked to the routine, so it can have a note and is there next time.
    expect(detail?.exercises[2].routineExerciseId).not.toBeNull();
    const routine = await getRoutineExercises(db, routineId);
    expect(routine.map((item) => item.exercise.id)).toEqual([
      "bench",
      "press",
      "fly",
    ]);
  });

  it("never has two active workouts", async () => {
    const first = await startWorkoutFromRoutine(db, routineId);
    const second = await startWorkoutFromRoutine(db, routineId);

    expect(second).toBe(first);
    const count = await db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM workouts",
    );
    expect(count?.n).toBe(1);
  });

  it("finishing a workout leaves no active workout", async () => {
    const workoutId = await startWorkoutFromRoutine(db, routineId);
    await finishWorkout(db, workoutId, new Date("2026-10-04T18:45:00.000Z"));

    expect(await getActiveWorkout(db)).toBeNull();
    expect((await getWorkoutDetail(db, workoutId))?.workout.finishedAt).toBe(
      "2026-10-04T18:45:00.000Z",
    );
  });

  it("deleting a workout also deletes its exercises and sets", async () => {
    const workoutId = await startWorkoutFromRoutine(db, routineId);

    await deleteWorkout(db, workoutId);

    const left = await db.getFirstAsync<{ n: number }>(
      `SELECT (SELECT COUNT(*) FROM workouts)
            + (SELECT COUNT(*) FROM workout_exercises)
            + (SELECT COUNT(*) FROM workout_sets) AS n`,
    );
    expect(left?.n).toBe(0);
  });

  describe("logging sets", () => {
    let workoutId: string;
    const benchSetsNow = async () =>
      (await getWorkoutDetail(db, workoutId))!.exercises[0].sets;

    beforeEach(async () => {
      workoutId = await startWorkoutFromRoutine(db, routineId);
    });

    it("updates a set's weight and reps", async () => {
      const [, , top] = await benchSetsNow();
      await updateWorkoutSet(db, top.id, {
        setType: "top",
        reps: 4.5,
        weightKg: 102.5,
        toFailure: false,
      });
      expect((await benchSetsNow())[2]).toMatchObject({
        reps: 4.5,
        weightKg: 102.5,
      });
    });

    it("drops reps when a set becomes a warm-up or feeder", async () => {
      const [, , top] = await benchSetsNow();
      await updateWorkoutSet(db, top.id, {
        setType: "feeder",
        reps: 6,
        weightKg: 90,
        toFailure: false,
      });
      expect((await benchSetsNow())[2]).toMatchObject({
        setType: "feeder",
        reps: null,
        weightKg: 90,
        toFailure: false,
      });
    });

    it("adds a set copying the last one, and deletes a set", async () => {
      const exerciseId = (await getWorkoutDetail(db, workoutId))!.exercises[0]
        .id;
      await addWorkoutSet(db, exerciseId);

      const sets = await benchSetsNow();
      expect(sets).toHaveLength(5);
      expect(sets[4]).toMatchObject({
        position: 5,
        setType: "backoff",
        reps: 8,
        weightKg: 85,
      });

      await deleteWorkoutSet(db, sets[0].id);
      expect(await benchSetsNow()).toHaveLength(4);
    });

    it("shows the routine's note for next week on each exercise", async () => {
      const [bench] = await getRoutineExercises(db, routineId);
      await setRoutineExerciseProgression(db, bench.id, "increase");

      const detail = await getWorkoutDetail(db, workoutId);
      expect(detail?.exercises[0]).toMatchObject({
        routineExerciseId: bench.id,
        progression: "increase",
      });
      expect(detail?.exercises[1].progression).toBeNull();
    });
  });
});
