import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";

import { RecurringTaskForm } from "@/components/recurring-task-form";
import { createRecurringTask } from "@/db/repositories/planner";
import { toDateKey } from "@/lib/dates";
import { EVERY_DAY } from "@/lib/planner";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

// A new task that repeats every week, from the given day (or today) on.
export default function NewRecurringTaskScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; title?: string }>();
  const today = toDateKey(new Date());
  // Never earlier than today: past days are left as they were.
  const startDate =
    params.date && DATE_KEY.test(params.date) && params.date > today
      ? params.date
      : today;

  return (
    <RecurringTaskForm
      initial={{ title: params.title ?? "", weekdays: EVERY_DAY }}
      submitLabel="Criar"
      onSubmit={async (task) => {
        await createRecurringTask(db, { ...task, startDate });
        router.back();
      }}
    />
  );
}
