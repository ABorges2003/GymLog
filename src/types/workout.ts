import type { Exercise } from "@/types/exercise";
import type { Progression } from "@/types/routine";
import type { SetType } from "@/types/set";

export type Workout = {
  id: string;
  // ISO 8601 timestamps.
  startedAt: string;
  // null while the workout is in progress.
  finishedAt: string | null;
  notes: string | null;
  routineId: string | null;
};

// A set logged in a workout. Empty values mean "not filled in yet"; warm-ups
// and feeders never have reps.
export type WorkoutSet = {
  id: string;
  position: number;
  setType: SetType;
  reps: number | null;
  weightKg: number | null;
  // Back-off done to failure (reps is then null).
  toFailure: boolean;
  // Extra reps done with a spotter's help (top sets only), or null.
  assistedReps: number | null;
};

export type WorkoutExercise = {
  id: string;
  position: number;
  exercise: Exercise;
  sets: WorkoutSet[];
  // The same exercise in the workout's routine (null if no longer in it),
  // and its note for the next time.
  routineExerciseId: string | null;
  progression: Progression | null;
};

// A workout with its routine name and everything logged in it.
export type WorkoutDetail = {
  workout: Workout;
  routineName: string | null;
  exercises: WorkoutExercise[];
};
