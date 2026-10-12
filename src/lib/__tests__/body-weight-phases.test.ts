import {
  autoFormatDateText,
  formatDateText,
  formatPhaseDates,
  parseDateText,
  phaseEntries,
  phaseStatus,
  summarizePhase,
  validatePhase,
  type PhaseInput,
} from "@/lib/body-weight-phases";

// Local noon, so the day never shifts with the time zone.
const day = (key: string) => {
  const [year, month, date] = key.split("-").map(Number);
  return new Date(year, month - 1, date, 12);
};

const bulk: PhaseInput = {
  name: "Bulk inverno",
  startDate: "2026-10-01",
  endDate: "2026-12-23",
};

describe("date text", () => {
  it("reads typed dates", () => {
    expect(parseDateText("15/10/2026")).toBe("2026-10-15");
    expect(parseDateText(" 5/3/2026 ")).toBe("2026-03-05");
  });

  it("rejects dates that do not exist", () => {
    expect(parseDateText("31/02/2026")).toBeNull();
    expect(parseDateText("15/13/2026")).toBeNull();
    expect(parseDateText("15-10-2026")).toBeNull();
    expect(parseDateText("")).toBeNull();
  });

  it("writes and auto-formats dates", () => {
    expect(formatDateText("2026-10-15")).toBe("15/10/2026");
    expect(autoFormatDateText("1")).toBe("1");
    expect(autoFormatDateText("1510")).toBe("15/10");
    expect(autoFormatDateText("15102026")).toBe("15/10/2026");
    expect(autoFormatDateText("15/10/20269")).toBe("15/10/2026");
  });
});

describe("validatePhase", () => {
  it("accepts a phase with or without an end", () => {
    expect(
      validatePhase({ name: " Cut ", startText: "01/06/2026", endText: "" }),
    ).toEqual({
      ok: true,
      phase: { name: "Cut", startDate: "2026-06-01", endDate: null },
    });
  });

  it("explains what is wrong", () => {
    const result = validatePhase({
      name: "",
      startText: "10/10/2026",
      endText: "01/10/2026",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.name).toBeDefined();
    expect(result.errors.startDate).toBeUndefined();
    expect(result.errors.endDate).toMatch(/depois do início/);
  });
});

describe("phaseStatus and dates", () => {
  it("knows whether a phase has started or ended", () => {
    expect(phaseStatus(bulk, day("2026-09-30"))).toBe("upcoming");
    expect(phaseStatus(bulk, day("2026-12-23"))).toBe("ongoing");
    expect(phaseStatus(bulk, day("2026-12-24"))).toBe("finished");
    expect(phaseStatus({ ...bulk, endDate: null }, day("2030-01-01"))).toBe(
      "ongoing",
    );
  });

  it("shows the dates", () => {
    expect(formatPhaseDates(bulk)).toBe("01/10/2026 – 23/12/2026");
    expect(formatPhaseDates({ ...bulk, endDate: null })).toBe(
      "01/10/2026 – em curso",
    );
  });
});

describe("summarizePhase", () => {
  const entries = [
    { date: "2026-09-30", weightKg: 70 }, // before the phase
    { date: "2026-10-01", weightKg: 72 },
    { date: "2026-10-08", weightKg: 72.4 },
    { date: "2026-10-15", weightKg: 72.6 },
    { date: "2026-10-29", weightKg: 73.4 },
  ];

  it("only uses the entries inside the phase", () => {
    expect(
      phaseEntries(entries, bulk, day("2026-10-29")).map((e) => e.date),
    ).toEqual(["2026-10-01", "2026-10-08", "2026-10-15", "2026-10-29"]);
  });

  it("works out the change, the weekly rate and the progress", () => {
    expect(summarizePhase(entries, bulk, day("2026-10-29"))).toEqual({
      daysDone: 29,
      totalDays: 84,
      entryCount: 4,
      firstKg: 72,
      firstDate: "2026-10-01",
      lastKg: 73.4,
      changeKg: 1.4,
      minKg: 72,
      maxKg: 73.4,
      // 1,4 kg in 4 weeks.
      weeklyKg: 0.35,
      weeklyPercent: 0.49,
    });
  });

  it("has no weights without entries", () => {
    const summary = summarizePhase([], bulk, day("2026-10-05"));
    expect(summary.daysDone).toBe(5);
    expect(summary.firstKg).toBeNull();
    expect(summary.lastKg).toBeNull();
    expect(summary.weeklyKg).toBeNull();
  });

  it("starts from the latest weight shortly before the first day", () => {
    const phase = { ...bulk, startDate: "2026-10-02" };
    // Just created, nothing logged inside yet: the start is already known.
    const created = summarizePhase(entries, phase, day("2026-10-02"));
    expect(created).toMatchObject({
      firstKg: 72,
      firstDate: "2026-10-01",
      lastKg: null,
      changeKg: null,
      entryCount: 0,
    });
    // Later, the change counts from that weight.
    const later = summarizePhase(entries, phase, day("2026-10-29"));
    expect(later).toMatchObject({ firstKg: 72, lastKg: 73.4, changeKg: 1.4 });
  });

  it("does not look further back than two weeks", () => {
    const phase = { ...bulk, startDate: "2026-10-20" };
    const summary = summarizePhase(
      [{ date: "2026-10-01", weightKg: 72 }],
      phase,
      day("2026-10-20"),
    );
    expect(summary.firstKg).toBeNull();
  });
});
