import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { addDaysToKey } from "@/lib/dates";
import { cleanupCutoffs, repeatsOn } from "@/lib/planner";
import type {
  AgendaEvent,
  AgendaEventInput,
  DayTask,
  RecurringTask,
  ReminderMinutes,
} from "@/types/planner";

type TaskRow = {
  id: string;
  date: string;
  title: string;
  done: number;
  recurring_id: string | null;
};

function toTask(row: TaskRow): DayTask {
  return {
    id: row.id,
    date: row.date,
    title: row.title,
    done: row.done === 1,
    recurringId: row.recurring_id,
  };
}

// Tasks of a day: the repeating ones first, then the others in the order
// they were added. Repeating tasks that fall on the day get their row the
// first time the day is read.
export async function getTasks(
  db: SQLiteDatabase,
  date: string,
  now: Date = new Date(),
): Promise<DayTask[]> {
  await addRecurringTasksOf(db, date, now);
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT id, date, title, done, recurring_id FROM day_tasks
     WHERE date = ? AND skipped = 0
     ORDER BY recurring_id IS NULL, created_at, rowid`,
    date,
  );
  return rows.map(toTask);
}

// Adds the day's row of each repeating task that falls on it, unless it is
// already there (also when skipped or renamed).
async function addRecurringTasksOf(
  db: SQLiteDatabase,
  date: string,
  now: Date,
): Promise<void> {
  const tasks = (await getRecurringTasks(db)).filter((task) =>
    repeatsOn(task, date),
  );
  for (const task of tasks) {
    await db.runAsync(
      `INSERT OR IGNORE INTO day_tasks (id, date, title, done, created_at, recurring_id)
       VALUES (?, ?, ?, 0, ?, ?)`,
      randomUUID(),
      date,
      task.title,
      now.toISOString(),
      task.id,
    );
  }
}

// Hides a repeating task on one day only (it doesn't come back that day).
export async function skipTask(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("UPDATE day_tasks SET skipped = 1 WHERE id = ?", id);
}

type RecurringRow = {
  id: string;
  title: string;
  weekdays: number;
  start_date: string;
  end_date: string | null;
};

function toRecurring(row: RecurringRow): RecurringTask {
  return {
    id: row.id,
    title: row.title,
    weekdays: row.weekdays,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

// Repeating tasks that have not been stopped, by title.
export async function getRecurringTasks(
  db: SQLiteDatabase,
): Promise<RecurringTask[]> {
  const rows = await db.getAllAsync<RecurringRow>(
    `SELECT id, title, weekdays, start_date, end_date FROM recurring_tasks
     WHERE end_date IS NULL ORDER BY title COLLATE NOCASE`,
  );
  return rows.map(toRecurring);
}

export async function getRecurringTaskById(
  db: SQLiteDatabase,
  id: string,
): Promise<RecurringTask | null> {
  const row = await db.getFirstAsync<RecurringRow>(
    `SELECT id, title, weekdays, start_date, end_date FROM recurring_tasks
     WHERE id = ?`,
    id,
  );
  return row ? toRecurring(row) : null;
}

// Returns the new repeating task's id.
export async function createRecurringTask(
  db: SQLiteDatabase,
  task: { title: string; weekdays: number; startDate: string },
  now: Date = new Date(),
): Promise<string> {
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO recurring_tasks (id, title, weekdays, start_date, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    task.title,
    task.weekdays,
    task.startDate,
    now.toISOString(),
  );
  return id;
}

// Changes the title or the days. From `today` on, the days not done yet
// follow the change (their rows are made again when each day is read).
export async function updateRecurringTask(
  db: SQLiteDatabase,
  id: string,
  task: { title: string; weekdays: number },
  today: string,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      "UPDATE recurring_tasks SET title = ?, weekdays = ? WHERE id = ?",
      task.title,
      task.weekdays,
      id,
    );
    await txn.runAsync(
      `DELETE FROM day_tasks
       WHERE recurring_id = ? AND date >= ? AND done = 0 AND skipped = 0`,
      id,
      today,
    );
  });
}

// Stops repeating from `from` on (that day included): those days lose the
// task unless already done. The days before stay as they are. A repetition
// that never got to start is deleted.
export async function stopRecurringTask(
  db: SQLiteDatabase,
  id: string,
  from: string,
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      "DELETE FROM day_tasks WHERE recurring_id = ? AND date >= ? AND done = 0",
      id,
      from,
    );
    await txn.runAsync(
      "DELETE FROM recurring_tasks WHERE id = ? AND start_date >= ?",
      id,
      from,
    );
    await txn.runAsync(
      "UPDATE recurring_tasks SET end_date = ? WHERE id = ?",
      addDaysToKey(from, -1),
      id,
    );
  });
}

// Returns the new task's id.
export async function addTask(
  db: SQLiteDatabase,
  date: string,
  title: string,
  now: Date = new Date(),
): Promise<string> {
  const id = randomUUID();
  await db.runAsync(
    "INSERT INTO day_tasks (id, date, title, done, created_at) VALUES (?, ?, ?, 0, ?)",
    id,
    date,
    title,
    now.toISOString(),
  );
  return id;
}

export async function renameTask(
  db: SQLiteDatabase,
  id: string,
  title: string,
): Promise<void> {
  await db.runAsync("UPDATE day_tasks SET title = ? WHERE id = ?", title, id);
}

export async function setTaskDone(
  db: SQLiteDatabase,
  id: string,
  done: boolean,
): Promise<void> {
  await db.runAsync(
    "UPDATE day_tasks SET done = ? WHERE id = ?",
    done ? 1 : 0,
    id,
  );
}

// Moves a task to another day (at the end of that day's list).
export async function moveTask(
  db: SQLiteDatabase,
  id: string,
  date: string,
  now: Date = new Date(),
): Promise<void> {
  await db.runAsync(
    "UPDATE day_tasks SET date = ?, created_at = ? WHERE id = ?",
    date,
    now.toISOString(),
    id,
  );
}

export async function deleteTask(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM day_tasks WHERE id = ?", id);
}

type EventRow = {
  id: string;
  date: string;
  time: string;
  title: string;
  notes: string | null;
  remind_minutes: ReminderMinutes | null;
};

function toEvent(row: EventRow): AgendaEvent {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    title: row.title,
    notes: row.notes,
    remindMinutes: row.remind_minutes,
  };
}

const EVENT_COLUMNS = "id, date, time, title, notes, remind_minutes";

// Events from a day on (that day included), soonest first.
export async function getEventsFrom(
  db: SQLiteDatabase,
  date: string,
): Promise<AgendaEvent[]> {
  const rows = await db.getAllAsync<EventRow>(
    `SELECT ${EVENT_COLUMNS} FROM agenda_events
     WHERE date >= ? ORDER BY date, time, created_at`,
    date,
  );
  return rows.map(toEvent);
}

// Events before a day, most recent first.
export async function getEventsBefore(
  db: SQLiteDatabase,
  date: string,
): Promise<AgendaEvent[]> {
  const rows = await db.getAllAsync<EventRow>(
    `SELECT ${EVENT_COLUMNS} FROM agenda_events
     WHERE date < ? ORDER BY date DESC, time DESC`,
    date,
  );
  return rows.map(toEvent);
}

export async function getEventById(
  db: SQLiteDatabase,
  id: string,
): Promise<AgendaEvent | null> {
  const row = await db.getFirstAsync<EventRow>(
    `SELECT ${EVENT_COLUMNS} FROM agenda_events WHERE id = ?`,
    id,
  );
  return row ? toEvent(row) : null;
}

// Returns the new event's id.
export async function createEvent(
  db: SQLiteDatabase,
  event: AgendaEventInput,
  now: Date = new Date(),
): Promise<string> {
  const id = randomUUID();
  await db.runAsync(
    `INSERT INTO agenda_events (id, date, time, title, notes, remind_minutes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    event.date,
    event.time,
    event.title,
    event.notes,
    event.remindMinutes,
    now.toISOString(),
  );
  return id;
}

export async function updateEvent(
  db: SQLiteDatabase,
  id: string,
  event: AgendaEventInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE agenda_events
     SET date = ?, time = ?, title = ?, notes = ?, remind_minutes = ?
     WHERE id = ?`,
    event.date,
    event.time,
    event.title,
    event.notes,
    event.remindMinutes,
    id,
  );
}

export async function deleteEvent(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM agenda_events WHERE id = ?", id);
}

// Deletes old tasks and events (see the KEEP_* rules in lib/planner). Their
// days are long past, so no reminder is left to cancel. Returns how many
// rows were deleted.
export async function cleanupPlanner(
  db: SQLiteDatabase,
  today: string,
): Promise<number> {
  const cutoffs = cleanupCutoffs(today);
  let deleted = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const done = await txn.runAsync(
      "DELETE FROM day_tasks WHERE done = 1 AND date < ?",
      cutoffs.doneTasksBefore,
    );
    const open = await txn.runAsync(
      "DELETE FROM day_tasks WHERE done = 0 AND date < ?",
      cutoffs.openTasksBefore,
    );
    const events = await txn.runAsync(
      "DELETE FROM agenda_events WHERE date < ?",
      cutoffs.eventsBefore,
    );
    // Repetitions stopped long ago: their days are gone by now too.
    const stopped = await txn.runAsync(
      "DELETE FROM recurring_tasks WHERE end_date < ?",
      cutoffs.openTasksBefore,
    );
    deleted =
      done.changes + open.changes + events.changes + stopped.changes;
  });
  return deleted;
}
