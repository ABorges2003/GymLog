import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { WeightChart } from "@/components/weight-chart";
import { useBodyWeight } from "@/hooks/use-body-weight";
import {
  MOVING_AVERAGE_DAYS,
  parseBodyWeight,
  summarizeBodyWeight,
  withMovingAverage,
} from "@/lib/body-weight";
import {
  addDaysToKey,
  dateFromKey,
  formatDayLabel,
  formatShortDate,
  toDateKey,
} from "@/lib/dates";
import { formatWeight } from "@/lib/sets";

function formatChange(change: number): string {
  const rounded = Math.round(change * 10) / 10;
  if (rounded === 0) return "= sem alteração numa semana";
  const arrow = rounded > 0 ? "▲" : "▼";
  return `${arrow} ${formatWeight(Math.abs(rounded))} kg numa semana`;
}

export default function BodyWeightScreen() {
  const { entries, error, save, remove } = useBodyWeight();
  const today = toDateKey(new Date());
  const [day, setDay] = useState(today);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const existing = entries?.find((entry) => entry.date === day) ?? null;

  // Show the saved weight of the selected day, or an empty field.
  useEffect(() => {
    setText(existing ? formatWeight(existing.weightKg) : "");
  }, [day, existing]);

  const points = useMemo(() => withMovingAverage(entries ?? []), [entries]);
  const summary = summarizeBodyWeight(points);
  const weight = parseBodyWeight(text);

  async function handleSave() {
    if (weight === null) return;
    setSaving(true);
    try {
      await save(day, weight);
      Keyboard.dismiss();
    } catch {
      Alert.alert("Erro", "Não foi possível guardar o peso.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(date: string) {
    Alert.alert("Apagar registo?", formatDayLabel(date), [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => {
          remove(date).catch(() =>
            Alert.alert("Erro", "Não foi possível apagar o registo."),
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

  if (!entries) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.dayRow}>
          <Pressable
            onPress={() => setDay(addDaysToKey(day, -1))}
            style={styles.dayButton}
            accessibilityRole="button"
            accessibilityLabel="Dia anterior"
          >
            <Ionicons name="chevron-back" size={26} color="#1f2937" />
          </Pressable>
          <Text style={styles.dayLabel}>{formatDayLabel(day)}</Text>
          <Pressable
            onPress={() => setDay(addDaysToKey(day, 1))}
            disabled={day >= today}
            style={[styles.dayButton, day >= today && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Dia seguinte"
          >
            <Ionicons name="chevron-forward" size={26} color="#1f2937" />
          </Pressable>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              text !== "" && weight === null && styles.inputError,
            ]}
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor="#9ca3af"
            maxLength={6}
            selectTextOnFocus
            accessibilityLabel="Peso em kg"
          />
          <Text style={styles.unit}>kg</Text>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={weight === null || saving || weight === existing?.weightKg}
          style={[
            styles.saveButton,
            (weight === null || saving || weight === existing?.weightKg) &&
              styles.disabled,
          ]}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveText}>
              {existing ? "Atualizar" : "Guardar"}
            </Text>
          )}
        </Pressable>
      </View>

      {summary && (
        <View style={[styles.card, styles.summary]}>
          <Text style={styles.summaryWeight}>
            {formatWeight(summary.latest.weightKg)} kg
          </Text>
          <Text style={styles.summaryLine}>
            Média de {MOVING_AVERAGE_DAYS} dias:{" "}
            {formatWeight(Math.round(summary.average * 10) / 10)} kg
          </Text>
          {summary.weeklyChange !== null && (
            <Text style={styles.summaryLine}>
              {formatChange(summary.weeklyChange)}
            </Text>
          )}
        </View>
      )}

      {points.length >= 2 && (
        <View style={styles.card}>
          <View style={styles.legend}>
            <View style={[styles.legendDot, styles.legendDaily]} />
            <Text style={styles.legendText}>Peso do dia</Text>
            <View style={[styles.legendDot, styles.legendAverage]} />
            <Text style={styles.legendText}>
              Média {MOVING_AVERAGE_DAYS} dias
            </Text>
          </View>
          <WeightChart
            points={points.map((point) => ({
              label: formatShortDate(dateFromKey(point.date).toISOString()),
              weightKg: point.weightKg,
              average: Math.round(point.average * 10) / 10,
            }))}
          />
        </View>
      )}

      {entries.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registos</Text>
          {[...entries].reverse().map((entry) => (
            <View key={entry.date} style={styles.entryRow}>
              <Text style={styles.entryDate}>{formatDayLabel(entry.date)}</Text>
              <Text style={styles.entryWeight}>
                {formatWeight(entry.weightKg)} kg
              </Text>
              <Pressable
                onPress={() => confirmDelete(entry.date)}
                style={styles.deleteButton}
                accessibilityRole="button"
                accessibilityLabel={`Apagar registo de ${formatDayLabel(entry.date)}`}
              >
                <Ionicons name="close" size={20} color="#9ca3af" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {entries.length === 0 && (
        <Text style={styles.empty}>
          Regista o teu peso todos os dias, de preferência à mesma hora. A média
          de {MOVING_AVERAGE_DAYS} dias mostra a tendência real, sem as
          variações do dia a dia.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    color: "red",
    textAlign: "center",
  },
  card: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "white",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
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
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d0d4da",
    backgroundColor: "#f9fafb",
  },
  inputError: {
    borderColor: "red",
    backgroundColor: "#fef2f2",
  },
  unit: {
    fontSize: 22,
    color: "gray",
  },
  saveButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#1f2937",
  },
  saveText: {
    fontSize: 17,
    fontWeight: "600",
    color: "white",
  },
  disabled: {
    opacity: 0.35,
  },
  summary: {
    alignItems: "center",
    gap: 4,
  },
  summaryWeight: {
    fontSize: 32,
    fontWeight: "bold",
  },
  summaryLine: {
    fontSize: 15,
    color: "gray",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendDaily: {
    backgroundColor: "#7c3aed",
  },
  legendAverage: {
    marginLeft: 12,
    backgroundColor: "#f59e0b",
  },
  legendText: {
    fontSize: 13,
    color: "gray",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eef0f3",
  },
  entryDate: {
    flex: 1,
    fontSize: 15,
    color: "gray",
  },
  entryWeight: {
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    width: 40,
    height: 40,
    marginRight: -8,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    fontSize: 15,
    color: "gray",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 8,
  },
});
