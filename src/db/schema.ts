// All app tables, parents before children (safe order for inserts and backups).
// The table definitions themselves live in migrations.ts.
export const TABLES = [
  "exercises",
  "routines",
  "routine_exercises",
  "workouts",
  "workout_exercises",
  "workout_sets",
  "body_weight_entries",
] as const;

export type TableName = (typeof TABLES)[number];
