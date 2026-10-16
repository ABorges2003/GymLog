import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Popup, PopupButton } from "@/components/popup";
import { PressableScale } from "@/components/pressable-scale";
import { formatWeight } from "@/lib/sets";
import {
  formatWeekRange,
  weekDayLabel,
  type WeeklyReport,
} from "@/lib/weekly-report";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius, spacing, type } from "@/theme/tokens";

type Props = {
  report: WeeklyReport;
  onClose: () => void;
  onExport: (report: WeeklyReport) => Promise<void>;
};

const COLUMNS = ["Dia", "Peso", "Kcal", "P", "C", "G"];

const number = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : formatWeight(value);

// Last week at a glance, to send to a nutritionist: body weight and kcal,
// protein, carbs and fat of each day, the averages, and an Excel export.
export function WeeklyReportPopup({ report, onClose, onExport }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [exporting, setExporting] = useState(false);

  async function exportExcel() {
    setExporting(true);
    try {
      await onExport(report);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Popup
      visible
      title="Resumo da semana"
      subtitle={formatWeekRange(report.start)}
      onClose={onClose}
    >
      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]}>
          {COLUMNS.map((column, index) => (
            <Text
              key={column}
              style={[styles.cell, index === 0 && styles.dayCell, styles.head]}
            >
              {column}
            </Text>
          ))}
        </View>
        {report.days.map((day) => (
          <View key={day.date} style={styles.row}>
            <Text style={[styles.cell, styles.dayCell]}>
              {weekDayLabel(day.date)}
            </Text>
            <Text style={styles.cell}>{number(day.weightKg)}</Text>
            <Text style={styles.cell}>{number(day.food?.kcal)}</Text>
            <Text style={styles.cell}>{number(day.food?.proteinG)}</Text>
            <Text style={styles.cell}>{number(day.food?.carbsG)}</Text>
            <Text style={styles.cell}>{number(day.food?.fatG)}</Text>
          </View>
        ))}
        <View style={[styles.row, styles.averageRow]}>
          <Text style={[styles.cell, styles.dayCell, styles.head]}>Média</Text>
          <Text style={[styles.cell, styles.head]}>
            {number(report.average.weightKg)}
          </Text>
          <Text style={[styles.cell, styles.head]}>
            {number(report.average.food?.kcal)}
          </Text>
          <Text style={[styles.cell, styles.head]}>
            {number(report.average.food?.proteinG)}
          </Text>
          <Text style={[styles.cell, styles.head]}>
            {number(report.average.food?.carbsG)}
          </Text>
          <Text style={[styles.cell, styles.head]}>
            {number(report.average.food?.fatG)}
          </Text>
        </View>
      </View>
      <Text style={styles.hint}>
        Peso em kg; proteína (P), carbos (C) e gordura (G) em gramas. A média
        conta só os dias com registos.
      </Text>

      <PressableScale
        onPress={exportExcel}
        disabled={exporting}
        style={styles.exportButton}
        accessibilityRole="button"
      >
        {exporting ? (
          <ActivityIndicator color={c.onPrimary} />
        ) : (
          <>
            <Ionicons name="download-outline" size={20} color={c.onPrimary} />
            <Text style={styles.exportText}>Exportar Excel</Text>
          </>
        )}
      </PressableScale>
      <PopupButton label="Fechar" onPress={onClose} />
    </Popup>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    table: {
      borderRadius: radius.md,
      backgroundColor: c.subtle,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 34,
      paddingHorizontal: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    headerRow: {
      borderTopWidth: 0,
    },
    averageRow: {
      backgroundColor: c.primarySoft,
    },
    cell: {
      flex: 1,
      fontSize: 13,
      textAlign: "right",
      fontVariant: ["tabular-nums"],
      color: c.text,
    },
    dayCell: {
      flex: 1.6,
      textAlign: "left",
    },
    head: {
      fontWeight: "700",
    },
    hint: {
      ...type.caption,
      color: c.textMuted,
    },
    exportButton: {
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: c.primary,
    },
    exportText: {
      ...type.bodyStrong,
      color: c.onPrimary,
    },
  });
}
