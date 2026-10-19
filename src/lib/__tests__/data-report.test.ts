import {
  MAX_REPORT_DAYS,
  buildDataReport,
  daysBetween,
  formatDateRange,
  hasReportData,
  isReportFileName,
  lastDaysRange,
  lastWeekRange,
  reportBoldRows,
  reportFileName,
  reportRows,
} from "@/lib/data-report";

// 2026-10-19 is a Monday.
describe("dates to export", () => {
  it("lists every day between two dates, in order", () => {
    expect(daysBetween("2026-10-05", "2026-10-07")).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
    ]);
    expect(daysBetween("2026-10-07", "2026-10-05")).toHaveLength(3);
    expect(daysBetween("2026-10-05", "2026-10-05")).toEqual(["2026-10-05"]);
    expect(daysBetween("2000-01-01", "2026-10-19")).toHaveLength(
      MAX_REPORT_DAYS,
    );
  });

  it("offers last week and the last days", () => {
    expect(lastWeekRange("2026-10-19")).toEqual({
      from: "2026-10-12",
      to: "2026-10-18",
    });
    expect(lastWeekRange("2026-10-23")).toEqual({
      from: "2026-10-12",
      to: "2026-10-18",
    });
    expect(lastDaysRange("2026-10-19", 30)).toEqual({
      from: "2026-09-20",
      to: "2026-10-19",
    });
  });
});

describe("buildDataReport", () => {
  const days = daysBetween("2026-10-12", "2026-10-18");
  const report = buildDataReport(
    days,
    [
      { date: "2026-10-12", weightKg: 72.4 },
      { date: "2026-10-14", weightKg: 72.8 },
    ],
    [
      { date: "2026-10-12", kcal: 2850.4, proteinG: 180.04, carbsG: 350, fatG: 80 },
      { date: "2026-10-13", kcal: 3050, proteinG: 200, carbsG: 390, fatG: 90 },
    ],
  );

  it("has every day, with what is known, and the counts", () => {
    expect(report.from).toBe("2026-10-12");
    expect(report.to).toBe("2026-10-18");
    expect(report.days).toHaveLength(7);
    expect(report.days[0]).toEqual({
      date: "2026-10-12",
      weightKg: 72.4,
      food: { kcal: 2850, proteinG: 180, carbsG: 350, fatG: 80 },
    });
    expect(report.days[2]).toEqual({
      date: "2026-10-14",
      weightKg: 72.8,
      food: null,
    });
    expect(report.weighIns).toBe(2);
    expect(report.foodDays).toBe(2);
  });

  it("averages only the days with a value", () => {
    expect(report.average).toEqual({
      weightKg: 72.6,
      food: { kcal: 2950, proteinG: 190, carbsG: 370, fatG: 85 },
    });
    expect(hasReportData(report)).toBe(true);
  });

  it("knows when there is nothing", () => {
    const empty = buildDataReport(days, [], []);
    expect(empty.average).toEqual({ weightKg: null, food: null });
    expect(hasReportData(empty)).toBe(false);
  });

  it("gives the sheet a title, a header, the days and the averages", () => {
    const rows = reportRows(report);
    expect(rows[0]).toEqual(["Peso e dieta: 12 a 18 de outubro de 2026"]);
    expect(rows[2][0]).toBe("Dia");
    expect(rows[3]).toEqual(["Seg", "2026-10-12", 72.4, 2850, 180, 350, 80]);
    expect(rows[5]).toEqual(["Qua", "2026-10-14", 72.8, null, null, null, null]);
    expect(rows[10]).toEqual(["Média", "", 72.6, 2950, 190, 370, 85]);
    expect(reportBoldRows(report)).toEqual([0, 2, 10]);
  });
});

describe("labels and file names", () => {
  it("writes date ranges", () => {
    expect(formatDateRange("2026-10-12", "2026-10-18")).toBe(
      "12 a 18 de outubro de 2026",
    );
    expect(formatDateRange("2026-09-28", "2026-10-04")).toBe(
      "28 de setembro a 4 de outubro de 2026",
    );
    expect(formatDateRange("2026-12-28", "2027-01-03")).toBe(
      "28 de dezembro de 2026 a 3 de janeiro de 2027",
    );
    expect(formatDateRange("2026-10-12", "2026-10-12")).toBe(
      "12 de outubro de 2026",
    );
  });

  it("names the Excel file after the dates", () => {
    const name = reportFileName({ from: "2026-10-12", to: "2026-10-18" });
    expect(name).toBe("gymlog-dados-2026-10-12_2026-10-18.xlsx");
    expect(isReportFileName(name)).toBe(true);
    // Weekly files from the previous version are cleaned up too.
    expect(isReportFileName("gymlog-semana-2026-10-05.xlsx")).toBe(true);
    expect(isReportFileName("gymlog-backup-2026-10-05.json")).toBe(false);
  });
});
