import { TABLES, type TableName } from "@/db/schema";

// Version of the backup file format (not of the database schema).
// 1: always everything. 2: may hold only some parts (`parts`).
export const BACKUP_FORMAT_VERSION = 2;

export type BackupRow = Record<string, string | number | null>;

// What can be exported or imported on its own.
export type BackupPart = "training" | "body_weight" | "diet";

export const BACKUP_PARTS: BackupPart[] = ["training", "body_weight", "diet"];

export const BACKUP_PART_LABELS: Record<BackupPart, string> = {
  training: "Treinos",
  body_weight: "Peso",
  diet: "Dieta",
};

export const BACKUP_PART_DETAILS: Record<BackupPart, string> = {
  training: "Exercícios, rotinas e treinos",
  body_weight: "Registos de peso e objetivo",
  diet: "Alimentos, refeições e objetivos",
};

// Tables of each part. The parts never point to each other's rows, so each
// one can be replaced alone.
const PART_TABLES: Record<BackupPart, TableName[]> = {
  training: [
    "exercises",
    "routines",
    "routine_exercises",
    "routine_sets",
    "workouts",
    "workout_exercises",
    "workout_sets",
  ],
  body_weight: ["body_weight_entries"],
  diet: ["foods", "food_entries"],
};

// app_settings is shared: its rows belong to a part by key. The theme belongs
// to none, so a backup never changes how the app looks.
const PART_SETTING_KEYS: Record<BackupPart, string[]> = {
  training: [],
  body_weight: ["body_weight_goal_kg"],
  diet: ["diet_goals"],
};

// Tables of the given parts, parents before children (app_settings apart).
export function partTables(parts: BackupPart[]): TableName[] {
  return TABLES.filter((table) =>
    parts.some((part) => PART_TABLES[part].includes(table)),
  );
}

export function partSettingKeys(parts: BackupPart[]): string[] {
  return parts.flatMap((part) => PART_SETTING_KEYS[part]);
}

export type Backup = {
  app: "gymlog";
  version: number;
  // PRAGMA user_version of the database the backup came from.
  schemaVersion: number;
  // ISO 8601 timestamp.
  exportedAt: string;
  // The parts the file holds; tables of other parts are empty.
  parts: BackupPart[];
  tables: Record<TableName, BackupRow[]>;
};

// Backup of the chosen parts only.
export function createBackup(
  tables: Record<TableName, BackupRow[]>,
  schemaVersion: number,
  parts: BackupPart[] = BACKUP_PARTS,
  now: Date = new Date(),
): Backup {
  const included = new Set(partTables(parts));
  const keys = partSettingKeys(parts);
  const picked = {} as Record<TableName, BackupRow[]>;
  for (const table of TABLES) {
    if (table === "app_settings") {
      picked[table] = tables[table].filter((row) =>
        keys.includes(String(row.key)),
      );
    } else {
      picked[table] = included.has(table) ? tables[table] : [];
    }
  }
  return {
    app: "gymlog",
    version: BACKUP_FORMAT_VERSION,
    schemaVersion,
    exportedAt: now.toISOString(),
    parts: BACKUP_PARTS.filter((part) => parts.includes(part)),
    tables: picked,
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
  if (candidate.version !== 1 && candidate.version !== BACKUP_FORMAT_VERSION) {
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

  // Version 1 files always hold everything.
  const parts: unknown =
    candidate.version === 1 ? BACKUP_PARTS : candidate.parts;
  if (
    !Array.isArray(parts) ||
    parts.length === 0 ||
    !parts.every((part) => BACKUP_PARTS.includes(part))
  ) {
    return { ok: false, error: "O backup está danificado (partes)." };
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
      parts: BACKUP_PARTS.filter((part) => parts.includes(part)),
      tables,
    },
  };
}

// What a part of a backup holds, e.g. "12 exercícios, 3 rotinas, 20 treinos".
export function describePart(backup: Backup, part: BackupPart): string {
  const count = (table: TableName, one: string, many: string) => {
    const n = backup.tables[table].length;
    return `${n} ${n === 1 ? one : many}`;
  };
  switch (part) {
    case "training":
      return [
        count("exercises", "exercício", "exercícios"),
        count("routines", "rotina", "rotinas"),
        count("workouts", "treino", "treinos"),
      ].join(", ");
    case "body_weight":
      return count("body_weight_entries", "registo", "registos");
    case "diet":
      return [
        count("foods", "alimento", "alimentos"),
        count("food_entries", "registo", "registos"),
      ].join(", ");
  }
}
