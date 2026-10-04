import { normalizeForSearch } from "@/lib/exercises";
import type { MuscleGroup } from "@/types/exercise";
import type { Progression } from "@/types/routine";

export const ROUTINE_NAME_MAX_LENGTH = 40;

// Checks a routine name before saving; returns an error message or null.
// `existing` is used to reject names already taken (ignoring case and accents);
// `editingId` skips the routine being renamed.
export function validateRoutineName(
  name: string,
  existing: { id: string; name: string }[],
  editingId?: string,
): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return "Escreve um nome.";
  }
  if (trimmed.length > ROUTINE_NAME_MAX_LENGTH) {
    return `O nome pode ter no máximo ${ROUTINE_NAME_MAX_LENGTH} caracteres.`;
  }
  const normalized = normalizeForSearch(trimmed);
  const duplicate = existing.find(
    (routine) =>
      routine.id !== editingId &&
      normalizeForSearch(routine.name) === normalized,
  );
  return duplicate
    ? `Já existe uma rotina com este nome: "${duplicate.name}".`
    : null;
}

// Muscle groups without repeats, in the order they first appear.
export function uniqueMuscleGroups(muscleGroups: MuscleGroup[]): MuscleGroup[] {
  return [...new Set(muscleGroups)];
}

export const PROGRESSION_LABELS: Record<Progression, string> = {
  keep: "Não aumentar na próxima semana",
  increase: "Aumentar carga na próxima semana",
};

// Green to keep the weight, red to increase it.
export const PROGRESSION_COLORS: Record<
  Progression,
  { text: string; background: string }
> = {
  keep: { text: "#15803d", background: "#dcfce7" },
  increase: { text: "#b91c1c", background: "#fee2e2" },
};
