import type { SQLiteDatabase } from "expo-sqlite";

import {
  getSchemaVersion,
  readAllTables,
  replaceAllData,
} from "@/db/repositories/backup";
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
import { createBackup, parseBackup } from "@/lib/backup";
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
async function exportToText(db: SQLiteDatabase): Promise<string> {
  return JSON.stringify(
    createBackup(await readAllTables(db), await getSchemaVersion(db)),
  );
}

describe("backup", () => {
  it("restores exactly the same data on another phone", async () => {
    const oldPhone = await phoneWithData();
    const text = await exportToText(oldPhone);

    const newPhone = await createTestDatabase();
    const parsed = parseBackup(text, await getSchemaVersion(newPhone));
    if (!parsed.ok) throw new Error(parsed.error);
    await replaceAllData(newPhone, parsed.backup);

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
    await replaceAllData(phone, parsed.backup);

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

    await expect(replaceAllData(phone, parsed.backup)).rejects.toThrow();
    expect(await readAllTables(phone)).toEqual(before);
  });
});
