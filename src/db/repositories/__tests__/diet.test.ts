import type { SQLiteDatabase } from "expo-sqlite";

import {
  addFoodEntry,
  addWater,
  getWaterGoalMl,
  getWaterMl,
  setWaterGoalMl,
  setWaterMl,
  getLastAmount,
  updateFoodEntryAmount,
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
import { setSetting } from "@/db/repositories/settings";
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

  it("remembers the amount of the last time a food was logged", async () => {
    expect(await getLastAmount(db, oats.id)).toBeNull();
    const log = (date: string, amount: number, at: string) =>
      addFoodEntry(
        db,
        { date, meal: "breakfast", food: oats, amount },
        new Date(at),
      );
    await log("2026-10-07", 80, "2026-10-07T08:00:00Z");
    await log("2026-10-08", 60, "2026-10-08T08:00:00Z");
    // Logged later, but for an earlier day: the latest day wins.
    await log("2026-10-06", 100, "2026-10-09T08:00:00Z");
    expect(await getLastAmount(db, oats.id)).toBe(60);
  });

  it("changes only the amount, with values in proportion", async () => {
    await addFoodEntry(db, {
      date: "2026-10-07",
      meal: "breakfast",
      food: oats,
      amount: 80,
    });
    // The food changes later: the logged entry keeps its own values.
    await updateFood(db, oats.id, { ...oats, kcal: 1000 });
    const [entry] = await getDayEntries(db, "2026-10-07");
    await updateFoodEntryAmount(db, entry, 40);

    expect(await getDayEntries(db, "2026-10-07")).toEqual([
      expect.objectContaining({
        amount: 40,
        kcal: 152,
        proteinG: 5.2,
        carbsG: 26.8,
        fatG: 2.8,
      }),
    ]);
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

  it("saves the daily goals and the kcal planned per meal", async () => {
    expect(await getDietGoals(db)).toBeNull();
    const goals = {
      kcal: 2850,
      proteinG: 204,
      carbsG: 409,
      fatG: 90,
      mealKcal: { breakfast: 600, lunch: 900 },
    };
    await setDietGoals(db, goals);
    expect(await getDietGoals(db)).toEqual(goals);
  });

  it("reads goals saved before meals had planned kcal", async () => {
    await setSetting(
      db,
      "diet_goals",
      JSON.stringify({ kcal: 2850, proteinG: null, carbsG: null, fatG: null }),
    );
    expect((await getDietGoals(db))?.mealKcal).toEqual({});
  });

  it("ignores planned kcal that are not valid", async () => {
    await setSetting(
      db,
      "diet_goals",
      JSON.stringify({
        kcal: 2850,
        proteinG: null,
        carbsG: null,
        fatG: null,
        mealKcal: { lunch: 900, brunch: 500, dinner: -1, supper: "x" },
      }),
    );
    expect((await getDietGoals(db))?.mealKcal).toEqual({ lunch: 900 });
  });

  it("adds water to each day on its own", async () => {
    expect(await getWaterMl(db, "2026-10-13")).toBe(0);
    expect(await addWater(db, "2026-10-13", 250)).toBe(250);
    expect(await addWater(db, "2026-10-13", 500)).toBe(750);
    await addWater(db, "2026-10-12", 1000);
    expect(await getWaterMl(db, "2026-10-13")).toBe(750);
    expect(await getWaterMl(db, "2026-10-12")).toBe(1000);
  });

  it("takes water away, never below zero", async () => {
    await addWater(db, "2026-10-13", 250);
    expect(await addWater(db, "2026-10-13", -500)).toBe(0);
    // A day back at zero has no row left.
    expect(await db.getAllAsync("SELECT * FROM water_days")).toEqual([]);
  });

  it("corrects the day's total", async () => {
    await addWater(db, "2026-10-13", 750);
    await setWaterMl(db, "2026-10-13", 1800);
    expect(await getWaterMl(db, "2026-10-13")).toBe(1800);
    await setWaterMl(db, "2026-10-13", 0);
    expect(await getWaterMl(db, "2026-10-13")).toBe(0);
  });

  it("saves and removes the daily water goal, on its own", async () => {
    expect(await getWaterGoalMl(db)).toBeNull();
    await setWaterGoalMl(db, 2500);
    expect(await getWaterGoalMl(db)).toBe(2500);
    // No diet goals needed.
    expect(await getDietGoals(db)).toBeNull();
    await setWaterGoalMl(db, null);
    expect(await getWaterGoalMl(db)).toBeNull();
  });

  it("ignores a water goal that is not valid", async () => {
    await setSetting(db, "water_goal_ml", "-1");
    expect(await getWaterGoalMl(db)).toBeNull();
  });
});
