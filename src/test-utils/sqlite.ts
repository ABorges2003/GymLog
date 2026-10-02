// Test helper: an in-memory SQLite database (Node's built-in node:sqlite)
// wrapped to look like the parts of expo-sqlite's SQLiteDatabase that the
// repositories use. expo-sqlite itself only runs on a phone.
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import type { SQLiteDatabase } from "expo-sqlite";

import { migrate } from "@/db/migrations";

type Params = SQLInputValue[];

function createAdapter(db: DatabaseSync): SQLiteDatabase {
  const adapter = {
    async execAsync(source: string) {
      db.exec(source);
    },
    async runAsync(source: string, ...params: Params) {
      const result = db.prepare(source).run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    async getFirstAsync<T>(source: string, ...params: Params) {
      return (db.prepare(source).get(...params) ?? null) as T | null;
    },
    async getAllAsync<T>(source: string, ...params: Params) {
      return db.prepare(source).all(...params) as T[];
    },
    async withExclusiveTransactionAsync(
      task: (txn: SQLiteDatabase) => Promise<void>,
    ) {
      db.exec("BEGIN EXCLUSIVE");
      try {
        await task(adapter as unknown as SQLiteDatabase);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return adapter as unknown as SQLiteDatabase;
}

// Fresh database with every migration applied.
export async function createTestDatabase(): Promise<SQLiteDatabase> {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  const adapter = createAdapter(db);
  await migrate(adapter);
  return adapter;
}
