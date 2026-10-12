import { STARTER_PACK } from "@/data/starter-pack";
import { createFood, getFoods } from "@/db/repositories/diet";
import { createExercise, getExercises } from "@/db/repositories/exercises";
import {
  importStarterPack,
  previewStarterPack,
} from "@/db/repositories/starter";
import { MAX_GRAMS, MAX_UNITS } from "@/lib/diet";
import { listNames, type StarterPack } from "@/lib/starter";
import { createTestDatabase } from "@/test-utils/sqlite";
import { EQUIPMENT, MUSCLE_GROUPS } from "@/types/exercise";

// expo-crypto is a native module; use Node's UUIDs in tests.
jest.mock("expo-crypto", () => ({
  randomUUID: () => require("node:crypto").randomUUID(),
}));

const oats = {
  name: "Aveia",
  basis: "grams" as const,
  basisAmount: 100,
  kcal: 380,
  proteinG: 13,
  carbsG: 67,
  fatG: 7,
};

const pack: StarterPack = {
  exercises: [
    { name: "Supino Plano", muscleGroup: "chest", equipment: "barbell" },
    { name: "Remada", muscleGroup: "back", equipment: null },
  ],
  foods: [oats],
};

describe("example exercises and foods", () => {
  it("adds only what is missing and keeps what the user has", async () => {
    const db = await createTestDatabase();
    // The user already has one, written differently and with other details.
    await createExercise(db, {
      name: "supino plano",
      muscleGroup: "shoulders",
      equipment: null,
    });

    expect(await previewStarterPack(db, pack)).toMatchObject({
      newExercises: [{ name: "Remada" }],
      newFoods: [{ name: "Aveia" }],
      existingExercises: ["Supino Plano"],
      existingFoods: [],
    });

    await importStarterPack(db, pack);
    const exercises = await getExercises(db);
    expect(exercises.map((e) => e.name).sort()).toEqual([
      "Remada",
      "supino plano",
    ]);
    // The user's exercise is not changed.
    expect(exercises.find((e) => e.name === "supino plano")).toMatchObject({
      muscleGroup: "shoulders",
      equipment: null,
    });
    expect(await getFoods(db)).toEqual([
      expect.objectContaining({ ...oats, isArchived: false }),
    ]);

    // Adding them again adds nothing.
    const again = await importStarterPack(db, pack);
    expect(again.newExercises).toEqual([]);
    expect(again.newFoods).toEqual([]);
    expect(await getExercises(db)).toHaveLength(2);
  });

  it("never touches a food the user already has", async () => {
    const db = await createTestDatabase();
    await createFood(db, { ...oats, name: "AVEIA", kcal: 999 });
    await importStarterPack(db, pack);
    expect(await getFoods(db)).toEqual([
      expect.objectContaining({ name: "AVEIA", kcal: 999 }),
    ]);
  });

  it("lists a few names", () => {
    expect(listNames(["A", "B"])).toBe("A, B");
    expect(listNames(["A", "B", "C", "D", "E"])).toBe("A, B, C e mais 2");
  });
});

describe("STARTER_PACK built into the app", () => {
  it("has only valid exercises and foods, without repeated names", () => {
    for (const exercise of STARTER_PACK.exercises) {
      expect(exercise.name.trim()).not.toBe("");
      expect(MUSCLE_GROUPS).toContain(exercise.muscleGroup);
      if (exercise.equipment !== null) {
        expect(EQUIPMENT).toContain(exercise.equipment);
      }
    }
    for (const food of STARTER_PACK.foods) {
      expect(food.name.trim()).not.toBe("");
      expect(["grams", "ml", "unit"]).toContain(food.basis);
      expect(food.basisAmount).toBeGreaterThan(0);
      expect(food.basisAmount).toBeLessThanOrEqual(
        food.basis === "unit" ? MAX_UNITS : MAX_GRAMS,
      );
      for (const value of [food.kcal, food.proteinG, food.carbsG, food.fatG]) {
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
    const names = (items: { name: string }[]) =>
      new Set(items.map((item) => item.name.toLowerCase())).size;
    expect(names(STARTER_PACK.exercises)).toBe(STARTER_PACK.exercises.length);
    expect(names(STARTER_PACK.foods)).toBe(STARTER_PACK.foods.length);
  });

  it("can be added to an empty app", async () => {
    const db = await createTestDatabase();
    await importStarterPack(db, STARTER_PACK);
    expect(await getExercises(db)).toHaveLength(STARTER_PACK.exercises.length);
    expect(await getFoods(db)).toHaveLength(STARTER_PACK.foods.length);
  });
});
