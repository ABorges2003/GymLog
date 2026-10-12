import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { Phase, PhaseInput } from "@/lib/body-weight-phases";

type PhaseRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
};

function toPhase(row: PhaseRow): Phase {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

// All phases, the most recent start first.
export async function getPhases(db: SQLiteDatabase): Promise<Phase[]> {
  const rows = await db.getAllAsync<PhaseRow>(
    `SELECT id, name, start_date, end_date FROM body_weight_phases
     ORDER BY start_date DESC, created_at DESC`,
  );
  return rows.map(toPhase);
}

export async function getPhaseById(
  db: SQLiteDatabase,
  id: string,
): Promise<Phase | null> {
  const row = await db.getFirstAsync<PhaseRow>(
    "SELECT id, name, start_date, end_date FROM body_weight_phases WHERE id = ?",
    id,
  );
  return row ? toPhase(row) : null;
}

// Returns the new phase's id.
export async function createPhase(
  db: SQLiteDatabase,
  phase: PhaseInput,
  now: Date = new Date(),
): Promise<string> {
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO body_weight_phases (id, name, start_date, end_date, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    phase.name,
    phase.startDate,
    phase.endDate,
    now.toISOString(),
  );
  return id;
}

export async function updatePhase(
  db: SQLiteDatabase,
  id: string,
  phase: PhaseInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE body_weight_phases SET name = ?, start_date = ?, end_date = ?
     WHERE id = ?`,
    phase.name,
    phase.startDate,
    phase.endDate,
    id,
  );
}

// Only the phase goes: the body weight entries stay.
export async function deletePhase(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM body_weight_phases WHERE id = ?", id);
}
