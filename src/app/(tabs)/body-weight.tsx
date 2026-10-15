import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { GoalEditor } from "@/components/goal-editor";
import { PressableScale } from "@/components/pressable-scale";
import { WeightChart } from "@/components/weight-chart";
import { useBodyWeight } from "@/hooks/use-body-weight";
import { usePhases } from "@/hooks/use-phases";
import { useSelectedDay } from "@/hooks/use-today";
import { phaseStatus } from "@/lib/body-weight-phases";
import {
  MOVING_AVERAGE_DAYS,
  goalStatus,
  parseBodyWeight,
  summarizeBodyWeight,
  withMovingAverage,
} from "@/lib/body-weight";
import {
  addDaysToKey,
  dateFromKey,
  formatDayLabel,
  formatShortDate,
} from "@/lib/dates";
import { formatWeight } from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius, spacing, type } from "@/theme/tokens";

function formatChange(change: number): string {
  const rounded = Math.round(change * 10) / 10;
  if (rounded === 0) return "= sem alteração numa semana";
  const arrow = rounded > 0 ? "▲" : "▼";
  return `${arrow} ${formatWeight(Math.abs(rounded))} kg numa semana`;
}

function formatGoal(status: ReturnType<typeof goalStatus>): string {
  if (status.kind === "reached") return "🎉 Objetivo atingido";
  const verb = status.kind === "lose" ? "perder" : "ganhar";
  return `Faltam ${verb} ${formatWeight(status.remainingKg)} kg`;
}

export default function BodyWeightScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { entries, goalKg, error, save, remove, saveGoal } = useBodyWeight();
  const { phases } = usePhases();
  // e.g. "Bulk inverno · em curso", "3 épocas" or a hint for the first one.
  const ongoing = phases?.find((phase) => phaseStatus(phase) === "ongoing");
  const phasesDetail = ongoing
    ? `${ongoing.name} · em curso`
    : phases && phases.length > 0
      ? `${phases.length} ${phases.length === 1 ? "época" : "épocas"}`
      : "Bulk, cut… marca períodos e vê o progresso de cada um";
  // Follows the date when the app stays open overnight (see useSelectedDay).
  const { date: day, setDate: setDay, today } = useSelectedDay();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const existing = entries?.find((entry) => entry.date === day) ?? null;

  // Show the saved weight of the selected day, or an empty field.
  useEffect(() => {
    setText(existing ? formatWeight(existing.weightKg) : "");
  }, [day, existing]);

  const points = useMemo(() => withMovingAverage(entries ?? []), [entries]);
  const summary = summarizeBodyWeight(points);
  const weight = parseBodyWeight(text);

  async function handleSave() {
    if (weight === null) return;
    setSaving(true);
    try {
      await save(day, weight);
      Keyboard.dismiss();
    } catch {
      Alert.alert("Erro", "Não foi possível guardar o peso.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(date: string) {
    Alert.alert("Apagar registo?", formatDayLabel(date), [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => {
          remove(date).catch(() =>
            Alert.alert("Erro", "Não foi possível apagar o registo."),
          );
        },
      },
    ]);
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!entries) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.dayRow}>
          <PressableScale
            onPress={() => setDay(addDaysToKey(day, -1))}
            style={styles.dayButton}
            accessibilityRole="button"
            accessibilityLabel="Dia anterior"
          >
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </PressableScale>
          <Text style={styles.dayLabel}>{formatDayLabel(day)}</Text>
          <PressableScale
            onPress={() => setDay(addDaysToKey(day, 1))}
            disabled={day >= today}
            style={[styles.dayButton, day >= today && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Dia seguinte"
          >
            <Ionicons name="chevron-forward" size={24} color={c.text} />
          </PressableScale>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              text !== "" && weight === null && styles.inputError,
            ]}
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={c.textFaint}
            maxLength={6}
            cursorColor={c.primary}
            selectTextOnFocus
            accessibilityLabel="Peso em kg"
          />
          <Text style={styles.unit}>kg</Text>
        </View>

        <PressableScale
          onPress={handleSave}
          disabled={weight === null || saving || weight === existing?.weightKg}
          style={[
            styles.saveButton,
            (weight === null || saving || weight === existing?.weightKg) &&
              styles.disabled,
          ]}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color={c.onPrimary} />
          ) : (
            <Text style={styles.saveText}>
              {existing ? "Atualizar" : "Guardar"}
            </Text>
          )}
        </PressableScale>
      </View>

      <View style={styles.card}>
        <GoalEditor goalKg={goalKg} onSave={saveGoal} />
      </View>

      <Link href="/phases" asChild>
        <PressableScale
          // One style object: Link asChild does not accept style arrays.
          style={styles.phasesLink}
          accessibilityRole="button"
        >
          <View style={styles.phasesIcon}>
            <Ionicons name="calendar" size={20} color={c.onPrimarySoft} />
          </View>
          <View style={styles.phasesText}>
            <Text style={styles.phasesTitle}>Épocas</Text>
            <Text style={styles.phasesDetail} numberOfLines={1}>
              {phasesDetail}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.textFaint} />
        </PressableScale>
      </Link>

      {summary && (
        <View style={[styles.card, styles.summary]}>
          <Text style={styles.summaryWeight}>
            {formatWeight(summary.latest.weightKg)}
            <Text style={styles.summaryUnit}> kg</Text>
          </Text>
          <Text style={styles.summaryLine}>
            Média de {MOVING_AVERAGE_DAYS} dias:{" "}
            {formatWeight(Math.round(summary.average * 10) / 10)} kg
          </Text>
          {summary.weeklyChange !== null && (
            <Text style={styles.summaryLine}>
              {formatChange(summary.weeklyChange)}
            </Text>
          )}
          {goalKg !== null && (
            <Text style={[styles.summaryLine, styles.goalLine]}>
              {formatGoal(goalStatus(summary.latest.weightKg, goalKg))}
            </Text>
          )}
        </View>
      )}

      {points.length >= 2 && (
        <View style={styles.card}>
          <View style={styles.legend}>
            <View style={[styles.legendDot, styles.legendDaily]} />
            <Text style={styles.legendText}>Peso do dia</Text>
            {goalKg !== null && (
              <>
                <View style={[styles.legendDot, styles.legendGoal]} />
                <Text style={styles.legendText}>
                  Objetivo ({formatWeight(goalKg)} kg)
                </Text>
              </>
            )}
          </View>
          <WeightChart
            points={points.map((point) => ({
              label: formatShortDate(dateFromKey(point.date).toISOString()),
              weightKg: point.weightKg,
              secondary: goalKg ?? undefined,
            }))}
          />
        </View>
      )}

      {entries.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registos</Text>
          {[...entries].reverse().map((entry) => (
            <View key={entry.date} style={styles.entryRow}>
              <Text style={styles.entryDate}>{formatDayLabel(entry.date)}</Text>
              <Text style={styles.entryWeight}>
                {formatWeight(entry.weightKg)} kg
              </Text>
              <Pressable
                onPress={() => confirmDelete(entry.date)}
                style={styles.deleteButton}
                accessibilityRole="button"
                accessibilityLabel={`Apagar registo de ${formatDayLabel(entry.date)}`}
              >
                <Ionicons name="close" size={20} color={c.textFaint} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {entries.length === 0 && (
        <View style={styles.emptyIcon}>
          <Ionicons name="scale" size={36} color={c.onPrimarySoft} />
        </View>
      )}
      {entries.length === 0 && (
        <Text style={styles.empty}>
          Regista o teu peso todos os dias, de preferência à mesma hora. A média
          de {MOVING_AVERAGE_DAYS} dias mostra a tendência real, sem as
          variações do dia a dia.
        </Text>
      )}
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
      padding: spacing.lg,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    error: {
      ...type.body,
      color: c.danger,
      textAlign: "center",
    },
    card: {
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.card,
    },
    cardTitle: {
      ...type.headline,
      fontSize: 17,
      color: c.text,
    },
    phasesLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.card,
    },
    phasesIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    phasesText: {
      flex: 1,
      gap: spacing.xxs,
    },
    phasesTitle: {
      ...type.headline,
      fontSize: 17,
      color: c.text,
    },
    phasesDetail: {
      fontSize: 14,
      color: c.textMuted,
    },
    dayRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    dayButton: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.subtle,
    },
    dayLabel: {
      ...type.headline,
      flex: 1,
      textAlign: "center",
      color: c.text,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
    },
    input: {
      width: 160,
      minHeight: 64,
      fontSize: 36,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      textAlign: "center",
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: "transparent",
      backgroundColor: c.subtle,
      color: c.text,
    },
    inputError: {
      borderColor: c.danger,
      backgroundColor: c.dangerBg,
    },
    unit: {
      fontSize: 22,
      color: c.textMuted,
    },
    saveButton: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      backgroundColor: c.primary,
    },
    saveText: {
      ...type.bodyStrong,
      fontSize: 17,
      color: c.onPrimary,
    },
    disabled: {
      opacity: 0.35,
    },
    summary: {
      alignItems: "center",
      gap: spacing.xs,
      paddingVertical: spacing.xl,
    },
    summaryWeight: {
      fontSize: 48,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      color: c.text,
    },
    summaryUnit: {
      fontSize: 22,
      fontWeight: "600",
      color: c.textMuted,
    },
    goalLine: {
      fontWeight: "600",
      color: c.warningText,
    },
    summaryLine: {
      ...type.subhead,
      color: c.textMuted,
    },
    legend: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: radius.full,
    },
    legendDaily: {
      backgroundColor: c.accent,
    },
    legendGoal: {
      marginLeft: spacing.md,
      backgroundColor: c.warning,
    },
    legendText: {
      ...type.caption,
      color: c.textMuted,
    },
    entryRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 44,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.subtle,
    },
    entryDate: {
      ...type.subhead,
      flex: 1,
      color: c.textMuted,
    },
    entryWeight: {
      ...type.bodyStrong,
      fontVariant: ["tabular-nums"],
      color: c.text,
    },
    deleteButton: {
      width: 40,
      height: 40,
      marginRight: -spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyIcon: {
      alignSelf: "center",
      width: 80,
      height: 80,
      marginTop: spacing.lg,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    empty: {
      ...type.subhead,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: spacing.lg,
    },
  });
}
