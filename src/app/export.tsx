import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import { useDataExport } from "@/hooks/use-data-export";
import { useToday } from "@/hooks/use-today";
import {
  formatDateRange,
  formatFullDate,
  hasReportData,
  lastDaysRange,
  lastWeekRange,
  type DataReport,
  type DateRange,
} from "@/lib/data-report";
import { dateFromKey, toDateKey } from "@/lib/dates";
import { formatWeight } from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius, spacing, type } from "@/theme/tokens";

type Choice = "all" | "lastWeek" | "last30" | "custom";

const CHOICES: { value: Choice; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "lastWeek", label: "Semana passada" },
  { value: "last30", label: "Últimos 30 dias" },
  { value: "custom", label: "Escolher datas" },
];

// Exports body weight and diet of the chosen days to Excel: everything, last
// week, the last 30 days or any range, after showing which days have data.
export default function ExportScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const today = useToday();
  const { loadRange, load, exportExcel } = useDataExport();
  // undefined while loading, null when nothing was ever logged.
  const [available, setAvailable] = useState<DateRange | null | undefined>();
  const [choice, setChoice] = useState<Choice>("lastWeek");
  const [custom, setCustom] = useState<DateRange | null>(null);
  const [picking, setPicking] = useState<"from" | "to" | null>(null);
  const [report, setReport] = useState<DataReport | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadRange()
      .then((range) => {
        setAvailable(range);
        if (range) setCustom(range);
      })
      .catch(() => setAvailable(null));
  }, [loadRange]);

  const range: DateRange | null =
    choice === "all"
      ? (available ?? null)
      : choice === "lastWeek"
        ? lastWeekRange(today)
        : choice === "last30"
          ? lastDaysRange(today, 30)
          : custom;

  const rangeFrom = range?.from;
  const rangeTo = range?.to;
  useEffect(() => {
    if (!rangeFrom || !rangeTo) return;
    let active = true;
    setReport(null);
    load({ from: rangeFrom, to: rangeTo })
      .then((next) => {
        if (active) setReport(next);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [load, rangeFrom, rangeTo]);

  async function exportReport() {
    if (!report) return;
    setExporting(true);
    try {
      await exportExcel(report);
    } finally {
      setExporting(false);
    }
  }

  if (available === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (available === null) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIcon}>
          <Ionicons name="document-text" size={32} color={c.onPrimarySoft} />
        </View>
        <Text style={styles.emptyText}>
          Ainda não tens registos de peso nem de dieta para exportar.
        </Text>
      </View>
    );
  }

  const hasData = report !== null && hasReportData(report);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={22} color={c.onPrimarySoft} />
        <Text style={styles.infoText}>
          Tens registos de {formatFullDate(available.from)} a{" "}
          {formatFullDate(available.to)}.
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Que dias?</Text>
        <View style={styles.chips}>
          {CHOICES.map((option) => {
            const selected = option.value === choice;
            return (
              <PressableScale
                key={option.value}
                onPress={() => setChoice(option.value)}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {option.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>

      {choice === "custom" && custom && (
        <View style={styles.pickers}>
          <DateButton
            label="De"
            value={custom.from}
            onPress={() => setPicking("from")}
          />
          <DateButton
            label="Até"
            value={custom.to}
            onPress={() => setPicking("to")}
          />
        </View>
      )}

      {range && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {formatDateRange(range.from, range.to)}
          </Text>
          {!report ? (
            <ActivityIndicator color={c.primary} />
          ) : hasData ? (
            <>
              <Text style={styles.muted}>
                {report.days.length}{" "}
                {report.days.length === 1 ? "dia" : "dias"} ·{" "}
                {report.weighIns}{" "}
                {report.weighIns === 1 ? "pesagem" : "pesagens"} ·{" "}
                {report.foodDays}{" "}
                {report.foodDays === 1 ? "dia com dieta" : "dias com dieta"}
              </Text>
              <View style={styles.averages}>
                <Average
                  label="Peso médio"
                  value={report.average.weightKg}
                  unit="kg"
                />
                <Average
                  label="Kcal"
                  value={report.average.food?.kcal ?? null}
                />
                <Average
                  label="Proteína"
                  value={report.average.food?.proteinG ?? null}
                  unit="g"
                />
                <Average
                  label="Carbos"
                  value={report.average.food?.carbsG ?? null}
                  unit="g"
                />
                <Average
                  label="Gordura"
                  value={report.average.food?.fatG ?? null}
                  unit="g"
                />
              </View>
              <Text style={styles.muted}>
                Médias por dia, contando só os dias com registos. O Excel tem
                uma linha por dia.
              </Text>
            </>
          ) : (
            <Text style={styles.muted}>
              Não há registos de peso nem de dieta nestas datas.
            </Text>
          )}
        </View>
      )}

      <PressableScale
        onPress={exportReport}
        disabled={!hasData || exporting}
        style={[styles.button, (!hasData || exporting) && styles.disabled]}
        accessibilityRole="button"
      >
        {exporting ? (
          <ActivityIndicator color={c.onPrimary} />
        ) : (
          <>
            <Ionicons name="download-outline" size={22} color={c.onPrimary} />
            <Text style={styles.buttonText}>Exportar Excel</Text>
          </>
        )}
      </PressableScale>

      {/* The phone's own date dialog. */}
      {picking !== null && custom && (
        <DateTimePicker
          value={dateFromKey(picking === "from" ? custom.from : custom.to)}
          mode="date"
          accentColor={c.primary}
          onValueChange={(_, picked) => {
            const key = toDateKey(picked);
            setPicking(null);
            setCustom((current) => {
              if (!current) return current;
              // Keep "from" on or before "to".
              if (picking === "from") {
                return { from: key, to: key > current.to ? key : current.to };
              }
              return { from: key < current.from ? key : current.from, to: key };
            });
          }}
          onDismiss={() => setPicking(null)}
        />
      )}
    </ScrollView>
  );
}

function DateButton({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      style={styles.dateButton}
      android_ripple={{ color: c.ripple }}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${formatFullDate(value)}`}
    >
      <View style={styles.dateIcon}>
        <Ionicons name="calendar" size={18} color={c.onPrimarySoft} />
      </View>
      <View style={styles.dateText}>
        <Text style={styles.dateLabel}>{label}</Text>
        <Text style={styles.dateValue} numberOfLines={1}>
          {formatFullDate(value)}
        </Text>
      </View>
    </Pressable>
  );
}

function Average({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit?: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.average}>
      <Text style={styles.averageValue}>
        {value === null ? "—" : formatWeight(value)}
        {value !== null && unit ? (
          <Text style={styles.averageUnit}> {unit}</Text>
        ) : null}
      </Text>
      <Text style={styles.averageLabel}>{label}</Text>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.lg,
      padding: spacing.lg,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      padding: spacing.xl,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    emptyText: {
      ...type.body,
      textAlign: "center",
      color: c.textMuted,
    },
    infoCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.primarySoft,
    },
    infoText: {
      ...type.subhead,
      flex: 1,
      color: c.onPrimarySoft,
    },
    field: {
      gap: spacing.sm,
    },
    label: {
      ...type.bodyStrong,
      color: c.text,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    chip: {
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      backgroundColor: c.card,
    },
    chipSelected: {
      backgroundColor: c.primary,
    },
    chipText: {
      ...type.subhead,
      fontWeight: "600",
      color: c.text,
    },
    chipTextSelected: {
      color: c.onPrimary,
    },
    pickers: {
      flexDirection: "row",
      gap: spacing.md,
    },
    dateButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: 64,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.card,
      overflow: "hidden",
    },
    dateIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    dateText: {
      flex: 1,
    },
    dateLabel: {
      ...type.caption,
      color: c.textMuted,
    },
    dateValue: {
      ...type.bodyStrong,
      fontSize: 14,
      color: c.text,
    },
    card: {
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.card,
    },
    cardTitle: {
      ...type.headline,
      color: c.text,
    },
    muted: {
      fontSize: 14,
      color: c.textMuted,
    },
    averages: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    average: {
      flexGrow: 1,
      minWidth: 90,
      alignItems: "center",
      gap: spacing.xxs,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: c.subtle,
    },
    averageValue: {
      ...type.bodyStrong,
      fontSize: 18,
      fontVariant: ["tabular-nums"],
      color: c.text,
    },
    averageUnit: {
      fontSize: 13,
      fontWeight: "400",
      color: c.textMuted,
    },
    averageLabel: {
      ...type.caption,
      color: c.textMuted,
    },
    button: {
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.lg,
      backgroundColor: c.primary,
    },
    buttonText: {
      ...type.bodyStrong,
      fontSize: 17,
      color: c.onPrimary,
    },
    disabled: {
      opacity: 0.4,
    },
  });
}
