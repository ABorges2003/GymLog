import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ExerciseHistoryButton } from "@/components/exercise-history-button";
import { PressableScale } from "@/components/pressable-scale";
import { ProgressionNote } from "@/components/progression-note";
import { WorkoutSetRow } from "@/components/workout-set-row";
import { MAX_SETS_PER_EXERCISE } from "@/lib/sets";
import type { Progression } from "@/types/routine";
import type { PlannedSet } from "@/types/set";
import type { WorkoutExercise } from "@/types/workout";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { motion, radius, spacing, type } from "@/theme/tokens";

type Props = {
  // Whether the exercise has history (null while loading).
  hasHistory: boolean | null;
  // Routine whose history the history icon shows.
  routineId: string | null;
  item: WorkoutExercise;
  onUpdateSet: (setId: string, values: PlannedSet) => void;
  onAddSet: () => void;
  onDeleteSet: (setId: string) => void;
  onAssistedRepsChange: (setId: string, reps: number | null) => void;
  // null when the exercise is no longer in the routine (no note possible).
  onProgressionChange: ((progression: Progression | null) => void) | null;
  // An input got focus; `offsetY` is the set row's position inside the card.
  onInputFocus: (offsetY: number) => void;
};

// One exercise of the workout in progress: editable sets (with reps done
// with help) and the note for next week.
export function WorkoutExerciseCard({
  item,
  hasHistory,
  routineId,
  onUpdateSet,
  onAddSet,
  onDeleteSet,
  onAssistedRepsChange,
  onProgressionChange,
  onInputFocus,
}: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  // Positions used to scroll a focused set above the keyboard.
  const setsY = useRef(0);
  const rowY = useRef(new Map<string, number>());

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{item.exercise.name}</Text>
        <ExerciseHistoryButton
          exerciseId={item.exercise.id}
          exerciseName={item.exercise.name}
          hasHistory={hasHistory}
          routineId={routineId}
        />
      </View>

      <View
        style={styles.sets}
        onLayout={(event) => {
          setsY.current = event.nativeEvent.layout.y;
        }}
      >
        {item.sets.map((set, index) => (
          // Fades in when added and out when deleted (not on first render:
          // see LayoutAnimationConfig in the workout screen).
          <Animated.View
            key={set.id}
            entering={FadeIn.duration(motion.enter)}
            exiting={FadeOut.duration(motion.state)}
            onLayout={(event) =>
              rowY.current.set(set.id, event.nativeEvent.layout.y)
            }
          >
            <WorkoutSetRow
              set={set}
              index={index}
              exerciseName={item.exercise.name}
              onSave={(values) => onUpdateSet(set.id, values)}
              onAssistedRepsChange={(reps) =>
                onAssistedRepsChange(set.id, reps)
              }
              onDelete={() => onDeleteSet(set.id)}
              onFocus={() =>
                onInputFocus(setsY.current + (rowY.current.get(set.id) ?? 0))
              }
            />
          </Animated.View>
        ))}
      </View>

      <PressableScale
        onPress={onAddSet}
        disabled={item.sets.length >= MAX_SETS_PER_EXERCISE}
        style={[
          styles.addButton,
          item.sets.length >= MAX_SETS_PER_EXERCISE && styles.disabled,
        ]}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={20} color={c.onPrimarySoft} />
        <Text style={styles.addText}>Série</Text>
      </PressableScale>

      {onProgressionChange && (
        <View style={styles.note}>
          <ProgressionNote
            exerciseName={item.exercise.name}
            progression={item.progression}
            onChange={onProgressionChange}
          />
        </View>
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      gap: spacing.sm,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
      borderRadius: radius.lg,
      backgroundColor: c.card,
    },
    // Negative margins: the history button's touch area is bigger than its
    // icon, so this keeps the name aligned with the card padding.
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: -spacing.sm,
      marginRight: -spacing.sm,
    },
    name: {
      ...type.headline,
      flex: 1,
      color: c.text,
    },
    sets: {
      gap: spacing.xs,
    },
    // Tonal button: clearly tappable without competing with "Terminar".
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      minHeight: 44,
      marginTop: spacing.xs,
      borderRadius: radius.md,
      backgroundColor: c.primarySoft,
    },
    addText: {
      ...type.bodyStrong,
      color: c.onPrimarySoft,
    },
    disabled: {
      opacity: 0.4,
    },
    note: {
      marginHorizontal: -spacing.md,
    },
  });
}
