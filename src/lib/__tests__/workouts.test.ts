import { buildWorkoutSets, mergeIntoPlanned } from "@/lib/workouts";
import type { PlannedSet } from "@/types/set";

const planned: PlannedSet[] = [
  { setType: "warmup", reps: null, weightKg: 40 },
  { setType: "feeder", reps: null, weightKg: 80 },
  { setType: "top", reps: 6, weightKg: 100 },
  { setType: "backoff", reps: 8, weightKg: 85 },
];

describe("buildWorkoutSets", () => {
  it("uses the routine's planned values", () => {
    expect(buildWorkoutSets(planned)).toEqual(planned);
  });

  it("never gives reps to warm-ups and feeders", () => {
    expect(
      buildWorkoutSets([{ setType: "feeder", reps: 3, weightKg: 80 }]),
    ).toEqual([{ setType: "feeder", reps: null, weightKg: 80 }]);
  });
});

describe("mergeIntoPlanned", () => {
  it("takes the values done in each set", () => {
    const done: PlannedSet[] = [
      { setType: "warmup", reps: null, weightKg: 45 },
      { setType: "feeder", reps: null, weightKg: 85 },
      { setType: "top", reps: 4.5, weightKg: 102.5 },
      { setType: "backoff", reps: 8, weightKg: 87.5 },
    ];
    expect(mergeIntoPlanned(planned, done)).toEqual(done);
  });

  it("keeps the routine's structure", () => {
    // An extra top set was done; a feeder was changed into a top set.
    const done: PlannedSet[] = [
      { setType: "warmup", reps: null, weightKg: 45 },
      { setType: "top", reps: 5, weightKg: 100 },
      { setType: "top", reps: 4, weightKg: 102.5 },
      { setType: "backoff", reps: 8, weightKg: 85 },
      { setType: "backoff", reps: 8, weightKg: 85 },
    ];
    expect(mergeIntoPlanned(planned, done)).toEqual([
      { setType: "warmup", reps: null, weightKg: 45 },
      // Different type at this position: keeps the planned values.
      { setType: "feeder", reps: null, weightKg: 80 },
      { setType: "top", reps: 4, weightKg: 102.5 },
      { setType: "backoff", reps: 8, weightKg: 85 },
    ]);
  });

  it("keeps planned values for sets left empty or deleted", () => {
    const done: PlannedSet[] = [
      { setType: "warmup", reps: null, weightKg: null },
      { setType: "feeder", reps: null, weightKg: 82.5 },
    ];
    expect(mergeIntoPlanned(planned, done)).toEqual([
      planned[0],
      { setType: "feeder", reps: null, weightKg: 82.5 },
      planned[2],
      planned[3],
    ]);
  });
});
