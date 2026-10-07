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
import { parsePositive } from "@/lib/diet";
import { formatWeight } from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

type Field = "kcal" | "proteinG" | "carbsG" | "fatG";

const FIELDS: { key: Field; label: string; unit: string; max: number }[] = [
  { key: "kcal", label: "Calorias", unit: "kcal", max: 10000 },
  { key: "proteinG", label: "Proteína", unit: "g", max: 1000 },
  { key: "carbsG", label: "Carbos", unit: "g", max: 2000 },
  { key: "fatG", label: "Gordura", unit: "g", max: 1000 },
];

// Daily diet goals. Calories are required; macros are optional.
export default function DietGoalsScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const router = useRouter();
  const [texts, setTexts] = useState<Record<Field, string> | null>(null);
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

  async function save() {
    if (invalid.length > 0 || !texts) return;
    setSaving(true);
    try {
      const [kcal, proteinG, carbsG, fatG] = FIELDS.map(parse);
      await setDietGoals(db, {
        kcal: Math.round(kcal ?? 0),
        proteinG,
        carbsG,
        fatG,
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
      <Pressable
        onPress={save}
        disabled={invalid.length > 0 || saving}
        style={[
          styles.button,
          (invalid.length > 0 || saving) && styles.disabled,
        ]}
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
