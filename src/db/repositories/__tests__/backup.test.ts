import type { SQLiteDatabase } from "expo-sqlite";

import {
  getSchemaVersion,
  readAllTables,
  replaceData,
} from "@/db/repositories/backup";
import { saveBodyWeight } from "@/db/repositories/body-weight";
import { createPhase } from "@/db/repositories/body-weight-phases";
import { addWater, getWaterMl } from "@/db/repositories/diet";
import { setSetting } from "@/db/repositories/settings";
import {
  addExercisesToRoutine,
  createRoutine,
  getRoutineExercises,
  setRoutineExerciseProgression,
} from "@/db/repositories/routines";
import {
  finishWorkout,
  startWorkoutFromRoutine,
} from "@/db/repositories/workouts";
import {
  BACKUP_PARTS,
  createBackup,
  parseBackup,
  type BackupPart,
} from "@/lib/backup";
import { createTestDatabase } from "@/test-utils/sqlite";

// expo-crypto is a native module; use Node's UUIDs in tests.
jest.mock("expo-crypto", () => ({
  randomUUID: () => require("node:crypto").randomUUID(),
}));

// A phone with exercises, a routine with a note and a finished workout.
async function phoneWithData(): Promise<SQLiteDatabase> {
  const db = await createTestDatabase();
  await db.execAsync(`
    INSERT INTO exercises (id, name, muscle_group, equipment, is_favorite) VALUES
      ('bench', 'Supino', 'chest', 'barbell', 1),
      ('press', 'Press Militar', 'shoulders', NULL, 0);
  `);
  const routineId = await createRoutine(db, "Push");
  await addExercisesToRoutine(db, routineId, ["bench", "press"]);
  const [bench] = await getRoutineExercises(db, routineId);
  await setRoutineExerciseProgression(db, bench.id, "increase");
  await finishWorkout(db, await startWorkoutFromRoutine(db, routineId));
  return db;
}

// Export the way the app does it: to a JSON string.
async function exportToText(
  db: SQLiteDatabase,
  parts: BackupPart[] = BACKUP_PARTS,
): Promise<string> {
  return JSON.stringify(
    createBackup(await readAllTables(db), await getSchemaVersion(db), parts),
  );
}

describe("backup", () => {
  it("restores exactly the same data on another phone", async () => {
    const oldPhone = await phoneWithData();
    const text = await exportToText(oldPhone);

    const newPhone = await createTestDatabase();
    const parsed = parseBackup(text, await getSchemaVersion(newPhone));
    if (!parsed.ok) throw new Error(parsed.error);
    await replaceData(newPhone, parsed.backup, BACKUP_PARTS);

    expect(await readAllTables(newPhone)).toEqual(
      await readAllTables(oldPhone),
    );
  });

  it("replaces what was on the phone", async () => {
    const backupText = await exportToText(await phoneWithData());
    const phone = await createTestDatabase();
    await phone.execAsync(
      "INSERT INTO exercises (id, name, muscle_group) VALUES ('old', 'Velho', 'back')",
    );

    const parsed = parseBackup(backupText, await getSchemaVersion(phone));
    if (!parsed.ok) throw new Error(parsed.error);
    await replaceData(phone, parsed.backup, BACKUP_PARTS);

    const names = (await readAllTables(phone)).exercises.map((e) => e.name);
    expect(names).toEqual(["Supino", "Press Militar"]);
  });

  it("changes nothing if the import fails halfway", async () => {
    const phone = await phoneWithData();
    const before = await readAllTables(phone);

    const parsed = parseBackup(
      await exportToText(phone),
      await getSchemaVersion(phone),
    );
    if (!parsed.ok) throw new Error(parsed.error);
    // A set pointing to an exercise that does not exist: the foreign key fails.
    parsed.backup.tables.workout_exercises.push({
      id: "broken",
      workout_id: "missing",
      exercise_id: "missing",
      position: 1,
    });

    await expect(
      replaceData(phone, parsed.backup, BACKUP_PARTS),
    ).rejects.toThrow();
    expect(await readAllTables(phone)).toEqual(before);
  });

  it("imports only the chosen parts and leaves the rest", async () => {
    const oldPhone = await phoneWithData();
    await saveBodyWeight(oldPhone, "2026-10-05", 74);
    await setSetting(oldPhone, "body_weight_goal_kg", "75");
    const text = await exportToText(oldPhone);

    const phone = await createTestDatabase();
    await phone.execAsync(
      "INSERT INTO exercises (id, name, muscle_group) VALUES ('mine', 'Meu', 'back')",
    );
    await setSetting(phone, "theme", "dark");
    const parsed = parseBackup(text, await getSchemaVersion(phone));
    if (!parsed.ok) throw new Error(parsed.error);
    await replaceData(phone, parsed.backup, ["body_weight"]);

    const tables = await readAllTables(phone);
    expect(tables.exercises.map((e) => e.name)).toEqual(["Meu"]);
    expect(tables.body_weight_entries.map((e) => e.weight_kg)).toEqual([74]);
    expect(tables.app_settings).toEqual(
      expect.arrayContaining([
        { key: "theme", value: "dark" },
        { key: "body_weight_goal_kg", value: "75" },
      ]),
    );
  });

  it("never imports a part the file does not hold", async () => {
    const text = await exportToText(await phoneWithData(), ["diet"]);
    const phone = await phoneWithData();
    const parsed = parseBackup(text, await getSchemaVersion(phone));
    if (!parsed.ok) throw new Error(parsed.error);
    await replaceData(phone, parsed.backup, BACKUP_PARTS);

    expect((await readAllTables(phone)).exercises).toHaveLength(2);
  });

  // Bug: importing "Peso" from a backup made before phases existed (v15 or
  // older) deleted all the phases on the phone.
  it("keeps tables an older backup could not have, like the phases", async () => {
    const source = await createTestDatabase();
    await saveBodyWeight(source, "2026-10-01", 80);
    const old = JSON.parse(await exportToText(source, ["body_weight"]));
    old.schemaVersion = 15;
    delete old.tables.body_weight_phases;

    const phone = await createTestDatabase();
    await saveBodyWeight(phone, "2026-10-02", 79);
    await createPhase(phone, {
      name: "Bulk",
      startDate: "2026-09-01",
      endDate: null,
    });
    const parsed = parseBackup(JSON.stringify(old), await getSchemaVersion(phone));
    if (!parsed.ok) throw new Error(parsed.error);
    await replaceData(phone, parsed.backup, ["body_weight"]);

    const tables = await readAllTables(phone);
    expect(tables.body_weight_entries.map((e) => e.date)).toEqual([
      "2026-10-01",
    ]);
    expect(tables.body_weight_phases.map((p) => p.name)).toEqual(["Bulk"]);
  });

  it("still replaces the phases when the backup has them, even none", async () => {
    const text = await exportToText(await createTestDatabase(), [
      "body_weight",
    ]);
    const phone = await createTestDatabase();
    await createPhase(phone, {
      name: "Bulk",
      startDate: "2026-09-01",
      endDate: null,
    });
    const parsed = parseBackup(text, await getSchemaVersion(phone));
    if (!parsed.ok) throw new Error(parsed.error);
    await replaceData(phone, parsed.backup, ["body_weight"]);

    expect((await readAllTables(phone)).body_weight_phases).toEqual([]);
  });

  it("takes the water with the diet, and an older backup keeps the phone's", async () => {
    const source = await createTestDatabase();
    await addWater(source, "2026-10-12", 1500);
    const text = await exportToText(source, ["diet"]);

    const phone = await createTestDatabase();
    await addWater(phone, "2026-10-13", 500);
    const parsed = parseBackup(text, await getSchemaVersion(phone));
    if (!parsed.ok) throw new Error(parsed.error);
    await replaceData(phone, parsed.backup, ["diet"]);
    expect(await getWaterMl(phone, "2026-10-12")).toBe(1500);
    expect(await getWaterMl(phone, "2026-10-13")).toBe(0);

    // A backup made before water existed (v16) leaves it alone.
    const old = JSON.parse(text);
    old.schemaVersion = 16;
    delete old.tables.water_days;
    const oldParsed = parseBackup(JSON.stringify(old), await getSchemaVersion(phone));
    if (!oldParsed.ok) throw new Error(oldParsed.error);
    await replaceData(phone, oldParsed.backup, ["diet"]);
    expect(await getWaterMl(phone, "2026-10-12")).toBe(1500);
  });
});
