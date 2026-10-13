import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, useRouter } from "expo-router";
import { useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import { ProgressBar } from "@/components/progress-bar";
import { ProgressRing } from "@/components/progress-ring";
import { WaterCard } from "@/components/water-card";
import { useDietDay } from "@/hooks/use-diet-day";
import { useWaterDay } from "@/hooks/use-water-day";
import { addDaysToKey, formatDayLabel, toDateKey } from "@/lib/dates";
import { MEAL_LABELS, formatAmount, sumMacros } from "@/lib/diet";
import { formatWeight } from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius, spacing, type } from "@/theme/tokens";
import { MEALS, type Meal } from "@/types/diet";

const round = (value: number) => Math.round(value);

type IconName = ComponentProps<typeof Ionicons>["name"];

// Only for the look of the bar of a meal without planned kcal (never shown
// as a number): every meal gets a bar that fills up as food is added.
const UNPLANNED_MEAL_BAR_KCAL = 300;

// Icon and theme colour of each meal in the list.
const MEAL_LOOK: Record<Meal, { icon: IconName; color: keyof ThemeColors }> = {
  breakfast: { icon: "cafe", color: "carbs" },
  morning_snack: { icon: "nutrition", color: "success" },
  lunch: { icon: "restaurant", color: "danger" },
  afternoon_snack: { icon: "ice-cream", color: "fat" },
  dinner: { icon: "fish", color: "protein" },
  supper: { icon: "moon", color: "primary" },
};

// Ring with the grams eaten inside; without a goal it is only the track.
function MacroTile({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number | null;
  color: string;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.macroTile}>
      <ProgressRing
        value={value}
        max={goal ?? 0}
        size={76}
        strokeWidth={7}
        sweep={360}
        color={color}
      >
        <Text style={styles.macroValue}>{formatWeight(round(value))}</Text>
      </ProgressRing>
      <View style={styles.macroLabelRow}>
        <View style={[styles.macroDot, { backgroundColor: color }]} />
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
      {goal !== null && (
        <Text style={styles.macroGoal}>{formatWeight(goal)}g</Text>
      )}
    </View>
  );
}

export default function DietScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const today = toDateKey(new Date());
  const [date, setDate] = useState(today);
  // Changing or removing foods happens in the meal screen.
  const { day, error } = useDietDay(date);
  const water = useWaterDay(date);
  const router = useRouter();

  const totals = useMemo(() => sumMacros(day?.entries ?? []), [day]);

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
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const { goals, entries } = day;
  const target = goals?.kcal ?? null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.dayRow}>
        <PressableScale
          onPress={() => setDate(addDaysToKey(date, -1))}
          style={styles.dayButton}
          accessibilityRole="button"
          accessibilityLabel="Dia anterior"
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </PressableScale>
        <Text style={styles.dayLabel}>{formatDayLabel(date)}</Text>
        <PressableScale
          onPress={() => setDate(addDaysToKey(date, 1))}
          disabled={date >= today}
          style={[styles.dayButton, date >= today && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Dia seguinte"
        >
          <Ionicons name="chevron-forward" size={24} color={c.text} />
        </PressableScale>
      </View>

      {goals === null || target === null ? (
        <Link href="/diet/goals" asChild>
          <PressableScale
            // One style object: Link asChild does not accept style arrays.
            style={styles.emptyCard}
            accessibilityRole="button"
          >
            <View style={styles.emptyIcon}>
              <Ionicons name="flag" size={28} color={c.onPrimarySoft} />
            </View>
            <Text style={styles.cardTitle}>Define os teus objetivos</Text>
            <Text style={[styles.muted, styles.centerText]}>
              Kcal, proteína, carbos e gordura por dia. Toca aqui.
            </Text>
          </PressableScale>
        </Link>
      ) : (
        <View style={styles.card}>
          <Link href="/diet/goals" asChild>
            <PressableScale
              style={styles.editGoals}
              accessibilityRole="button"
              accessibilityLabel="Mudar objetivos"
            >
              <Ionicons name="create-outline" size={22} color={c.textMuted} />
            </PressableScale>
          </Link>
          <View style={styles.kcalRing}>
            <ProgressRing
              value={totals.kcal}
              max={target}
              size={210}
              strokeWidth={16}
              color={c.primary}
            >
              <Text style={styles.remainingValue}>
                {formatWeight(round(target - totals.kcal))}
              </Text>
              <Text style={styles.muted}>kcal restantes</Text>
            </ProgressRing>
            {/* Sits in the ring's open bottom. */}
            <Text style={[styles.muted, styles.consumed]}>
              Consumido {formatWeight(round(totals.kcal))} de{" "}
              {formatWeight(target)} kcal
            </Text>
          </View>

          <View style={styles.macros}>
            <MacroTile
              label="Carbs"
              value={totals.carbsG}
              goal={goals.carbsG}
              color={c.carbs}
            />
            <MacroTile
              label="Proteína"
              value={totals.proteinG}
              goal={goals.proteinG}
              color={c.protein}
            />
            <MacroTile
              label="Gordura"
              value={totals.fatG}
              goal={goals.fatG}
              color={c.fat}
            />
          </View>
        </View>
      )}

      <View style={styles.mealsHeader}>
        <Text style={styles.sectionTitle}>Refeições</Text>
        <Link href="/diet/foods" asChild>
          <Pressable accessibilityRole="button" hitSlop={8}>
            <Text style={styles.link}>Os meus alimentos</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.mealsCard}>
        {MEALS.map((meal, index) => {
          const mealEntries = entries.filter((entry) => entry.meal === meal);
          const mealKcal = sumMacros(mealEntries).kcal;
          const planned = goals?.mealKcal?.[meal];
          const look = MEAL_LOOK[meal];
          const color = c[look.color];
          return (
            <View key={meal}>
              {index > 0 && <View style={styles.mealDivider} />}
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/diet/meal",
                    params: { date, meal },
                  })
                }
                android_ripple={{ color: c.ripple }}
                style={styles.meal}
                accessibilityRole="button"
                accessibilityHint="Abrir a refeição"
              >
                <Ionicons name={look.icon} size={34} color={color} />
                <View style={styles.mealBody}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealName} numberOfLines={1}>
                      {MEAL_LABELS[meal]}
                    </Text>
                    {/* Eaten, or eaten / planned when the meal has a plan. */}
                    <Text style={styles.mealKcal}>
                      {formatWeight(round(mealKcal))}
                      {planned !== undefined && `/${formatWeight(planned)}`}{" "}
                      kcal
                    </Text>
                  </View>
                  <ProgressBar
                    value={mealKcal}
                    // Without a plan the bar just stays full past 300 kcal
                    // (never red: there is no limit to go over).
                    max={
                      planned ?? Math.max(UNPLANNED_MEAL_BAR_KCAL, mealKcal)
                    }
                    color={color}
                  />
                  {mealEntries.map((entry) => (
                    <View key={entry.id} style={styles.entry}>
                      <Text style={styles.entryName} numberOfLines={1}>
                        {entry.foodName}
                      </Text>
                      <Text style={styles.entryAmount}>
                        {formatAmount(entry.amount, entry.basis)}
                      </Text>
                    </View>
                  ))}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={c.textFaint}
                />
              </Pressable>
            </View>
          );
        })}
      </View>

      <WaterCard
        ml={water.ml}
        goalMl={water.goalMl}
        onAdd={water.add}
        onSet={water.set}
        onSetGoal={water.setGoal}
      />
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
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
    centerText: {
      textAlign: "center",
    },
    error: {
      ...type.body,
      color: c.danger,
      textAlign: "center",
    },
    dayRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    dayButton: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.card,
    },
    dayLabel: {
      ...type.headline,
      flex: 1,
      textAlign: "center",
      color: c.text,
    },
    disabled: {
      opacity: 0.35,
    },
    card: {
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.card,
    },
    emptyCard: {
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.card,
      alignItems: "center",
      paddingVertical: spacing.xl,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    cardTitle: {
      ...type.headline,
      color: c.text,
    },
    muted: {
      fontSize: 14,
      color: c.textMuted,
    },
    editGoals: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      position: "absolute",
      top: spacing.sm,
      right: spacing.sm,
      zIndex: 1,
    },
    kcalRing: {
      alignItems: "center",
    },
    // Pulled up into the ring's open bottom.
    consumed: {
      marginTop: -spacing.xl,
    },
    remainingValue: {
      fontSize: 40,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
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
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    macroTile: {
      flex: 1,
      alignItems: "center",
      gap: spacing.xs,
    },
    macroLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    macroDot: {
      width: 8,
      height: 8,
      borderRadius: radius.full,
    },
    macroLabel: {
      ...type.captionStrong,
      color: c.text,
    },
    macroValue: {
      ...type.bodyStrong,
      fontVariant: ["tabular-nums"],
      color: c.text,
    },
    macroGoal: {
      ...type.caption,
      color: c.textMuted,
    },
    mealsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.xs,
    },
    sectionTitle: {
      ...type.title,
      fontSize: 20,
      color: c.text,
    },
    link: {
      ...type.subhead,
      fontWeight: "600",
      color: c.primary,
    },
    mealsCard: {
      borderRadius: radius.lg,
      backgroundColor: c.card,
      overflow: "hidden",
    },
    meal: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lg,
      minHeight: 76,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    // Inset hairline between meals, like a grouped list.
    mealDivider: {
      marginHorizontal: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    mealBody: {
      flex: 1,
      gap: spacing.sm,
    },
    mealHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    mealName: {
      ...type.headline,
      flex: 1,
      color: c.text,
    },
    mealKcal: {
      ...type.subhead,
      fontVariant: ["tabular-nums"],
      color: c.textMuted,
    },
    entry: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    entryName: {
      ...type.subhead,
      flex: 1,
      color: c.textMuted,
    },
    entryAmount: {
      ...type.caption,
      fontVariant: ["tabular-nums"],
      color: c.textFaint,
    },
  });
}
