import { buildWorkoutSets, mergeIntoPlanned } from "@/lib/workouts";
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
