import {
  goalStatus,
  parseBodyWeight,
  summarizeBodyWeight,
  withMovingAverage,
} from "@/lib/body-weight";

describe("parseBodyWeight", () => {
  it("reads a decimal comma or dot", () => {
    expect(parseBodyWeight("78,4")).toBe(78.4);
    expect(parseBodyWeight(" 80.25 ")).toBe(80.25);
  });

  it("rejects empty, zero, text and impossible values", () => {
    expect(parseBodyWeight("")).toBeNull();
    expect(parseBodyWeight("0")).toBeNull();
    expect(parseBodyWeight("abc")).toBeNull();
    expect(parseBodyWeight("401")).toBeNull();
  });
});

describe("withMovingAverage", () => {
  it("averages the last 7 calendar days, oldest first", () => {
    const points = withMovingAverage([
      { date: "2026-10-03", weightKg: 80 },
      { date: "2026-10-01", weightKg: 82 },
      { date: "2026-10-02", weightKg: 81 },
    ]);
    expect(points.map((p) => [p.date, p.average])).toEqual([
      ["2026-10-01", 82],
      ["2026-10-02", 81.5],
      ["2026-10-03", 81],
    ]);
  });

  it("drops entries older than the window and skips missing days", () => {
    const points = withMovingAverage([
      { date: "2026-09-25", weightKg: 90 }, // 8 days before the last one
      { date: "2026-09-28", weightKg: 80 },
      { date: "2026-10-03", weightKg: 78 },
    ]);
    expect(points.at(-1)?.average).toBe(79);
  });
});

describe("summarizeBodyWeight", () => {
  it("is null without entries", () => {
    expect(summarizeBodyWeight([])).toBeNull();
  });

  it("shows the latest weight, average and weekly change of the average", () => {
    const points = withMovingAverage([
      { date: "2026-09-26", weightKg: 80 },
      { date: "2026-10-03", weightKg: 79 },
    ]);
    expect(summarizeBodyWeight(points)).toEqual({
      latest: { date: "2026-10-03", weightKg: 79 },
      average: 79,
      weeklyChange: -1,
    });
  });

  it("has no weekly change without data from a week before", () => {
    const points = withMovingAverage([
      { date: "2026-10-01", weightKg: 80 },
      { date: "2026-10-03", weightKg: 79 },
    ]);
    expect(summarizeBodyWeight(points)?.weeklyChange).toBeNull();
  });
});

describe("goalStatus", () => {
  it("says how much is left to lose or gain", () => {
    expect(goalStatus(78.4, 75)).toEqual({ kind: "lose", remainingKg: 3.4 });
    expect(goalStatus(70, 72.5)).toEqual({ kind: "gain", remainingKg: 2.5 });
  });

  it("is reached at the goal", () => {
    expect(goalStatus(75.02, 75)).toEqual({ kind: "reached" });
  });
});
