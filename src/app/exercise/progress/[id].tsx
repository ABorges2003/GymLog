import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { WeightChart } from "@/components/weight-chart";
import { useExerciseProgress } from "@/hooks/use-exercise-progress";
import { formatLongDate, formatShortDate } from "@/lib/dates";
import { formatBestSet, type Direction } from "@/lib/progress";

const DIRECTION_ICONS: Record<
  Direction,
  { name: "arrow-up" | "arrow-down" | "remove"; color: string }
> = {
  up: { name: "arrow-up", color: "#15803d" },
  down: { name: "arrow-down", color: "#b91c1c" },
  same: { name: "remove", color: "#9ca3af" },
};

// Chart of an exercise's best top set over time, and the list of workouts.
export default function ExerciseProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { exercise, points, error } = useExerciseProgress(id);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!exercise || !points) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: exercise.name }} />

      {points.length === 0 ? (
        <Text style={styles.empty}>
          Ainda não há treinos terminados com este exercício.
        </Text>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Carga do top set</Text>
            <WeightChart
              points={points.map((point) => ({
                label: formatShortDate(point.startedAt),
                weightKg: point.best.weightKg,
              }))}
            />
          </View>

          <View style={styles.card}>
            {[...points].reverse().map((point) => {
              const icon = point.direction
                ? DIRECTION_ICONS[point.direction]
                : null;
              return (
                <View key={point.workoutId} style={styles.row}>
                  <Text style={styles.rowDate}>
                    {formatLongDate(point.startedAt)}
                  </Text>
                  <Text style={styles.rowValue}>
                    {formatBestSet(point.best)}
                  </Text>
                  <View style={styles.rowIcon}>
                    {icon && (
                      <Ionicons name={icon.name} size={18} color={icon.color} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </>
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
  empty: {
    fontSize: 16,
    color: "gray",
    textAlign: "center",
    marginTop: 32,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "white",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eef0f3",
  },
  rowDate: {
    flex: 1,
    fontSize: 14,
    color: "gray",
  },
  rowValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowIcon: {
    width: 22,
    alignItems: "center",
  },
});
