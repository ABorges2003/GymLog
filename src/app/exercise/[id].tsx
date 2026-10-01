import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useExercise } from "@/hooks/use-exercise";
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from "@/lib/labels";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function workoutCountLabel(count: number): string {
  if (count === 0) return "Nunca usado";
  return count === 1 ? "1 treino" : `${count} treinos`;
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { detail, notFound, error, toggleFavorite } = useExercise(id);

  if (error || notFound) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Exercício" }} />
        <Text style={styles.error}>
          {error ?? "Este exercício já não existe."}
        </Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Exercício" }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { exercise, workoutCount } = detail;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: "Exercício" }} />

      <Text style={styles.name}>{exercise.name}</Text>

      <View style={styles.card}>
        <InfoRow
          label="Grupo muscular"
          value={MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
        />
        <InfoRow
          label="Equipamento"
          value={
            exercise.equipment ? EQUIPMENT_LABELS[exercise.equipment] : "—"
          }
        />
        <InfoRow
          label="Origem"
          value={exercise.isCustom ? "Criado por mim" : "App"}
        />
        <InfoRow label="Usado em" value={workoutCountLabel(workoutCount)} />
      </View>

      <Pressable
        onPress={toggleFavorite}
        style={[styles.button, exercise.isFavorite && styles.buttonActive]}
        accessibilityRole="button"
      >
        <Ionicons
          name={exercise.isFavorite ? "star" : "star-outline"}
          size={22}
          color={exercise.isFavorite ? "#f5a524" : "#1f2937"}
        />
        <Text style={styles.buttonText}>
          {exercise.isFavorite ? "Nos favoritos" : "Adicionar aos favoritos"}
        </Text>
      </Pressable>

      {!exercise.isCustom && (
        <Text style={styles.note}>
          Os exercícios da app não podem ser editados nem apagados.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
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
  name: {
    fontSize: 26,
    fontWeight: "bold",
  },
  card: {
    borderRadius: 12,
    backgroundColor: "white",
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d0d4da",
  },
  infoLabel: {
    fontSize: 16,
    color: "gray",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d0d4da",
    backgroundColor: "white",
  },
  buttonActive: {
    borderColor: "#f5a524",
    backgroundColor: "#fff7e6",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
  },
  note: {
    fontSize: 14,
    color: "gray",
    textAlign: "center",
  },
});
