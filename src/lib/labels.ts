import type { Equipment, MuscleGroup } from "@/types/exercise";

// Portuguese (Portugal) labels for values stored in English in the database.
// `Record` makes TypeScript fail if a new value is added without a label.

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Peito",
  back: "Costas",
  shoulders: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  quads: "Quadríceps",
  hamstrings: "Isquiotibiais",
  glutes: "Glúteos",
  calves: "Gémeos",
  core: "Abdominais",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barra",
  dumbbell: "Halteres",
  machine: "Máquina",
  cable: "Polia",
  smith_machine: "Máquina Smith",
  bodyweight: "Peso corporal",
};
