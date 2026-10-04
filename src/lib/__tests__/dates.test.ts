import { formatLongDate } from "@/lib/dates";

describe("formatLongDate", () => {
  const today = new Date(2026, 9, 4);

  it("shows weekday, day and month in Portuguese", () => {
    const date = new Date(2026, 9, 4, 18, 30);
    expect(formatLongDate(date.toISOString(), today)).toBe(
      "Domingo, 4 de outubro",
    );
  });

  it("adds the year when it is not the current one", () => {
    const date = new Date(2025, 11, 31, 10, 0);
    expect(formatLongDate(date.toISOString(), today)).toBe(
      "Quarta-feira, 31 de dezembro de 2025",
    );
  });
});
