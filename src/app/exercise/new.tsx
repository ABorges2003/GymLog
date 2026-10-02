import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Alert } from "react-native";

import { ExerciseForm } from "@/components/exercise-form";
import { createExercise, getExerciseNames } from "@/db/repositories/exercises";
import {
  hasErrors,
  validateExerciseInput,
  type ExerciseInputErrors,
} from "@/lib/exercises";
import type { ExerciseInput } from "@/types/exercise";

export default function NewExerciseScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  async function handleSubmit(
    input: ExerciseInput,
  ): Promise<ExerciseInputErrors> {
    try {
      const errors = validateExerciseInput(input, await getExerciseNames(db));
      if (hasErrors(errors) || !input.muscleGroup) {
        return errors;
      }
      const id = await createExercise(db, {
        name: input.name,
        muscleGroup: input.muscleGroup,
        equipment: input.equipment,
      });
      // Show the new exercise instead of the form.
      router.replace({ pathname: "/exercise/[id]", params: { id } });
      return {};
    } catch {
      Alert.alert("Erro", "Não foi possível guardar o exercício.");
      return {};
    }
  }

  return <ExerciseForm submitLabel="Criar exercício" onSubmit={handleSubmit} />;
}
