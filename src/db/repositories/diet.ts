import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { getSetting, setSetting } from "@/db/repositories/settings";
import { scaleMacros, type FoodValues } from "@/lib/diet";
import type { DietGoals, Food, FoodBasis, FoodEntry, Meal } from "@/types/diet";

// In the table, ml foods are basis 'grams' with measure 'ml' (see migration v11).
type DbBasis = "grams" | "unit";
type DbMeasure = "g" | "ml";

function fromDb(basis: DbBasis, measure: DbMeasure): FoodBasis {
  return basis === "grams" && measure === "ml" ? "ml" : basis;
}

function toDb(basis: FoodBasis): { basis: DbBasis; measure: DbMeasure } {
  if (basis === "ml") return { basis: "grams", measure: "ml" };
  return { basis, measure: "g" };
}

type FoodRow = {
  id: string;
  name: string;
  basis: DbBasis;
  measure: DbMeasure;
  basis_amount: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  is_archived: number;
};

function toFood(row: FoodRow): Food {
  return {
    id: row.id,
    name: row.name,
    basis: fromDb(row.basis, row.measure),
    basisAmount: row.basis_amount,
    kcal: row.kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
    isArchived: row.is_archived === 1,
  };
}

const FOOD_COLUMNS =
  "id, name, basis, measure, basis_amount, kcal, protein_g, carbs_g, fat_g, is_archived";

// Foods not archived, sorted by name.
export async function getFoods(db: SQLiteDatabase): Promise<Food[]> {
  const rows = await db.getAllAsync<FoodRow>(
    `SELECT ${FOOD_COLUMNS} FROM foods WHERE is_archived = 0 ORDER BY name`,
  );
  return rows.map(toFood);
}

export async function getFoodById(
  db: SQLiteDatabase,
  id: string,
): Promise<Food | null> {
  const row = await db.getFirstAsync<FoodRow>(
    `SELECT ${FOOD_COLUMNS} FROM foods WHERE id = ?`,
    id,
  );
  return row ? toFood(row) : null;
}

// All food names (archived included), to check for duplicates.
export async function getFoodNames(
  db: SQLiteDatabase,
): Promise<{ id: string; name: string }[]> {
  return db.getAllAsync<{ id: string; name: string }>(
    "SELECT id, name FROM foods",
  );
}

export async function createFood(
  db: SQLiteDatabase,
  values: FoodValues,
): Promise<string> {
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO foods (id, name, basis, measure, basis_amount, kcal, protein_g, carbs_g, fat_g)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    values.name,
    toDb(values.basis).basis,
    toDb(values.basis).measure,
    values.basisAmount,
    values.kcal,
    values.proteinG,
    values.carbsG,
    values.fatG,
  );
  return id;
}

// Changes a food. Days already logged keep their values.
export async function updateFood(
  db: SQLiteDatabase,
  id: string,
  values: FoodValues,
): Promise<void> {
  await db.runAsync(
    `UPDATE foods
     SET name = ?, basis = ?, measure = ?, basis_amount = ?, kcal = ?, protein_g = ?, carbs_g = ?, fat_g = ?
     WHERE id = ?`,
    values.name,
    toDb(values.basis).basis,
    toDb(values.basis).measure,
    values.basisAmount,
    values.kcal,
    values.proteinG,
    values.carbsG,
    values.fatG,
    id,
  );
}

// Deletes a food never logged; one already logged is archived instead, so
// past days keep their name.
export async function removeFood(
  db: SQLiteDatabase,
  id: string,
): Promise<"deleted" | "archived"> {
  const result: { value: "deleted" | "archived" } = { value: "deleted" };
  await db.withExclusiveTransactionAsync(async (txn) => {
    const used = await txn.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM food_entries WHERE food_id = ?",
      id,
    );
    if ((used?.n ?? 0) > 0) {
      await txn.runAsync("UPDATE foods SET is_archived = 1 WHERE id = ?", id);
      result.value = "archived";
    } else {
      await txn.runAsync("DELETE FROM foods WHERE id = ?", id);
    }
  });
  return result.value;
}

type EntryRow = {
  id: string;
  date: string;
  meal: Meal;
  food_id: string;
  food_name: string;
  basis: DbBasis;
  measure: DbMeasure;
  amount: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

// What was eaten on a day ("YYYY-MM-DD"), in the order it was logged.
export async function getDayEntries(
  db: SQLiteDatabase,
  date: string,
): Promise<FoodEntry[]> {
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT fe.id, fe.date, fe.meal, fe.food_id, f.name AS food_name, f.basis, f.measure,
            fe.amount, fe.kcal, fe.protein_g, fe.carbs_g, fe.fat_g
     FROM food_entries fe
     JOIN foods f ON f.id = fe.food_id
     WHERE fe.date = ?
     ORDER BY fe.created_at`,
    date,
  );
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    meal: row.meal,
    foodId: row.food_id,
    foodName: row.food_name,
    basis: fromDb(row.basis, row.measure),
    amount: row.amount,
    kcal: row.kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
  }));
}

// Logs `amount` grams/units of a food in a meal; the values are worked out
// and stored now.
export async function addFoodEntry(
  db: SQLiteDatabase,
  entry: { date: string; meal: Meal; food: Food; amount: number },
  now: Date = new Date(),
): Promise<void> {
  const macros = scaleMacros(entry.food, entry.amount);
  await db.runAsync(
    `INSERT INTO food_entries
       (id, date, meal, food_id, amount, kcal, protein_g, carbs_g, fat_g, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    randomUUID(),
    entry.date,
    entry.meal,
    entry.food.id,
    entry.amount,
    macros.kcal,
    macros.proteinG,
    macros.carbsG,
    macros.fatG,
    now.toISOString(),
  );
}

export async function deleteFoodEntry(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM food_entries WHERE id = ?", id);
}

// Daily goals are stored as JSON in app_settings.
export async function getDietGoals(
  db: SQLiteDatabase,
): Promise<DietGoals | null> {
  const value = await getSetting(db, "diet_goals");
  if (!value) return null;
  try {
    const goals = JSON.parse(value) as DietGoals;
    return typeof goals.kcal === "number" ? goals : null;
  } catch {
    return null;
  }
}

export async function setDietGoals(
  db: SQLiteDatabase,
  goals: DietGoals,
): Promise<void> {
  await setSetting(db, "diet_goals", JSON.stringify(goals));
}
