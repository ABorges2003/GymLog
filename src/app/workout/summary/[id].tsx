import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ProgressChangeRow } from "@/components/progress-change-row";
import { useWorkoutSummary } from "@/hooks/use-workout-summary";
import { formatLongDate } from "@/lib/dates";
import { formatVolume } from "@/lib/progress";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Shown right after a workout is finished.
export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { summary, error } = useWorkoutSummary(id);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { detail, totals, changes } = summary;
  const ups = changes.filter((change) => change.direction === "up").length;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {ups > 0 ? "Bom treino! 💪" : "Treino terminado"}
          </Text>
          <Text style={styles.subtitle}>
            {detail.routineName ? `${detail.routineName} · ` : ""}
            {formatLongDate(detail.workout.startedAt)}
          </Text>
        </View>

        <View style={styles.stats}>
          <Stat value={String(totals.exerciseCount)} label="exercícios" />
          <Stat value={String(totals.setCount)} label="séries" />
          <Stat value={formatVolume(totals.volumeKg)} label="volume" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progressões</Text>
          {changes.length === 0 ? (
            <Text style={styles.empty}>
              Sem alterações em relação à última vez.
            </Text>
          ) : (
            changes.map((change) => (
              <ProgressChangeRow key={change.exerciseId} change={change} />
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.back()}
          style={styles.button}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Fechar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    gap: 16,
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
  header: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 15,
    color: "gray",
  },
  stats: {
    flexDirection: "row",
    gap: 12,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "white",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
    color: "gray",
  },
  card: {
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "white",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 4,
  },
  empty: {
    fontSize: 15,
    color: "gray",
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d0d4da",
    backgroundColor: "white",
  },
  button: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#1f2937",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "white",
  },
});
