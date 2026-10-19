import type { SQLiteDatabase } from "expo-sqlite";

import { migrate } from "./migrations";

export const DATABASE_NAME = "gymlog.db";

// Runs once when the app opens the database, before any screen renders.
// busy_timeout: while another connection writes (withExclusiveTransactionAsync
// opens its own), a write waits up to 5 s instead of failing at once with
// "database is locked" (it happened when a new day started and several
// screens and the start-up clean-up wrote at the same time).
export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
  await migrate(db);
}
