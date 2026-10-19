import type { SQLiteDatabase } from "expo-sqlite";

import { saveBodyWeight } from "@/db/repositories/body-weight";
import { addFoodEntry, createFood, getFoodById } from "@/db/repositories/diet";
import { getDataRange } from "@/db/repositories/reports";
import { createTestDatabase } from "@/test-utils/sqlite";

// expo-crypto is a native module; use Node's UUIDs in tests.
jest.mock("expo-crypto", () => ({
  randomUUID: () => require("node:crypto").randomUUID(),
}));

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createTestDatabase();
});

describe("getDataRange", () => {
  it("is null with nothing logged", async () => {
    expect(await getDataRange(db)).toBeNull();
  });

  it("spans the body weight and the food logged", async () => {
    await saveBodyWeight(db, "2026-10-03", 73);
    await saveBodyWeight(db, "2026-10-10", 72.5);
    const id = await createFood(db, {
      name: "Aveia",
      basis: "grams",
      basisAmount: 100,
      kcal: 380,
      proteinG: 13,
      carbsG: 67,
      fatG: 7,
    });
    const oats = (await getFoodById(db, id))!;
    await addFoodEntry(db, {
      date: "2026-10-18",
      meal: "breakfast",
      food: oats,
      amount: 80,
    });

    expect(await getDataRange(db)).toEqual({
      from: "2026-10-03",
      to: "2026-10-18",
    });
  });
});
