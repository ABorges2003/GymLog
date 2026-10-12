import type { BodyWeightEntry } from "@/lib/body-weight";
import { dateFromKey, toDateKey } from "@/lib/dates";

// A period with a purpose, e.g. "Bulk inverno 2026" or "Cut verão".
export type Phase = {
  id: string;
  name: string;
  // Local days, "YYYY-MM-DD". No end date means it is still going on.
  startDate: string;
  endDate: string | null;
};

export type PhaseInput = Omit<Phase, "id">;

export const PHASE_NAME_MAX_LENGTH = 40;

const pad = (value: number) => String(value).padStart(2, "0");

// "2026-10-15" -> "15/10/2026", how dates are typed.
export function formatDateText(key: string): string {
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

// Adds the slashes while typing: "1510" -> "15/10", "15102026" -> "15/10/2026".
export function autoFormatDateText(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Reads "15/10/2026" (or "5/3/2026"); null if it is not a real date.
export function parseDateText(text: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [day, month, year] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  // new Date rolls 31/02 over to March: such dates do not exist.
  if (
    year < 2000 ||
    year > 2100 ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

export type PhaseErrors = {
  name?: string;
  startDate?: string;
  endDate?: string;
};

// Checks the typed form; returns the phase or the errors to show.
export function validatePhase(form: {
  name: string;
  startText: string;
  endText: string;
}): { ok: true; phase: PhaseInput } | { ok: false; errors: PhaseErrors } {
  const errors: PhaseErrors = {};
  const name = form.name.trim();
  if (name === "") errors.name = "Dá um nome à época (ex.: Bulk inverno).";
  else if (name.length > PHASE_NAME_MAX_LENGTH) {
    errors.name = `No máximo ${PHASE_NAME_MAX_LENGTH} caracteres.`;
  }

  const startDate = parseDateText(form.startText);
  if (!startDate) errors.startDate = "Data inválida. Usa dd/mm/aaaa.";

  let endDate: string | null = null;
  if (form.endText.trim() !== "") {
    endDate = parseDateText(form.endText);
    if (!endDate) errors.endDate = "Data inválida. Usa dd/mm/aaaa.";
    else if (startDate && endDate < startDate) {
      errors.endDate = "O fim tem de ser depois do início.";
    }
  }

  if (Object.keys(errors).length > 0 || !startDate) {
    return { ok: false, errors };
  }
  return { ok: true, phase: { name, startDate, endDate } };
}

export type PhaseStatus = "upcoming" | "ongoing" | "finished";

export function phaseStatus(
  phase: PhaseInput,
  today: Date = new Date(),
): PhaseStatus {
  const todayKey = toDateKey(today);
  if (phase.startDate > todayKey) return "upcoming";
  if (phase.endDate !== null && phase.endDate < todayKey) return "finished";
  return "ongoing";
}

export const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  upcoming: "Ainda não começou",
  ongoing: "Em curso",
  finished: "Terminada",
};

// "15/10/2026 – 12/01/2027", or "15/10/2026 – em curso" without an end.
export function formatPhaseDates(phase: PhaseInput): string {
  return `${formatDateText(phase.startDate)} – ${
    phase.endDate === null ? "em curso" : formatDateText(phase.endDate)
  }`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days from one day key to another.
function daysBetween(from: string, to: string): number {
  return Math.round(
    (dateFromKey(to).getTime() - dateFromKey(from).getTime()) / DAY_MS,
  );
}

// Body weight entries inside the phase (up to its end, or today if that comes
// first), oldest first.
export function phaseEntries(
  entries: BodyWeightEntry[],
  phase: PhaseInput,
  today: Date = new Date(),
): BodyWeightEntry[] {
  // Up to the end, and never past today.
  const todayKey = toDateKey(today);
  const last =
    phase.endDate !== null && phase.endDate < todayKey
      ? phase.endDate
      : todayKey;
  return entries
    .filter((entry) => entry.date >= phase.startDate && entry.date <= last)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type PhaseSummary = {
  // Days from the start to the end (or to today while it goes on), counting
  // both; and the planned total, when there is an end date.
  daysDone: number;
  totalDays: number | null;
  entryCount: number;
  // The starting weight: the first entry of the phase, or the latest one up
  // to START_LOOKBACK_DAYS before it when there is none on the first day.
  // null without any. `firstDate` is its day.
  firstKg: number | null;
  firstDate: string | null;
  // From here on, null without entries inside the phase.
  lastKg: number | null;
  changeKg: number | null;
  minKg: number | null;
  maxKg: number | null;
  // Change per week between the first and the last entry, in kg and as a
  // percentage of the first weight (usual targets: ~0,25–0,5 %/week).
  // null with less than a week between them.
  weeklyKg: number | null;
  weeklyPercent: number | null;
};

// How far back to look for a starting weight when there is no entry on the
// first day of a phase.
export const START_LOOKBACK_DAYS = 14;

export function summarizePhase(
  entries: BodyWeightEntry[],
  phase: PhaseInput,
  today: Date = new Date(),
): PhaseSummary {
  const inside = phaseEntries(entries, phase, today);
  const todayKey = toDateKey(today);
  const lastDay =
    phase.endDate !== null && phase.endDate < todayKey
      ? phase.endDate
      : todayKey;
  const daysDone = Math.max(0, daysBetween(phase.startDate, lastDay) + 1);
  const totalDays =
    phase.endDate === null
      ? null
      : daysBetween(phase.startDate, phase.endDate) + 1;

  // Starting weight: on the first day, or else the latest one shortly before.
  const lookbackFrom = toDateKey(
    new Date(
      dateFromKey(phase.startDate).getTime() - START_LOOKBACK_DAYS * DAY_MS,
    ),
  );
  const before = [...entries]
    .filter(
      (entry) => entry.date < phase.startDate && entry.date >= lookbackFrom,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  const first =
    inside[0]?.date === phase.startDate ? inside[0] : (before ?? inside[0]);
  const last = inside.at(-1);
  if (!first || !last) {
    return {
      daysDone: phaseStatus(phase, today) === "upcoming" ? 0 : daysDone,
      totalDays,
      entryCount: 0,
      firstKg: first?.weightKg ?? null,
      firstDate: first?.date ?? null,
      lastKg: null,
      changeKg: null,
      minKg: null,
      maxKg: null,
      weeklyKg: null,
      weeklyPercent: null,
    };
  }

  const round = (value: number, digits = 1) =>
    Math.round(value * 10 ** digits) / 10 ** digits;
  const changeKg = round(last.weightKg - first.weightKg);
  const weeks = daysBetween(first.date, last.date) / 7;
  const weekly = weeks >= 1 ? (last.weightKg - first.weightKg) / weeks : null;
  const weights = inside.map((entry) => entry.weightKg);
  return {
    daysDone: phaseStatus(phase, today) === "upcoming" ? 0 : daysDone,
    totalDays,
    entryCount: inside.length,
    firstKg: first.weightKg,
    firstDate: first.date,
    lastKg: last.weightKg,
    changeKg,
    minKg: Math.min(...weights),
    maxKg: Math.max(...weights),
    weeklyKg: weekly === null ? null : round(weekly, 2),
    weeklyPercent:
      weekly === null ? null : round((weekly / first.weightKg) * 100, 2),
  };
}
