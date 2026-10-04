import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";

import { RoutineNameForm } from "@/components/routine-name-form";
import { getRoutineNames, renameRoutine } from "@/db/repositories/routines";
import { useRoutine } from "@/hooks/use-routine";
import { validateRoutineName } from "@/lib/routines";

export default function RenameRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { routine } = useRoutine(id);

  if (!routine) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  async function handleSubmit(name: string): Promise<string | null> {
    try {
      const error = validateRoutineName(name, await getRoutineNames(db), id);
      if (error) return error;
      await renameRoutine(db, id, name);
      router.back();
      return null;
    } catch {
      Alert.alert("Erro", "Não foi possível mudar o nome.");
      return null;
    }
  }

  return (
    <RoutineNameForm
      initialName={routine.name}
      submitLabel="Guardar"
      onSubmit={handleSubmit}
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
