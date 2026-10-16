import {
  addDaysToKey,
  dateFromKey,
  formatDayMonth,
  formatShortDate,
  mondayOf,
} from "@/lib/dates";
import type { Cell } from "@/lib/xlsx";

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export type DayTotals = {
  date: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type WeeklyReportDay = {
  // Local date "YYYY-MM-DD", Monday to Sunday.
  date: string;
  weightKg: number | null;
  // null when nothing was logged that day.
  food: Omit<DayTotals, "date"> | null;
};

export type WeeklyReport = {
  // Monday of the week.
  start: string;
  days: WeeklyReportDay[];
  // Averages over the days with a value (days without one are not counted).
  average: {
    weightKg: number | null;
    food: Omit<DayTotals, "date"> | null;
  };
};

// The 7 days, Monday to Sunday, of the week before the one `today` is in.
export function lastWeekDays(today: string): string[] {
  const start = addDaysToKey(mondayOf(today), -7);
  return Array.from({ length: 7 }, (_, index) => addDaysToKey(start, index));
}

// Whether to show last week's summary when the app opens: once per week,
// the first time it is opened from Monday on. `shownOn` is the day it was
// last shown (app_settings "weekly_report_shown"; older versions saved that
// week's Monday, which works the same).
export function shouldShowWeeklyReport(
  today: string,
  shownOn: string | null,
): boolean {
  return shownOn === null || mondayOf(shownOn) !== mondayOf(today);
}

// Days the summary stays in Settings after it popped up: that day and the
// next one, to open it again if it was closed too soon.
export const WEEKLY_REPORT_SETTINGS_DAYS = 2;

export function weeklyReportInSettings(
  today: string,
  shownOn: string | null,
): boolean {
  if (shownOn === null) return false;
  const lastDay = addDaysToKey(shownOn, WEEKLY_REPORT_SETTINGS_DAYS - 1);
  return today >= shownOn && today <= lastDay;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Body weight and what was eaten each day of a week, with the averages.
export function buildWeeklyReport(
  days: string[],
  weights: { date: string; weightKg: number }[],
  totals: DayTotals[],
): WeeklyReport {
  const weightOf = new Map(weights.map((entry) => [entry.date, entry.weightKg]));
  const totalsOf = new Map(totals.map((day) => [day.date, day]));
  const rows = days.map((date): WeeklyReportDay => {
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
  const mean = (pick: (food: Omit<DayTotals, "date">) => number) =>
    average(withFood.map(pick)) ?? 0;
  const weightAverage = average(withWeight);

  return {
    start: days[0],
    days: rows,
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

// Whether there is anything to show (a weight or a meal on any day).
export function hasWeeklyData(report: WeeklyReport): boolean {
  return report.days.some((day) => day.weightKg !== null || day.food !== null);
}

// "Seg 6/10".
export function weekDayLabel(date: string): string {
  const day = dateFromKey(date);
  return `${WEEKDAY_SHORT[day.getDay()]} ${formatShortDate(day.toISOString())}`;
}

// "6 a 12 de outubro" (or "29 de setembro a 5 de outubro").
export function formatWeekRange(start: string): string {
  const end = addDaysToKey(start, 6);
  const [startDay, startMonth] = formatDayMonth(start).split(" de ");
  const endText = formatDayMonth(end);
  return startMonth === endText.split(" de ")[1]
    ? `${startDay} a ${endText}`
    : `${formatDayMonth(start)} a ${endText}`;
}

// "gymlog-semana-2026-10-05.xlsx" (the Monday). The .gitignore relies on it.
export function weeklyReportFileName(start: string): string {
  return `gymlog-semana-${start}.xlsx`;
}

export function isWeeklyReportFileName(name: string): boolean {
  return /^gymlog-semana-\d{4}-\d{2}-\d{2}\.xlsx$/.test(name);
}

// Rows of the Excel sheet: a title, the header, one row per day, then the
// averages. Numbers stay numbers, so they can be used in formulas.
export function weeklyReportRows(report: WeeklyReport): Cell[][] {
  const header: Cell[] = [
    "Dia",
    "Data",
    "Peso (kg)",
    "Kcal",
    "Proteína (g)",
    "Carbos (g)",
    "Gordura (g)",
  ];
  const line = (
    label: string,
    date: string,
    weightKg: number | null,
    food: Omit<DayTotals, "date"> | null,
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
    [`Resumo da semana: ${formatWeekRange(report.start)}`],
    [],
    header,
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

// Rows of weeklyReportRows to show in bold: title, header and averages.
export const WEEKLY_REPORT_BOLD_ROWS = [0, 2, 10];
