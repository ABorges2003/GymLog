// Agenda tab: day-to-day tasks and agenda events.

// A task of a day, ticked when done.
export type DayTask = {
  id: string;
  // Local date "YYYY-MM-DD".
  date: string;
  title: string;
  done: boolean;
  // The repetition it comes from, or null for a one-off task.
  recurringId: string | null;
};

// A task that comes back on some days of every week.
export type RecurringTask = {
  id: string;
  title: string;
  // Days of the week as bits: 1 << 0 = Sunday ... 1 << 6 = Saturday.
  weekdays: number;
  // Local dates "YYYY-MM-DD"; no end while it keeps repeating.
  startDate: string;
  endDate: string | null;
};

// How long before an event its reminder goes off, in minutes.
export const REMINDER_MINUTES = [15, 60, 1440] as const;
export type ReminderMinutes = (typeof REMINDER_MINUTES)[number];

// Something important on a given day and time, e.g. an appointment.
export type AgendaEvent = {
  id: string;
  // Local date "YYYY-MM-DD" and local time "HH:MM".
  date: string;
  time: string;
  title: string;
  notes: string | null;
  // null: no reminder.
  remindMinutes: ReminderMinutes | null;
};

export type AgendaEventInput = Omit<AgendaEvent, "id">;
