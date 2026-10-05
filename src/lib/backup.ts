import { TABLES, type TableName } from "@/db/schema";

// Version of the backup file format (not of the database schema).
export const BACKUP_FORMAT_VERSION = 1;

export type BackupRow = Record<string, string | number | null>;

export type Backup = {
  app: "gymlog";
  version: number;
  // PRAGMA user_version of the database the backup came from.
  schemaVersion: number;
  // ISO 8601 timestamp.
  exportedAt: string;
  tables: Record<TableName, BackupRow[]>;
};

export function createBackup(
  tables: Record<TableName, BackupRow[]>,
  schemaVersion: number,
  now: Date = new Date(),
): Backup {
  return {
    app: "gymlog",
    version: BACKUP_FORMAT_VERSION,
    schemaVersion,
    exportedAt: now.toISOString(),
    tables,
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

// "gymlog-backup-2026-10-05.json" (local date). The .gitignore relies on this name.
export function backupFileName(now: Date = new Date()): string {
  return `gymlog-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export type ParseResult =
  { ok: true; backup: Backup } | { ok: false; error: string };

function isRow(value: unknown): value is BackupRow {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (field) =>
        field === null ||
        typeof field === "string" ||
        typeof field === "number",
    )
  );
}

// Reads and checks a backup file before anything is imported.
// `currentSchemaVersion` rejects backups made by a newer version of the app.
export function parseBackup(
  text: string,
  currentSchemaVersion: number,
): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "O ficheiro não é um backup válido." };
  }

  const candidate = data as Partial<Backup> | null;
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    candidate.app !== "gymlog" ||
    typeof candidate.tables !== "object" ||
    candidate.tables === null
  ) {
    return { ok: false, error: "O ficheiro não é um backup do GymLog." };
  }
  if (candidate.version !== BACKUP_FORMAT_VERSION) {
    return { ok: false, error: "Este formato de backup não é suportado." };
  }
  if (
    typeof candidate.schemaVersion !== "number" ||
    candidate.schemaVersion > currentSchemaVersion
  ) {
    return {
      ok: false,
      error:
        "Este backup foi feito numa versão mais recente da app. Atualiza a app primeiro.",
    };
  }

  const tables = {} as Record<TableName, BackupRow[]>;
  for (const table of TABLES) {
    // Tables added in later versions may be missing from older backups.
    const rows = (candidate.tables as Record<string, unknown>)[table] ?? [];
    if (!Array.isArray(rows) || !rows.every(isRow)) {
      return { ok: false, error: `O backup está danificado (${table}).` };
    }
    tables[table] = rows;
  }

  return {
    ok: true,
    backup: {
      app: "gymlog",
      version: candidate.version,
      schemaVersion: candidate.schemaVersion,
      exportedAt: String(candidate.exportedAt ?? ""),
      tables,
    },
  };
}

// Short description for the import confirmation, e.g. "12 exercícios, 3 rotinas, 20 treinos".
export function describeBackup(backup: Backup): string {
  const count = (table: TableName, one: string, many: string) => {
    const n = backup.tables[table].length;
    return `${n} ${n === 1 ? one : many}`;
  };
  return [
    count("exercises", "exercício", "exercícios"),
    count("routines", "rotina", "rotinas"),
    count("workouts", "treino", "treinos"),
  ].join(", ");
}
