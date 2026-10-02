import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FilterChips, type ChipOption } from "@/components/filter-chips";
import {
  EXERCISE_NAME_MAX_LENGTH,
  type ExerciseInputErrors,
} from "@/lib/exercises";
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from "@/lib/labels";
import {
  EQUIPMENT,
  MUSCLE_GROUPS,
  type Equipment,
  type ExerciseInput,
  type MuscleGroup,
} from "@/types/exercise";

const MUSCLE_GROUP_OPTIONS: ChipOption<MuscleGroup | null>[] =
  MUSCLE_GROUPS.map((muscleGroup) => ({
    value: muscleGroup,
    label: MUSCLE_GROUP_LABELS[muscleGroup],
  }));

const EQUIPMENT_OPTIONS: ChipOption<Equipment | null>[] = [
  ...EQUIPMENT.map((equipment) => ({
    value: equipment,
    label: EQUIPMENT_LABELS[equipment],
  })),
  { value: null, label: "Nenhum" },
];

const EMPTY_INPUT: ExerciseInput = {
  name: "",
  muscleGroup: null,
  equipment: null,
};

type Props = {
  initialValues?: ExerciseInput;
  submitLabel: string;
  // Saves the exercise. Returns validation errors to show, or {} on success.
  onSubmit: (input: ExerciseInput) => Promise<ExerciseInputErrors>;
};

// Form shared by "create" and "edit" custom exercise screens.
export function ExerciseForm({
  initialValues = EMPTY_INPUT,
  submitLabel,
  onSubmit,
}: Props) {
  const [input, setInput] = useState<ExerciseInput>(initialValues);
  const [errors, setErrors] = useState<ExerciseInputErrors>({});
  const [saving, setSaving] = useState(false);

  function update(changes: Partial<ExerciseInput>) {
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
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.field}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={input.name}
          onChangeText={(name) => update({ name })}
          placeholder="Ex.: Remada Baixa Unilateral"
          placeholderTextColor="gray"
          maxLength={EXERCISE_NAME_MAX_LENGTH}
          autoCapitalize="words"
          autoFocus={!initialValues.name}
        />
        {errors.name && <Text style={styles.error}>{errors.name}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Grupo muscular</Text>
        <FilterChips
          options={MUSCLE_GROUP_OPTIONS}
          selected={input.muscleGroup}
          onSelect={(muscleGroup) => update({ muscleGroup })}
          wrap
        />
        {errors.muscleGroup && (
          <Text style={styles.error}>{errors.muscleGroup}</Text>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Equipamento</Text>
        <FilterChips
          options={EQUIPMENT_OPTIONS}
          selected={input.equipment}
          onSelect={(equipment) => update({ equipment })}
          wrap
        />
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
    </ScrollView>
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
