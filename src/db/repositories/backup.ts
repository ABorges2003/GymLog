import type { SQLiteDatabase } from "expo-sqlite";

import { TABLES, type TableName } from "@/db/schema";
import type { Backup, BackupRow } from "@/lib/backup";

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

// Replaces all data with the backup's, in one transaction: if anything fails,
// nothing changes. Columns the backup lacks (older app versions) get their
// default values; columns this version does not know are ignored.
export async function replaceAllData(
  db: SQLiteDatabase,
  backup: Backup,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    // Children first, so foreign keys never block a delete.
    for (const table of [...TABLES].reverse()) {
      await txn.runAsync(`DELETE FROM ${table}`);
    }
    // Parents first, so foreign keys always find their row.
    for (const table of TABLES) {
      const known = await getColumns(txn, table);
      for (const row of backup.tables[table]) {
        const columns = Object.keys(row).filter((column) => known.has(column));
        if (columns.length === 0) continue;
        await txn.runAsync(
          `INSERT INTO ${table} (${columns.join(", ")})
           VALUES (${columns.map(() => "?").join(", ")})`,
          ...columns.map((column) => row[column]),
        );
      }
    }
  });
}
