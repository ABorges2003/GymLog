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
