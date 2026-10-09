import { TABLES, type TableName } from "@/db/schema";
import {
  BACKUP_PARTS,
  backupFileName,
  createBackup,
  describePart,
  parseBackup,
  type BackupRow,
} from "@/lib/backup";

function emptyTables(): Record<TableName, BackupRow[]> {
  return Object.fromEntries(
    TABLES.map((table) => [table, []]),
  ) as unknown as Record<TableName, BackupRow[]>;
}

const sample = () => {
  const tables = emptyTables();
  tables.exercises = [
    { id: "e1", name: "Supino", muscle_group: "chest", equipment: null },
  ];
  tables.routines = [{ id: "r1", name: "Push", created_at: "2026-10-01" }];
  tables.body_weight_entries = [
    { id: "w1", date: "2026-10-05", weight_kg: 74 },
  ];
  tables.app_settings = [
    { key: "theme", value: "dark" },
    { key: "body_weight_goal_kg", value: "75" },
    { key: "diet_goals", value: '{"kcal":3000}' },
  ];
  return createBackup(
    tables,
    8,
    BACKUP_PARTS,
    new Date("2026-10-05T10:00:00.000Z"),
  );
};

describe("createBackup", () => {
  it("keeps everything but the theme", () => {
    const backup = sample();
    expect(backup.parts).toEqual(["training", "body_weight", "diet"]);
    expect(backup.tables.exercises).toHaveLength(1);
    expect(backup.tables.app_settings.map((row) => row.key)).toEqual([
      "body_weight_goal_kg",
      "diet_goals",
    ]);
  });

  it("keeps only the chosen parts", () => {
    const full = sample();
    const backup = createBackup(full.tables, 8, ["body_weight"]);
    expect(backup.parts).toEqual(["body_weight"]);
    expect(backup.tables.exercises).toEqual([]);
    expect(backup.tables.routines).toEqual([]);
    expect(backup.tables.body_weight_entries).toHaveLength(1);
    expect(backup.tables.app_settings).toEqual([
      { key: "body_weight_goal_kg", value: "75" },
    ]);
  });
});

describe("backupFileName", () => {
  it("uses the local date", () => {
    expect(backupFileName(new Date(2026, 9, 5, 23, 59))).toBe(
      "gymlog-backup-2026-10-05.json",
    );
  });
});

describe("parseBackup", () => {
  it("reads back what was exported", () => {
    const backup = sample();
    expect(parseBackup(JSON.stringify(backup), 8)).toEqual({
      ok: true,
      backup,
    });
  });

  it("accepts backups from older versions, filling missing tables", () => {
    const old = JSON.parse(JSON.stringify(sample()));
    old.schemaVersion = 3;
    delete old.tables.routine_sets;
    const result = parseBackup(JSON.stringify(old), 8);
    expect(result.ok && result.backup.tables.routine_sets).toEqual([]);
  });

  it("reads version 1 files as holding everything", () => {
    const old = JSON.parse(JSON.stringify(sample()));
    old.version = 1;
    delete old.parts;
    const result = parseBackup(JSON.stringify(old), 8);
    expect(result.ok && result.backup.parts).toEqual(BACKUP_PARTS);
  });

  it("rejects unknown or missing parts", () => {
    const bad = JSON.parse(JSON.stringify(sample()));
    bad.parts = ["training", "photos"];
    expect(parseBackup(JSON.stringify(bad), 8).ok).toBe(false);
    bad.parts = [];
    expect(parseBackup(JSON.stringify(bad), 8).ok).toBe(false);
  });

  it("rejects files that are not GymLog backups", () => {
    expect(parseBackup("not json", 8).ok).toBe(false);
    expect(parseBackup("{}", 8).ok).toBe(false);
    expect(
      parseBackup(JSON.stringify({ app: "other", tables: {} }), 8).ok,
    ).toBe(false);
  });

  it("rejects backups from a newer version of the app", () => {
    const result = parseBackup(JSON.stringify(sample()), 7);
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("mais recente"),
    });
  });

  it("rejects damaged tables", () => {
    const damaged = JSON.parse(JSON.stringify(sample()));
    damaged.tables.exercises = [{ id: "e1", name: { nested: true } }];
    expect(parseBackup(JSON.stringify(damaged), 8).ok).toBe(false);
  });
});

describe("describePart", () => {
  it("counts what each part holds", () => {
    const backup = sample();
    expect(describePart(backup, "training")).toBe(
      "1 exercício, 1 rotina, 0 treinos",
    );
    expect(describePart(backup, "body_weight")).toBe("1 registo");
    expect(describePart(backup, "diet")).toBe("0 alimentos, 0 registos");
  });
});
