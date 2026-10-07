import {
  bestSet,
  buildExerciseChanges,
  buildExerciseProgress,
  chartScale,
  exercisesWithChanges,
  buildProgressHistory,
  compareBestSets,
  formatBestSet,
  formatVolume,
  summarizeWorkout,
  type ExerciseEntry,
} from "@/lib/progress";
import type { PlannedSet } from "@/types/set";

const top = (weightKg: number | null, reps: number | null): PlannedSet => ({
  setType: "top",
  weightKg,
  reps,
});

describe("bestSet", () => {
  it("picks the heaviest top set, more reps on a tie", () => {
    expect(
      bestSet([
        { setType: "warmup", reps: null, weightKg: 40 },
        { setType: "feeder", reps: null, weightKg: 110 },
        top(100, 6),
        top(102.5, 4),
        top(102.5, 5),
        { setType: "backoff", reps: 8, weightKg: 85 },
      ]),
    ).toEqual({ weightKg: 102.5, reps: 5 });
  });

  it("uses the heaviest set when there is no top set", () => {
    expect(
      bestSet([
        { setType: "warmup", reps: null, weightKg: 20 },
        { setType: "backoff", reps: 10, weightKg: 30 },
      ]),
    ).toEqual({ weightKg: 30, reps: 10 });
  });

  it("ignores sets without weight", () => {
    expect(bestSet([top(null, 6)])).toBeNull();
    expect(
      bestSet([top(null, 6), { setType: "feeder", reps: null, weightKg: 80 }]),
    ).toEqual({ weightKg: 80, reps: null });
  });
});

describe("compareBestSets", () => {
  it("compares weight first", () => {
    expect(
      compareBestSets({ weightKg: 100, reps: 8 }, { weightKg: 102.5, reps: 4 }),
    ).toBe("up");
    expect(
      compareBestSets({ weightKg: 100, reps: 4 }, { weightKg: 97.5, reps: 8 }),
    ).toBe("down");
  });

  it("with the same weight, more reps is progress", () => {
    expect(
      compareBestSets({ weightKg: 100, reps: 6 }, { weightKg: 100, reps: 8 }),
    ).toBe("up");
    expect(
      compareBestSets({ weightKg: 100, reps: 6 }, { weightKg: 100, reps: 5.5 }),
    ).toBe("down");
    expect(
      compareBestSets({ weightKg: 100, reps: 6 }, { weightKg: 100, reps: 6 }),
    ).toBe("same");
    expect(
      compareBestSets(
        { weightKg: 100, reps: null },
        { weightKg: 100, reps: 6 },
      ),
    ).toBe("same");
  });
});

describe("formatBestSet", () => {
  it("shows weight and reps", () => {
    expect(formatBestSet({ weightKg: 102.5, reps: 4.5 })).toBe(
      "102,5 kg × 4,5",
    );
    expect(formatBestSet({ weightKg: 80, reps: null })).toBe("80 kg");
  });
});

describe("buildProgressHistory", () => {
  const entry = (
    workoutId: string,
    startedAt: string,
    exerciseId: string,
    sets: PlannedSet[],
    plannedSets: PlannedSet[] = [],
  ): ExerciseEntry => ({
    workoutId,
    startedAt,
    routineId: "push",
    routineName: "Push",
    exerciseId,
    exerciseName: exerciseId === "bench" ? "Supino" : "Press",
    sets,
    plannedSets,
  });

  const entries = [
    entry("w1", "2026-09-27T18:00:00Z", "bench", [top(100, 6)]),
    entry("w1", "2026-09-27T18:00:00Z", "press", [top(60, 8)]),
    entry("w2", "2026-10-04T18:00:00Z", "bench", [top(102.5, 5)]),
    entry("w2", "2026-10-04T18:00:00Z", "press", [top(60, 8)]),
    entry("w3", "2026-10-11T18:00:00Z", "bench", [top(102.5, 5)]),
    entry("w3", "2026-10-11T18:00:00Z", "press", [top(57.5, 8)]),
  ];

  it("keeps only workouts with changes, newest first", () => {
    const history = buildProgressHistory(entries);
    expect(history.map((group) => group.workoutId)).toEqual(["w3", "w2"]);
  });

  it("lists progressions and regressions against the previous time", () => {
    const [w3, w2] = buildProgressHistory(entries);
    expect(w2.changes).toEqual([
      {
        exerciseId: "bench",
        exerciseName: "Supino",
        direction: "up",
        previous: { weightKg: 100, reps: 6 },
        current: { weightKg: 102.5, reps: 5 },
      },
    ]);
    expect(w3.changes).toEqual([
      expect.objectContaining({ exerciseId: "press", direction: "down" }),
    ]);
  });

  it("works with entries in any order", () => {
    expect(buildProgressHistory([...entries].reverse())).toEqual(
      buildProgressHistory(entries),
    );
  });

  it("the first time, compares with the values the workout started with", () => {
    const history = buildProgressHistory([
      entry(
        "w1",
        "2026-10-05T18:00:00Z",
        "bench",
        [top(102.5, 5)],
        [top(100, 6)],
      ),
      entry("w1", "2026-10-05T18:00:00Z", "press", [top(60, 8)], [top(60, 8)]),
    ]);
    expect(history).toEqual([
      {
        workoutId: "w1",
        startedAt: "2026-10-05T18:00:00Z",
        routineName: "Push",
        changes: [
          {
            exerciseId: "bench",
            exerciseName: "Supino",
            direction: "up",
            previous: { weightKg: 100, reps: 6 },
            current: { weightKg: 102.5, reps: 5 },
          },
        ],
      },
    ]);
  });

  it("after the first time, compares with the previous workout", () => {
    const history = buildProgressHistory([
      entry(
        "w1",
        "2026-10-05T18:00:00Z",
        "bench",
        [top(102.5, 5)],
        [top(100, 6)],
      ),
      // Started with a routine value edited by hand (105), did 102.5 × 6.
      entry(
        "w2",
        "2026-10-12T18:00:00Z",
        "bench",
        [top(102.5, 6)],
        [top(105, 5)],
      ),
    ]);
    expect(history[0].changes[0]).toMatchObject({
      direction: "up",
      previous: { weightKg: 102.5, reps: 5 },
      current: { weightKg: 102.5, reps: 6 },
    });
  });

  it("compares an exercise only within the same routine", () => {
    const inRoutine = (routineId: string, entry: ExerciseEntry) => ({
      ...entry,
      routineId,
    });
    const history = buildProgressHistory([
      inRoutine(
        "abs",
        entry("w1", "2026-10-01T18:00:00Z", "crunch", [top(56, 6)]),
      ),
      // Same exercise at the end of another routine, more tired: lighter.
      inRoutine(
        "push",
        entry("w2", "2026-10-03T18:00:00Z", "crunch", [top(45, 8)]),
      ),
      inRoutine(
        "abs",
        entry("w3", "2026-10-08T18:00:00Z", "crunch", [top(56, 7)]),
      ),
    ]);
    // w2 is the first time in "push": no comparison with "abs".
    // w3 is compared with w1 (same routine), not with w2.
    expect(history.map((group) => group.workoutId)).toEqual(["w3"]);
    expect(history[0].changes[0]).toMatchObject({
      direction: "up",
      previous: { weightKg: 56, reps: 6 },
      current: { weightKg: 56, reps: 7 },
    });
  });

  it("skips exercises without any weight", () => {
    const history = buildProgressHistory([
      entry("w1", "2026-09-27T18:00:00Z", "bench", [top(100, 6)]),
      entry("w2", "2026-10-04T18:00:00Z", "bench", [top(null, null)]),
      entry("w3", "2026-10-11T18:00:00Z", "bench", [top(100, 7)]),
    ]);
    expect(history.map((group) => group.workoutId)).toEqual(["w3"]);
  });
});

describe("buildExerciseChanges", () => {
  it("lists one exercise's changes, newest first", () => {
    const sets = (weightKg: number) => [top(weightKg, 5)];
    const entries: ExerciseEntry[] = [
      ["w1", "2026-09-28T18:00:00Z", 100],
      ["w2", "2026-10-05T18:00:00Z", 102.5],
      ["w3", "2026-10-12T18:00:00Z", 102.5],
      ["w4", "2026-10-19T18:00:00Z", 100],
    ].map(([workoutId, startedAt, weightKg]) => ({
      workoutId: workoutId as string,
      startedAt: startedAt as string,
      routineId: "push",
      routineName: "Push",
      exerciseId: "bench",
      exerciseName: "Supino",
      sets: sets(weightKg as number),
      plannedSets: [],
    }));
    entries.push({ ...entries[1], exerciseId: "press", exerciseName: "Press" });

    expect(
      buildExerciseChanges(entries, "bench", "push").map((change) => [
        change.workoutId,
        change.direction,
      ]),
    ).toEqual([
      ["w4", "down"],
      ["w2", "up"],
    ]);
  });
});

describe("summarizeWorkout", () => {
  it("counts exercises, filled sets and volume of top sets and back-offs", () => {
    expect(
      summarizeWorkout([
        {
          sets: [
            { setType: "warmup", reps: null, weightKg: 40 },
            { setType: "feeder", reps: null, weightKg: 80 },
            top(100, 6),
            { setType: "backoff", reps: 8, weightKg: 85 },
          ],
        },
        { sets: [top(60, 8), top(null, null)] },
      ]),
    ).toEqual({
      exerciseCount: 2,
      setCount: 5,
      volumeKg: 100 * 6 + 85 * 8 + 60 * 8,
    });
  });
});

describe("formatVolume", () => {
  it("rounds and groups thousands with spaces", () => {
    expect(formatVolume(0)).toBe("0 kg");
    expect(formatVolume(840)).toBe("840 kg");
    expect(formatVolume(12340.5)).toBe("12 341 kg");
    expect(formatVolume(1234567)).toBe("1 234 567 kg");
  });
});

describe("buildExerciseProgress", () => {
  const entry = (
    workoutId: string,
    startedAt: string,
    exerciseId: string,
    sets: PlannedSet[],
    plannedSets: PlannedSet[] = [],
  ): ExerciseEntry => ({
    workoutId,
    startedAt,
    routineId: "push",
    routineName: "Push",
    exerciseId,
    exerciseName: exerciseId,
    sets,
    plannedSets,
  });

  it("lists the best set of each workout, oldest first, with the change", () => {
    const points = buildExerciseProgress(
      [
        entry("w3", "2026-10-11T18:00:00Z", "bench", [top(102.5, 5)]),
        entry("w1", "2026-09-27T18:00:00Z", "bench", [top(100, 6)]),
        entry("w2", "2026-10-04T18:00:00Z", "bench", [top(null, null)]),
        entry("w2", "2026-10-04T18:00:00Z", "press", [top(60, 8)]),
        entry("w4", "2026-10-18T18:00:00Z", "bench", [top(102.5, 5)]),
      ],
      "bench",
      "push",
    );
    expect(points).toEqual([
      {
        workoutId: "w1",
        startedAt: "2026-09-27T18:00:00Z",
        best: { weightKg: 100, reps: 6 },
        direction: null,
      },
      {
        workoutId: "w3",
        startedAt: "2026-10-11T18:00:00Z",
        best: { weightKg: 102.5, reps: 5 },
        direction: "up",
      },
      {
        workoutId: "w4",
        startedAt: "2026-10-18T18:00:00Z",
        best: { weightKg: 102.5, reps: 5 },
        direction: "same",
      },
    ]);
  });
});

describe("chartScale", () => {
  it("zooms in around small changes", () => {
    expect(chartScale([100, 102.5])).toEqual({
      offset: 99,
      step: 1,
      sections: 5,
    });
  });

  it("uses bigger steps for bigger ranges and keeps values inside", () => {
    const scale = chartScale([60, 100]);
    expect(scale.step).toBe(10);
    expect(scale.offset).toBeLessThan(60);
    expect(scale.offset + scale.step * scale.sections).toBeGreaterThan(100);
  });

  it("never goes below zero", () => {
    expect(chartScale([0, 5]).offset).toBe(0);
  });

  it("works with a single value", () => {
    expect(chartScale([80])).toEqual({ offset: 79, step: 1, sections: 2 });
  });
});

describe("exercisesWithChanges", () => {
  it("lists only exercises that went up or down at least once", () => {
    const entry = (
      workoutId: string,
      startedAt: string,
      exerciseId: string,
      weightKg: number,
    ): ExerciseEntry => ({
      workoutId,
      startedAt,
      routineId: "push",
      routineName: "Push",
      exerciseId,
      exerciseName: exerciseId,
      sets: [top(weightKg, 5)],
      plannedSets: [],
    });
    const ids = exercisesWithChanges([
      entry("w1", "2026-09-28T18:00:00Z", "bench", 100),
      entry("w1", "2026-09-28T18:00:00Z", "press", 60),
      entry("w2", "2026-10-05T18:00:00Z", "bench", 102.5),
      entry("w2", "2026-10-05T18:00:00Z", "press", 60),
    ]);
    expect([...ids]).toEqual(["push:bench"]);
  });
});
