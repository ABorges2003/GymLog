import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ROUTINE_NAME_MAX_LENGTH } from "@/lib/routines";

type Props = {
  initialName?: string;
  submitLabel: string;
  // Saves the name. Returns an error message to show, or null on success.
  onSubmit: (name: string) => Promise<string | null>;
};

// Form shared by "new routine" and "rename routine".
export function RoutineNameForm({
  initialName = "",
  submitLabel,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try {
      setError(await onSubmit(name));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>Nome da rotina</Text>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Push, Pull, Pernas"
          placeholderTextColor="gray"
          maxLength={ROUTINE_NAME_MAX_LENGTH}
          autoCapitalize="words"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={saving}
        style={[styles.button, saving && styles.buttonDisabled]}
        accessibilityRole="button"
      >
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>{submitLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 12,
    fontSize: 17,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d0d4da",
    backgroundColor: "white",
  },
  inputError: {
    borderColor: "red",
  },
  error: {
    fontSize: 14,
    color: "red",
  },
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#1f2937",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "white",
  },
});
