import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import { ExerciseForm } from "@/components/exercise-form";
import { getExerciseNames, updateExercise } from "@/db/repositories/exercises";
import { useExercise } from "@/hooks/use-exercise";
import {
  hasErrors,
  validateExerciseInput,
  type ExerciseInputErrors,
} from "@/lib/exercises";
import type { ExerciseInput } from "@/types/exercise";
import type { ThemeColors } from "@/theme/colors";
import { useThemedStyles } from "@/theme/theme";

export default function EditExerciseScreen() {
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { detail, notFound, error } = useExercise(id);

  if (error || notFound) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {error ?? "Este exercício já não existe."}
        </Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { exercise } = detail;

  async function handleSubmit(
    input: ExerciseInput,
  ): Promise<ExerciseInputErrors> {
    try {
      const errors = validateExerciseInput(
        input,
        await getExerciseNames(db),
        id,
      );
      if (hasErrors(errors) || !input.muscleGroup) {
        return errors;
      }
      await updateExercise(db, id, {
        name: input.name,
        muscleGroup: input.muscleGroup,
        equipment: input.equipment,
      });
      // The details screen reloads when it gets focus again.
      router.back();
      return {};
    } catch {
      Alert.alert("Erro", "Não foi possível guardar as alterações.");
      return {};
    }
  }

  return (
    <ExerciseForm
      initialValues={{
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
      }}
      submitLabel="Guardar alterações"
      onSubmit={handleSubmit}
    />
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
    error: {
      fontSize: 16,
      color: c.danger,
      textAlign: "center",
    },
  });
}
