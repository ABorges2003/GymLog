import {
  EVERY_DAY,
  WORK_DAYS,
  cleanTitle,
  cleanupCutoffs,
  describeWeekdays,
  eventStart,
  groupEventsByDate,
  isValidTime,
  newEventDefaults,
  reminderAt,
  reminderBody,
  repeatsOn,
  toTimeKey,
  toggleWeekday,
  validateEvent,
} from "@/lib/planner";

describe("cleanTitle", () => {
  it("trims and joins spaces, and rejects empty or long titles", () => {
    expect(cleanTitle("  Comprar   aveia ", 20)).toBe("Comprar aveia");
    expect(cleanTitle("   ", 20)).toBeNull();
    expect(cleanTitle("x".repeat(21), 20)).toBeNull();
  });
});

describe("times", () => {
  it("accepts only HH:MM times of a day", () => {
    expect(isValidTime("09:05")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("9:05")).toBe(false);
  });

  it("formats a local time", () => {
    expect(toTimeKey(new Date(2026, 9, 13, 7, 3))).toBe("07:03");
  });
});

describe("reminders", () => {
  const event = { date: "2026-10-20", time: "15:30" };

  it("starts at the local date and time", () => {
    expect(eventStart(event)).toEqual(new Date(2026, 9, 20, 15, 30));
  });

  it("goes off the chosen minutes before, or never", () => {
    expect(reminderAt({ ...event, remindMinutes: 60 })).toEqual(
      new Date(2026, 9, 20, 14, 30),
    );
    expect(reminderAt({ ...event, remindMinutes: 1440 })).toEqual(
      new Date(2026, 9, 19, 15, 30),
    );
    expect(reminderAt({ ...event, remindMinutes: null })).toBeNull();
  });
});

describe("validateEvent", () => {
  const input = {
    date: "2026-10-20",
    time: "15:30",
    title: " Dentista ",
    notes: "  ",
    remindMinutes: 60 as const,
  };

  it("cleans the title and drops empty notes", () => {
    expect(validateEvent(input)).toEqual({
      ok: true,
      event: { ...input, title: "Dentista", notes: null },
    });
  });

  it("needs a title and a valid time", () => {
    expect(validateEvent({ ...input, title: "" }).ok).toBe(false);
    expect(validateEvent({ ...input, time: "25:00" }).ok).toBe(false);
  });
});

describe("groupEventsByDate", () => {
  it("groups consecutive events of the same day", () => {
    const events = [
      { id: "a", date: "2026-10-20" },
      { id: "b", date: "2026-10-20" },
      { id: "c", date: "2026-10-22" },
    ];
    expect(groupEventsByDate(events)).toEqual([
      { date: "2026-10-20", events: [events[0], events[1]] },
      { date: "2026-10-22", events: [events[2]] },
    ]);
  });
});

describe("cleanupCutoffs", () => {
  it("keeps done tasks 30 days, open ones 90 and events 12 months", () => {
    expect(cleanupCutoffs("2026-10-13")).toEqual({
      doneTasksBefore: "2026-09-13",
      openTasksBefore: "2026-07-15",
      eventsBefore: "2025-10-13",
    });
  });
});

describe("reminderBody", () => {
  it("says when the event is, then its notes", () => {
    expect(
      reminderBody({ time: "15:30", notes: null, remindMinutes: 60 }),
    ).toBe("Daqui a 1 hora, às 15:30");
    expect(
      reminderBody({ time: "09:00", notes: "Em jejum", remindMinutes: 1440 }),
    ).toBe("Amanhã, às 09:00\nEm jejum");
  });
});

describe("newEventDefaults", () => {
  it("starts at the next full hour with a reminder an hour before", () => {
    expect(
      newEventDefaults("2026-10-20", new Date(2026, 9, 13, 14, 25)),
    ).toEqual({
      date: "2026-10-20",
      time: "15:00",
      title: "",
      notes: null,
      remindMinutes: 60,
    });
  });

  it("uses 09:00 late at night", () => {
    expect(
      newEventDefaults("2026-10-14", new Date(2026, 9, 13, 23, 30)).time,
    ).toBe("09:00");
  });
});

// 2026-10-13 is a Tuesday.
const TUESDAY = 2;
const THURSDAY = 4;
const SATURDAY = 6;
const tueThu = (1 << TUESDAY) | (1 << THURSDAY);

describe("repeating tasks", () => {
  it("falls on its weekdays, from its start and until its end", () => {
    const task = { weekdays: tueThu, startDate: "2026-10-13", endDate: null };
    expect(repeatsOn(task, "2026-10-13")).toBe(true); // Tuesday
    expect(repeatsOn(task, "2026-10-14")).toBe(false); // Wednesday
    expect(repeatsOn(task, "2026-10-15")).toBe(true); // Thursday
    expect(repeatsOn(task, "2026-10-08")).toBe(false); // before the start
    expect(repeatsOn({ ...task, endDate: "2026-10-14" }, "2026-10-15")).toBe(
      false,
    );
  });

  it("turns a weekday on and off", () => {
    expect(toggleWeekday(tueThu, TUESDAY)).toBe(1 << THURSDAY);
    expect(toggleWeekday(1 << THURSDAY, TUESDAY)).toBe(tueThu);
  });

  it("describes the days in words", () => {
    expect(describeWeekdays(EVERY_DAY)).toBe("Todos os dias");
    expect(describeWeekdays(WORK_DAYS)).toBe("Dias úteis");
    expect(describeWeekdays(1 << SATURDAY)).toBe("Todos os sábados");
    expect(describeWeekdays(1 << TUESDAY)).toBe("Todas as terças");
    expect(describeWeekdays(tueThu)).toBe("Ter e Qui");
    expect(describeWeekdays(tueThu | 1)).toBe("Ter, Qui e Dom");
  });
});
