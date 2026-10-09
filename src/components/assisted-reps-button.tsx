import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Popup, PopupButton } from "@/components/popup";
import { formatReps, parseReps } from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

type Props = {
  // Shown under the popup title, e.g. "Supino · série 4".
  title: string;
  reps: number | null;
  // null removes them.
  onSave: (reps: number | null) => void;
};

// Hand icon at the end of a workout set: reps done with help. Shows "+N"
// once set; tap again to change or remove.
export function AssistedRepsButton({ title, reps, onSave }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const parsed = parseReps(text);
  const value = parsed.ok ? parsed.value : null;

  function openPopup() {
    setText(reps === null ? "" : formatReps(reps));
    setOpen(true);
  }

  function save(next: number | null) {
    setOpen(false);
    if (next !== reps) onSave(next);
  }

  return (
    <>
      <Pressable
        onPress={openPopup}
        style={styles.button}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={
          reps === null
            ? "Reps com ajuda"
            : `${formatReps(reps)} reps com ajuda`
        }
      >
        {reps === null ? (
          <Ionicons name="hand-left-outline" size={20} color={c.textFaint} />
        ) : (
          <Text style={styles.buttonText} numberOfLines={1}>
            +{formatReps(reps)}
          </Text>
        )}
      </Pressable>

      <Popup
        visible={open}
        title="Reps com ajuda"
        subtitle={title}
        onClose={() => setOpen(false)}
      >
        <Text style={styles.hint}>Quantas reps fizeste com ajuda?</Text>
        <View style={styles.inputRow}>
          <Text style={styles.plus}>+</Text>
          <TextInput
            style={[styles.input, !parsed.ok && styles.inputError]}
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            placeholder="Ex.: 2"
            placeholderTextColor={c.textFaint}
            maxLength={4}
            autoFocus
            selectTextOnFocus
            accessibilityLabel="Reps com ajuda"
          />
          <Text style={styles.unit}>reps</Text>
        </View>
        <PopupButton
          label="Guardar"
          variant="primary"
          disabled={value === null}
          onPress={() => value !== null && save(value)}
        />
        {reps !== null ? (
          <PopupButton
            label="Tirar"
            variant="danger"
            onPress={() => save(null)}
          />
        ) : (
          <PopupButton label="Cancelar" onPress={() => setOpen(false)} />
        )}
      </Popup>
    </>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    button: {
      width: 40,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "700",
      color: c.accent,
    },
    hint: {
      fontSize: 15,
      color: c.textMuted,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    plus: {
      fontSize: 22,
      fontWeight: "bold",
      color: c.text,
    },
    input: {
      flex: 1,
      minHeight: 52,
      fontSize: 22,
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
  });
}
