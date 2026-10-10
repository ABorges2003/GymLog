const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

// Local date of an ISO timestamp in Portuguese, e.g. "Domingo, 4 de outubro".
// The year is added only when it is not the current one.
export function formatLongDate(iso: string, today: Date = new Date()): string {
  const date = new Date(iso);
  const weekday = WEEKDAYS[date.getDay()];
  const text = `${weekday}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
  const withYear =
    date.getFullYear() === today.getFullYear()
      ? text
      : `${text} de ${date.getFullYear()}`;
  return withYear.charAt(0).toUpperCase() + withYear.slice(1);
}

const pad = (value: number) => String(value).padStart(2, "0");

// Local clock time of an ISO timestamp, e.g. "18:32".
export function formatClockTime(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Short local date, e.g. "4/10".
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

// Local calendar day as "YYYY-MM-DD" (how body weight dates are stored).
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDaysToKey(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

// "Hoje", "Ontem" or e.g. "Sábado, 3 de outubro".
export function formatDayLabel(key: string, today: Date = new Date()): string {
  const todayKey = toDateKey(today);
  if (key === todayKey) return "Hoje";
  if (key === addDaysToKey(todayKey, -1)) return "Ontem";
  return formatLongDate(dateFromKey(key).toISOString(), today);
}

// Time between two moments as a stopwatch: "0:07", "42:13", "1:05:09".
// Negative spans (a clock moved back) count as zero.
export function formatElapsed(fromIso: string, to: Date = new Date()): string {
  const total = Math.max(
    0,
    Math.floor((to.getTime() - new Date(fromIso).getTime()) / 1000),
  );
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}
