import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";

import { EventForm } from "@/components/event-form";
import { warnAboutReminder } from "@/components/reminder-warning";
import { createEvent } from "@/db/repositories/planner";
import { toDateKey } from "@/lib/dates";
import { newEventDefaults } from "@/lib/planner";
import { applyEventReminder } from "@/notifications/agenda-reminders";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

// Adds an event to the agenda (on the given day, or today).
export default function NewEventScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const [initial] = useState(() =>
    newEventDefaults(
      params.date && DATE_KEY.test(params.date)
        ? params.date
        : toDateKey(new Date()),
    ),
  );

  return (
    <EventForm
      initial={initial}
      submitLabel="Guardar evento"
      onSubmit={async (event) => {
        const id = await createEvent(db, event);
        warnAboutReminder(await applyEventReminder({ id, ...event }));
        router.back();
      }}
    />
  );
}
