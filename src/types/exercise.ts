export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "smith_machine",
  "bodyweight",
] as const;

export type Equipment = (typeof EQUIPMENT)[number];

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment | null;
  isArchived: boolean;
  isFavorite: boolean;
};

// What the user fills in when creating or editing an exercise.
export type ExerciseInput = {
  name: string;
  muscleGroup: MuscleGroup | null;
  equipment: Equipment | null;
};
