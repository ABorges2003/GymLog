import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ProgressionNote } from "@/components/progression-note";
import { WorkoutSetRow } from "@/components/workout-set-row";
import { MAX_SETS_PER_EXERCISE } from "@/lib/sets";
import type { PlannedSet } from "@/types/set";
import type { WorkoutExercise } from "@/types/workout";

type Props = {
  item: WorkoutExercise;
  onUpdateSet: (setId: string, values: PlannedSet) => void;
  onAddSet: () => void;
  onDeleteSet: (setId: string) => void;
  // null when the exercise is no longer in the routine (no note possible).
  onProgressionPress: (() => void) | null;
  // An input got focus; `offsetY` is the set row's position inside the card.
  onInputFocus: (offsetY: number) => void;
};

// One exercise of the workout in progress: editable sets and the note for
// next week.
export function WorkoutExerciseCard({
  item,
  onUpdateSet,
  onAddSet,
  onDeleteSet,
  onProgressionPress,
  onInputFocus,
}: Props) {
  // Positions used to scroll a focused set above the keyboard.
  const setsY = useRef(0);
  const rowY = useRef(new Map<string, number>());

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{item.exercise.name}</Text>

      <View
        style={styles.sets}
        onLayout={(event) => {
          setsY.current = event.nativeEvent.layout.y;
        }}
      >
        {item.sets.map((set, index) => (
          <View
            key={set.id}
            onLayout={(event) =>
              rowY.current.set(set.id, event.nativeEvent.layout.y)
            }
          >
            <WorkoutSetRow
              set={set}
              index={index}
              onSave={(values) => onUpdateSet(set.id, values)}
              onDelete={() => onDeleteSet(set.id)}
              onFocus={() =>
                onInputFocus(setsY.current + (rowY.current.get(set.id) ?? 0))
              }
            />
          </View>
        ))}
      </View>

      <Pressable
        onPress={onAddSet}
        disabled={item.sets.length >= MAX_SETS_PER_EXERCISE}
        style={[
          styles.addButton,
          item.sets.length >= MAX_SETS_PER_EXERCISE && styles.disabled,
        ]}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={20} color="#1f2937" />
        <Text style={styles.addText}>Série</Text>
      </Pressable>

      {onProgressionPress && (
        <View style={styles.note}>
          <ProgressionNote
            progression={item.progression}
            onPress={onProgressionPress}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 4,
    borderRadius: 12,
    backgroundColor: "white",
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },
  sets: {
    gap: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#9ca3af",
  },
  addText: {
    fontSize: 16,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.4,
  },
  note: {
    marginHorizontal: -12,
  },
});
