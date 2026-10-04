import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ProgressChangeRow } from "@/components/progress-change-row";
import { useProgressHistory } from "@/hooks/use-progress-history";
import { formatClockTime, formatLongDate } from "@/lib/dates";
import type { ProgressGroup } from "@/lib/progress";

// Only the workouts where an exercise went up or down (top set weight, or
// reps at the same weight).
export default function HistoryScreen() {
  const { history, error, removeWorkout } = useProgressHistory();

  function confirmDelete(group: ProgressGroup) {
    const label = `${formatLongDate(group.startedAt)}${
      group.routineName ? ` (${group.routineName})` : ""
    }`;
    Alert.alert(
      "Apagar treino?",
      `O treino de ${label} vai ser apagado. As cargas da rotina não mudam.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: () => {
            removeWorkout(group.workoutId).catch(() =>
              Alert.alert("Erro", "Não foi possível apagar o treino."),
            );
          },
        },
      ],
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!history) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>
          Ainda não há progressões.{"\n"}Aparecem aqui quando subires (ou
          desceres) a carga ou as reps do top set de um exercício.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {history.map((group) => (
        <View key={group.workoutId} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.date}>
              {formatLongDate(group.startedAt)},{" "}
              {formatClockTime(group.startedAt)}
              {group.routineName ? ` · ${group.routineName}` : ""}
            </Text>
            <Pressable
              onPress={() => confirmDelete(group)}
              style={styles.deleteButton}
              accessibilityRole="button"
              accessibilityLabel="Apagar treino"
            >
              <Ionicons name="trash-outline" size={20} color="#9ca3af" />
            </Pressable>
          </View>
          {group.changes.map((change) => (
            <Link
              key={change.exerciseId}
              href={{
                pathname: "/exercise/progress/[id]",
                params: { id: change.exerciseId },
              }}
              asChild
            >
              <Pressable
                android_ripple={{ color: "#e5e7eb" }}
                accessibilityRole="button"
                accessibilityHint="Ver o gráfico do exercício"
              >
                <ProgressChangeRow change={change} />
              </Pressable>
            </Link>
          ))}
        </View>
      ))}
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
    padding: 24,
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
    lineHeight: 24,
  },
  card: {
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    borderRadius: 12,
    backgroundColor: "white",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  date: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "gray",
  },
  deleteButton: {
    width: 40,
    height: 40,
    marginRight: -8,
    alignItems: "center",
    justifyContent: "center",
  },
});
