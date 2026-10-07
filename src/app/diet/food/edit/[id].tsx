import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FoodForm } from "@/components/food-form";
import {
  getFoodById,
  getFoodNames,
  removeFood,
  updateFood,
} from "@/db/repositories/diet";
import { foodToInput, validateFood, type FoodInputErrors } from "@/lib/diet";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import type { Food, FoodInput } from "@/types/diet";

export default function EditFoodScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [food, setFood] = useState<Food | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getFoodById(db, id)
      .then((result) => (result ? setFood(result) : setNotFound(true)))
      .catch(() => setNotFound(true));
  }, [db, id]);

  if (notFound) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Este alimento já não existe.</Text>
      </View>
    );
  }

  if (!food) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  async function handleSubmit(input: FoodInput): Promise<FoodInputErrors> {
    try {
      const result = validateFood(input, await getFoodNames(db), id);
      if (!result.ok) return result.errors;
      await updateFood(db, id, result.values);
      router.back();
      return {};
    } catch {
      Alert.alert("Erro", "Não foi possível guardar o alimento.");
      return {};
    }
  }

  function confirmRemove() {
    if (!food) return;
    Alert.alert(
      "Apagar alimento?",
      `"${food.name}" deixa de aparecer na lista. Os dias em que já o registaste não mudam.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: () => {
            removeFood(db, id)
              .then(() => router.back())
              .catch(() =>
                Alert.alert("Erro", "Não foi possível apagar o alimento."),
              );
          },
        },
      ],
    );
  }

  return (
    <FoodForm
      initialValues={foodToInput(food)}
      submitLabel="Guardar alterações"
      onSubmit={handleSubmit}
      footer={
        <Pressable
          onPress={confirmRemove}
          style={styles.deleteButton}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={22} color={c.danger} />
          <Text style={styles.deleteText}>Apagar alimento</Text>
        </Pressable>
      }
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
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.dangerBorder,
    },
    deleteText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.danger,
    },
  });
}
