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

type Props = {
  // Starts a workout from the routine.
  onStart: (routineId: string) => void;
  // True while a workout is being started (disables the buttons).
  starting: boolean;
};

// The user's routines, each with a button to start a workout, and a button
// to create a new routine.
export function RoutineList({ onStart, starting }: Props) {
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
        <View key={routine.id} style={styles.card}>
          <Link
            href={{ pathname: "/routine/[id]", params: { id: routine.id } }}
            asChild
          >
            <Pressable
              style={styles.cardText}
              android_ripple={{ color: "#e5e7eb" }}
              accessibilityRole="button"
              accessibilityHint="Abrir a rotina para editar"
            >
              <Text style={styles.cardName}>{routine.name}</Text>
              <Text style={styles.cardDetails}>{routineDetails(routine)}</Text>
            </Pressable>
          </Link>
          <Pressable
            onPress={() => onStart(routine.id)}
            disabled={starting || routine.exerciseCount === 0}
            style={[
              styles.startButton,
              (starting || routine.exerciseCount === 0) && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Começar treino ${routine.name}`}
          >
            <Ionicons name="play" size={20} color="white" />
            <Text style={styles.startText}>Começar</Text>
          </Pressable>
        </View>
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
    gap: 8,
    paddingRight: 12,
    borderRadius: 12,
    backgroundColor: "white",
    overflow: "hidden",
  },
  cardText: {
    flex: 1,
    gap: 2,
    minHeight: 72,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: "#1f2937",
  },
  startText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  disabled: {
    opacity: 0.35,
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
