import { addDaysToKey } from "@/lib/dates";
import { parseWeight } from "@/lib/sets";

export type BodyWeightEntry = {
  // Local day, "YYYY-MM-DD".
  date: string;
  weightKg: number;
};

export type BodyWeightPoint = BodyWeightEntry & {
  // Average of the entries of the last `days` days, this one included.
  average: number;
};

export const MOVING_AVERAGE_DAYS = 7;
export const MAX_BODY_WEIGHT_KG = 400;

// Reads a typed body weight ("78,4" or "78.4"); null if empty or invalid.
export function parseBodyWeight(text: string): number | null {
  const parsed = parseWeight(text);
  if (!parsed.ok || parsed.value === null) return null;
  return parsed.value > 0 && parsed.value <= MAX_BODY_WEIGHT_KG
    ? parsed.value
    : null;
}

// Each entry with the moving average of the last `days` calendar days
// (missing days are simply not counted). Oldest first.
export function withMovingAverage(
  entries: BodyWeightEntry[],
  days: number = MOVING_AVERAGE_DAYS,
): BodyWeightPoint[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((entry) => {
    const from = addDaysToKey(entry.date, -(days - 1));
    const window = sorted.filter(
      (other) => other.date >= from && other.date <= entry.date,
    );
    const total = window.reduce((sum, other) => sum + other.weightKg, 0);
    return { ...entry, average: total / window.length };
  });
}

export type BodyWeightSummary = {
  latest: BodyWeightEntry;
  average: number;
  // Change of the moving average over the last week; null without data
  // from a week before.
  weeklyChange: number | null;
};

export function summarizeBodyWeight(
  points: BodyWeightPoint[],
): BodyWeightSummary | null {
  const latest = points.at(-1);
  if (!latest) return null;
  const weekAgo = addDaysToKey(latest.date, -MOVING_AVERAGE_DAYS);
  // The last point on or before the day a week ago.
  const before = [...points].reverse().find((point) => point.date <= weekAgo);
  return {
    latest: { date: latest.date, weightKg: latest.weightKg },
    average: latest.average,
    weeklyChange: before ? latest.average - before.average : null,
  };
}

export type GoalStatus =
  { kind: "reached" } | { kind: "lose" | "gain"; remainingKg: number };

// How far the latest weight is from the goal (within 0.05 kg counts as reached).
export function goalStatus(latestKg: number, goalKg: number): GoalStatus {
  const difference = Math.round((latestKg - goalKg) * 10) / 10;
  if (Math.abs(difference) < 0.05) return { kind: "reached" };
  return difference > 0
    ? { kind: "lose", remainingKg: difference }
    : { kind: "gain", remainingKg: -difference };
}
