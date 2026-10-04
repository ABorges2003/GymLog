import type { Exercise, MuscleGroup } from "@/types/exercise";
import type { PlannedSet } from "@/types/set";

export type Routine = {
  id: string;
  name: string;
  // ISO 8601 timestamp.
  createdAt: string;
};

// A routine as shown in the routines list.
export type RoutineSummary = Routine & {
  exerciseCount: number;
  // In the order they first appear in the routine.
  muscleGroups: MuscleGroup[];
};

// Note for the next time the exercise is done.
export type Progression = "keep" | "increase";

// An exercise inside a routine, in the routine's order.
export type RoutineExercise = {
  id: string;
  position: number;
  exercise: Exercise;
  // The planned sets, in order (e.g. W 15×40, F 3×70, F 2×85, T 6×100, B 8×85).
  sets: PlannedSet[];
  progression: Progression | null;
};
