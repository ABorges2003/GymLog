// All app tables, parents before children (safe order for inserts and backups).
// The table definitions themselves live in migrations.ts.
export const TABLES = [
  "exercises",
  "routines",
  "routine_exercises",
  "routine_sets",
  "workouts",
  "workout_exercises",
  "workout_sets",
  "body_weight_entries",
  "app_settings",
] as const;

export type TableName = (typeof TABLES)[number];
