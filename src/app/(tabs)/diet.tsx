import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ProgressBar } from "@/components/progress-bar";
import { useDietDay } from "@/hooks/use-diet-day";
import { addDaysToKey, formatDayLabel, toDateKey } from "@/lib/dates";
import { MEAL_LABELS, formatAmount, formatMacros, sumMacros } from "@/lib/diet";
import { formatWeight } from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { MEALS, type FoodEntry } from "@/types/diet";

const round = (value: number) => Math.round(value);

function MacroTile({
  label,
  value,
  goal,
}: {
  label: string;
  value: number;
  goal: number | null;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.macroTile}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>
        {formatWeight(round(value))}
        {goal !== null && (
          <Text style={styles.macroGoal}> / {formatWeight(goal)}g</Text>
        )}
      </Text>
      {goal !== null && <ProgressBar value={value} max={goal} />}
    </View>
  );
}

export default function DietScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const today = toDateKey(new Date());
  const [date, setDate] = useState(today);
  const { day, error, deleteEntry } = useDietDay(date);

  const totals = useMemo(() => sumMacros(day?.entries ?? []), [day]);

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

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!day) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { goals, entries } = day;
  const target = goals?.kcal ?? null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.dayRow}>
        <Pressable
          onPress={() => setDate(addDaysToKey(date, -1))}
          style={styles.dayButton}
          accessibilityRole="button"
          accessibilityLabel="Dia anterior"
        >
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text style={styles.dayLabel}>{formatDayLabel(date)}</Text>
        <Pressable
          onPress={() => setDate(addDaysToKey(date, 1))}
          disabled={date >= today}
          style={[styles.dayButton, date >= today && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Dia seguinte"
        >
          <Ionicons name="chevron-forward" size={26} color={c.text} />
        </Pressable>
      </View>

      {goals === null || target === null ? (
        <Link href="/diet/goals" asChild>
          <Pressable style={styles.card} accessibilityRole="button">
            <Text style={styles.cardTitle}>Define os teus objetivos</Text>
            <Text style={styles.muted}>
              Kcal, proteína, carbos e gordura por dia. Toca aqui.
            </Text>
          </Pressable>
        </Link>
      ) : (
        <View style={styles.card}>
          <View style={styles.summaryTop}>
            <View style={styles.remaining}>
              <Text style={styles.remainingValue}>
                {formatWeight(round(target - totals.kcal))}
              </Text>
              <Text style={styles.muted}>kcal restantes</Text>
            </View>
            <Link href="/diet/goals" asChild>
              <Pressable
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel="Mudar objetivos"
              >
                <Ionicons name="create-outline" size={22} color={c.textMuted} />
              </Pressable>
            </Link>
          </View>
          <ProgressBar value={totals.kcal} max={target} />
          <Text style={styles.muted}>
            Consumido {formatWeight(round(totals.kcal))} de{" "}
            {formatWeight(target)} kcal
          </Text>

          <View style={styles.macros}>
            <MacroTile
              label="Carbs"
              value={totals.carbsG}
              goal={goals.carbsG}
            />
            <MacroTile
              label="Proteína"
              value={totals.proteinG}
              goal={goals.proteinG}
            />
            <MacroTile label="Gordura" value={totals.fatG} goal={goals.fatG} />
          </View>
        </View>
      )}

      <View style={styles.mealsHeader}>
        <Text style={styles.sectionTitle}>Refeições</Text>
        <Link href="/diet/foods" asChild>
          <Pressable accessibilityRole="button">
            <Text style={styles.link}>Os meus alimentos</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.card}>
        {MEALS.map((meal, index) => {
          const mealEntries = entries.filter((entry) => entry.meal === meal);
          const mealKcal = sumMacros(mealEntries).kcal;
          return (
            <View
              key={meal}
              style={[styles.meal, index > 0 && styles.mealDivider]}
            >
              <View style={styles.mealHeader}>
                <Text style={styles.mealName}>{MEAL_LABELS[meal]}</Text>
                <Text style={styles.muted}>
                  {formatWeight(round(mealKcal))} kcal
                </Text>
                <Link
                  href={{ pathname: "/diet/add", params: { date, meal } }}
                  asChild
                >
                  <Pressable
                    style={styles.addButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Adicionar a ${MEAL_LABELS[meal]}`}
                  >
                    <Ionicons name="add" size={24} color={c.accent} />
                  </Pressable>
                </Link>
              </View>
              {mealEntries.map((entry) => (
                <View key={entry.id} style={styles.entry}>
                  <View style={styles.entryText}>
                    <Text style={styles.entryName}>
                      {entry.foodName}{" "}
                      <Text style={styles.muted}>
                        {formatAmount(entry.amount, entry.basis)}
                      </Text>
                    </Text>
                    <Text style={styles.entryMacros}>
                      {formatMacros(entry)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => confirmDelete(entry)}
                    style={styles.iconButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Tirar ${entry.foodName}`}
                  >
                    <Ionicons name="close" size={20} color={c.textFaint} />
                  </Pressable>
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 12,
      padding: 16,
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
    dayRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    dayButton: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    dayLabel: {
      flex: 1,
      fontSize: 18,
      fontWeight: "600",
      textAlign: "center",
      color: c.text,
    },
    disabled: {
      opacity: 0.35,
    },
    card: {
      gap: 12,
      padding: 16,
      borderRadius: 12,
      backgroundColor: c.card,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: "bold",
      color: c.text,
    },
    muted: {
      fontSize: 14,
      color: c.textMuted,
    },
    summaryTop: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    remaining: {
      flex: 1,
    },
    remainingValue: {
      fontSize: 40,
      fontWeight: "bold",
      color: c.text,
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    macros: {
      flexDirection: "row",
      gap: 8,
    },
    macroTile: {
      flex: 1,
      gap: 6,
      padding: 10,
      borderRadius: 10,
      backgroundColor: c.subtle,
    },
    macroLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textMuted,
    },
    macroValue: {
      fontSize: 16,
      fontWeight: "bold",
      color: c.text,
    },
    macroGoal: {
      fontSize: 13,
      fontWeight: "400",
      color: c.textMuted,
    },
    mealsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: c.text,
    },
    link: {
      fontSize: 15,
      fontWeight: "600",
      color: c.accent,
    },
    meal: {
      gap: 6,
    },
    mealDivider: {
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    mealHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    mealName: {
      flex: 1,
      fontSize: 17,
      fontWeight: "600",
      color: c.text,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.subtle,
    },
    entry: {
      flexDirection: "row",
      alignItems: "center",
    },
    entryText: {
      flex: 1,
      gap: 2,
    },
    entryName: {
      fontSize: 15,
      color: c.text,
    },
    entryMacros: {
      fontSize: 13,
      color: c.textMuted,
    },
  });
}
