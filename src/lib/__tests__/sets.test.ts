import {
  DEFAULT_SETS,
  MAX_SETS_PER_EXERCISE,
  formatReps,
  formatSetValues,
  formatWeight,
  normalizeSet,
  parseReps,
  parseWeight,
  setTypeHasReps,
  validateSetCount,
} from "@/lib/sets";

describe("validateSetCount", () => {
  it("accepts the default structure", () => {
    expect(validateSetCount(DEFAULT_SETS)).toBeNull();
  });

  it("requires at least one set", () => {
    expect(validateSetCount([])).not.toBeNull();
  });

  it("limits the number of sets", () => {
    expect(
      validateSetCount(Array(MAX_SETS_PER_EXERCISE + 1).fill(DEFAULT_SETS[0])),
    ).not.toBeNull();
  });
});

describe("DEFAULT_SETS", () => {
  it("is W, F, F, T, B without values", () => {
    expect(DEFAULT_SETS.map((set) => set.setType)).toEqual([
      "warmup",
      "feeder",
      "feeder",
      "top",
      "backoff",
    ]);
    expect(
      DEFAULT_SETS.every((s) => s.reps === null && s.weightKg === null),
    ).toBe(true);
  });
});

describe("parseReps", () => {
  it("reads whole numbers and allows empty", () => {
    expect(parseReps("8")).toEqual({ ok: true, value: 8 });
    expect(parseReps(" 12 ")).toEqual({ ok: true, value: 12 });
    expect(parseReps("")).toEqual({ ok: true, value: null });
  });

  it("accepts half reps with a comma or a dot", () => {
    expect(parseReps("4,5")).toEqual({ ok: true, value: 4.5 });
    expect(parseReps("4.5")).toEqual({ ok: true, value: 4.5 });
    expect(parseReps("6,0")).toEqual({ ok: true, value: 6 });
  });

  it("rejects zero, other fractions and text", () => {
    expect(parseReps("0").ok).toBe(false);
    expect(parseReps("0,5").ok).toBe(false);
    expect(parseReps("5,3").ok).toBe(false);
    expect(parseReps("5,25").ok).toBe(false);
    expect(parseReps("abc").ok).toBe(false);
    expect(parseReps("101").ok).toBe(false);
  });
});

describe("parseWeight", () => {
  it("accepts a comma or a dot as decimal separator", () => {
    expect(parseWeight("102,5")).toEqual({ ok: true, value: 102.5 });
    expect(parseWeight("102.5")).toEqual({ ok: true, value: 102.5 });
    expect(parseWeight("1,25")).toEqual({ ok: true, value: 1.25 });
  });

  it("allows empty and zero (bodyweight)", () => {
    expect(parseWeight("")).toEqual({ ok: true, value: null });
    expect(parseWeight("0")).toEqual({ ok: true, value: 0 });
  });

  it("rejects text, negatives and too many decimals", () => {
    expect(parseWeight("abc").ok).toBe(false);
    expect(parseWeight("-5").ok).toBe(false);
    expect(parseWeight("10,125").ok).toBe(false);
    expect(parseWeight("1001").ok).toBe(false);
  });
});

describe("formatWeight", () => {
  it("uses a decimal comma and drops trailing zeros", () => {
    expect(formatWeight(100)).toBe("100");
    expect(formatWeight(102.5)).toBe("102,5");
    expect(formatWeight(1.25)).toBe("1,25");
  });
});

describe("formatReps", () => {
  it("uses a decimal comma for half reps", () => {
    expect(formatReps(6)).toBe("6");
    expect(formatReps(4.5)).toBe("4,5");
  });
});

describe("setTypeHasReps", () => {
  it("is true only for top sets and back-offs", () => {
    expect(setTypeHasReps("top")).toBe(true);
    expect(setTypeHasReps("backoff")).toBe(true);
    expect(setTypeHasReps("warmup")).toBe(false);
    expect(setTypeHasReps("feeder")).toBe(false);
  });
});

describe("formatSetValues", () => {
  it("shows weight first, then reps", () => {
    const set = {
      setType: "top" as const,
      reps: 6,
      weightKg: 102.5,
      toFailure: false,
    };
    expect(formatSetValues(set)).toBe("102,5 kg × 6");
    expect(formatSetValues({ ...set, reps: 4.5 })).toBe("102,5 kg × 4,5");
    expect(formatSetValues({ ...set, reps: null })).toBe("102,5 kg");
    expect(formatSetValues({ ...set, weightKg: null })).toBe("6 reps");
    expect(formatSetValues({ ...set, reps: null, weightKg: null })).toBe("");
  });

  it("never shows reps for warm-ups and feeders", () => {
    expect(
      formatSetValues({
        setType: "feeder",
        reps: 3,
        weightKg: 70,
        toFailure: false,
      }),
    ).toBe("70 kg");
    expect(
      formatSetValues({
        setType: "warmup",
        reps: 15,
        weightKg: null,
        toFailure: false,
      }),
    ).toBe("");
  });
});

describe("back-offs to failure", () => {
  it("are shown as falha", () => {
    expect(
      formatSetValues({
        setType: "backoff",
        reps: null,
        weightKg: 85,
        toFailure: true,
      }),
    ).toBe("85 kg × falha");
    expect(
      formatSetValues({
        setType: "backoff",
        reps: null,
        weightKg: null,
        toFailure: true,
      }),
    ).toBe("até à falha");
  });

  it("only exist for back-offs, and have no reps", () => {
    expect(
      normalizeSet({ setType: "top", reps: 6, weightKg: 100, toFailure: true }),
    ).toEqual({ setType: "top", reps: 6, weightKg: 100, toFailure: false });
    expect(
      normalizeSet({
        setType: "backoff",
        reps: 8,
        weightKg: 85,
        toFailure: true,
      }),
    ).toEqual({
      setType: "backoff",
      reps: null,
      weightKg: 85,
      toFailure: true,
    });
  });
});
