import {
  buildWeeklyReport,
  formatWeekRange,
  hasWeeklyData,
  isWeeklyReportFileName,
  lastWeekDays,
  shouldShowWeeklyReport,
  weekDayLabel,
  weeklyReportFileName,
  weeklyReportInSettings,
  weeklyReportRows,
} from "@/lib/weekly-report";

// 2026-10-12 is a Monday.
describe("which week", () => {
  it("is Monday to Sunday of the week before", () => {
    expect(lastWeekDays("2026-10-12")).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
    // Any day of this week gives the same week.
    expect(lastWeekDays("2026-10-16")[0]).toBe("2026-10-05");
  });

  it("is shown once a week, the first time the app opens from Monday on", () => {
    expect(shouldShowWeeklyReport("2026-10-12", null)).toBe(true);
    expect(shouldShowWeeklyReport("2026-10-12", "2026-10-05")).toBe(true);
    // Shown on Wednesday: not again that week, again the next one.
    expect(shouldShowWeeklyReport("2026-10-18", "2026-10-14")).toBe(false);
    expect(shouldShowWeeklyReport("2026-10-19", "2026-10-14")).toBe(true);
  });

  it("stays in Settings the day it popped up and the next one", () => {
    expect(weeklyReportInSettings("2026-10-14", "2026-10-14")).toBe(true);
    expect(weeklyReportInSettings("2026-10-15", "2026-10-14")).toBe(true);
    expect(weeklyReportInSettings("2026-10-16", "2026-10-14")).toBe(false);
    expect(weeklyReportInSettings("2026-10-14", null)).toBe(false);
  });
});

describe("buildWeeklyReport", () => {
  const days = lastWeekDays("2026-10-12");
  const report = buildWeeklyReport(
    days,
    [
      { date: "2026-10-05", weightKg: 72.4 },
      { date: "2026-10-07", weightKg: 72.8 },
    ],
    [
      { date: "2026-10-05", kcal: 2850.4, proteinG: 180.04, carbsG: 350, fatG: 80 },
      { date: "2026-10-06", kcal: 3050, proteinG: 200, carbsG: 390, fatG: 90 },
    ],
  );

  it("has every day, with what is known", () => {
    expect(report.days).toHaveLength(7);
    expect(report.days[0]).toEqual({
      date: "2026-10-05",
      weightKg: 72.4,
      food: { kcal: 2850, proteinG: 180, carbsG: 350, fatG: 80 },
    });
    expect(report.days[2]).toEqual({
      date: "2026-10-07",
      weightKg: 72.8,
      food: null,
    });
  });

  it("averages only the days with a value", () => {
    expect(report.average).toEqual({
      weightKg: 72.6,
      food: { kcal: 2950, proteinG: 190, carbsG: 370, fatG: 85 },
    });
    expect(hasWeeklyData(report)).toBe(true);
  });

  it("knows when the week is empty", () => {
    const empty = buildWeeklyReport(days, [], []);
    expect(empty.average).toEqual({ weightKg: null, food: null });
    expect(hasWeeklyData(empty)).toBe(false);
  });

  it("gives the sheet a title, a header, the days and the averages", () => {
    const rows = weeklyReportRows(report);
    expect(rows[0]).toEqual(["Resumo da semana: 5 a 11 de outubro"]);
    expect(rows[2][0]).toBe("Dia");
    expect(rows[3]).toEqual(["Seg", "2026-10-05", 72.4, 2850, 180, 350, 80]);
    expect(rows[5]).toEqual(["Qua", "2026-10-07", 72.8, null, null, null, null]);
    expect(rows[10]).toEqual(["Média", "", 72.6, 2950, 190, 370, 85]);
  });
});

describe("labels and file names", () => {
  it("writes the days and the week", () => {
    expect(weekDayLabel("2026-10-05")).toBe("Seg 5/10");
    expect(formatWeekRange("2026-10-05")).toBe("5 a 11 de outubro");
    expect(formatWeekRange("2026-09-28")).toBe(
      "28 de setembro a 4 de outubro",
    );
  });

  it("names the Excel file after the Monday", () => {
    expect(weeklyReportFileName("2026-10-05")).toBe(
      "gymlog-semana-2026-10-05.xlsx",
    );
    expect(isWeeklyReportFileName("gymlog-semana-2026-10-05.xlsx")).toBe(true);
    expect(isWeeklyReportFileName("gymlog-backup-2026-10-05.json")).toBe(false);
  });
});
