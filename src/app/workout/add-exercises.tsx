import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useMemo } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

import { ExercisePicker } from "@/components/exercise-picker";
import { addExercisesToWorkout } from "@/db/repositories/workouts";
import { useActiveWorkout } from "@/hooks/use-active-workout";
import { useExercises } from "@/hooks/use-exercises";
import type { ThemeColors } from "@/theme/colors";
import { useThemedStyles } from "@/theme/theme";

// Adds exercises to the workout in progress (and to its routine).
export default function AddWorkoutExercisesScreen() {
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const router = useRouter();
  const { exercises } = useExercises();
  const { detail, loading } = useActiveWorkout();

  const alreadyInWorkout = useMemo(
    () => new Set(detail?.exercises.map((item) => item.exercise.id) ?? []),
    [detail],
  );

  if (!exercises || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  async function handleConfirm(exerciseIds: string[]) {
    if (!detail) return;
    try {
      await addExercisesToWorkout(db, detail.workout.id, exerciseIds);
      router.back();
    } catch {
      Alert.alert("Erro", "Não foi possível adicionar os exercícios.");
    }
  }

  return (
    <ExercisePicker
      exercises={exercises}
      disabledIds={alreadyInWorkout}
      disabledLabel="Já está no treino"
      onConfirm={handleConfirm}
    />
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
