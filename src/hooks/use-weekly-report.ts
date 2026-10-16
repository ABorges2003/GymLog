import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback } from "react";
import { Alert } from "react-native";

import { getBodyWeightBetween } from "@/db/repositories/body-weight";
import { getDailyTotals } from "@/db/repositories/diet";
import {
  WEEKLY_REPORT_BOLD_ROWS,
  buildWeeklyReport,
  isWeeklyReportFileName,
  lastWeekDays,
  weeklyReportFileName,
  weeklyReportRows,
  type WeeklyReport,
} from "@/lib/weekly-report";
import { buildXlsx } from "@/lib/xlsx";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Loads last week's summary (body weight and what was eaten each day) and
// exports it as an Excel file to share. Nothing is stored: it is worked out
// from the logs each time.
export function useWeeklyReport() {
  const db = useSQLiteContext();

  // Summary of the week before the one `today` is in.
  const load = useCallback(
    async (today: string): Promise<WeeklyReport> => {
      const days = lastWeekDays(today);
      const from = days[0];
      const to = days[days.length - 1];
      const [weights, totals] = await Promise.all([
        getBodyWeightBetween(db, from, to),
        getDailyTotals(db, from, to),
      ]);
      return buildWeeklyReport(days, weights, totals);
    },
    [db],
  );

  // Writes the .xlsx to the app cache and opens the share menu (save to the
  // phone, Drive, send it...).
  const exportExcel = useCallback(async (report: WeeklyReport) => {
    try {
      // Earlier ones would pile up in the cache, one per week.
      for (const item of new Directory(Paths.cache).list()) {
        if (item instanceof File && isWeeklyReportFileName(item.name)) {
          item.delete();
        }
      }
    } catch {
      // Not worth stopping the export for.
    }
    try {
      const file = new File(Paths.cache, weeklyReportFileName(report.start));
      if (file.exists) file.delete();
      file.create();
      file.write(
        buildXlsx("Semana", weeklyReportRows(report), {
          boldRows: WEEKLY_REPORT_BOLD_ROWS,
          columnWidths: [8, 12, 10, 8, 13, 11, 12],
        }),
      );
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          "Erro",
          "Não é possível partilhar ficheiros neste aparelho.",
        );
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: XLSX_MIME,
        dialogTitle: "Guardar o resumo da semana",
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });
    } catch {
      Alert.alert("Erro", "Não foi possível criar o ficheiro Excel.");
    }
  }, []);

  return { load, exportExcel };
}
