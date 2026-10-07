import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { parseBodyWeight } from "@/lib/body-weight";
import { formatWeight } from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

type Props = {
  goalKg: number | null;
  // null removes the goal.
  onSave: (goalKg: number | null) => Promise<void>;
};

// Shows the body weight goal, with a small form to set, change or remove it.
export function GoalEditor({ goalKg, onSave }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const value = parseBodyWeight(text);

  function startEditing() {
    setText(goalKg === null ? "" : formatWeight(goalKg));
    setEditing(true);
  }

  async function save(next: number | null) {
    await onSave(next);
    setEditing(false);
  }

  if (!editing) {
    return (
      <Pressable
        onPress={startEditing}
        style={styles.row}
        accessibilityRole="button"
        accessibilityHint="Definir ou mudar o objetivo"
      >
        <Ionicons name="flag-outline" size={20} color={c.warning} />
        <Text style={styles.label}>Objetivo</Text>
        <Text style={styles.value}>
          {goalKg === null ? "Definir" : `${formatWeight(goalKg)} kg`}
        </Text>
        <Ionicons name="create-outline" size={20} color={c.textMuted} />
      </Pressable>
    );
  }

  return (
    <View style={styles.editRow}>
      <TextInput
        style={[
          styles.input,
          text !== "" && value === null && styles.inputError,
        ]}
        value={text}
        onChangeText={setText}
        keyboardType="decimal-pad"
        placeholder="Ex.: 75"
        placeholderTextColor={c.textFaint}
        maxLength={6}
        autoFocus
        selectTextOnFocus
        accessibilityLabel="Objetivo em kg"
      />
      <Text style={styles.unit}>kg</Text>
      <Pressable
        onPress={() => value !== null && save(value)}
        disabled={value === null}
        style={[
          styles.button,
          styles.saveButton,
          value === null && styles.disabled,
        ]}
        accessibilityRole="button"
      >
        <Text style={styles.saveText}>Guardar</Text>
      </Pressable>
      {goalKg !== null && (
        <Pressable
          onPress={() => save(null)}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Tirar objetivo"
        >
          <Ionicons name="trash-outline" size={20} color={c.danger} />
        </Pressable>
      )}
      <Pressable
        onPress={() => setEditing(false)}
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Cancelar"
      >
        <Ionicons name="close" size={22} color={c.textMuted} />
      </Pressable>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 44,
    },
    label: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    value: {
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    editRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    input: {
      flex: 1,
      minHeight: 48,
      fontSize: 20,
      fontWeight: "600",
      textAlign: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.input,
      color: c.text,
    },
    inputError: {
      borderColor: c.danger,
    },
    unit: {
      fontSize: 16,
      color: c.textMuted,
    },
    button: {
      minHeight: 48,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
    },
    saveButton: {
      backgroundColor: c.primary,
    },
    saveText: {
      fontSize: 16,
      fontWeight: "600",
      color: c.onPrimary,
    },
    disabled: {
      opacity: 0.35,
    },
    iconButton: {
      width: 40,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
