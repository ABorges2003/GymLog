import {
  EXERCISE_NAME_MAX_LENGTH,
  filterExercises,
  groupExercisesByMuscleGroup,
  hasErrors,
  normalizeForSearch,
  validateExerciseInput,
} from "@/lib/exercises";
import type { Exercise } from "@/types/exercise";

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: "id",
    name: "Exercise",
    muscleGroup: "chest",
    equipment: null,
    isArchived: false,
    isFavorite: false,
    ...overrides,
  };
}

const benchPress = makeExercise({
  id: "1",
  name: "Supino Plano com Barra",
  muscleGroup: "chest",
  equipment: "barbell",
});
const dumbbellPress = makeExercise({
  id: "2",
  name: "Supino Inclinado com Halteres",
  muscleGroup: "chest",
  equipment: "dumbbell",
  isFavorite: true,
});
const pulldown = makeExercise({
  id: "3",
  name: "Puxada à Frente",
  muscleGroup: "back",
  equipment: "cable",
});
const bicepsCurl = makeExercise({
  id: "4",
  name: "Curl Martelo",
  muscleGroup: "biceps",
  equipment: "dumbbell",
});
const all = [pulldown, bicepsCurl, benchPress, dumbbellPress];

describe("normalizeForSearch", () => {
  it("removes accents, lowercases and trims", () => {
    expect(normalizeForSearch("  Bíceps ÁBDUÇÃO ")).toBe("biceps abducao");
  });
});

describe("groupExercisesByMuscleGroup", () => {
  it("puts favorites first, then muscle groups in the defined order", () => {
    const sections = groupExercisesByMuscleGroup(all);
    expect(sections.map((section) => section.key)).toEqual([
      "favorites",
      "chest",
      "back",
      "biceps",
    ]);
  });

  it("keeps favorites in their muscle group too", () => {
    const chest = groupExercisesByMuscleGroup(all).find(
      (section) => section.key === "chest",
    );
    expect(chest?.data).toContain(dumbbellPress);
  });

  it("sorts names alphabetically inside each group", () => {
    const chest = groupExercisesByMuscleGroup(all).find(
      (section) => section.key === "chest",
    );
    expect(chest?.data.map((exercise) => exercise.name)).toEqual([
      "Supino Inclinado com Halteres",
      "Supino Plano com Barra",
    ]);
  });

  it("uses Portuguese labels as titles", () => {
    const titles = groupExercisesByMuscleGroup(all).map((s) => s.title);
    expect(titles).toEqual(["Favoritos", "Peito", "Costas", "Bíceps"]);
  });

  it("leaves out empty sections", () => {
    expect(groupExercisesByMuscleGroup([pulldown])).toHaveLength(1);
    expect(groupExercisesByMuscleGroup([])).toEqual([]);
  });
});

describe("filterExercises", () => {
  const noFilter = { query: "", muscleGroups: [] };

  it("returns everything with an empty filter", () => {
    expect(filterExercises(all, noFilter)).toHaveLength(all.length);
  });

  it("ignores case and accents", () => {
    expect(filterExercises(all, { ...noFilter, query: "PUXADA A" })).toEqual([
      pulldown,
    ]);
  });

  it("matches every word in any order", () => {
    expect(
      filterExercises(all, { ...noFilter, query: "halteres supino" }),
    ).toEqual([dumbbellPress]);
  });

  it("searches muscle group and equipment labels", () => {
    expect(filterExercises(all, { ...noFilter, query: "biceps" })).toEqual([
      bicepsCurl,
    ]);
    expect(filterExercises(all, { ...noFilter, query: "polia" })).toEqual([
      pulldown,
    ]);
  });

  it("filters by muscle group", () => {
    expect(filterExercises(all, { query: "", muscleGroups: ["back"] })).toEqual(
      [pulldown],
    );
  });

  it("filters by several muscle groups at once", () => {
    expect(
      filterExercises(all, { query: "", muscleGroups: ["back", "biceps"] }),
    ).toEqual([pulldown, bicepsCurl]);
  });

  it("combines query and muscle group", () => {
    expect(
      filterExercises(all, { query: "halteres", muscleGroups: ["chest"] }),
    ).toEqual([dumbbellPress]);
  });
});

describe("validateExerciseInput", () => {
  const existing = [
    { id: "1", name: "Agachamento Búlgaro", isArchived: false },
    { id: "2", name: "Peso Morto", isArchived: true },
  ];
  const valid = {
    name: "Remada Baixa",
    muscleGroup: "back",
    equipment: null,
  } as const;

  it("accepts a valid exercise", () => {
    expect(hasErrors(validateExerciseInput(valid, existing))).toBe(false);
  });

  it("requires a name and a muscle group", () => {
    const errors = validateExerciseInput(
      { name: "   ", muscleGroup: null, equipment: null },
      existing,
    );
    expect(errors.name).toBeDefined();
    expect(errors.muscleGroup).toBeDefined();
  });

  it("limits the name length", () => {
    const name = "x".repeat(EXERCISE_NAME_MAX_LENGTH + 1);
    expect(
      validateExerciseInput({ ...valid, name }, existing).name,
    ).toBeDefined();
  });

  it("rejects duplicate names ignoring case and accents", () => {
    const errors = validateExerciseInput(
      { ...valid, name: "agachamento bulgaro" },
      existing,
    );
    expect(errors.name).toContain("Agachamento Búlgaro");
  });

  it("mentions when the duplicate is archived", () => {
    const errors = validateExerciseInput(
      { ...valid, name: "peso morto" },
      existing,
    );
    expect(errors.name).toContain("arquivado");
  });

  it("allows keeping the same name when editing", () => {
    const errors = validateExerciseInput(
      { ...valid, name: "Agachamento Búlgaro" },
      existing,
      "1",
    );
    expect(hasErrors(errors)).toBe(false);
  });
});
