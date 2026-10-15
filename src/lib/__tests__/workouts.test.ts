import {
  buildWorkoutSets,
  mergeIntoPlanned,
  planAfterWorkout,
} from "@/lib/workouts";
import type { PlannedSet } from "@/types/set";

const planned: PlannedSet[] = [
  { setType: "warmup", reps: null, weightKg: 40, toFailure: false },
  { setType: "feeder", reps: null, weightKg: 80, toFailure: false },
  { setType: "top", reps: 6, weightKg: 100, toFailure: false },
  { setType: "backoff", reps: 8, weightKg: 85, toFailure: false },
];

describe("buildWorkoutSets", () => {
  it("uses the routine's planned values", () => {
    expect(buildWorkoutSets(planned)).toEqual(planned);
  });

  it("never gives reps to warm-ups and feeders", () => {
    expect(
      buildWorkoutSets([
        { setType: "feeder", reps: 3, weightKg: 80, toFailure: false },
      ]),
    ).toEqual([
      { setType: "feeder", reps: null, weightKg: 80, toFailure: false },
    ]);
  });
});

describe("mergeIntoPlanned", () => {
  it("takes the values done in each set", () => {
    const done: PlannedSet[] = [
      { setType: "warmup", reps: null, weightKg: 45, toFailure: false },
      { setType: "feeder", reps: null, weightKg: 85, toFailure: false },
      { setType: "top", reps: 4.5, weightKg: 102.5, toFailure: false },
      { setType: "backoff", reps: 8, weightKg: 87.5, toFailure: false },
    ];
    expect(mergeIntoPlanned(planned, done)).toEqual(done);
  });

  it("keeps the routine's structure", () => {
    // An extra top set was done; a feeder was changed into a top set.
    const done: PlannedSet[] = [
      { setType: "warmup", reps: null, weightKg: 45, toFailure: false },
      { setType: "top", reps: 5, weightKg: 100, toFailure: false },
      { setType: "top", reps: 4, weightKg: 102.5, toFailure: false },
      { setType: "backoff", reps: 8, weightKg: 85, toFailure: false },
      { setType: "backoff", reps: 8, weightKg: 85, toFailure: false },
    ];
    expect(mergeIntoPlanned(planned, done)).toEqual([
      { setType: "warmup", reps: null, weightKg: 45, toFailure: false },
      // Different type at this position: keeps the planned values.
      { setType: "feeder", reps: null, weightKg: 80, toFailure: false },
      { setType: "top", reps: 4, weightKg: 102.5, toFailure: false },
      { setType: "backoff", reps: 8, weightKg: 85, toFailure: false },
    ]);
  });

  it("keeps planned values for sets left empty or deleted", () => {
    const done: PlannedSet[] = [
      { setType: "warmup", reps: null, weightKg: null, toFailure: false },
      { setType: "feeder", reps: null, weightKg: 82.5, toFailure: false },
    ];
    expect(mergeIntoPlanned(planned, done)).toEqual([
      planned[0],
      { setType: "feeder", reps: null, weightKg: 82.5, toFailure: false },
      planned[2],
      planned[3],
    ]);
  });
});

describe("mergeIntoPlanned with back-offs to failure", () => {
  const backoff = (reps: number | null, toFailure: boolean): PlannedSet => ({
    setType: "backoff",
    reps,
    weightKg: 85,
    toFailure,
  });

  it("keeps a planned failure when the workout did it to failure", () => {
    expect(
      mergeIntoPlanned([backoff(null, true)], [backoff(null, true)]),
    ).toEqual([backoff(null, true)]);
  });

  it("takes the reps done instead of a planned failure", () => {
    expect(
      mergeIntoPlanned([backoff(null, true)], [backoff(9, false)]),
    ).toEqual([backoff(9, false)]);
  });

  it("takes a failure done instead of planned reps", () => {
    expect(
      mergeIntoPlanned([backoff(8, false)], [backoff(null, true)]),
    ).toEqual([backoff(null, true)]);
  });

  it("keeps the plan when nothing was filled in", () => {
    expect(
      mergeIntoPlanned([backoff(null, true)], [backoff(null, false)]),
    ).toEqual([backoff(null, true)]);
  });
});

describe("mergeIntoPlanned with reps done with help", () => {
  const top = (assistedReps?: number | null): PlannedSet => ({
    setType: "top",
    reps: 6,
    weightKg: 93,
    toFailure: false,
    ...(assistedReps !== undefined ? { assistedReps } : {}),
  });

  it("keeps the reps done with help of the workout", () => {
    expect(mergeIntoPlanned([top()], [top(1)])).toEqual([top(1)]);
  });

  it("drops them when the workout had none", () => {
    expect(mergeIntoPlanned([top(1)], [top(null)])).toEqual([top()]);
  });

  it("never keeps them on other set types", () => {
    const backoff: PlannedSet = {
      setType: "backoff",
      reps: 8,
      weightKg: 70,
      toFailure: false,
      assistedReps: 2,
    };
    expect(
      mergeIntoPlanned([backoff], [backoff])[0].assistedReps,
    ).toBeUndefined();
  });
});

describe("mergeIntoPlanned when a set was deleted in the workout", () => {
  it("matches each set with the one of the same type, not just position", () => {
    const routine: PlannedSet[] = [
      { setType: "warmup", reps: null, weightKg: 40, toFailure: false },
      { setType: "feeder", reps: null, weightKg: 60, toFailure: false },
      { setType: "feeder", reps: null, weightKg: 80, toFailure: false },
      { setType: "top", reps: 6, weightKg: 100, toFailure: false },
      { setType: "backoff", reps: 8, weightKg: 85, toFailure: false },
    ];
    // The second feeder was deleted: every set after it moved up one place.
    const done: PlannedSet[] = [
      { setType: "warmup", reps: null, weightKg: 42.5, toFailure: false },
      { setType: "feeder", reps: null, weightKg: 62.5, toFailure: false },
      { setType: "top", reps: 6, weightKg: 102.5, toFailure: false },
      { setType: "backoff", reps: 8, weightKg: 87.5, toFailure: false },
    ];
    expect(mergeIntoPlanned(routine, done)).toEqual([
      done[0],
      done[1],
      // No second feeder was done: the planned one stays.
      routine[2],
      done[2],
      done[3],
    ]);
  });
});

describe("planAfterWorkout", () => {
  const blank: PlannedSet[] = ["warmup", "feeder", "feeder", "top", "backoff"]
    .map((setType) => ({
      setType: setType as PlannedSet["setType"],
      reps: null,
      weightKg: null,
      toFailure: false,
    }));

  it("gives an exercise with nothing planned the sets done, as they were", () => {
    const done: PlannedSet[] = [
      { setType: "warmup", reps: null, weightKg: 20, toFailure: false },
      { setType: "top", reps: 10, weightKg: 40, toFailure: false },
      { setType: "top", reps: 8, weightKg: 45, toFailure: false },
    ];
    expect(planAfterWorkout(blank, done)).toEqual({
      sets: done,
      replaceStructure: true,
    });
  });

  it("leaves an empty plan alone when nothing was filled in", () => {
    expect(planAfterWorkout(blank, blank)).toEqual({
      sets: blank,
      replaceStructure: false,
    });
  });

  it("merges into a plan that already has values", () => {
    expect(planAfterWorkout(planned, planned).replaceStructure).toBe(false);
  });
});
