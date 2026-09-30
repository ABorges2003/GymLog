import type { SQLiteDatabase } from "expo-sqlite";

import { migrate } from "./migrations";

export const DATABASE_NAME = "gymlog.db";

// Runs once when the app opens the database, before any screen renders.
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
  await migrate(db);
}
