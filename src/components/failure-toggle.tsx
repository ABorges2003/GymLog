import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text } from "react-native";

import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

// Width of FailureToggle, for spacers that keep rows aligned.
export const FAILURE_TOGGLE_WIDTH = 40;

// Fixed width of the "reps" label next to a reps input, so FailureBox can
// also cover it (with the row's 8 px gap).
export const REPS_LABEL_WIDTH = 34;
const ROW_GAP = 8;

type ToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  // e.g. "série 5", for screen readers.
  label: string;
};

// Flame at the end of a back-off set: done to failure instead of a number
// of reps.
export function FailureToggle({ value, onChange, label }: ToggleProps) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={styles.toggle}
      hitSlop={4}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel={`Até à falha, ${label}`}
    >
      <Ionicons
        name={value ? "flame" : "flame-outline"}
        size={22}
        color={value ? c.danger : c.textFaint}
      />
    </Pressable>
  );
}

type BoxProps = {
  // Tapping it goes back to typing reps.
  onPress: () => void;
  minHeight: number;
};

// Shown instead of the reps input when a back-off is done to failure.
export function FailureBox({ onPress, minHeight }: BoxProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.box, { minHeight }]}
      accessibilityRole="button"
      accessibilityHint="Escrever as reps em vez de falha"
    >
      <Text style={styles.boxText} numberOfLines={1} adjustsFontSizeToFit>
        FALHA
      </Text>
    </Pressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    toggle: {
      width: FAILURE_TOGGLE_WIDTH,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    // Takes the place of the reps input (same flex) and stretches over the
    // invisible "reps" label after it, so the word fits.
    box: {
      flex: 1,
      marginRight: -(ROW_GAP + REPS_LABEL_WIDTH),
      paddingHorizontal: 6,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.danger,
      backgroundColor: c.dangerBg,
    },
    boxText: {
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 1,
      color: c.danger,
    },
  });
}
