import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";
import { getDietGoals, setDietGoals } from "@/db/repositories/diet";
import { MEAL_LABELS, parsePositive } from "@/lib/diet";
import { formatWeight } from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { MEALS, type Meal } from "@/types/diet";

type Field = "kcal" | "proteinG" | "carbsG" | "fatG";

const FIELDS: { key: Field; label: string; unit: string; max: number }[] = [
  { key: "kcal", label: "Calorias", unit: "kcal", max: 10000 },
  { key: "proteinG", label: "Proteína", unit: "g", max: 1000 },
  { key: "carbsG", label: "Carbos", unit: "g", max: 2000 },
  { key: "fatG", label: "Gordura", unit: "g", max: 1000 },
];

const MAX_MEAL_KCAL = 5000;

// Daily diet goals. Calories are required; macros and the kcal planned
// for each meal are optional.
export default function DietGoalsScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const router = useRouter();
  const [texts, setTexts] = useState<Record<Field, string> | null>(null);
  const [mealTexts, setMealTexts] = useState<Record<Meal, string>>(
    () =>
      Object.fromEntries(MEALS.map((meal) => [meal, ""])) as Record<
        Meal,
        string
      >,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDietGoals(db)
      .then((goals) => {
        const text = (value: number | null | undefined) =>
          value == null ? "" : formatWeight(value);
        setTexts({
          kcal: text(goals?.kcal),
          proteinG: text(goals?.proteinG),
          carbsG: text(goals?.carbsG),
          fatG: text(goals?.fatG),
        });
        setMealTexts(
          Object.fromEntries(
            MEALS.map((meal) => [meal, text(goals?.mealKcal?.[meal])]),
          ) as Record<Meal, string>,
        );
      })
      .catch(() => Alert.alert("Erro", "Não foi possível ler os objetivos."));
  }, [db]);

  if (!texts) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const parse = (field: (typeof FIELDS)[number]) =>
    texts[field.key].trim() === ""
      ? null
      : parsePositive(texts[field.key], field.max);
  const invalid = FIELDS.filter(
    (field) =>
      (field.key === "kcal" || texts[field.key].trim() !== "") &&
      parse(field) === null,
  ).map((field) => field.key);
  const parseMeal = (meal: Meal) =>
    mealTexts[meal].trim() === ""
      ? null
      : parsePositive(mealTexts[meal], MAX_MEAL_KCAL);
  const invalidMeals = MEALS.filter(
    (meal) => mealTexts[meal].trim() !== "" && parseMeal(meal) === null,
  );
  const plannedTotal = MEALS.reduce(
    (total, meal) => total + Math.round(parseMeal(meal) ?? 0),
    0,
  );
  const dayKcal = parse(FIELDS[0]);
  const blocked = invalid.length > 0 || invalidMeals.length > 0;

  async function save() {
    if (blocked || !texts) return;
    setSaving(true);
    try {
      const [kcal, proteinG, carbsG, fatG] = FIELDS.map(parse);
      await setDietGoals(db, {
        kcal: Math.round(kcal ?? 0),
        proteinG,
        carbsG,
        fatG,
        mealKcal: Object.fromEntries(
          MEALS.flatMap((meal) => {
            const value = parseMeal(meal);
            return value === null ? [] : [[meal, Math.round(value)]];
          }),
        ),
      });
      router.back();
    } catch {
      Alert.alert("Erro", "Não foi possível guardar os objetivos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <Text style={styles.hint}>
        Os teus objetivos por dia. A proteína, carbos e gordura são opcionais.
      </Text>
      {FIELDS.map((field) => (
        <View key={field.key} style={styles.field}>
          <Text style={styles.label}>{field.label}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                invalid.includes(field.key) &&
                  texts[field.key] !== "" &&
                  styles.inputError,
              ]}
              value={texts[field.key]}
              onChangeText={(text) =>
                setTexts((current) =>
                  current ? { ...current, [field.key]: text } : current,
                )
              }
              keyboardType="decimal-pad"
              placeholder={field.key === "kcal" ? "Ex.: 2850" : "—"}
              placeholderTextColor={c.textFaint}
              maxLength={6}
              selectTextOnFocus
            />
            <Text style={styles.unit}>{field.unit}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Por refeição (opcional)</Text>
      <Text style={styles.hint}>
        Mais ou menos quantas kcal planeias para cada refeição. Aparece ao lado
        dela, ex.: 420 / 400 kcal.
      </Text>
      {MEALS.map((meal) => (
        <View key={meal} style={styles.mealRow}>
          <Text style={styles.mealLabel}>{MEAL_LABELS[meal]}</Text>
          <TextInput
            style={[
              styles.input,
              styles.mealInput,
              invalidMeals.includes(meal) && styles.inputError,
            ]}
            value={mealTexts[meal]}
            onChangeText={(text) =>
              setMealTexts((current) => ({ ...current, [meal]: text }))
            }
            keyboardType="number-pad"
            placeholder="—"
            placeholderTextColor={c.textFaint}
            maxLength={5}
            selectTextOnFocus
            accessibilityLabel={`Kcal planeadas para ${MEAL_LABELS[meal]}`}
          />
          <Text style={styles.unit}>kcal</Text>
        </View>
      ))}
      {plannedTotal > 0 && (
        <Text style={styles.hint}>
          Total planeado: {formatWeight(plannedTotal)}
          {dayKcal === null
            ? ""
            : ` de ${formatWeight(Math.round(dayKcal))}`}{" "}
          kcal
        </Text>
      )}

      <Pressable
        onPress={save}
        disabled={blocked || saving}
        style={[styles.button, (blocked || saving) && styles.disabled]}
        accessibilityRole="button"
      >
        {saving ? (
          <ActivityIndicator color={c.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>Guardar</Text>
        )}
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 16,
      padding: 16,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitle: {
      marginTop: 8,
      fontSize: 18,
      fontWeight: "bold",
      color: c.text,
    },
    mealRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    mealLabel: {
      flex: 1,
      fontSize: 16,
      color: c.text,
    },
    mealInput: {
      flex: 0,
      width: 110,
      minHeight: 48,
      fontSize: 18,
    },
    hint: {
      fontSize: 15,
      lineHeight: 21,
      color: c.textMuted,
    },
    field: {
      gap: 6,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    input: {
      flex: 1,
      minHeight: 52,
      fontSize: 20,
      fontWeight: "600",
      textAlign: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      color: c.text,
    },
    inputError: {
      borderColor: c.danger,
    },
    unit: {
      width: 40,
      fontSize: 16,
      color: c.textMuted,
    },
    button: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    buttonText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.onPrimary,
    },
    disabled: {
      opacity: 0.4,
    },
  });
}
