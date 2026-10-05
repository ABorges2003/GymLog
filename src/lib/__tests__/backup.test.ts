import { TABLES, type TableName } from "@/db/schema";
import {
  backupFileName,
  createBackup,
  describeBackup,
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
  return createBackup(tables, 8, new Date("2026-10-05T10:00:00.000Z"));
};

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

describe("describeBackup", () => {
  it("counts exercises, routines and workouts", () => {
    expect(describeBackup(sample())).toBe("1 exercício, 1 rotina, 0 treinos");
  });
});
