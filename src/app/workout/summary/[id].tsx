import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ProgressChangeRow } from "@/components/progress-change-row";
import { SetTypeBadge } from "@/components/set-type-badge";
import { useWorkoutSummary } from "@/hooks/use-workout-summary";
import { formatElapsed, formatLongDate } from "@/lib/dates";
import { formatVolume } from "@/lib/progress";
import {
  formatAssistedReps,
  formatSetValues,
  setTypeHasReps,
} from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useThemedStyles } from "@/theme/theme";

function Stat({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Shown right after a workout is finished.
export default function WorkoutSummaryScreen() {
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { summary, error } = useWorkoutSummary(id);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { detail, totals, changes } = summary;
  const ups = changes.filter((change) => change.direction === "up").length;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {ups > 0 ? "Bom treino! 💪" : "Treino terminado"}
          </Text>
          <Text style={styles.subtitle}>
            {detail.routineName ? `${detail.routineName} · ` : ""}
            {formatLongDate(detail.workout.startedAt)}
          </Text>
          {detail.workout.finishedAt && (
            <Text style={styles.subtitle}>
              Duração:{" "}
              {formatElapsed(
                detail.workout.startedAt,
                new Date(detail.workout.finishedAt),
              )}
            </Text>
          )}
        </View>

        <View style={styles.stats}>
          <Stat value={String(totals.exerciseCount)} label="exercícios" />
          <Stat value={String(totals.setCount)} label="séries" />
          <Stat value={formatVolume(totals.volumeKg)} label="volume" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progressões</Text>
          {changes.length === 0 ? (
            <Text style={styles.empty}>
              Sem alterações em relação à última vez.
            </Text>
          ) : (
            changes.map((change) => (
              <ProgressChangeRow key={change.exerciseId} change={change} />
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Séries</Text>
          {detail.exercises.map((exercise) => {
            // Top sets and back-offs: the ones that count.
            const sets = exercise.sets.filter(
              (set) =>
                setTypeHasReps(set.setType) && formatSetValues(set) !== "",
            );
            if (sets.length === 0) return null;
            return (
              <View key={exercise.id} style={styles.exercise}>
                <Text style={styles.exerciseName}>
                  {exercise.exercise.name}
                </Text>
                {sets.map((set) => (
                  <View key={set.id} style={styles.setRow}>
                    <SetTypeBadge setType={set.setType} size={24} />
                    <Text style={styles.setText}>
                      {formatSetValues(set)}
                      <Text style={styles.assisted}>
                        {formatAssistedReps(set.assistedReps)}
                      </Text>
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.back()}
          style={styles.button}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Fechar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    container: {
      gap: 16,
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
    header: {
      alignItems: "center",
      gap: 4,
      paddingVertical: 8,
    },
    title: {
      fontSize: 26,
      fontWeight: "bold",
      color: c.text,
    },
    subtitle: {
      fontSize: 15,
      color: c.textMuted,
    },
    stats: {
      flexDirection: "row",
      gap: 12,
    },
    stat: {
      flex: 1,
      alignItems: "center",
      gap: 2,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: c.card,
    },
    statValue: {
      fontSize: 20,
      fontWeight: "bold",
      color: c.text,
    },
    statLabel: {
      fontSize: 14,
      color: c.textMuted,
    },
    card: {
      gap: 4,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.card,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: "bold",
      marginBottom: 4,
      color: c.text,
    },
    exercise: {
      gap: 6,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    exerciseName: {
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    setRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    setText: {
      flex: 1,
      fontSize: 15,
      color: c.text,
    },
    assisted: {
      fontWeight: "600",
      color: c.accent,
    },
    empty: {
      fontSize: 15,
      color: c.textMuted,
    },
    footer: {
      padding: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.card,
    },
    button: {
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    buttonText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.onPrimary,
    },
  });
}
