import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { BodyWeightEntry } from "@/lib/body-weight";

// All entries, oldest first.
export async function getBodyWeightEntries(
  db: SQLiteDatabase,
): Promise<BodyWeightEntry[]> {
  const rows = await db.getAllAsync<{ date: string; weight_kg: number }>(
    "SELECT date, weight_kg FROM body_weight_entries ORDER BY date",
  );
  return rows.map((row) => ({ date: row.date, weightKg: row.weight_kg }));
}

// Saves the weight of a day. There is one entry per day (unique index on
// date), so saving the same day again updates it.
export async function saveBodyWeight(
  db: SQLiteDatabase,
  date: string,
  weightKg: number,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO body_weight_entries (id, date, weight_kg) VALUES (?, ?, ?)
     ON CONFLICT (date) DO UPDATE SET weight_kg = excluded.weight_kg`,
    randomUUID(),
    date,
    weightKg,
  );
}

export async function deleteBodyWeight(
  db: SQLiteDatabase,
  date: string,
): Promise<void> {
  await db.runAsync("DELETE FROM body_weight_entries WHERE date = ?", date);
}
