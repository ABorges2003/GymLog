import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useMemo } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

import { ExercisePicker } from "@/components/exercise-picker";
import { addExercisesToRoutine } from "@/db/repositories/routines";
import { useExercises } from "@/hooks/use-exercises";
import { useRoutine } from "@/hooks/use-routine";

export default function AddRoutineExercisesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { exercises } = useExercises();
  const { routine, exercises: routineExercises } = useRoutine(id);

  const alreadyInRoutine = useMemo(
    () => new Set(routineExercises.map((item) => item.exercise.id)),
    [routineExercises],
  );

  if (!exercises || !routine) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  async function handleConfirm(exerciseIds: string[]) {
    try {
      await addExercisesToRoutine(db, id, exerciseIds);
      router.back();
    } catch {
      Alert.alert("Erro", "Não foi possível adicionar os exercícios.");
    }
  }

  return (
    <ExercisePicker
      exercises={exercises}
      disabledIds={alreadyInRoutine}
      disabledLabel="Já está na rotina"
      onConfirm={handleConfirm}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
