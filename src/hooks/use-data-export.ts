import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback } from "react";
import { Alert } from "react-native";

import { getBodyWeightBetween } from "@/db/repositories/body-weight";
import { getDailyTotals } from "@/db/repositories/diet";
import { getDataRange } from "@/db/repositories/reports";
import {
  buildDataReport,
  daysBetween,
  isReportFileName,
  reportBoldRows,
  reportFileName,
  reportRows,
  type DataReport,
  type DateRange,
} from "@/lib/data-report";
import { buildXlsx } from "@/lib/xlsx";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Body weight and diet of a range of days, and their export as an Excel file
// to share. Nothing is stored: it is worked out from the logs each time.
export function useDataExport() {
  const db = useSQLiteContext();

  // First and last day with any data (null when there is none).
  const loadRange = useCallback(() => getDataRange(db), [db]);

  const load = useCallback(
    async (range: DateRange): Promise<DataReport> => {
      const days = daysBetween(range.from, range.to);
      const from = days[0];
      const to = days[days.length - 1];
      const [weights, totals] = await Promise.all([
        getBodyWeightBetween(db, from, to),
        getDailyTotals(db, from, to),
      ]);
      return buildDataReport(days, weights, totals);
    },
    [db],
  );

  // Writes the .xlsx to the app cache and opens the share menu (save to the
  // phone, Drive, send it...).
  const exportExcel = useCallback(async (report: DataReport) => {
    try {
      // Earlier ones would pile up in the cache.
      for (const item of new Directory(Paths.cache).list()) {
        if (item instanceof File && isReportFileName(item.name)) {
          item.delete();
        }
      }
    } catch {
      // Not worth stopping the export for.
    }
    try {
      const file = new File(Paths.cache, reportFileName(report));
      if (file.exists) file.delete();
      file.create();
      file.write(
        buildXlsx("Peso e dieta", reportRows(report), {
          boldRows: reportBoldRows(report),
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
        dialogTitle: "Guardar o Excel do peso e dieta",
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });
    } catch {
      Alert.alert("Erro", "Não foi possível criar o ficheiro Excel.");
    }
  }, []);

  return { loadRange, load, exportExcel };
}
