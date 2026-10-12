import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";
import {
  PHASE_NAME_MAX_LENGTH,
  autoFormatDateText,
  formatDateText,
  validatePhase,
  type PhaseErrors,
  type PhaseInput,
} from "@/lib/body-weight-phases";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

type Props = {
  initial: PhaseInput;
  submitLabel: string;
  // Saves the phase; throws if saving fails.
  onSubmit: (phase: PhaseInput) => Promise<void>;
  // Extra content below the save button (e.g. a delete button).
  footer?: ReactNode;
};

// Name, start and (optional) end of a body weight phase. Dates are typed as
// dd/mm/aaaa; the slashes are added while typing.
export function PhaseForm({ initial, submitLabel, onSubmit, footer }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState(initial.name);
  const [startText, setStartText] = useState(formatDateText(initial.startDate));
  const [endText, setEndText] = useState(
    initial.endDate === null ? "" : formatDateText(initial.endDate),
  );
  // Errors only show after the first try, not while typing.
  const [errors, setErrors] = useState<PhaseErrors | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const form = { name, startText, endText };
  const shown = errors === null ? {} : errors;

  async function submit() {
    const result = validatePhase(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit(result.phase);
    } catch {
      setSaveError("Não foi possível guardar a época.");
    } finally {
      setSaving(false);
    }
  }

  // After the first try, errors follow what is typed.
  function update(next: typeof form) {
    if (errors !== null) {
      const result = validatePhase(next);
      setErrors(result.ok ? {} : result.errors);
    }
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.field}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={[styles.input, shown.name && styles.inputError]}
          value={name}
          onChangeText={(text) => {
            setName(text);
            update({ ...form, name: text });
          }}
          placeholder="Ex.: Bulk inverno, Cut verão"
          placeholderTextColor={c.textFaint}
          maxLength={PHASE_NAME_MAX_LENGTH}
          autoCapitalize="sentences"
        />
        {shown.name && <Text style={styles.error}>{shown.name}</Text>}
      </View>

      <View style={styles.dates}>
        <View style={[styles.field, styles.dateField]}>
          <Text style={styles.label}>Início</Text>
          <TextInput
            style={[
              styles.input,
              styles.dateInput,
              shown.startDate && styles.inputError,
            ]}
            value={startText}
            onChangeText={(text) => {
              const next = autoFormatDateText(text);
              setStartText(next);
              update({ ...form, startText: next });
            }}
            keyboardType="number-pad"
            placeholder="dd/mm/aaaa"
            placeholderTextColor={c.textFaint}
            maxLength={10}
            accessibilityLabel="Data de início"
          />
          {shown.startDate && (
            <Text style={styles.error}>{shown.startDate}</Text>
          )}
        </View>

        <View style={[styles.field, styles.dateField]}>
          <Text style={styles.label}>Fim</Text>
          <TextInput
            style={[
              styles.input,
              styles.dateInput,
              shown.endDate && styles.inputError,
            ]}
            value={endText}
            onChangeText={(text) => {
              const next = autoFormatDateText(text);
              setEndText(next);
              update({ ...form, endText: next });
            }}
            keyboardType="number-pad"
            placeholder="dd/mm/aaaa"
            placeholderTextColor={c.textFaint}
            maxLength={10}
            accessibilityLabel="Data de fim"
          />
          {shown.endDate && <Text style={styles.error}>{shown.endDate}</Text>}
        </View>
      </View>
      <Text style={styles.hint}>
        Ainda não sabes quando acaba? Deixa o fim vazio e muda depois.
      </Text>

      <Pressable
        onPress={submit}
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
      {saveError && <Text style={styles.error}>{saveError}</Text>}

      {footer}
    </KeyboardAwareScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 16,
      padding: 16,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    input: {
      minHeight: 52,
      paddingHorizontal: 14,
      fontSize: 17,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      color: c.text,
    },
    inputError: {
      borderColor: c.danger,
    },
    dates: {
      flexDirection: "row",
      gap: 12,
    },
    dateField: {
      flex: 1,
    },
    dateInput: {
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    hint: {
      marginTop: -8,
      fontSize: 14,
      color: c.textMuted,
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
    buttonText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.onPrimary,
    },
    disabled: {
      opacity: 0.4,
    },
  });
}
