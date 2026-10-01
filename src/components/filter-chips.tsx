import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

export type ChipOption<T> = {
  value: T;
  label: string;
};

type Props<T> = {
  options: ChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
};

// Horizontal row of single-choice chips.
export function FilterChips<T>({ options, selected, onSelect }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {options.map((option) => {
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
      })}
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
