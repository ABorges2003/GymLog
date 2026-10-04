export type Workout = {
  id: string;
  // ISO 8601 timestamps.
  startedAt: string;
  // null while the workout is in progress.
  finishedAt: string | null;
  notes: string | null;
  routineId: string | null;
};
