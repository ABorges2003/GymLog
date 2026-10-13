import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { EASE_OUT, motion, radius, spacing, type } from "@/theme/tokens";
import type { DayTask } from "@/types/planner";

const BOX_SIZE = 26;

type Props = {
  task: DayTask;
  onToggle: () => void;
  // Opens the popup to rename, move or delete it.
  onEdit: () => void;
};

// One task of the day: a round checkbox and its title (struck through when
// done). The tick fades and grows in, a small reward for each task done.
export function DayTaskRow({ task, onToggle, onEdit }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        style={styles.boxTouch}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
        accessibilityLabel={task.title}
      >
        <Animated.View
          style={[
            styles.box,
            {
              backgroundColor: task.done ? c.primary : "transparent",
              borderColor: task.done ? c.primary : c.textFaint,
              transitionProperty: ["backgroundColor", "borderColor"],
              transitionDuration: motion.state,
              transitionTimingFunction: EASE_OUT,
            },
          ]}
        >
          <Animated.View
            style={{
              opacity: task.done ? 1 : 0,
              transform: [{ scale: task.done ? 1 : 0.6 }],
              transitionProperty: ["opacity", "transform"],
              transitionDuration: motion.state,
              transitionTimingFunction: EASE_OUT,
            }}
          >
            <Ionicons name="checkmark" size={18} color={c.onPrimary} />
          </Animated.View>
        </Animated.View>
      </Pressable>
      <Pressable
        onPress={onEdit}
        style={styles.titleTouch}
        android_ripple={{ color: c.ripple }}
        accessibilityRole="button"
        accessibilityHint="Editar a tarefa"
      >
        <Text style={[styles.title, task.done && styles.titleDone]}>
          {task.title}
        </Text>
        {task.recurringId && (
          <Ionicons
            name="repeat"
            size={16}
            color={c.textFaint}
            accessibilityLabel="Repete-se"
          />
        )}
      </Pressable>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      minHeight: 56,
      paddingLeft: spacing.lg,
    },
    boxTouch: {
      padding: spacing.xs,
    },
    box: {
      width: BOX_SIZE,
      height: BOX_SIZE,
      borderRadius: radius.full,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    titleTouch: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      alignSelf: "stretch",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    title: {
      ...type.body,
      flex: 1,
      color: c.text,
    },
    titleDone: {
      color: c.textFaint,
      textDecorationLine: "line-through",
    },
  });
}
