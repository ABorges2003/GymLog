import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Alert } from "react-native";

import { FoodForm } from "@/components/food-form";
import { createFood, getFoodNames } from "@/db/repositories/diet";
import { foodToInput, validateFood, type FoodInputErrors } from "@/lib/diet";
import type { FoodInput } from "@/types/diet";

export default function NewFoodScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  async function handleSubmit(input: FoodInput): Promise<FoodInputErrors> {
    try {
      const result = validateFood(input, await getFoodNames(db));
      if (!result.ok) return result.errors;
      await createFood(db, result.values);
      router.back();
      return {};
    } catch {
      Alert.alert("Erro", "Não foi possível guardar o alimento.");
      return {};
    }
  }

  return (
    <FoodForm
      initialValues={foodToInput(null)}
      submitLabel="Criar alimento"
      onSubmit={handleSubmit}
    />
  );
}
