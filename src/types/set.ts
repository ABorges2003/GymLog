// Set types, in the order they usually happen in an exercise.
export const SET_TYPES = ["warmup", "feeder", "top", "backoff"] as const;

export type SetType = (typeof SET_TYPES)[number];

// A set as planned in a routine. Reps and weight are optional. A back-off
// set may be done to failure instead of a number of reps (then reps is null).
export type PlannedSet = {
  setType: SetType;
  reps: number | null;
  weightKg: number | null;
  toFailure: boolean;
};
