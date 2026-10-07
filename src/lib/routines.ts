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

// Most recently done first; routines never done go last, by name.
export function sortRoutines<
  T extends { name: string; lastDoneAt: string | null },
>(routines: T[]): T[] {
  return [...routines].sort((a, b) => {
    if (a.lastDoneAt && b.lastDoneAt) {
      return b.lastDoneAt.localeCompare(a.lastDoneAt);
    }
    if (a.lastDoneAt) return -1;
    if (b.lastDoneAt) return 1;
    return a.name.localeCompare(b.name, "pt");
  });
}

export const PROGRESSION_LABELS: Record<Progression, string> = {
  keep: "Não aumentar na próxima semana",
  increase: "Aumentar carga na próxima semana",
};
