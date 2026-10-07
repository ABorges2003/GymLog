import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "@/theme/colors";
import { useThemedStyles } from "@/theme/theme";

export type ChipOption<T> = {
  value: T;
  label: string;
};

type Props<T> = {
  options: ChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  // true: chips wrap onto several lines (forms). false: one scrollable row (filters).
  wrap?: boolean;
};

// Single-choice chips.
export function FilterChips<T>({
  options,
  selected,
  onSelect,
  wrap = false,
}: Props<T>) {
  const styles = useThemedStyles(createStyles);
  const chips = options.map((option) => {
    const isSelected = option.value === selected;
    return (
      <Pressable
        key={option.label}
        onPress={() => onSelect(option.value)}
        style={[styles.chip, isSelected && styles.chipSelected]}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
      >
        <Text style={[styles.label, isSelected && styles.labelSelected]}>
          {option.label}
        </Text>
      </Pressable>
    );
  });

  if (wrap) {
    return <View style={styles.wrapContainer}>{chips}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {chips}
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    wrapContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      minHeight: 36,
      justifyContent: "center",
      paddingHorizontal: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    chipSelected: {
      borderColor: c.primary,
      backgroundColor: c.primary,
    },
    label: {
      fontSize: 15,
      color: c.text,
    },
    labelSelected: {
      color: c.onPrimary,
      fontWeight: "600",
    },
  });
}
