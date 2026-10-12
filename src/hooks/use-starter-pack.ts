import { useSQLiteContext } from "expo-sqlite";
import { useCallback } from "react";
import { Alert } from "react-native";

import { STARTER_PACK } from "@/data/starter-pack";
import {
  importStarterPack,
  previewStarterPack,
} from "@/db/repositories/starter";
import { listNames } from "@/lib/starter";

const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

// Adds the example exercises and foods built into the app, after showing what
// will be added and what the user already has (kept as it is). `onAdded`
// runs after they are added.
export function useStarterPack(onAdded: () => void) {
  const db = useSQLiteContext();

  const add = useCallback(async () => {
    const plan = await previewStarterPack(db, STARTER_PACK);
    const adding = plan.newExercises.length + plan.newFoods.length;
    const existing = [...plan.existingExercises, ...plan.existingFoods];

    if (adding === 0) {
      Alert.alert(
        "Já tens tudo",
        "Já tens todos os exercícios e alimentos de exemplo. Nada foi alterado.",
      );
      return;
    }

    const lines = [
      `Vão ser adicionados ${count(plan.newExercises.length, "exercício", "exercícios")} e ${count(plan.newFoods.length, "alimento", "alimentos")}.`,
    ];
    if (existing.length > 0) {
      lines.push(
        `Já tens ${existing.length} com o mesmo nome (${listNames(existing)}): ${existing.length === 1 ? "fica exatamente como está" : "ficam exatamente como estão"}.`,
      );
    }
    lines.push("Nada do que é teu é apagado nem alterado.");

    Alert.alert("Adicionar exemplos?", lines.join("\n\n"), [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Adicionar",
        onPress: () => {
          importStarterPack(db, STARTER_PACK)
            .then((done) => {
              Alert.alert(
                "Exemplos adicionados",
                `Adicionados ${count(done.newExercises.length, "exercício", "exercícios")} e ${count(done.newFoods.length, "alimento", "alimentos")}. Podes editá-los ou apagá-los como os teus.`,
              );
              onAdded();
            })
            .catch(() =>
              Alert.alert(
                "Erro",
                "Não foi possível adicionar os exemplos. Os teus dados não foram alterados.",
              ),
            );
        },
      },
    ]);
  }, [db, onAdded]);

  return { add };
}
