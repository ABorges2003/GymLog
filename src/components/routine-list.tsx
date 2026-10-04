import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useRoutines } from "@/hooks/use-routines";
import { MUSCLE_GROUP_LABELS } from "@/lib/labels";
import type { RoutineSummary } from "@/types/routine";

function routineDetails(routine: RoutineSummary): string {
  if (routine.exerciseCount === 0) return "Sem exercícios";
  const count =
    routine.exerciseCount === 1
      ? "1 exercício"
      : `${routine.exerciseCount} exercícios`;
  const muscles = routine.muscleGroups
    .map((muscleGroup) => MUSCLE_GROUP_LABELS[muscleGroup])
    .join(" · ");
  return `${count} · ${muscles}`;
}

// The user's routines, with a button to create a new one.
export function RoutineList() {
  const { routines, error } = useRoutines();

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  if (!routines) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>As minhas rotinas</Text>

      {routines.length === 0 && (
        <Text style={styles.empty}>
          Ainda não tens rotinas. Cria uma para cada treino da semana (ex.:
          Push, Pull, Pernas).
        </Text>
      )}

      {routines.map((routine) => (
        <Link
          key={routine.id}
          href={{ pathname: "/routine/[id]", params: { id: routine.id } }}
          asChild
        >
          <Pressable
            style={styles.card}
            android_ripple={{ color: "#e5e7eb" }}
            accessibilityRole="button"
          >
            <View style={styles.cardText}>
              <Text style={styles.cardName}>{routine.name}</Text>
              <Text style={styles.cardDetails}>{routineDetails(routine)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
          </Pressable>
        </Link>
      ))}

      <Link href="/routine/new" asChild>
        <Pressable style={styles.newButton} accessibilityRole="button">
          <Ionicons name="add" size={24} color="#1f2937" />
          <Text style={styles.newButtonText}>Nova rotina</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  error: {
    fontSize: 16,
    color: "red",
  },
  empty: {
    fontSize: 16,
    color: "gray",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "white",
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontSize: 18,
    fontWeight: "600",
  },
  cardDetails: {
    fontSize: 14,
    color: "gray",
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#9ca3af",
  },
  newButtonText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
