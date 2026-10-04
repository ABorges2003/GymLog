import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Alert } from "react-native";

import { RoutineNameForm } from "@/components/routine-name-form";
import { createRoutine, getRoutineNames } from "@/db/repositories/routines";
import { validateRoutineName } from "@/lib/routines";

export default function NewRoutineScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  async function handleSubmit(name: string): Promise<string | null> {
    try {
      const error = validateRoutineName(name, await getRoutineNames(db));
      if (error) return error;
      const id = await createRoutine(db, name);
      // Open the new routine so exercises can be added right away.
      router.replace({ pathname: "/routine/[id]", params: { id } });
      return null;
    } catch {
      Alert.alert("Erro", "Não foi possível criar a rotina.");
      return null;
    }
  }

  return <RoutineNameForm submitLabel="Criar rotina" onSubmit={handleSubmit} />;
}
