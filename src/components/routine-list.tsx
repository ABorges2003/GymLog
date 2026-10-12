import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import { useRoutines } from "@/hooks/use-routines";
import { formatDayLabel, toDateKey } from "@/lib/dates";
import { MUSCLE_GROUP_LABELS } from "@/lib/labels";
import type { RoutineSummary } from "@/types/routine";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius, shadows, spacing, type } from "@/theme/tokens";

const PLAY_SIZE = 52;

function routineDetails(routine: RoutineSummary): string {
  if (routine.exerciseCount === 0) return "Sem exercícios";
  const count =
    routine.exerciseCount === 1
      ? "1 exercício"
      : `${routine.exerciseCount} exercícios`;
  const muscles = routine.muscleGroups
    .map((muscleGroup) => MUSCLE_GROUP_LABELS[muscleGroup])
    .join(" · ");
  return `${count} · ${muscles}`;
}

type Props = {
  // Starts a workout from the routine.
  onStart: (routineId: string) => void;
  // True while a workout is being started (disables the buttons).
  starting: boolean;
};

// The user's routines, each with a button to start a workout, and a button
// to create a new routine.
export function RoutineList({ onStart, starting }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { routines, error } = useRoutines();

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  if (!routines) {
    return <ActivityIndicator size="large" color={c.primary} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>As minhas rotinas</Text>

      {routines.length === 0 && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="barbell" size={36} color={c.onPrimarySoft} />
          </View>
          <Text style={styles.emptyText}>
            Ainda não tens rotinas. Cria uma para cada treino da semana (ex.:
            Push, Pull, Pernas).
          </Text>
        </View>
      )}

      {routines.map((routine) => {
        const disabled = starting || routine.exerciseCount === 0;
        return (
          <View key={routine.id} style={styles.card}>
            <Link
              href={{ pathname: "/routine/[id]", params: { id: routine.id } }}
              asChild
            >
              <Pressable
                style={styles.cardText}
                android_ripple={{ color: c.ripple }}
                accessibilityRole="button"
                accessibilityHint="Abrir a rotina para editar"
              >
                <Text style={styles.cardName} numberOfLines={1}>
                  {routine.name}
                </Text>
                <Text style={styles.cardDetails} numberOfLines={2}>
                  {routineDetails(routine)}
                </Text>
                {routine.lastDoneAt && (
                  <View style={styles.lastDone}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={c.onPrimarySoft}
                    />
                    <Text style={styles.lastDoneText}>
                      {formatDayLabel(
                        toDateKey(new Date(routine.lastDoneAt)),
                      )}
                    </Text>
                  </View>
                )}
              </Pressable>
            </Link>
            <PressableScale
              onPress={() => onStart(routine.id)}
              disabled={disabled}
              style={[styles.startButton, disabled && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel={`Começar treino ${routine.name}`}
            >
              <Ionicons
                name="play"
                size={24}
                color={c.onPrimary}
                // Optical nudge: a triangle looks off-centre when centred.
                style={{ marginLeft: 3 }}
              />
            </PressableScale>
          </View>
        );
      })}

      <Link href="/routine/new" asChild>
        <PressableScale style={styles.newButton} accessibilityRole="button">
          <Ionicons name="add" size={24} color={c.onPrimarySoft} />
          <Text style={styles.newButtonText}>Nova rotina</Text>
        </PressableScale>
      </Link>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
    },
    title: {
      ...type.title,
      fontSize: 20,
      color: c.text,
    },
    error: {
      ...type.body,
      color: c.danger,
    },
    empty: {
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    emptyIcon: {
      width: 80,
      height: 80,
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
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingRight: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.card,
      boxShadow: shadows.card,
      overflow: "hidden",
    },
    cardText: {
      flex: 1,
      gap: spacing.xxs,
      minHeight: 80,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    cardName: {
      ...type.headline,
      color: c.text,
    },
    cardDetails: {
      fontSize: 14,
      color: c.textMuted,
    },
    lastDone: {
      flexDirection: "row",
      alignSelf: "flex-start",
      alignItems: "center",
      gap: spacing.xs,
      marginTop: spacing.xs,
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.primarySoft,
    },
    lastDoneText: {
      ...type.captionStrong,
      color: c.onPrimarySoft,
    },
    startButton: {
      width: PLAY_SIZE,
      height: PLAY_SIZE,
      borderRadius: PLAY_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primary,
    },
    disabled: {
      opacity: 0.35,
    },
    newButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 52,
      borderRadius: radius.lg,
      backgroundColor: c.primarySoft,
    },
    newButtonText: {
      ...type.bodyStrong,
      fontSize: 17,
      color: c.onPrimarySoft,
    },
  });
}
