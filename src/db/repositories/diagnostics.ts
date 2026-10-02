import type { SQLiteDatabase } from "expo-sqlite";

import type { MuscleGroup } from "@/types/exercise";

import { TABLES, type TableName } from "../schema";

export type DatabaseInfo = {
  sqliteVersion: string;
  schemaVersion: number;
  foreignKeysEnabled: boolean;
  journalMode: string;
};

export async function getDatabaseInfo(
  db: SQLiteDatabase,
): Promise<DatabaseInfo> {
  const sqlite = await db.getFirstAsync<{ version: string }>(
    "SELECT sqlite_version() AS version",
  );
  const userVersion = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const foreignKeys = await db.getFirstAsync<{ foreign_keys: number }>(
    "PRAGMA foreign_keys",
  );
  const journal = await db.getFirstAsync<{ journal_mode: string }>(
    "PRAGMA journal_mode",
  );

  return {
    sqliteVersion: sqlite?.version ?? "unknown",
    schemaVersion: userVersion?.user_version ?? 0,
    foreignKeysEnabled: foreignKeys?.foreign_keys === 1,
    journalMode: journal?.journal_mode ?? "unknown",
  };
}

export type TableInfo = {
  name: TableName;
  exists: boolean;
  rowCount: number;
};

export async function getTableInfo(db: SQLiteDatabase): Promise<TableInfo[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table'",
  );
  const existing = new Set(rows.map((row) => row.name));

  const result: TableInfo[] = [];
  for (const name of TABLES) {
    if (!existing.has(name)) {
      result.push({ name, exists: false, rowCount: 0 });
      continue;
    }
    // Table names cannot be bound as parameters; `name` comes from the TABLES constant.
    const count = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ${name}`,
    );
    result.push({ name, exists: true, rowCount: count?.n ?? 0 });
  }
  return result;
}

export type MuscleGroupCount = {
  muscleGroup: MuscleGroup;
  count: number;
};

export async function getExerciseCountsByMuscleGroup(
  db: SQLiteDatabase,
): Promise<MuscleGroupCount[]> {
  return db.getAllAsync<MuscleGroupCount>(
    `SELECT muscle_group AS muscleGroup, COUNT(*) AS count
     FROM exercises
     GROUP BY muscle_group
     ORDER BY muscle_group`,
  );
}
