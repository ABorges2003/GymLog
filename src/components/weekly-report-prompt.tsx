import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";

import { WeeklyReportPopup } from "@/components/weekly-report-popup";
import { getSetting, setSetting } from "@/db/repositories/settings";
import { useToday } from "@/hooks/use-today";
import { useWeeklyReport } from "@/hooks/use-weekly-report";
import {
  hasWeeklyData,
  shouldShowWeeklyReport,
  type WeeklyReport,
} from "@/lib/weekly-report";

// Shows last week's summary once a week: the first time the app opens (or
// comes back) from Monday on, if that week has any weight or meal logged.
// The day it was shown is saved, which also keeps it in Settings for a day
// or two (weeklyReportInSettings). Must be inside SQLiteProvider and
// ThemeProvider.
export function WeeklyReportPrompt() {
  const db = useSQLiteContext();
  const today = useToday();
  const { load, exportExcel } = useWeeklyReport();
  const [report, setReport] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    let active = true;
    getSetting(db, "weekly_report_shown")
      .then(async (shownOn) => {
        if (!shouldShowWeeklyReport(today, shownOn)) return;
        const next = await load(today);
        if (!active) return;
        // An empty week is not shown, but not asked about again either.
        if (hasWeeklyData(next)) setReport(next);
        await setSetting(db, "weekly_report_shown", today);
      })
      .catch(() => {
        // It will be tried again the next time the app opens.
      });
    return () => {
      active = false;
    };
  }, [db, today, load]);

  if (!report) return null;

  return (
    <WeeklyReportPopup
      report={report}
      onExport={exportExcel}
      onClose={() => setReport(null)}
    />
  );
}
