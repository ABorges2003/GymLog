import type { SQLiteDatabase } from "expo-sqlite";

import {
  addTask,
  cleanupPlanner,
  createEvent,
  createRecurringTask,
  deleteEvent,
  deleteTask,
  getEventById,
  getEventsBefore,
  getEventsFrom,
  getRecurringTaskById,
  getRecurringTasks,
  getTasks,
  moveTask,
  renameTask,
  setTaskDone,
  skipTask,
  stopRecurringTask,
  updateEvent,
  updateRecurringTask,
} from "@/db/repositories/planner";
import { createTestDatabase } from "@/test-utils/sqlite";

// expo-crypto is a native module; use Node's UUIDs in tests.
jest.mock("expo-crypto", () => ({
  randomUUID: () => require("node:crypto").randomUUID(),
}));

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createTestDatabase();
});

const event = {
  date: "2026-10-20",
  time: "15:30",
  title: "Dentista",
  notes: null,
  remindMinutes: 60 as const,
};

describe("day tasks", () => {
  it("adds, ticks, renames and deletes the tasks of a day", async () => {
    const first = await addTask(db, "2026-10-13", "Comprar aveia");
    await addTask(db, "2026-10-13", "Ligar ao ginásio");
    await addTask(db, "2026-10-14", "Amanhã");

    await setTaskDone(db, first, true);
    await renameTask(db, first, "Comprar aveia e leite");
    expect(await getTasks(db, "2026-10-13")).toEqual([
      expect.objectContaining({ title: "Comprar aveia e leite", done: true }),
      expect.objectContaining({ title: "Ligar ao ginásio", done: false }),
    ]);

    await deleteTask(db, first);
    expect(await getTasks(db, "2026-10-13")).toHaveLength(1);
  });

  it("moves a task to the end of another day", async () => {
    await addTask(db, "2026-10-14", "Já lá estava", new Date(2026, 9, 1));
    const id = await addTask(db, "2026-10-13", "Passar para amanhã");
    await moveTask(db, id, "2026-10-14", new Date(2026, 9, 13));
    expect(await getTasks(db, "2026-10-13")).toEqual([]);
    expect((await getTasks(db, "2026-10-14")).map((t) => t.title)).toEqual([
      "Já lá estava",
      "Passar para amanhã",
    ]);
  });
});

describe("agenda events", () => {
  it("creates, edits and deletes an event", async () => {
    const id = await createEvent(db, event);
    expect(await getEventById(db, id)).toEqual({ id, ...event });

    await updateEvent(db, id, { ...event, notes: "Levar o cartão", remindMinutes: null });
    expect(await getEventById(db, id)).toEqual({
      id,
      ...event,
      notes: "Levar o cartão",
      remindMinutes: null,
    });

    await deleteEvent(db, id);
    expect(await getEventById(db, id)).toBeNull();
  });

  it("lists coming events soonest first and past ones most recent first", async () => {
    await createEvent(db, { ...event, date: "2026-10-21", title: "C" });
    await createEvent(db, { ...event, time: "09:00", title: "A" });
    await createEvent(db, { ...event, title: "B" });
    await createEvent(db, { ...event, date: "2026-10-01", title: "Antigo" });
    await createEvent(db, { ...event, date: "2026-10-10", title: "Recente" });

    const coming = await getEventsFrom(db, "2026-10-13");
    expect(coming.map((e) => e.title)).toEqual(["A", "B", "C"]);
    const past = await getEventsBefore(db, "2026-10-13");
    expect(past.map((e) => e.title)).toEqual(["Recente", "Antigo"]);
  });

  it("rejects a reminder time that is not one of the options", async () => {
    await expect(
      db.runAsync(
        `INSERT INTO agenda_events (id, date, time, title, remind_minutes, created_at)
         VALUES ('x', '2026-10-20', '10:00', 'Mau', 30, '2026-10-13')`,
      ),
    ).rejects.toThrow();
  });
});

describe("clean-up", () => {
  it("deletes old done tasks, forgotten tasks and events of over a year ago", async () => {
    const today = "2026-10-13";
    const keepDone = await addTask(db, "2026-09-13", "Feita há 30 dias");
    await setTaskDone(db, keepDone, true);
    const oldDone = await addTask(db, "2026-09-12", "Feita há 31 dias");
    await setTaskDone(db, oldDone, true);
    await addTask(db, "2026-09-12", "Por fazer há 31 dias");
    await addTask(db, "2026-07-14", "Por fazer há 91 dias");
    await createEvent(db, { ...event, date: "2025-10-13", title: "Há um ano" });
    await createEvent(db, { ...event, date: "2025-10-12", title: "Há mais de um ano" });

    expect(await cleanupPlanner(db, today)).toBe(3);

    const tasks = await db.getAllAsync<{ title: string }>(
      "SELECT title FROM day_tasks ORDER BY title",
    );
    expect(tasks.map((t) => t.title)).toEqual([
      "Feita há 30 dias",
      "Por fazer há 31 dias",
    ]);
    const events = await getEventsBefore(db, today);
    expect(events.map((e) => e.title)).toEqual(["Há um ano"]);
  });
});

describe("repeating tasks", () => {
  // 2026-10-13 is a Tuesday; Tuesdays and Thursdays.
  const walk = { title: "Passear a cadela", weekdays: (1 << 2) | (1 << 4) };

  async function titles(date: string) {
    return (await getTasks(db, date)).map((task) => task.title);
  }

  it("shows up on its days, first and only once", async () => {
    await addTask(db, "2026-10-13", "Comprar aveia");
    await createRecurringTask(db, { ...walk, startDate: "2026-10-13" });

    expect(await titles("2026-10-13")).toEqual([
      "Passear a cadela",
      "Comprar aveia",
    ]);
    expect(await titles("2026-10-13")).toHaveLength(2);
    expect(await titles("2026-10-14")).toEqual([]); // Wednesday
    expect(await titles("2026-10-15")).toEqual(["Passear a cadela"]);
    expect(await titles("2026-10-20")).toEqual(["Passear a cadela"]);
    expect(await titles("2026-10-08")).toEqual([]); // before it started
  });

  it("is ticked, renamed or skipped one day at a time", async () => {
    await createRecurringTask(db, { ...walk, startDate: "2026-10-13" });
    const [tuesday] = await getTasks(db, "2026-10-13");
    expect(tuesday.recurringId).not.toBeNull();
    await setTaskDone(db, tuesday.id, true);
    await renameTask(db, tuesday.id, "Passear a cadela no parque");

    const [thursday] = await getTasks(db, "2026-10-15");
    await skipTask(db, thursday.id);

    expect(await getTasks(db, "2026-10-13")).toEqual([
      expect.objectContaining({
        title: "Passear a cadela no parque",
        done: true,
      }),
    ]);
    expect(await getTasks(db, "2026-10-15")).toEqual([]);
    expect(await titles("2026-10-20")).toEqual(["Passear a cadela"]);
  });

  it("changes the days still to come, not the ones done", async () => {
    const id = await createRecurringTask(db, {
      ...walk,
      startDate: "2026-10-13",
    });
    const [tuesday] = await getTasks(db, "2026-10-13");
    await setTaskDone(db, tuesday.id, true);
    await getTasks(db, "2026-10-15");

    // From Wednesday on: only on Saturdays, with another name.
    await updateRecurringTask(
      db,
      id,
      { title: "Levar o lixo", weekdays: 1 << 6 },
      "2026-10-14",
    );

    expect(await titles("2026-10-13")).toEqual(["Passear a cadela"]);
    expect(await titles("2026-10-15")).toEqual([]);
    expect(await titles("2026-10-17")).toEqual(["Levar o lixo"]);
  });

  it("stops, keeping the days already done", async () => {
    const id = await createRecurringTask(db, {
      ...walk,
      startDate: "2026-10-13",
    });
    const [tuesday] = await getTasks(db, "2026-10-13");
    await setTaskDone(db, tuesday.id, true);
    await getTasks(db, "2026-10-15");

    await stopRecurringTask(db, id, "2026-10-14");

    expect(await titles("2026-10-13")).toEqual(["Passear a cadela"]);
    expect(await titles("2026-10-15")).toEqual([]);
    expect(await getRecurringTasks(db)).toEqual([]);
    expect((await getRecurringTaskById(db, id))?.endDate).toBe("2026-10-13");
  });

  it("is deleted when stopped before it started", async () => {
    const id = await createRecurringTask(db, {
      ...walk,
      startDate: "2026-10-20",
    });
    await stopRecurringTask(db, id, "2026-10-13");
    expect(await getRecurringTaskById(db, id)).toBeNull();
  });

  it("is cleaned up some time after being stopped", async () => {
    const id = await createRecurringTask(db, {
      ...walk,
      startDate: "2026-01-06",
    });
    await stopRecurringTask(db, id, "2026-03-01");
    await cleanupPlanner(db, "2026-10-13");
    expect(await getRecurringTaskById(db, id)).toBeNull();
  });
});
