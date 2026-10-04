import type { PlannedSet, SetType } from "@/types/set";

// Structure given to an exercise when it is added to a routine:
// warm-up, two feeders, top set and back-off.
export const DEFAULT_SET_TYPES: SetType[] = [
  "warmup",
  "feeder",
  "feeder",
  "top",
  "backoff",
];

export const DEFAULT_SETS: PlannedSet[] = DEFAULT_SET_TYPES.map((setType) => ({
  setType,
  reps: null,
  weightKg: null,
}));

export const MAX_SETS_PER_EXERCISE = 12;
export const MAX_REPS = 100;
export const MAX_WEIGHT_KG = 1000;

export const SET_TYPE_SHORT_LABELS: Record<SetType, string> = {
  warmup: "W",
  feeder: "F",
  top: "T",
  backoff: "B",
};

export const SET_TYPE_LABELS: Record<SetType, string> = {
  warmup: "Aquecimento",
  feeder: "Feeder",
  top: "Top set",
  backoff: "Backoff",
};

// Only top sets and back-offs record reps; warm-ups and feeders only a weight.
export function setTypeHasReps(setType: SetType): boolean {
  return setType === "top" || setType === "backoff";
}

export const SET_TYPE_COLORS: Record<SetType, string> = {
  warmup: "#64748b",
  feeder: "#d97706",
  top: "#7c3aed",
  backoff: "#16a34a",
};

// Result of reading a number typed by the user: empty is allowed (null).
export type ParsedNumber = { ok: true; value: number | null } | { ok: false };

// Reps between 1 and MAX_REPS in steps of a half (a partial rep counts as
// half: "4,5" or "4.5"), or empty.
export function parseReps(text: string): ParsedNumber {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return { ok: true, value: null };
  if (!/^\d+(\.[05])?$/.test(trimmed)) return { ok: false };
  const value = Number(trimmed);
  return value >= 1 && value <= MAX_REPS ? { ok: true, value } : { ok: false };
}

// Reps with a decimal comma: 6 -> "6", 4.5 -> "4,5".
export function formatReps(reps: number): string {
  return String(reps).replace(".", ",");
}

// Weight in kg between 0 and MAX_WEIGHT_KG, or empty. Accepts "," or "."
// as decimal separator (Portuguese keyboards type a comma).
export function parseWeight(text: string): ParsedNumber {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return { ok: true, value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return { ok: false };
  const value = Number(trimmed);
  return value <= MAX_WEIGHT_KG ? { ok: true, value } : { ok: false };
}

// Weight with a decimal comma and no trailing zeros: 100 -> "100", 102.5 -> "102,5".
export function formatWeight(weightKg: number): string {
  return String(Math.round(weightKg * 100) / 100).replace(".", ",");
}

// Short summary of a set's values, weight first: "100 kg × 6", "100 kg",
// "6 reps" or "". Reps are only shown for set types that have them.
export function formatSetValues({
  setType,
  reps,
  weightKg,
}: PlannedSet): string {
  const shownReps = setTypeHasReps(setType) ? reps : null;
  if (weightKg !== null && shownReps !== null) {
    return `${formatWeight(weightKg)} kg × ${formatReps(shownReps)}`;
  }
  if (weightKg !== null) return `${formatWeight(weightKg)} kg`;
  if (shownReps !== null) return `${formatReps(shownReps)} reps`;
  return "";
}

// Checks the number of sets before saving; returns an error message or null.
export function validateSetCount(sets: unknown[]): string | null {
  if (sets.length === 0) {
    return "Adiciona pelo menos uma série.";
  }
  if (sets.length > MAX_SETS_PER_EXERCISE) {
    return `No máximo ${MAX_SETS_PER_EXERCISE} séries por exercício.`;
  }
  return null;
}
