import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import type { ChipOption } from "@/components/filter-chips";

type Props<T> = {
  options: ChipOption<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
  // Label of the first chip, selected when nothing else is (tapping it clears).
  allLabel: string;
};

// Horizontal row of multiple-choice chips.
export function ToggleChips<T>({
  options,
  selected,
  onChange,
  allLabel,
}: Props<T>) {
  function toggle(value: T) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  const chips = [
    {
      key: allLabel,
      label: allLabel,
      isSelected: selected.length === 0,
      onPress: () => onChange([]),
    },
    ...options.map((option) => ({
      key: option.label,
      label: option.label,
      isSelected: selected.includes(option.value),
      onPress: () => toggle(option.value),
    })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {chips.map((chip) => (
        <Pressable
          key={chip.key}
          onPress={chip.onPress}
          style={[styles.chip, chip.isSelected && styles.chipSelected]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: chip.isSelected }}
        >
          <Text style={[styles.label, chip.isSelected && styles.labelSelected]}>
            {chip.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d0d4da",
    backgroundColor: "white",
  },
  chipSelected: {
    borderColor: "#1f2937",
    backgroundColor: "#1f2937",
  },
  label: {
    fontSize: 15,
  },
  labelSelected: {
    color: "white",
    fontWeight: "600",
  },
});
