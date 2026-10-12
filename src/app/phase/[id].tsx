import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ProgressBar } from "@/components/progress-bar";
import { WeightChart } from "@/components/weight-chart";
import { usePhase } from "@/hooks/use-phases";
import {
  PHASE_STATUS_LABELS,
  formatPhaseDates,
  phaseEntries,
  phaseStatus,
  summarizePhase,
} from "@/lib/body-weight-phases";
import { dateFromKey, formatShortDate } from "@/lib/dates";
import { formatWeight } from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

// "+1,4 kg", "−0,8 kg" or "0 kg".
function formatSignedKg(value: number, digits = 1): string {
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  if (rounded === 0) return "0 kg";
  return `${rounded > 0 ? "+" : "−"}${formatWeight(Math.abs(rounded))} kg`;
}

function formatSignedPercent(value: number): string {
  const text = String(Math.abs(value)).replace(".", ",");
  if (value === 0) return "0 %";
  return `${value > 0 ? "+" : "−"}${text} %`;
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// One phase: dates, how far along it is, the weight chart of those days and
// the numbers that matter in a bulk or a cut.
export default function PhaseScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, notFound, error } = usePhase(id);

  const view = useMemo(() => {
    if (!data) return null;
    const today = new Date();
    return {
      status: phaseStatus(data.phase, today),
      summary: summarizePhase(data.entries, data.phase, today),
      inside: phaseEntries(data.entries, data.phase, today),
    };
  }, [data]);

  if (error || notFound) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Esta época já não existe."}</Text>
      </View>
    );
  }

  if (!data || !view) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { phase } = data;
  const { status, summary, inside } = view;
  // Neutral colour: going up is good in a bulk and bad in a cut.
  const changeColor = c.accent;
  // Short notes under the numbers, only the ones that apply.
  const hints = [
    status === "upcoming"
      ? "Esta época ainda não começou. Os valores aparecem quando registares o peso nestas datas."
      : summary.entryCount === 0
        ? "Regista o peso no separador Peso: os valores e o gráfico aparecem aqui."
        : summary.weeklyKg === null
          ? "O ritmo por semana aparece com pelo menos uma semana de registos."
          : null,
    summary.firstDate !== null && summary.firstDate < phase.startDate
      ? `O peso inicial é o de ${formatShortDate(
          dateFromKey(summary.firstDate).toISOString(),
        )}, a última pesagem antes do início.`
      : null,
  ].filter((hint) => hint !== null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: phase.name,
          headerRight: () => (
            <Link
              href={{ pathname: "/phase/edit/[id]", params: { id: phase.id } }}
              asChild
            >
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Editar época"
              >
                <Ionicons name="create-outline" size={24} color={c.text} />
              </Pressable>
            </Link>
          ),
        }}
      />

      <View style={styles.card}>
        <Text style={styles.name}>{phase.name}</Text>
        <Text style={styles.muted}>{formatPhaseDates(phase)}</Text>
        <View style={styles.statusRow}>
          <View
            style={[styles.chip, status === "ongoing" && styles.chipOngoing]}
          >
            <Text
              style={[
                styles.chipText,
                status === "ongoing" && styles.chipTextOngoing,
              ]}
            >
              {PHASE_STATUS_LABELS[status]}
            </Text>
          </View>
          <Text style={styles.muted}>
            {summary.totalDays === null
              ? `${summary.daysDone} ${summary.daysDone === 1 ? "dia" : "dias"}`
              : `Dia ${summary.daysDone} de ${summary.totalDays}`}
          </Text>
        </View>
        {summary.totalDays !== null && (
          <ProgressBar value={summary.daysDone} max={summary.totalDays} />
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.changeRow}>
          <Text style={[styles.change, { color: changeColor }]}>
            {summary.changeKg === null ? "—" : formatSignedKg(summary.changeKg)}
          </Text>
          <Text style={styles.muted}>
            {summary.firstKg === null
              ? "Sem peso inicial"
              : `${formatWeight(summary.firstKg)} kg → ${
                  summary.lastKg === null
                    ? "…"
                    : `${formatWeight(summary.lastKg)} kg`
                }`}
          </Text>
        </View>
        <View style={styles.stats}>
          <Stat
            label="início"
            value={
              summary.firstKg === null
                ? "—"
                : `${formatWeight(summary.firstKg)} kg`
            }
          />
          <Stat
            label="atual"
            value={
              summary.lastKg === null
                ? "—"
                : `${formatWeight(summary.lastKg)} kg`
            }
          />
          <Stat label="registos" value={String(summary.entryCount)} />
        </View>
        <View style={styles.stats}>
          <Stat
            label="por semana"
            value={
              summary.weeklyKg === null
                ? "—"
                : formatSignedKg(summary.weeklyKg, 2)
            }
          />
          <Stat
            label="do peso / semana"
            value={
              summary.weeklyPercent === null
                ? "—"
                : formatSignedPercent(summary.weeklyPercent)
            }
          />
        </View>
        <View style={styles.stats}>
          <Stat
            label="mínimo"
            value={
              summary.minKg === null ? "—" : `${formatWeight(summary.minKg)} kg`
            }
          />
          <Stat
            label="máximo"
            value={
              summary.maxKg === null ? "—" : `${formatWeight(summary.maxKg)} kg`
            }
          />
        </View>
        {hints.map((hint) => (
          <Text key={hint} style={styles.hint}>
            {hint}
          </Text>
        ))}
      </View>

      {inside.length >= 2 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Peso durante a época</Text>
          <WeightChart
            points={inside.map((entry) => ({
              label: formatShortDate(dateFromKey(entry.date).toISOString()),
              weightKg: entry.weightKg,
            }))}
          />
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 12,
      padding: 16,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
    error: {
      fontSize: 16,
      color: c.danger,
      textAlign: "center",
    },
    card: {
      gap: 10,
      padding: 16,
      borderRadius: 12,
      backgroundColor: c.card,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: "bold",
      color: c.text,
    },
    name: {
      fontSize: 24,
      fontWeight: "bold",
      color: c.text,
    },
    muted: {
      fontSize: 15,
      color: c.textMuted,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.subtle,
    },
    chipOngoing: {
      backgroundColor: c.successBg,
    },
    chipText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textMuted,
    },
    chipTextOngoing: {
      color: c.success,
    },
    changeRow: {
      alignItems: "center",
      gap: 2,
    },
    change: {
      fontSize: 36,
      fontWeight: "bold",
    },
    stats: {
      flexDirection: "row",
      gap: 8,
    },
    stat: {
      flex: 1,
      alignItems: "center",
      gap: 2,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: c.subtle,
    },
    statValue: {
      fontSize: 17,
      fontWeight: "bold",
      color: c.text,
    },
    statLabel: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
    },
    hint: {
      fontSize: 13,
      color: c.textMuted,
      textAlign: "center",
    },
  });
}
