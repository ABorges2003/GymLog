import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SearchBar } from "@/components/search-bar";
import { useFoods } from "@/hooks/use-foods";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { formatBasis, formatMacros, searchFoods } from "@/lib/diet";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

// The user's foods: tap one to edit it, + to create one.
export default function FoodsScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { foods, error } = useFoods();
  const [query, setQuery] = useState("");
  // Room below the results so the last ones are not under the keyboard.
  const keyboardHeight = useKeyboardHeight();
  const results = useMemo(
    () => searchFoods(foods ?? [], query),
    [foods, query],
  );

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
          { paddingBottom: 96 + keyboardHeight },
        ]}
        renderItem={({ item }) => (
          <Link
            href={{ pathname: "/diet/food/edit/[id]", params: { id: item.id } }}
            asChild
          >
            <Pressable
              style={styles.row}
              android_ripple={{ color: c.ripple }}
              accessibilityRole="button"
            >
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowDetails}>
                {formatMacros(item)} {formatBasis(item)}
              </Text>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {foods.length === 0
              ? "Ainda não tens alimentos.\nToca em + para criar o primeiro."
              : "Nenhum alimento encontrado"}
          </Text>
        }
      />
      <Link href="/diet/food/new" asChild>
        <Pressable
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel="Criar alimento"
        >
          <Ionicons name="add" size={32} color={c.onPrimary} />
        </Pressable>
      </Link>
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
      paddingBottom: 96,
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
      marginTop: 32,
      lineHeight: 24,
    },
    fab: {
      position: "absolute",
      right: 20,
      bottom: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primary,
      elevation: 4,
    },
  });
}
