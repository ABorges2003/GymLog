import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FilterChips, type ChipOption } from "@/components/filter-chips";
import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";
import { amountUnit, type FoodInputErrors } from "@/lib/diet";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import type { FoodBasis, FoodInput } from "@/types/diet";

const BASIS_OPTIONS: ChipOption<FoodBasis>[] = [
  { value: "grams", label: "Por gramas" },
  { value: "ml", label: "Por ml" },
  { value: "unit", label: "Por unidade" },
];

type Props = {
  initialValues: FoodInput;
  submitLabel: string;
  // Saves the food. Returns validation errors to show, or {} on success.
  onSubmit: (input: FoodInput) => Promise<FoodInputErrors>;
  // Optional extra content below the save button (e.g. a delete button).
  footer?: React.ReactNode;
};

type NumberField = "kcalText" | "proteinText" | "carbsText" | "fatText";

const NUMBER_FIELDS: { key: NumberField; label: string; unit: string }[] = [
  { key: "kcalText", label: "Calorias", unit: "kcal" },
  { key: "proteinText", label: "Proteína", unit: "g" },
  { key: "carbsText", label: "Carbos", unit: "g" },
  { key: "fatText", label: "Gordura", unit: "g" },
];

// Form shared by "new food" and "edit food".
export function FoodForm({
  initialValues,
  submitLabel,
  onSubmit,
  footer,
}: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [input, setInput] = useState<FoodInput>(initialValues);
  const [errors, setErrors] = useState<FoodInputErrors>({});
  const [saving, setSaving] = useState(false);

  function update(changes: Partial<FoodInput>) {
    setInput((current) => ({ ...current, ...changes }));
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      setErrors(await onSubmit(input));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={input.name}
          onChangeText={(name) => update({ name })}
          placeholder="Ex.: Aveia"
          placeholderTextColor={c.textFaint}
          autoCapitalize="sentences"
          autoFocus={!initialValues.name}
        />
        {errors.name && <Text style={styles.error}>{errors.name}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Os valores são</Text>
        <FilterChips
          options={BASIS_OPTIONS}
          selected={input.basis}
          onSelect={(basis) =>
            update({
              basis,
              basisAmountText: basis === "unit" ? "1" : "100",
            })
          }
          wrap
        />
        <View style={styles.inlineRow}>
          <Text style={styles.inlineLabel}>por</Text>
          <TextInput
            style={[
              styles.input,
              styles.smallInput,
              errors.basisAmount && styles.inputError,
            ]}
            value={input.basisAmountText}
            onChangeText={(basisAmountText) => update({ basisAmountText })}
            keyboardType="decimal-pad"
            maxLength={6}
            selectTextOnFocus
          />
          <Text style={styles.inlineLabel}>
            {input.basis === "unit" ? "unidade(s)" : amountUnit(input.basis)}
          </Text>
        </View>
        {errors.basisAmount && (
          <Text style={styles.error}>{errors.basisAmount}</Text>
        )}
      </View>

      <View style={styles.grid}>
        {NUMBER_FIELDS.map((field) => (
          <View key={field.key} style={styles.gridItem}>
            <Text style={styles.label}>{field.label}</Text>
            <View style={styles.inlineRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.numberInput,
                  errors.macros &&
                    input[field.key].trim() === "" &&
                    styles.inputError,
                ]}
                value={input[field.key]}
                onChangeText={(text) => update({ [field.key]: text })}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={c.textFaint}
                maxLength={7}
                selectTextOnFocus
              />
              <Text style={styles.inlineLabel}>{field.unit}</Text>
            </View>
          </View>
        ))}
      </View>
      {errors.macros && <Text style={styles.error}>{errors.macros}</Text>}

      <Pressable
        onPress={handleSubmit}
        disabled={saving}
        style={[styles.button, saving && styles.disabled]}
        accessibilityRole="button"
      >
        {saving ? (
          <ActivityIndicator color={c.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>{submitLabel}</Text>
        )}
      </Pressable>
      {footer}
    </KeyboardAwareScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 20,
      padding: 16,
    },
    field: {
      gap: 8,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    input: {
      minHeight: 48,
      paddingHorizontal: 12,
      fontSize: 17,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      color: c.text,
    },
    smallInput: {
      width: 100,
      textAlign: "center",
    },
    numberInput: {
      flex: 1,
      textAlign: "center",
      fontWeight: "600",
    },
    inputError: {
      borderColor: c.danger,
    },
    inlineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    inlineLabel: {
      fontSize: 16,
      color: c.textMuted,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    gridItem: {
      width: "47%",
      gap: 6,
    },
    error: {
      fontSize: 14,
      color: c.danger,
    },
    button: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    disabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.onPrimary,
    },
  });
}
