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

// Tables the given table points to with a foreign key.
async function getParents(
  db: SQLiteDatabase,
  table: TableName,
): Promise<string[]> {
  const rows = await db.getAllAsync<{ table: string }>(
    `PRAGMA foreign_key_list(${table})`,
  );
  return rows.map((row) => row.table);
}

// Tables of the import that a backup made before they existed must not touch:
// it has no rows for them, so replacing would only delete the phone's. Only
// tables with no foreign keys to or from the other imported tables; a missing
// child of a replaced table (e.g. routine_sets in very old files) is still
// replaced, as its rows belong to parents that are being replaced too.
async function tablesToKeep(
  db: SQLiteDatabase,
  backup: Backup,
  tables: TableName[],
): Promise<Set<TableName>> {
  const keep = new Set<TableName>();
  const missing = (backup.missingTables ?? []).filter((table) =>
    tables.includes(table),
  );
  if (missing.length === 0) return keep;
  const parents = new Map<TableName, string[]>();
  for (const table of tables) parents.set(table, await getParents(db, table));
  for (const table of missing) {
    const hasParents = (parents.get(table) ?? []).length > 0;
    const hasChildren = tables.some((other) =>
      (parents.get(other) ?? []).includes(table),
    );
    if (!hasParents && !hasChildren) keep.add(table);
  }
  return keep;
}

// Replaces the data of the chosen parts with the backup's, in one
// transaction: if anything fails, nothing changes. The other parts stay as
// they are. Columns the backup lacks (older app versions) get their default
// values; columns this version does not know are ignored. Tables the backup
// lacks altogether keep the phone's rows when they stand alone (see
// tablesToKeep).
export async function replaceData(
  db: SQLiteDatabase,
  backup: Backup,
  parts: BackupPart[],
): Promise<void> {
  // Only parts the file really holds: the others are empty in it.
  const chosen = parts.filter((part) => backup.parts.includes(part));
  const keep = await tablesToKeep(db, backup, partTables(chosen));
  const tables = partTables(chosen).filter((table) => !keep.has(table));
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
