import type { SQLiteDatabase } from "expo-sqlite";

import type { DateRange } from "@/lib/data-report";

// First and last day with a body weight or a food logged, or null when
// there is none yet.
export async function getDataRange(
  db: SQLiteDatabase,
): Promise<DateRange | null> {
  const row = await db.getFirstAsync<{
    first: string | null;
    last: string | null;
  }>(
    `SELECT MIN(date) AS first, MAX(date) AS last FROM (
       SELECT date FROM body_weight_entries
       UNION ALL
       SELECT date FROM food_entries
     )`,
  );
  return row?.first && row.last ? { from: row.first, to: row.last } : null;
}
