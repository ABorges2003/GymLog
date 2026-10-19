import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Popup, PopupButton } from "@/components/popup";
import {
  amountUnit,
  formatMacros,
  parseAmount,
  rescaleEntry,
} from "@/lib/diet";
import { formatWeight } from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useThemedStyles } from "@/theme/theme";
import type { FoodEntry } from "@/types/diet";

type Props = {
  entry: FoodEntry;
  onClose: () => void;
  // Saves the new amount; throws if saving fails.
  onSave: (amount: number) => Promise<void>;
};

// Changes only the amount of a food already in a meal. Render it only while
// open, so it starts with the entry's amount.
export function FoodEntryPopup({ entry, onClose, onSave }: Props) {
  const styles = useThemedStyles(createStyles);
  const [text, setText] = useState(formatWeight(entry.amount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = parseAmount(text, entry.basis);

  async function save() {
    if (amount === null) return;
    if (amount === entry.amount) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(amount);
      onClose();
    } catch {
      setError("Não foi possível guardar a quantidade.");
      setSaving(false);
    }
  }

  return (
    <Popup visible title={entry.foodName} onClose={onClose}>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            text !== "" && amount === null && styles.inputError,
          ]}
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          maxLength={6}
          autoFocus
          selectTextOnFocus
          accessibilityLabel="Quantidade"
        />
        <Text style={styles.unit}>{amountUnit(entry.basis)}</Text>
      </View>
      <Text style={styles.preview}>
        {amount === null
          ? "Escreve a quantidade."
          : formatMacros(rescaleEntry(entry, amount))}
      </Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <PopupButton
        label="Guardar"
        variant="primary"
        disabled={amount === null || saving}
        onPress={save}
      />
      <PopupButton label="Cancelar" onPress={onClose} />
    </Popup>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    input: {
      width: 140,
      minHeight: 56,
      fontSize: 26,
      fontWeight: "bold",
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
      fontSize: 18,
      color: c.textMuted,
    },
    preview: {
      fontSize: 15,
      textAlign: "center",
      color: c.textMuted,
    },
    error: {
      fontSize: 14,
      color: c.danger,
      textAlign: "center",
    },
  });
}
