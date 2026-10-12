import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FoodEntryPopup } from "@/components/food-entry-popup";
import { MacroDonut } from "@/components/macro-donut";
import { PressableScale } from "@/components/pressable-scale";
import { ProgressBar } from "@/components/progress-bar";
import { useDietDay } from "@/hooks/use-diet-day";
import { toDateKey } from "@/lib/dates";
import { MEAL_LABELS, formatAmount, sumMacros } from "@/lib/diet";
import { formatWeight } from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius, shadows, spacing, type } from "@/theme/tokens";
import { MEALS, type FoodEntry, type Meal } from "@/types/diet";

const round = (value: number) => Math.round(value);

function isMeal(value: string | undefined): value is Meal {
  return MEALS.includes(value as Meal);
}

// One meal of a day: what was eaten, how it splits into macros, and the
// button to add more. Tap a food to change its amount.
export default function MealScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ date: string; meal: string }>();
  const meal = isMeal(params.meal) ? params.meal : "breakfast";
  const date = params.date ?? toDateKey(new Date());
  const { day, error, deleteEntry, updateAmount } = useDietDay(date);
  // The food whose amount is being changed, if any.
  const [editing, setEditing] = useState<FoodEntry | null>(null);

  function confirmDelete(entry: FoodEntry) {
    Alert.alert("Tirar alimento?", entry.foodName, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Tirar",
        style: "destructive",
        onPress: () => {
          deleteEntry(entry.id).catch(() =>
            Alert.alert("Erro", "Não foi possível tirar o alimento."),
          );
        },
      },
    ]);
  }

  const title = <Stack.Screen options={{ title: MEAL_LABELS[meal] }} />;

  if (error) {
    return (
      <View style={styles.center}>
        {title}
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!day) {
    return (
      <View style={styles.center}>
        {title}
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const entries = day.entries.filter((entry) => entry.meal === meal);
  const totals = sumMacros(entries);
  const planned = day.goals?.mealKcal?.[meal];

  return (
    <View style={styles.screen}>
      {title}
      <ScrollView contentContainerStyle={styles.container}>
        {/* Calories: left of the plan for this meal, or eaten if no plan. */}
        <View style={styles.summary}>
          {planned !== undefined ? (
            <>
              <Text style={styles.muted}>
                Consumido {formatWeight(round(totals.kcal))} de{" "}
                {formatWeight(planned)} kcal
              </Text>
              <View style={styles.bigRow}>
                <Text style={styles.bigValue}>
                  {formatWeight(round(planned - totals.kcal))}
                </Text>
                <Text style={styles.bigLabel}>kcal{"\n"}restantes</Text>
              </View>
              <ProgressBar value={totals.kcal} max={planned} />
            </>
          ) : (
            <View style={styles.bigRow}>
              <Text style={styles.bigValue}>
                {formatWeight(round(totals.kcal))}
              </Text>
              <Text style={styles.bigLabel}>kcal</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Alimentos</Text>
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="restaurant" size={32} color={c.onPrimarySoft} />
            </View>
            <Text style={styles.emptyText}>
              Ainda não há nada nesta refeição.
            </Text>
          </View>
        ) : (
          entries.map((entry) => (
            <View key={entry.id} style={styles.entry}>
              <Pressable
                onPress={() => setEditing(entry)}
                style={styles.entryText}
                android_ripple={{ color: c.ripple }}
                accessibilityRole="button"
                accessibilityHint="Mudar a quantidade"
              >
                <Text style={styles.entryName}>{entry.foodName}</Text>
                <Text style={styles.muted}>
                  {formatAmount(entry.amount, entry.basis)} ·{" "}
                  {round(entry.kcal)} kcal
                </Text>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(entry)}
                style={styles.deleteButton}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`Tirar ${entry.foodName}`}
              >
                <Ionicons name="trash-outline" size={22} color={c.textMuted} />
              </Pressable>
            </View>
          ))
        )}

        {entries.length > 0 && (
          <View style={styles.card}>
            <View>
              <Text style={styles.cardTitle}>Informação nutricional</Text>
              <Text style={styles.muted}>Soma de todos os alimentos</Text>
            </View>
            <View style={styles.nutrition}>
              <MacroDonut
                carbsG={totals.carbsG}
                proteinG={totals.proteinG}
                fatG={totals.fatG}
                kcal={totals.kcal}
              />
              <View style={styles.legend}>
                <LegendRow label="Carbs" grams={totals.carbsG} color={c.carbs} />
                <LegendRow
                  label="Proteína"
                  grams={totals.proteinG}
                  color={c.protein}
                />
                <LegendRow label="Gordura" grams={totals.fatG} color={c.fat} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Link
          href={{ pathname: "/diet/add", params: { date, meal } }}
          asChild
        >
          <PressableScale style={styles.addButton} accessibilityRole="button">
            <Ionicons name="add" size={24} color={c.onPrimary} />
            <Text style={styles.addText}>Adicionar alimento</Text>
          </PressableScale>
        </Link>
      </View>

      {editing && (
        <FoodEntryPopup
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(amount) => updateAmount(editing, amount)}
        />
      )}
    </View>
  );
}

function LegendRow({
  label,
  grams,
  color,
}: {
  label: string;
  grams: number;
  color: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendBar, { backgroundColor: color }]} />
      <Text style={styles.legendLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.legendValue}>{formatWeight(grams)} g</Text>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    container: {
      gap: spacing.md,
      padding: spacing.lg,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    error: {
      ...type.body,
      color: c.danger,
      textAlign: "center",
    },
    summary: {
      gap: spacing.sm,
      paddingBottom: spacing.sm,
    },
    bigRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    bigValue: {
      fontSize: 56,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      color: c.text,
    },
    bigLabel: {
      ...type.bodyStrong,
      fontSize: 18,
      lineHeight: 22,
      color: c.text,
    },
    muted: {
      fontSize: 14,
      color: c.textMuted,
    },
    sectionTitle: {
      ...type.title,
      marginTop: spacing.sm,
      color: c.text,
    },
    empty: {
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.xl,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    emptyText: {
      ...type.body,
      textAlign: "center",
      color: c.textMuted,
    },
    entry: {
      flexDirection: "row",
      alignItems: "center",
      paddingRight: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: c.card,
      overflow: "hidden",
    },
    entryText: {
      flex: 1,
      gap: spacing.xxs,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    entryName: {
      ...type.bodyStrong,
      fontSize: 17,
      color: c.text,
    },
    deleteButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    card: {
      gap: spacing.lg,
      marginTop: spacing.sm,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.card,
    },
    cardTitle: {
      ...type.headline,
      color: c.text,
    },
    nutrition: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lg,
    },
    legend: {
      flex: 1,
      gap: spacing.sm,
    },
    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingRight: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: c.subtle,
      overflow: "hidden",
    },
    legendBar: {
      width: 5,
      alignSelf: "stretch",
    },
    legendLabel: {
      ...type.caption,
      fontSize: 14,
      flex: 1,
      color: c.text,
    },
    legendValue: {
      ...type.bodyStrong,
      fontSize: 15,
      fontVariant: ["tabular-nums"],
      color: c.text,
    },
    footer: {
      padding: spacing.lg,
      paddingTop: spacing.sm,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 56,
      borderRadius: radius.full,
      backgroundColor: c.primary,
      boxShadow: shadows.raised,
    },
    addText: {
      ...type.bodyStrong,
      fontSize: 17,
      color: c.onPrimary,
    },
  });
}
