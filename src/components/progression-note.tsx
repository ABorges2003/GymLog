import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text } from "react-native";

import { PROGRESSION_LABELS } from "@/lib/routines";
import type { Progression } from "@/types/routine";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

type Props = {
  progression: Progression | null;
  onPress: () => void;
};

// Green "keep" / red "increase" note for the next workout, or a button to add one.
export function ProgressionNote({ progression, onPress }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  if (!progression) {
    return (
      <Pressable
        onPress={onPress}
        style={styles.empty}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={18} color={c.textMuted} />
        <Text style={styles.emptyText}>Nota para a próxima semana</Text>
      </Pressable>
    );
  }

  const colors =
    progression === "keep"
      ? { text: c.success, background: c.successBg }
      : { text: c.danger, background: c.dangerBg };
  return (
    <Pressable
      onPress={onPress}
      style={[styles.note, { backgroundColor: colors.background }]}
      accessibilityRole="button"
      accessibilityHint="Mudar ou tirar a nota"
    >
      <Ionicons
        name={progression === "increase" ? "arrow-up-circle" : "pause-circle"}
        size={20}
        color={colors.text}
      />
      <Text style={[styles.noteText, { color: colors.text }]}>
        {PROGRESSION_LABELS[progression]}
      </Text>
    </Pressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    empty: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 16,
    },
    emptyText: {
      fontSize: 15,
      color: c.textMuted,
    },
    note: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 44,
      marginHorizontal: 12,
      marginBottom: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    noteText: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
  });
}
