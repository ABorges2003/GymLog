import {
  ROUTINE_NAME_MAX_LENGTH,
  sortRoutines,
  uniqueMuscleGroups,
  validateRoutineName,
} from "@/lib/routines";

describe("validateRoutineName", () => {
  const existing = [{ id: "1", name: "Pernas" }];

  it("accepts a new name", () => {
    expect(validateRoutineName("Push", existing)).toBeNull();
  });

  it("requires a name", () => {
    expect(validateRoutineName("   ", existing)).not.toBeNull();
  });

  it("limits the length", () => {
    const name = "x".repeat(ROUTINE_NAME_MAX_LENGTH + 1);
    expect(validateRoutineName(name, existing)).not.toBeNull();
  });

  it("rejects duplicates ignoring case and accents", () => {
    expect(validateRoutineName("PERNAS", existing)).toContain("Pernas");
  });

  it("allows keeping the same name when renaming", () => {
    expect(validateRoutineName("Pernas", existing, "1")).toBeNull();
  });
});

describe("sortRoutines", () => {
  it("puts the most recently done first and never-done ones last, by name", () => {
    const sorted = sortRoutines([
      { name: "Pull", lastDoneAt: "2026-10-01T18:00:00Z" },
      { name: "Pernas", lastDoneAt: null },
      { name: "Push", lastDoneAt: "2026-10-06T18:00:00Z" },
      { name: "Abdominal", lastDoneAt: null },
    ]);
    expect(sorted.map((routine) => routine.name)).toEqual([
      "Push",
      "Pull",
      "Abdominal",
      "Pernas",
    ]);
  });
});

describe("uniqueMuscleGroups", () => {
  it("removes repeats and keeps the first-appearance order", () => {
    expect(
      uniqueMuscleGroups(["chest", "chest", "shoulders", "chest", "triceps"]),
    ).toEqual(["chest", "shoulders", "triceps"]);
  });
});
