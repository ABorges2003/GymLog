import { migrate } from "@/db/migrations";
import { createTestDatabase } from "@/test-utils/sqlite";

describe.each([
  ["on", "ON"],
  ["off (as on a phone)", "OFF"],
])("migration v12 with foreign keys %s", (_, pragma) => {
  it("keeps routines, their sets and notes, and allows the 'maybe' note", async () => {
    const db = await createTestDatabase(11);
    await db.execAsync(`PRAGMA foreign_keys = ${pragma};`);
    await db.execAsync(`
      INSERT INTO exercises (id, name, muscle_group) VALUES ('bench', 'Supino', 'chest');
      INSERT INTO routines (id, name, created_at) VALUES ('push', 'Push', '2026-10-01');
      INSERT INTO routine_exercises (id, routine_id, exercise_id, position, progression)
        VALUES ('re1', 'push', 'bench', 1, 'increase');
      INSERT INTO routine_sets (id, routine_exercise_id, position, set_type, reps, weight_kg)
        VALUES ('s1', 're1', 1, 'top', 6, 100), ('s2', 're1', 2, 'backoff', 8, 85);
    `);

    await migrate(db);
    await db.execAsync("PRAGMA foreign_keys = ON;");

    expect(
      await db.getAllAsync("SELECT id, progression FROM routine_exercises"),
    ).toEqual([{ id: "re1", progression: "increase" }]);
    expect(
      await db.getAllAsync(
        "SELECT id, routine_exercise_id, set_type, reps, weight_kg FROM routine_sets ORDER BY position",
      ),
    ).toEqual([
      {
        id: "s1",
        routine_exercise_id: "re1",
        set_type: "top",
        reps: 6,
        weight_kg: 100,
      },
      {
        id: "s2",
        routine_exercise_id: "re1",
        set_type: "backoff",
        reps: 8,
        weight_kg: 85,
      },
    ]);

    await db.runAsync(
      "UPDATE routine_exercises SET progression = 'maybe' WHERE id = 're1'",
    );
    await expect(
      db.runAsync(
        "UPDATE routine_exercises SET progression = 'other' WHERE id = 're1'",
      ),
    ).rejects.toThrow();

    // Deleting the routine still deletes its exercises and sets.
    await db.runAsync("DELETE FROM routines WHERE id = 'push'");
    expect(await db.getAllAsync("SELECT id FROM routine_sets")).toEqual([]);
  });
});

// Updating the app, from any older database, must never lose the routine's
// planned values. Covers every migration added later too.
describe.each([["ON"], ["OFF (as on a phone)"]])(
  "updating with foreign keys %s",
  (pragma) => {
    it("keeps the routine's weights and reps from every older version", async () => {
      const latest = await createTestDatabase();
      const row = await latest.getFirstAsync<{ user_version: number }>(
        "PRAGMA user_version",
      );
      const latestVersion = row?.user_version ?? 0;

      // v5 added the planned reps and weights.
      for (let from = 5; from < latestVersion; from++) {
        const db = await createTestDatabase(from);
        await db.execAsync(`PRAGMA foreign_keys = ${pragma.split(" ")[0]};`);
        await db.execAsync(`
          INSERT INTO exercises (id, name, muscle_group) VALUES ('bench', 'Supino', 'chest');
          INSERT INTO routines (id, name, created_at) VALUES ('push', 'Push', '2026-10-01');
          INSERT INTO routine_exercises (id, routine_id, exercise_id, position)
            VALUES ('re1', 'push', 'bench', 1);
          INSERT INTO routine_sets (id, routine_exercise_id, position, set_type, reps, weight_kg)
            VALUES ('s1', 're1', 1, 'warmup', NULL, 40), ('s2', 're1', 2, 'top', 6, 100);
        `);

        await migrate(db);

        expect({
          from,
          sets: await db.getAllAsync(
            "SELECT id, set_type, reps, weight_kg FROM routine_sets ORDER BY position",
          ),
        }).toEqual({
          from,
          sets: [
            { id: "s1", set_type: "warmup", reps: null, weight_kg: 40 },
            { id: "s2", set_type: "top", reps: 6, weight_kg: 100 },
          ],
        });
      }
    });
  },
);
