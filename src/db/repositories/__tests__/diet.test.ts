import type { SQLiteDatabase } from "expo-sqlite";

import {
  addFoodEntry,
  createFood,
  deleteFoodEntry,
  getDayEntries,
  getDietGoals,
  getFoodById,
  getFoods,
  removeFood,
  setDietGoals,
  updateFood,
} from "@/db/repositories/diet";
import { createTestDatabase } from "@/test-utils/sqlite";
import type { Food } from "@/types/diet";

// expo-crypto is a native module; use Node's UUIDs in tests.
jest.mock("expo-crypto", () => ({
  randomUUID: () => require("node:crypto").randomUUID(),
}));

let db: SQLiteDatabase;
let oats: Food;

beforeEach(async () => {
  db = await createTestDatabase();
  const id = await createFood(db, {
    name: "Aveia",
    basis: "grams",
    basisAmount: 100,
    kcal: 380,
    proteinG: 13,
    carbsG: 67,
    fatG: 7,
  });
  oats = (await getFoodById(db, id))!;
});

describe("diet repository", () => {
  it("logs a food with its values worked out for the amount", async () => {
    await addFoodEntry(db, {
      date: "2026-10-07",
      meal: "breakfast",
      food: oats,
      amount: 80,
    });

    expect(await getDayEntries(db, "2026-10-07")).toEqual([
      expect.objectContaining({
        meal: "breakfast",
        foodName: "Aveia",
        basis: "grams",
        amount: 80,
        kcal: 304,
        proteinG: 10.4,
        carbsG: 53.6,
        fatG: 5.6,
      }),
    ]);
    expect(await getDayEntries(db, "2026-10-08")).toEqual([]);
  });

  it("keeps past days' values when a food is edited", async () => {
    await addFoodEntry(db, {
      date: "2026-10-07",
      meal: "lunch",
      food: oats,
      amount: 100,
    });
    await updateFood(db, oats.id, { ...oats, kcal: 400 });

    const [entry] = await getDayEntries(db, "2026-10-07");
    expect(entry.kcal).toBe(380);
  });

  it("deletes an entry", async () => {
    await addFoodEntry(db, {
      date: "2026-10-07",
      meal: "supper",
      food: oats,
      amount: 50,
    });
    const [entry] = await getDayEntries(db, "2026-10-07");
    await deleteFoodEntry(db, entry.id);
    expect(await getDayEntries(db, "2026-10-07")).toEqual([]);
  });

  it("deletes an unused food but archives a logged one", async () => {
    const id = await createFood(db, {
      name: "Ovo",
      basis: "unit",
      basisAmount: 1,
      kcal: 70,
      proteinG: 6,
      carbsG: 0.5,
      fatG: 5,
    });
    expect(await removeFood(db, id)).toBe("deleted");

    await addFoodEntry(db, {
      date: "2026-10-07",
      meal: "dinner",
      food: oats,
      amount: 60,
    });
    expect(await removeFood(db, oats.id)).toBe("archived");
    expect(await getFoods(db)).toEqual([]);
    // The logged day still shows the food.
    expect((await getDayEntries(db, "2026-10-07"))[0].foodName).toBe("Aveia");
  });

  it("saves and logs foods measured in ml", async () => {
    const id = await createFood(db, {
      name: "Leite",
      basis: "ml",
      basisAmount: 100,
      kcal: 47,
      proteinG: 3.3,
      carbsG: 4.9,
      fatG: 1.6,
    });
    const milk = (await getFoodById(db, id))!;
    expect(milk).toMatchObject({ basis: "ml", basisAmount: 100 });

    await addFoodEntry(db, {
      date: "2026-10-07",
      meal: "breakfast",
      food: milk,
      amount: 250,
    });
    expect((await getDayEntries(db, "2026-10-07"))[0]).toMatchObject({
      basis: "ml",
      amount: 250,
      kcal: 118,
      proteinG: 8.3,
    });

    // Switching it back to grams.
    await updateFood(db, id, { ...milk, basis: "grams" });
    expect((await getFoodById(db, id))?.basis).toBe("grams");
  });

  it("saves the daily goals", async () => {
    expect(await getDietGoals(db)).toBeNull();
    const goals = { kcal: 2850, proteinG: 204, carbsG: 409, fatG: 90 };
    await setDietGoals(db, goals);
    expect(await getDietGoals(db)).toEqual(goals);
  });
});
