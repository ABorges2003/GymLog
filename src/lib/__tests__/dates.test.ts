import {
  addDaysToKey,
  formatClockTime,
  formatDayLabel,
  formatLongDate,
  formatShortDate,
  toDateKey,
  formatElapsed,
} from "@/lib/dates";

describe("formatLongDate", () => {
  const today = new Date(2026, 9, 4);

  it("shows weekday, day and month in Portuguese", () => {
    const date = new Date(2026, 9, 4, 18, 30);
    expect(formatLongDate(date.toISOString(), today)).toBe(
      "Domingo, 4 de outubro",
    );
  });

  it("adds the year when it is not the current one", () => {
    const date = new Date(2025, 11, 31, 10, 0);
    expect(formatLongDate(date.toISOString(), today)).toBe(
      "Quarta-feira, 31 de dezembro de 2025",
    );
  });
});

describe("formatClockTime", () => {
  it("shows local hours and minutes", () => {
    expect(formatClockTime(new Date(2026, 9, 4, 8, 5).toISOString())).toBe(
      "08:05",
    );
  });
});

describe("formatShortDate", () => {
  it("shows day/month", () => {
    expect(formatShortDate(new Date(2026, 9, 4, 18, 0).toISOString())).toBe(
      "4/10",
    );
  });
});

describe("date keys", () => {
  const today = new Date(2026, 9, 5, 12, 0);

  it("converts and moves local days", () => {
    expect(toDateKey(new Date(2026, 9, 5, 23, 59))).toBe("2026-10-05");
    expect(addDaysToKey("2026-10-01", -1)).toBe("2026-09-30");
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("labels today, yesterday and other days", () => {
    expect(formatDayLabel("2026-10-05", today)).toBe("Hoje");
    expect(formatDayLabel("2026-10-04", today)).toBe("Ontem");
    expect(formatDayLabel("2026-10-03", today)).toBe("Sábado, 3 de outubro");
  });
});

describe("formatElapsed", () => {
  const start = "2026-10-10T17:00:00.000Z";
  const at = (iso: string) => new Date(iso);

  it("shows minutes and seconds under an hour", () => {
    expect(formatElapsed(start, at("2026-10-10T17:00:07.900Z"))).toBe("0:07");
    expect(formatElapsed(start, at("2026-10-10T17:42:13.000Z"))).toBe("42:13");
  });

  it("adds the hours after an hour", () => {
    expect(formatElapsed(start, at("2026-10-10T18:05:09.000Z"))).toBe(
      "1:05:09",
    );
  });

  it("never goes below zero", () => {
    expect(formatElapsed(start, at("2026-10-10T16:59:00.000Z"))).toBe("0:00");
  });
});
