import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FilterChips } from "@/components/filter-chips";
import { WeightChart } from "@/components/weight-chart";
import { useExerciseProgress } from "@/hooks/use-exercise-progress";
import { formatLongDate, formatShortDate } from "@/lib/dates";
import { formatBestSet, type Direction } from "@/lib/progress";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

function directionIcon(
  direction: Direction,
  c: ThemeColors,
): { name: "arrow-up" | "arrow-down" | "remove"; color: string } {
  if (direction === "up") return { name: "arrow-up", color: c.success };
  if (direction === "down") return { name: "arrow-down", color: c.danger };
  return { name: "remove", color: c.textFaint };
}

// Chart of an exercise's best top set over time, and the list of workouts.
// Progress is per routine: when the exercise was done in several routines,
// chips choose which one.
export default function ExerciseProgressScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { id, routineId: initialRoutineId } = useLocalSearchParams<{
    id: string;
    routineId?: string;
  }>();
  const { exercise, routines, routineId, selectRoutine, points, error } =
    useExerciseProgress(id, initialRoutineId);

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

      {routines.length > 1 && (
        <FilterChips
          options={routines.map((routine) => ({
            value: routine.routineId,
            label: routine.routineName ?? "Sem rotina",
          }))}
          selected={routineId}
          onSelect={selectRoutine}
          wrap
        />
      )}

      {points.length === 0 ? (
        <Text style={styles.empty}>
          Ainda não há treinos terminados com este exercício
          {routines.length > 0 ? " nesta rotina" : ""}.
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
                ? directionIcon(point.direction, c)
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
    empty: {
      fontSize: 16,
      color: c.textMuted,
      textAlign: "center",
      marginTop: 32,
    },
    card: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.card,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: c.text,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 44,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.subtle,
    },
    rowDate: {
      flex: 1,
      fontSize: 14,
      color: c.textMuted,
    },
    rowValue: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
    rowIcon: {
      width: 22,
      alignItems: "center",
    },
  });
}
