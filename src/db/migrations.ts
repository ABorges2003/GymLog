import type { SQLiteDatabase } from "expo-sqlite";

type Migration = (db: SQLiteDatabase) => Promise<void>;

// migrations[i] upgrades the schema from version i to version i + 1.
// Never edit an existing migration; always append a new one.
const migrations: Migration[] = [
  // v1: initial schema
  async (db) => {
    await db.execAsync(`
      CREATE TABLE exercises (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        equipment TEXT,
        is_custom INTEGER NOT NULL DEFAULT 0 CHECK (is_custom IN (0, 1)),
        is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1))
      );

      CREATE TABLE routines (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE routine_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        routine_id TEXT NOT NULL REFERENCES routines (id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises (id) ON DELETE RESTRICT,
        position INTEGER NOT NULL,
        target_sets INTEGER CHECK (target_sets > 0),
        target_reps INTEGER CHECK (target_reps > 0)
      );

      CREATE TABLE workouts (
        id TEXT PRIMARY KEY NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        notes TEXT,
        routine_id TEXT REFERENCES routines (id) ON DELETE SET NULL
      );

      CREATE TABLE workout_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        workout_id TEXT NOT NULL REFERENCES workouts (id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises (id) ON DELETE RESTRICT,
        position INTEGER NOT NULL
      );

      CREATE TABLE workout_sets (
        id TEXT PRIMARY KEY NOT NULL,
        workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises (id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        set_type TEXT NOT NULL CHECK (set_type IN ('warmup', 'feeder', 'top', 'backoff')),
        reps INTEGER NOT NULL CHECK (reps > 0),
        weight_kg REAL NOT NULL CHECK (weight_kg >= 0)
      );

      CREATE TABLE body_weight_entries (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        weight_kg REAL NOT NULL CHECK (weight_kg > 0)
      );

      CREATE UNIQUE INDEX idx_body_weight_entries_date ON body_weight_entries (date);
      CREATE INDEX idx_routine_exercises_routine ON routine_exercises (routine_id);
      CREATE INDEX idx_routine_exercises_exercise ON routine_exercises (exercise_id);
      CREATE INDEX idx_workouts_started_at ON workouts (started_at);
      CREATE INDEX idx_workouts_routine ON workouts (routine_id);
      CREATE INDEX idx_workout_exercises_workout ON workout_exercises (workout_id);
      CREATE INDEX idx_workout_exercises_exercise ON workout_exercises (exercise_id);
      CREATE INDEX idx_workout_sets_workout_exercise ON workout_sets (workout_exercise_id);
    `);
  },

  // v2: favorite exercises
  async (db) => {
    await db.execAsync(`
      ALTER TABLE exercises
        ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1));
    `);
  },

  // v3: no more built-in exercises; every exercise is created by the user.
  // Removes the old built-in ones, unless already used (those become the user's).
  // is_custom stays in the table but is no longer used.
  async (db) => {
    await db.execAsync(`
      DELETE FROM exercises
      WHERE is_custom = 0
        AND id NOT IN (SELECT exercise_id FROM workout_exercises)
        AND id NOT IN (SELECT exercise_id FROM routine_exercises);

      UPDATE exercises SET is_custom = 1 WHERE is_custom = 0;
    `);
  },

  // v4: set structure of each exercise in a routine (e.g. W, F, F, T, B).
  // Exercises already in routines get the default structure.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE routine_sets (
        id TEXT PRIMARY KEY NOT NULL,
        routine_exercise_id TEXT NOT NULL REFERENCES routine_exercises (id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        set_type TEXT NOT NULL CHECK (set_type IN ('warmup', 'feeder', 'top', 'backoff'))
      );

      CREATE INDEX idx_routine_sets_routine_exercise ON routine_sets (routine_exercise_id);

      -- Random v4 UUIDs generated in SQL.
      INSERT INTO routine_sets (id, routine_exercise_id, position, set_type)
      SELECT
        lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
          substr(lower(hex(randomblob(2))), 2) || '-' ||
          substr('89ab', 1 + abs(random()) % 4, 1) ||
          substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
        re.id,
        d.position,
        d.set_type
      FROM routine_exercises re
      CROSS JOIN (
        SELECT 1 AS position, 'warmup' AS set_type
        UNION ALL SELECT 2, 'feeder'
        UNION ALL SELECT 3, 'feeder'
        UNION ALL SELECT 4, 'top'
        UNION ALL SELECT 5, 'backoff'
      ) d;
    `);
  },

  // v5: planned reps and weight for each set of a routine (both optional).
  async (db) => {
    await db.execAsync(`
      ALTER TABLE routine_sets
        ADD COLUMN reps INTEGER CHECK (reps IS NULL OR reps > 0);
      ALTER TABLE routine_sets
        ADD COLUMN weight_kg REAL CHECK (weight_kg IS NULL OR weight_kg >= 0);
    `);
  },

  // v6: note for the next time an exercise of a routine is done:
  // keep the weight or increase it. NULL means no note.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE routine_exercises
        ADD COLUMN progression TEXT CHECK (progression IS NULL OR progression IN ('keep', 'increase'));
    `);
  },

  // v7: workout sets may have no reps (warm-ups and feeders) and no weight
  // yet (not filled in). SQLite cannot change column constraints, so the
  // table is rebuilt and its rows copied.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE workout_sets_new (
        id TEXT PRIMARY KEY NOT NULL,
        workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises (id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        set_type TEXT NOT NULL CHECK (set_type IN ('warmup', 'feeder', 'top', 'backoff')),
        reps REAL CHECK (reps IS NULL OR reps > 0),
        weight_kg REAL CHECK (weight_kg IS NULL OR weight_kg >= 0)
      );

      INSERT INTO workout_sets_new (id, workout_exercise_id, position, set_type, reps, weight_kg)
      SELECT id, workout_exercise_id, position, set_type, reps, weight_kg
      FROM workout_sets;

      DROP TABLE workout_sets;
      ALTER TABLE workout_sets_new RENAME TO workout_sets;

      CREATE INDEX idx_workout_sets_workout_exercise ON workout_sets (workout_exercise_id);
    `);
  },

  // v8: the values each workout set started with (copied from the routine),
  // so even the first workout of a routine has a "before" to compare with.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE workout_sets
        ADD COLUMN planned_reps REAL CHECK (planned_reps IS NULL OR planned_reps > 0);
      ALTER TABLE workout_sets
        ADD COLUMN planned_weight_kg REAL CHECK (planned_weight_kg IS NULL OR planned_weight_kg >= 0);
    `);
  },

  // v9: app settings as key/value pairs (body weight goal, theme...).
  async (db) => {
    await db.execAsync(`
      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  },

  // v10: diet. The user's foods (values per X grams or per unit), what was
  // eaten each day (values stored when logged) and the extra kcal of
  // training days.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE foods (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        basis TEXT NOT NULL CHECK (basis IN ('grams', 'unit')),
        basis_amount REAL NOT NULL CHECK (basis_amount > 0),
        kcal REAL NOT NULL CHECK (kcal >= 0),
        protein_g REAL NOT NULL CHECK (protein_g >= 0),
        carbs_g REAL NOT NULL CHECK (carbs_g >= 0),
        fat_g REAL NOT NULL CHECK (fat_g >= 0),
        is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1))
      );

      CREATE TABLE food_entries (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        meal TEXT NOT NULL CHECK (meal IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'supper')),
        food_id TEXT NOT NULL REFERENCES foods (id) ON DELETE RESTRICT,
        amount REAL NOT NULL CHECK (amount > 0),
        kcal REAL NOT NULL CHECK (kcal >= 0),
        protein_g REAL NOT NULL CHECK (protein_g >= 0),
        carbs_g REAL NOT NULL CHECK (carbs_g >= 0),
        fat_g REAL NOT NULL CHECK (fat_g >= 0),
        created_at TEXT NOT NULL
      );

      CREATE INDEX idx_food_entries_date ON food_entries (date);
      CREATE INDEX idx_food_entries_food ON food_entries (food_id);

      CREATE TABLE diet_days (
        date TEXT PRIMARY KEY NOT NULL,
        training_kcal REAL NOT NULL CHECK (training_kcal >= 0)
      );
    `);
  },

  // v11: foods measured in millilitres (e.g. milk per 100 ml). They keep
  // basis = 'grams' (same maths) with measure = 'ml'.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE foods
        ADD COLUMN measure TEXT NOT NULL DEFAULT 'g' CHECK (measure IN ('g', 'ml'));
    `);
  },

  // v12: a third note, "maybe" (probably increase), and reps done with help
  // in a workout exercise. SQLite cannot change a CHECK, so routine_exercises
  // is rebuilt. Its routine_sets are kept aside, deleted and put back:
  // dropping the table may or may not cascade to them, depending on whether
  // foreign keys are on in the migration's connection (on a phone, the
  // transaction runs on its own connection, where they are off).
  async (db) => {
    await db.execAsync(`
      CREATE TABLE routine_sets_copy AS SELECT * FROM routine_sets;
      DELETE FROM routine_sets;

      CREATE TABLE routine_exercises_new (
        id TEXT PRIMARY KEY NOT NULL,
        routine_id TEXT NOT NULL REFERENCES routines (id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises (id) ON DELETE RESTRICT,
        position INTEGER NOT NULL,
        target_sets INTEGER CHECK (target_sets > 0),
        target_reps INTEGER CHECK (target_reps > 0),
        progression TEXT CHECK (progression IS NULL OR progression IN ('keep', 'maybe', 'increase'))
      );

      INSERT INTO routine_exercises_new (id, routine_id, exercise_id, position, target_sets, target_reps, progression)
      SELECT id, routine_id, exercise_id, position, target_sets, target_reps, progression
      FROM routine_exercises;

      DROP TABLE routine_exercises;
      ALTER TABLE routine_exercises_new RENAME TO routine_exercises;

      CREATE INDEX idx_routine_exercises_routine ON routine_exercises (routine_id);
      CREATE INDEX idx_routine_exercises_exercise ON routine_exercises (exercise_id);

      INSERT INTO routine_sets (id, routine_exercise_id, position, set_type, reps, weight_kg)
      SELECT id, routine_exercise_id, position, set_type, reps, weight_kg
      FROM routine_sets_copy;
      DROP TABLE routine_sets_copy;

      ALTER TABLE workout_exercises
        ADD COLUMN assisted_reps REAL CHECK (assisted_reps IS NULL OR assisted_reps > 0);
    `);
  },

  // v13: reps done with help belong to each set, not to the whole exercise.
  // Only test builds had the v12 column, so its values are not kept.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE workout_exercises DROP COLUMN assisted_reps;
      ALTER TABLE workout_sets
        ADD COLUMN assisted_reps REAL CHECK (assisted_reps IS NULL OR assisted_reps > 0);
    `);
  },

  // v14: back-off sets done to failure (then without reps), planned in the
  // routine and logged in the workout. Reps done with help are now for top
  // sets only.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE routine_sets
        ADD COLUMN to_failure INTEGER NOT NULL DEFAULT 0 CHECK (to_failure IN (0, 1));
      ALTER TABLE workout_sets
        ADD COLUMN to_failure INTEGER NOT NULL DEFAULT 0 CHECK (to_failure IN (0, 1));
      UPDATE workout_sets SET assisted_reps = NULL WHERE set_type <> 'top';
    `);
  },

  // v15: the routine keeps the reps done with help of its top sets, like the
  // weights, so the next workout starts with them.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE routine_sets
        ADD COLUMN assisted_reps REAL CHECK (assisted_reps IS NULL OR assisted_reps > 0);
    `);
  },
];

// Upgrades the schema to the latest version (tests may stop at an older one).
export async function migrate(
  db: SQLiteDatabase,
  targetVersion: number = migrations.length,
): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = row?.user_version ?? 0;

  for (let version = currentVersion; version < targetVersion; version++) {
    const runMigration = migrations[version];
    await db.withExclusiveTransactionAsync(async (txn) => {
      await runMigration(txn);
      // PRAGMA does not accept bound parameters; `version` is a trusted integer.
      await txn.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
