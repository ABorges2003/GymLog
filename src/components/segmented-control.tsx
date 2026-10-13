import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { EASE_OUT, motion, radius, spacing, type } from "@/theme/tokens";

type Props<T extends string> = {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
};

// Two or three views of the same screen side by side. Switching is frequent,
// so nothing slides: only the colours fade.
export function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
}: Props<T>) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
          >
            <Animated.View
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected ? c.primary : c.card,
                  transitionProperty: "backgroundColor",
                  transitionDuration: motion.press,
                  transitionTimingFunction: EASE_OUT,
                },
              ]}
            >
              <Text
                style={[styles.label, isSelected && styles.labelSelected]}
              >
                {option.label}
              </Text>
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    track: {
      flexDirection: "row",
      padding: spacing.xs,
      gap: spacing.xs,
      borderRadius: radius.full,
      backgroundColor: c.card,
    },
    segment: {
      flex: 1,
    },
    pill: {
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
    },
    label: {
      ...type.bodyStrong,
      fontSize: 15,
      color: c.textMuted,
    },
    labelSelected: {
      color: c.onPrimary,
    },
  });
}
