import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { getSetting, setSetting } from "@/db/repositories/settings";
import {
  addWaterMl,
  rescaleEntry,
  scaleMacros,
  type FoodValues,
} from "@/lib/diet";
import type { DayTotals } from "@/lib/weekly-report";
import {
  MEALS,
  type DietGoals,
  type Food,
  type FoodBasis,
  type FoodEntry,
  type Meal,
} from "@/types/diet";

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
// Amount of the last time a food was logged (grams, ml or units), or null if
// it never was. Used to suggest the usual amount.
export async function getLastAmount(
  db: SQLiteDatabase,
  foodId: string,
): Promise<number | null> {
  const row = await db.getFirstAsync<{ amount: number }>(
    `SELECT amount FROM food_entries
     WHERE food_id = ?
     ORDER BY date DESC, created_at DESC
     LIMIT 1`,
    foodId,
  );
  return row?.amount ?? null;
}

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

// Changes the amount of a logged food; its values follow in proportion.
export async function updateFoodEntryAmount(
  db: SQLiteDatabase,
  entry: FoodEntry,
  amount: number,
): Promise<void> {
  const macros = rescaleEntry(entry, amount);
  await db.runAsync(
    `UPDATE food_entries
     SET amount = ?, kcal = ?, protein_g = ?, carbs_g = ?, fat_g = ?
     WHERE id = ?`,
    amount,
    macros.kcal,
    macros.proteinG,
    macros.carbsG,
    macros.fatG,
    entry.id,
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
    if (typeof goals.kcal !== "number") return null;
    // Keep only real meals with a positive number.
    const mealKcal = Object.fromEntries(
      Object.entries(goals.mealKcal ?? {}).filter(
        ([meal, kcal]) =>
          MEALS.includes(meal as Meal) && typeof kcal === "number" && kcal > 0,
      ),
    );
    return { ...goals, mealKcal };
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

// Water drunk on a day, in ml (0 when nothing was logged).
export async function getWaterMl(
  db: SQLiteDatabase,
  date: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ ml: number }>(
    "SELECT ml FROM water_days WHERE date = ?",
    date,
  );
  return row?.ml ?? 0;
}

// Sets the day's total (used to correct it). 0 removes the day's row.
export async function setWaterMl(
  db: SQLiteDatabase,
  date: string,
  ml: number,
): Promise<void> {
  const value = addWaterMl(ml, 0);
  if (value === 0) {
    await db.runAsync("DELETE FROM water_days WHERE date = ?", date);
    return;
  }
  await db.runAsync(
    `INSERT INTO water_days (date, ml) VALUES (?, ?)
     ON CONFLICT (date) DO UPDATE SET ml = excluded.ml`,
    date,
    value,
  );
}

// Adds (or, if negative, takes away) water from the day; returns the new total.
export async function addWater(
  db: SQLiteDatabase,
  date: string,
  deltaMl: number,
): Promise<number> {
  let total = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    total = addWaterMl(await getWaterMl(txn, date), deltaMl);
    await setWaterMl(txn, date, total);
  });
  return total;
}

// Daily water goal in ml, or null when not set.
export async function getWaterGoalMl(
  db: SQLiteDatabase,
): Promise<number | null> {
  const value = Number(await getSetting(db, "water_goal_ml"));
  return Number.isFinite(value) && value > 0 ? value : null;
}

// null removes the goal.
export async function setWaterGoalMl(
  db: SQLiteDatabase,
  ml: number | null,
): Promise<void> {
  await setSetting(
    db,
    "water_goal_ml",
    ml === null ? null : String(Math.round(ml)),
  );
}

// What was eaten each day from `from` to `to` (both included), summed per
// day. Days with nothing logged are not listed.
export async function getDailyTotals(
  db: SQLiteDatabase,
  from: string,
  to: string,
): Promise<DayTotals[]> {
  const rows = await db.getAllAsync<{
    date: string;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }>(
    `SELECT date, SUM(kcal) AS kcal, SUM(protein_g) AS protein_g,
            SUM(carbs_g) AS carbs_g, SUM(fat_g) AS fat_g
     FROM food_entries
     WHERE date BETWEEN ? AND ?
     GROUP BY date ORDER BY date`,
    from,
    to,
  );
  return rows.map((row) => ({
    date: row.date,
    kcal: row.kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
  }));
}
