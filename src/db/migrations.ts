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
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = row?.user_version ?? 0;

  for (let version = currentVersion; version < migrations.length; version++) {
    const runMigration = migrations[version];
    await db.withExclusiveTransactionAsync(async (txn) => {
      await runMigration(txn);
      // PRAGMA does not accept bound parameters; `version` is a trusted integer.
      await txn.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
