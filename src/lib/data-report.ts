import {
  addDaysToKey,
  dateFromKey,
  formatDayMonth,
  mondayOf,
} from "@/lib/dates";
import type { Cell } from "@/lib/xlsx";

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// The most days one export can hold (about 5 years), so a wrong date can't
// build a huge sheet.
export const MAX_REPORT_DAYS = 1830;

export type DayTotals = {
  date: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type Macros = Omit<DayTotals, "date">;

export type ReportDay = {
  // Local date "YYYY-MM-DD".
  date: string;
  weightKg: number | null;
  // null when nothing was logged that day.
  food: Macros | null;
};

// Body weight and what was eaten each day from `from` to `to`.
export type DataReport = {
  from: string;
  to: string;
  days: ReportDay[];
  weighIns: number;
  foodDays: number;
  // Averages over the days with a value (days without one are not counted).
  average: { weightKg: number | null; food: Macros | null };
};

export type DateRange = { from: string; to: string };

// Every day from `from` to `to`, both included (in order even if swapped).
export function daysBetween(from: string, to: string): string[] {
  const [start, end] = from <= to ? [from, to] : [to, from];
  const days: string[] = [];
  for (let day = start; day <= end && days.length < MAX_REPORT_DAYS; ) {
    days.push(day);
    day = addDaysToKey(day, 1);
  }
  return days;
}

// Quick choices for the export screen.
export function lastWeekRange(today: string): DateRange {
  const from = addDaysToKey(mondayOf(today), -7);
  return { from, to: addDaysToKey(from, 6) };
}

export function lastDaysRange(today: string, count: number): DateRange {
  return { from: addDaysToKey(today, -(count - 1)), to: today };
}

const round1 = (value: number) => Math.round(value * 10) / 10;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildDataReport(
  days: string[],
  weights: { date: string; weightKg: number }[],
  totals: DayTotals[],
): DataReport {
  const weightOf = new Map(weights.map((entry) => [entry.date, entry.weightKg]));
  const totalsOf = new Map(totals.map((day) => [day.date, day]));
  const rows = days.map((date): ReportDay => {
    const day = totalsOf.get(date);
    return {
      date,
      weightKg: weightOf.get(date) ?? null,
      food: day
        ? {
            kcal: Math.round(day.kcal),
            proteinG: round1(day.proteinG),
            carbsG: round1(day.carbsG),
            fatG: round1(day.fatG),
          }
        : null,
    };
  });

  const withWeight = rows.flatMap((row) =>
    row.weightKg === null ? [] : [row.weightKg],
  );
  const withFood = rows.flatMap((row) => (row.food ? [row.food] : []));
  const mean = (pick: (food: Macros) => number) =>
    average(withFood.map(pick)) ?? 0;
  const weightAverage = average(withWeight);

  return {
    from: days[0],
    to: days[days.length - 1],
    days: rows,
    weighIns: withWeight.length,
    foodDays: withFood.length,
    average: {
      weightKg: weightAverage === null ? null : round1(weightAverage),
      food:
        withFood.length === 0
          ? null
          : {
              kcal: Math.round(mean((food) => food.kcal)),
              proteinG: round1(mean((food) => food.proteinG)),
              carbsG: round1(mean((food) => food.carbsG)),
              fatG: round1(mean((food) => food.fatG)),
            },
    },
  };
}

// Whether there is anything to export (a weight or a meal on any day).
export function hasReportData(report: DataReport): boolean {
  return report.weighIns > 0 || report.foodDays > 0;
}

// "6 de outubro de 2026".
export function formatFullDate(key: string): string {
  return `${formatDayMonth(key)} de ${dateFromKey(key).getFullYear()}`;
}

// "5 a 11 de outubro de 2026", "28 de setembro a 4 de outubro de 2026" or,
// across years, "29 de dezembro de 2026 a 4 de janeiro de 2027".
export function formatDateRange(from: string, to: string): string {
  if (from === to) return formatFullDate(from);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  if (!sameYear) return `${formatFullDate(from)} a ${formatFullDate(to)}`;
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  const start = sameMonth
    ? String(dateFromKey(from).getDate())
    : formatDayMonth(from);
  return `${start} a ${formatFullDate(to)}`;
}

// "gymlog-dados-2026-10-05_2026-10-11.xlsx". The .gitignore relies on it.
export function reportFileName(report: DateRange): string {
  return `gymlog-dados-${report.from}_${report.to}.xlsx`;
}

export function isReportFileName(name: string): boolean {
  return /^gymlog-(dados-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}|semana-\d{4}-\d{2}-\d{2})\.xlsx$/.test(
    name,
  );
}

// Rows of the Excel sheet: a title, the header, one row per day, then the
// averages. Numbers stay numbers, so they can be used in formulas.
export function reportRows(report: DataReport): Cell[][] {
  const line = (
    label: string,
    date: string,
    weightKg: number | null,
    food: Macros | null,
  ): Cell[] => [
    label,
    date,
    weightKg,
    food?.kcal ?? null,
    food?.proteinG ?? null,
    food?.carbsG ?? null,
    food?.fatG ?? null,
  ];
  return [
    [`Peso e dieta: ${formatDateRange(report.from, report.to)}`],
    [],
    [
      "Dia",
      "Data",
      "Peso (kg)",
      "Kcal",
      "Proteína (g)",
      "Carbos (g)",
      "Gordura (g)",
    ],
    ...report.days.map((day) =>
      line(
        WEEKDAY_SHORT[dateFromKey(day.date).getDay()],
        day.date,
        day.weightKg,
        day.food,
      ),
    ),
    line("Média", "", report.average.weightKg, report.average.food),
  ];
}

// Rows of reportRows to show in bold: title, header and averages.
export function reportBoldRows(report: DataReport): number[] {
  return [0, 2, 3 + report.days.length];
}
