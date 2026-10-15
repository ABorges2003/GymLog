import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { toDateKey } from "@/lib/dates";

// Today's local date ("YYYY-MM-DD"), kept up to date: Android keeps the app
// in memory overnight, so a value worked out once would still say yesterday
// in the morning. It changes when the app comes back to the screen and at
// midnight while it is open.
export function useToday(): string {
  const [today, setToday] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    // Same string as before: React skips the re-render.
    const refresh = () => setToday(toDateKey(new Date()));

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleMidnight = () => {
      const now = new Date();
      const midnight = new Date(now);
      // A second past midnight, so the new day has surely started.
      midnight.setHours(24, 0, 1, 0);
      timer = setTimeout(() => {
        refresh();
        scheduleMidnight();
      }, midnight.getTime() - now.getTime());
    };
    scheduleMidnight();

    return () => {
      subscription.remove();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return today;
}

// The day chosen with ‹ › on a screen, and today. While the user is on
// today, the chosen day follows it when the date changes (e.g. the app was
// left open overnight); a day picked on purpose stays as it is.
export function useSelectedDay() {
  const today = useToday();
  const [date, setDate] = useState(today);
  const [lastToday, setLastToday] = useState(today);

  // Adjusting state while rendering (React's pattern for derived state): the
  // screen never shows yesterday as "today" for even one frame.
  if (lastToday !== today) {
    setLastToday(today);
    if (date === lastToday) setDate(today);
  }

  return { date, setDate, today };
}
