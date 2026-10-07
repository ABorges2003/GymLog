import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";
import { SearchBar } from "@/components/search-bar";
import { addFoodEntry } from "@/db/repositories/diet";
import { useFoods } from "@/hooks/use-foods";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import {
  MEAL_LABELS,
  amountUnit,
  formatBasis,
  formatMacros,
  parseAmount,
  scaleMacros,
  searchFoods,
} from "@/lib/diet";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { MEALS, type Food, type Meal } from "@/types/diet";

function isMeal(value: string | undefined): value is Meal {
  return MEALS.includes(value as Meal);
}

// Adds a food to a meal: pick the food, type the grams or units.
export default function AddFoodEntryScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ date: string; meal: string }>();
  const meal = isMeal(params.meal) ? params.meal : "breakfast";
  const { foods, error } = useFoods();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [amountText, setAmountText] = useState("");
  const [saving, setSaving] = useState(false);
  // Room below the search results so the last ones are not under the keyboard.
  const keyboardHeight = useKeyboardHeight();

  const results = useMemo(
    () => searchFoods(foods ?? [], query),
    [foods, query],
  );
  const amount = selected ? parseAmount(amountText, selected.basis) : null;

  function select(food: Food) {
    setSelected(food);
    setAmountText(food.basis === "unit" ? "1" : "");
  }

  async function add() {
    if (!selected || amount === null) return;
    setSaving(true);
    try {
      await addFoodEntry(db, {
        date: params.date,
        meal,
        food: selected,
        amount,
      });
      router.back();
    } catch {
      Alert.alert("Erro", "Não foi possível adicionar o alimento.");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!foods) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: MEAL_LABELS[meal] }} />

      {selected ? (
        <KeyboardAwareScrollView>
          <View style={styles.amountCard}>
            <View style={styles.selectedRow}>
              <Text style={styles.selectedName}>{selected.name}</Text>
              <Pressable
                onPress={() => setSelected(null)}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel="Escolher outro alimento"
              >
                <Ionicons name="close" size={22} color={c.textMuted} />
              </Pressable>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  amountText !== "" && amount === null && styles.inputError,
                ]}
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
                placeholder={
                  selected.basis === "unit"
                    ? "Ex.: 1"
                    : selected.basis === "ml"
                      ? "Ex.: 250"
                      : "Ex.: 80"
                }
                placeholderTextColor={c.textFaint}
                maxLength={7}
                autoFocus
                selectTextOnFocus
                accessibilityLabel={
                  selected.basis === "unit"
                    ? "Unidades"
                    : selected.basis === "ml"
                      ? "Mililitros"
                      : "Gramas"
                }
              />
              <Text style={styles.unit}>{amountUnit(selected.basis)}</Text>
            </View>
            <Text style={styles.preview}>
              {amount !== null
                ? formatMacros(scaleMacros(selected, amount))
                : `${formatMacros(selected)} ${formatBasis(selected)}`}
            </Text>
            <Pressable
              onPress={add}
              disabled={amount === null || saving}
              style={[
                styles.addButton,
                (amount === null || saving) && styles.disabled,
              ]}
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator color={c.onPrimary} />
              ) : (
                <Text style={styles.addText}>Adicionar</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAwareScrollView>
      ) : (
        <>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Pesquisar alimento"
          />
          <FlatList
            data={results}
            keyExtractor={(food) => food.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.list,
              { paddingBottom: 16 + keyboardHeight },
            ]}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => select(item)}
                style={styles.row}
                android_ripple={{ color: c.ripple }}
                accessibilityRole="button"
              >
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowDetails}>
                  {formatMacros(item)} {formatBasis(item)}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {foods.length === 0
                  ? "Ainda não tens alimentos. Cria o primeiro."
                  : "Nenhum alimento encontrado"}
              </Text>
            }
            ListFooterComponent={
              <Link href="/diet/food/new" asChild>
                <Pressable
                  style={styles.createButton}
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={22} color={c.text} />
                  <Text style={styles.createText}>Criar alimento</Text>
                </Pressable>
              </Link>
            }
          />
        </>
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
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
    list: {
      gap: 8,
      padding: 16,
    },
    row: {
      gap: 2,
      minHeight: 60,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.card,
    },
    rowName: {
      fontSize: 17,
      fontWeight: "500",
      color: c.text,
    },
    rowDetails: {
      fontSize: 13,
      color: c.textMuted,
    },
    empty: {
      fontSize: 16,
      color: c.textMuted,
      textAlign: "center",
      marginVertical: 24,
    },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 52,
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: c.textFaint,
    },
    createText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.text,
    },
    amountCard: {
      gap: 14,
      margin: 16,
      padding: 16,
      borderRadius: 12,
      backgroundColor: c.card,
    },
    selectedRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    selectedName: {
      flex: 1,
      fontSize: 20,
      fontWeight: "bold",
      color: c.text,
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    input: {
      width: 160,
      minHeight: 64,
      fontSize: 32,
      fontWeight: "bold",
      textAlign: "center",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.input,
      color: c.text,
    },
    inputError: {
      borderColor: c.danger,
    },
    unit: {
      fontSize: 22,
      color: c.textMuted,
    },
    preview: {
      fontSize: 15,
      textAlign: "center",
      color: c.textMuted,
    },
    addButton: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    addText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.onPrimary,
    },
    disabled: {
      opacity: 0.4,
    },
  });
}
