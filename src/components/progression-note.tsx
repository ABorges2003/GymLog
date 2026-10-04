import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text } from "react-native";

import { PROGRESSION_COLORS, PROGRESSION_LABELS } from "@/lib/routines";
import type { Progression } from "@/types/routine";

type Props = {
  progression: Progression | null;
  onPress: () => void;
};

// Green "keep" / red "increase" note for the next workout, or a button to add one.
export function ProgressionNote({ progression, onPress }: Props) {
  if (!progression) {
    return (
      <Pressable
        onPress={onPress}
        style={styles.empty}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={18} color="gray" />
        <Text style={styles.emptyText}>Nota para a próxima semana</Text>
      </Pressable>
    );
  }

  const colors = PROGRESSION_COLORS[progression];
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

const styles = StyleSheet.create({
  empty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 15,
    color: "gray",
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
  },
});
