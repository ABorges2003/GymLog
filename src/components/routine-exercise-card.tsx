import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ExerciseHistoryButton } from "@/components/exercise-history-button";
import { ProgressionNote } from "@/components/progression-note";
import { SetTypeBadge } from "@/components/set-type-badge";
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from "@/lib/labels";
import { formatSetValues } from "@/lib/sets";
import type { RoutineExercise } from "@/types/routine";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

type Props = {
  // Whether the exercise has history (null while loading).
  hasHistory: boolean | null;
  // Routine whose history the history icon shows.
  routineId: string | null;
  item: RoutineExercise;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onProgressionPress: () => void;
};

function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  color,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  // Defaults to the text colour.
  color?: string;
}) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.iconButton, disabled && styles.iconDisabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={color ?? c.text} />
    </Pressable>
  );
}

// One exercise of a routine: buttons to reorder or remove it, and its set
// structure (tap to edit).
export function RoutineExerciseCard({
  item,
  hasHistory,
  routineId,
  isFirst,
  isLast,
  onMove,
  onRemove,
  onProgressionPress,
}: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { exercise } = item;
  const details = [
    MUSCLE_GROUP_LABELS[exercise.muscleGroup],
    exercise.equipment ? EQUIPMENT_LABELS[exercise.equipment] : null,
    exercise.isArchived ? "Arquivado" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.text}>
          <Text style={styles.name}>{exercise.name}</Text>
          <Text style={styles.details}>{details}</Text>
        </View>
        <ExerciseHistoryButton
          exerciseId={exercise.id}
          exerciseName={exercise.name}
          hasHistory={hasHistory}
          routineId={routineId}
        />
        <IconButton
          icon="chevron-up"
          label="Subir"
          onPress={() => onMove(-1)}
          disabled={isFirst}
        />
        <IconButton
          icon="chevron-down"
          label="Descer"
          onPress={() => onMove(1)}
          disabled={isLast}
        />
        <IconButton
          icon="close"
          label="Tirar da rotina"
          onPress={onRemove}
          color={c.danger}
        />
      </View>

      <Link
        href={{ pathname: "/routine/sets/[id]", params: { id: item.id } }}
        asChild
      >
        <Pressable
          style={styles.setsRow}
          android_ripple={{ color: c.ripple }}
          accessibilityRole="button"
          accessibilityLabel="Editar séries"
        >
          <View style={styles.badges}>
            {item.sets.length === 0 ? (
              <Text style={styles.details}>Sem séries</Text>
            ) : (
              item.sets.map((set, index) => (
                <View key={index} style={styles.setChip}>
                  <SetTypeBadge setType={set.setType} size={24} />
                  {formatSetValues(set) !== "" && (
                    <Text style={styles.setValues}>{formatSetValues(set)}</Text>
                  )}
                </View>
              ))
            )}
          </View>
          <Text style={styles.editSets}>Séries</Text>
          <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
        </Pressable>
      </Link>

      <ProgressionNote
        progression={item.progression}
        onPress={onProgressionPress}
      />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderRadius: 12,
      backgroundColor: c.card,
      overflow: "hidden",
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 64,
      paddingLeft: 16,
      paddingVertical: 8,
    },
    setsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 48,
      paddingHorizontal: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.ripple,
    },
    badges: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      paddingVertical: 8,
    },
    setChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingRight: 6,
    },
    setValues: {
      fontSize: 14,
      fontWeight: "500",
      color: c.text,
    },
    editSets: {
      fontSize: 15,
      color: c.textMuted,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 17,
      fontWeight: "500",
      color: c.text,
    },
    details: {
      fontSize: 14,
      color: c.textMuted,
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    iconDisabled: {
      opacity: 0.25,
    },
  });
}
