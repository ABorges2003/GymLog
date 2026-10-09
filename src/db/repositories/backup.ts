import type { SQLiteDatabase } from "expo-sqlite";

import { TABLES, type TableName } from "@/db/schema";
import {
  partSettingKeys,
  partTables,
  type Backup,
  type BackupPart,
  type BackupRow,
} from "@/lib/backup";

// Table and column names cannot be bound as parameters. They only ever come
// from the TABLES constant and from PRAGMA table_info, never from the file.

export async function getSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  return row?.user_version ?? 0;
}

// Every row of every app table.
export async function readAllTables(
  db: SQLiteDatabase,
): Promise<Record<TableName, BackupRow[]>> {
  const tables = {} as Record<TableName, BackupRow[]>;
  for (const table of TABLES) {
    tables[table] = await db.getAllAsync<BackupRow>(`SELECT * FROM ${table}`);
  }
  return tables;
}

async function getColumns(
  db: SQLiteDatabase,
  table: TableName,
): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`,
  );
  return new Set(rows.map((row) => row.name));
}

async function insertRow(
  db: SQLiteDatabase,
  table: TableName,
  known: Set<string>,
  row: BackupRow,
): Promise<void> {
  const columns = Object.keys(row).filter((column) => known.has(column));
  if (columns.length === 0) return;
  await db.runAsync(
    `INSERT INTO ${table} (${columns.join(", ")})
     VALUES (${columns.map(() => "?").join(", ")})`,
    ...columns.map((column) => row[column]),
  );
}

// Replaces the data of the chosen parts with the backup's, in one
// transaction: if anything fails, nothing changes. The other parts stay as
// they are. Columns the backup lacks (older app versions) get their default
// values; columns this version does not know are ignored.
export async function replaceData(
  db: SQLiteDatabase,
  backup: Backup,
  parts: BackupPart[],
): Promise<void> {
  // Only parts the file really holds: the others are empty in it.
  const chosen = parts.filter((part) => backup.parts.includes(part));
  const tables = partTables(chosen);
  const keys = partSettingKeys(chosen);

  await db.withExclusiveTransactionAsync(async (txn) => {
    // Children first, so foreign keys never block a delete.
    for (const table of [...tables].reverse()) {
      await txn.runAsync(`DELETE FROM ${table}`);
    }
    // Parents first, so foreign keys always find their row.
    for (const table of tables) {
      const known = await getColumns(txn, table);
      for (const row of backup.tables[table]) {
        await insertRow(txn, table, known, row);
      }
    }

    if (keys.length === 0) return;
    const known = await getColumns(txn, "app_settings");
    await txn.runAsync(
      `DELETE FROM app_settings WHERE key IN (${keys.map(() => "?").join(", ")})`,
      ...keys,
    );
    for (const row of backup.tables.app_settings) {
      if (keys.includes(String(row.key))) {
        await insertRow(txn, "app_settings", known, row);
      }
    }
  });
}
