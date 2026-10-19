import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";

import {
  addTask,
  deleteTask,
  getTasks,
  moveTask,
  renameTask,
  setTaskDone,
  skipTask,
  stopRecurringTask,
} from "@/db/repositories/planner";
import { addDaysToKey } from "@/lib/dates";
import type { DayTask } from "@/types/planner";

// Tasks of a day (null while loading). Reloads on focus and when the day
// changes; every change reloads the list.
export function useDayTasks(date: string) {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<DayTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getTasks(db, date)
        .then((result) => {
          if (!active) return;
          setTasks(result);
          // A failed read earlier (e.g. the database was busy) is over.
          setError(null);
        })
        .catch((e: unknown) => {
          if (active) setError(String(e));
        });
      return () => {
        active = false;
      };
    }, [db, date]),
  );

  const reload = useCallback(async () => {
    setTasks(await getTasks(db, date));
    setError(null);
  }, [db, date]);

  const add = useCallback(
    async (title: string) => {
      await addTask(db, date, title);
      await reload();
    },
    [db, date, reload],
  );

  // Ticks the task right away, then saves (a tick should feel instant).
  const toggle = useCallback(
    async (task: DayTask) => {
      setTasks((current) =>
        current?.map((item) =>
          item.id === task.id ? { ...item, done: !task.done } : item,
        ) ?? null,
      );
      try {
        await setTaskDone(db, task.id, !task.done);
      } finally {
        await reload();
      }
    },
    [db, reload],
  );

  const rename = useCallback(
    async (task: DayTask, title: string) => {
      await renameTask(db, task.id, title);
      await reload();
    },
    [db, reload],
  );

  const moveToNextDay = useCallback(
    async (task: DayTask) => {
      await moveTask(db, task.id, addDaysToKey(task.date, 1));
      await reload();
    },
    [db, reload],
  );

  // A repeating task is only skipped that day; others are deleted.
  const remove = useCallback(
    async (task: DayTask) => {
      if (task.recurringId) await skipTask(db, task.id);
      else await deleteTask(db, task.id);
      await reload();
    },
    [db, reload],
  );

  // Stops a repeating task from this task's day on.
  const stopRepeating = useCallback(
    async (task: DayTask) => {
      if (!task.recurringId) return;
      await stopRecurringTask(db, task.recurringId, task.date);
      await reload();
    },
    [db, reload],
  );

  return {
    tasks,
    error,
    add,
    toggle,
    rename,
    moveToNextDay,
    remove,
    stopRepeating,
  };
}
