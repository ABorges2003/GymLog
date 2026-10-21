import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";

import { CountUpText } from "@/components/count-up-text";
import { PressableScale } from "@/components/pressable-scale";
import { ProgressChangeRow } from "@/components/progress-change-row";
import { SetTypeBadge } from "@/components/set-type-badge";
import type { RoutineStructureChange } from "@/db/repositories/workouts";
import { useWorkoutSummary } from "@/hooks/use-workout-summary";
import { formatElapsed, formatLongDate } from "@/lib/dates";
import { formatVolume } from "@/lib/progress";
import {
  formatAssistedReps,
  formatSetValues,
  setTypeHasReps,
} from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius, spacing, type } from "@/theme/tokens";

type IconName = ComponentProps<typeof Ionicons>["name"];

// Entrance timing: the hero lands first, then the stats one after another,
// then the cards. Only on this screen (seen once per workout).
const STAT_DELAY = 150;
const STAT_STAGGER = 80;
const CARDS_DELAY = 450;

const formatCount = (value: number) => String(Math.round(value));

function Stat({
  value,
  format,
  label,
  icon,
  index,
}: {
  value: number;
  format: (value: number) => string;
  label: string;
  icon: IconName;
  index: number;
}) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const delay = STAT_DELAY + index * STAT_STAGGER;
  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(delay)}
      style={styles.stat}
    >
      <Ionicons name={icon} size={20} color={c.primary} />
      <CountUpText
        value={value}
        format={format}
        delay={delay}
        style={styles.statValue}
      />
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// An exercise whose sets changed during the workout, with a button to keep
// the new sets in the routine.
function StructureChangeRow({
  change,
  onKeep,
}: {
  change: RoutineStructureChange;
  onKeep: (change: RoutineStructureChange) => Promise<void>;
}) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  async function keep() {
    setState("saving");
    try {
      await onKeep(change);
      setState("saved");
    } catch {
      setState("idle");
      Alert.alert("Erro", "Não foi possível guardar as séries na rotina.");
    }
  }

  return (
    <View style={styles.exercise}>
      <Text style={styles.exerciseName}>{change.exerciseName}</Text>
      {change.sets.map((set, index) => (
        <View key={index} style={styles.setRow}>
          <SetTypeBadge setType={set.setType} size={24} />
          <Text style={styles.setText}>
            {formatSetValues(set)}
            <Text style={styles.assisted}>
              {formatAssistedReps(set.assistedReps)}
            </Text>
          </Text>
        </View>
      ))}
      {state === "saved" ? (
        <View style={styles.keptRow}>
          <Ionicons name="checkmark-circle" size={18} color={c.success} />
          <Text style={styles.keptText}>Guardado na rotina</Text>
        </View>
      ) : (
        <PressableScale
          onPress={keep}
          disabled={state === "saving"}
          style={styles.keepButton}
          accessibilityRole="button"
        >
          <Text style={styles.keepButtonText}>
            {state === "saving" ? "A guardar…" : "Guardar estas séries na rotina"}
          </Text>
        </PressableScale>
      )}
    </View>
  );
}

// Shown right after a workout is finished.
export default function WorkoutSummaryScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { summary, error, keepStructure } = useWorkoutSummary(id);

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
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const { detail, totals, changes, structureChanges } = summary;
  const ups = changes.filter((change) => change.direction === "up").length;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Animated.View
            entering={ZoomIn.springify().duration(500).dampingRatio(0.6)}
            style={[styles.heroIcon, ups > 0 && styles.heroIconWin]}
          >
            <Ionicons
              name={ups > 0 ? "trophy" : "checkmark-done"}
              size={40}
              color={ups > 0 ? c.onPrimary : c.onPrimarySoft}
            />
          </Animated.View>
          <Animated.View
            entering={FadeIn.duration(300).delay(100)}
            style={styles.headerText}
          >
            <Text style={styles.title}>
              {ups > 0 ? "Bom treino! 💪" : "Treino terminado"}
            </Text>
            <Text style={styles.subtitle}>
              {detail.routineName ? `${detail.routineName} · ` : ""}
              {formatLongDate(detail.workout.startedAt)}
            </Text>
            {detail.workout.finishedAt && (
              <View style={styles.duration}>
                <Ionicons
                  name="stopwatch-outline"
                  size={16}
                  color={c.onPrimarySoft}
                />
                <Text style={styles.durationText}>
                  Duração:{" "}
                  {formatElapsed(
                    detail.workout.startedAt,
                    new Date(detail.workout.finishedAt),
                  )}
                </Text>
              </View>
            )}
          </Animated.View>
        </View>

        <View style={styles.stats}>
          <Stat
            value={totals.exerciseCount}
            format={formatCount}
            label="exercícios"
            icon="barbell-outline"
            index={0}
          />
          <Stat
            value={totals.setCount}
            format={formatCount}
            label="séries"
            icon="layers-outline"
            index={1}
          />
          <Stat
            value={totals.volumeKg}
            format={formatVolume}
            label="volume"
            icon="trending-up"
            index={2}
          />
        </View>

        {structureChanges.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(300).delay(CARDS_DELAY)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Séries alteradas</Text>
            <Text style={styles.empty}>
              Mudaste as séries destes exercícios no treino. A rotina ficou
              como estava; guarda as de hoje se as quiseres manter.
            </Text>
            {structureChanges.map((change) => (
              <StructureChangeRow
                key={change.routineExerciseId}
                change={change}
                onKeep={keepStructure}
              />
            ))}
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.duration(300).delay(CARDS_DELAY)}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Progressões</Text>
            {ups > 0 && (
              <View style={styles.upsBadge}>
                <Ionicons name="arrow-up" size={14} color={c.success} />
                <Text style={styles.upsText}>{ups}</Text>
              </View>
            )}
          </View>
          {changes.length === 0 ? (
            <Text style={styles.empty}>
              Sem alterações em relação à última vez.
            </Text>
          ) : (
            changes.map((change) => (
              <ProgressChangeRow key={change.exerciseId} change={change} />
            ))
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(300).delay(CARDS_DELAY + 100)}
          style={styles.card}
        >
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
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <PressableScale
          onPress={() => router.back()}
          style={styles.button}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Fechar</Text>
        </PressableScale>
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
      gap: spacing.lg,
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
    header: {
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerText: {
      alignItems: "center",
      gap: spacing.xs,
    },
    heroIcon: {
      width: 84,
      height: 84,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    heroIconWin: {
      backgroundColor: c.primary,
    },
    title: {
      fontSize: 26,
      fontWeight: "700",
      color: c.text,
    },
    subtitle: {
      ...type.subhead,
      textAlign: "center",
      color: c.textMuted,
    },
    duration: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginTop: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      backgroundColor: c.primarySoft,
    },
    durationText: {
      ...type.captionStrong,
      fontSize: 14,
      fontVariant: ["tabular-nums"],
      color: c.onPrimarySoft,
    },
    stats: {
      flexDirection: "row",
      gap: spacing.md,
    },
    stat: {
      flex: 1,
      alignItems: "center",
      gap: spacing.xs,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.lg,
      backgroundColor: c.card,
    },
    statValue: {
      fontSize: 20,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      color: c.text,
    },
    statLabel: {
      fontSize: 14,
      color: c.textMuted,
    },
    card: {
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.card,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    cardTitle: {
      ...type.headline,
      fontSize: 17,
      color: c.text,
    },
    upsBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xxs,
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.successBg,
    },
    upsText: {
      ...type.captionStrong,
      color: c.success,
    },
    exercise: {
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    exerciseName: {
      ...type.bodyStrong,
      color: c.text,
    },
    setRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    setText: {
      ...type.subhead,
      flex: 1,
      color: c.text,
    },
    assisted: {
      fontWeight: "600",
      color: c.accent,
    },
    keepButton: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: c.primarySoft,
    },
    keepButtonText: {
      ...type.bodyStrong,
      color: c.onPrimarySoft,
    },
    keptRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      minHeight: 44,
      marginTop: spacing.xs,
    },
    keptText: {
      ...type.bodyStrong,
      color: c.success,
    },
    empty: {
      ...type.subhead,
      color: c.textMuted,
    },
    footer: {
      padding: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.card,
    },
    button: {
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
  });
}
