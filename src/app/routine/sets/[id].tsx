import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import { SetStructureEditor } from "@/components/set-structure-editor";
import { useRoutineExercise } from "@/hooks/use-routine-exercise";
import type { PlannedSet } from "@/types/set";
import type { ThemeColors } from "@/theme/colors";
import { useThemedStyles } from "@/theme/theme";

// Edits the planned sets (type, reps, weight) of one exercise in a routine.
export default function RoutineSetsScreen() {
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { item, notFound, error, saveSets } = useRoutineExercise(id);

  if (error || notFound) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>
          {error ?? "Este exercício já não está na rotina."}
        </Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  async function handleSave(sets: PlannedSet[]) {
    try {
      await saveSets(sets);
      router.back();
    } catch {
      Alert.alert("Erro", "Não foi possível guardar as séries.");
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: item.exercise.name }} />
      <SetStructureEditor initialSets={item.sets} onSave={handleSave} />
    </>
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
