import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useExerciseChanges } from "@/hooks/use-exercise-changes";
import { formatShortDate } from "@/lib/dates";
import { formatBestSet } from "@/lib/progress";

const COLORS = {
  up: "#15803d",
  down: "#b91c1c",
};

type Props = {
  exerciseId: string;
  exerciseName: string;
  // Green when the exercise has history, red when not, grey while unknown.
  hasHistory: boolean | null;
};

// Icon that opens a popup with the exercise's progressions (green ▲) and
// regressions (red ▼): the top set before and after.
export function ExerciseHistoryButton({
  exerciseId,
  exerciseName,
  hasHistory,
}: Props) {
  const [open, setOpen] = useState(false);
  const { changes, error } = useExerciseChanges(exerciseId, open);
  const router = useRouter();

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.iconButton}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`Histórico de ${exerciseName}`}
      >
        <Ionicons
          name="stats-chart"
          size={20}
          color={
            hasHistory === null ? "#9ca3af" : hasHistory ? "#16a34a" : "#dc2626"
          }
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Inner Pressable stops taps on the card from closing the popup. */}
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{exerciseName}</Text>

            {error && <Text style={styles.error}>{error}</Text>}
            {!changes && !error && <ActivityIndicator style={styles.loading} />}
            {changes?.length === 0 && (
              <Text style={styles.empty}>
                Ainda sem alterações. Aparecem aqui quando subires ou desceres a
                carga ou as reps do top set.
              </Text>
            )}

            <ScrollView style={styles.list}>
              {changes?.map((change) => (
                <View key={change.workoutId} style={styles.row}>
                  <Ionicons
                    name={change.direction === "up" ? "arrow-up" : "arrow-down"}
                    size={22}
                    color={COLORS[change.direction]}
                  />
                  <Text style={styles.date}>
                    {formatShortDate(change.startedAt)}
                  </Text>
                  <Text style={styles.values}>
                    {formatBestSet(change.previous)}
                    {"  →  "}
                    <Text
                      style={[
                        styles.current,
                        { color: COLORS[change.direction] },
                      ]}
                    >
                      {formatBestSet(change.current)}
                    </Text>
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.buttons}>
              <Pressable
                onPress={() => {
                  setOpen(false);
                  router.push({
                    pathname: "/exercise/progress/[id]",
                    params: { id: exerciseId },
                  });
                }}
                style={styles.secondaryButton}
                accessibilityRole="button"
              >
                <Ionicons name="trending-up" size={20} color="#1f2937" />
                <Text style={styles.secondaryText}>Gráfico</Text>
              </Pressable>
              <Pressable
                onPress={() => setOpen(false)}
                style={styles.primaryButton}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>Fechar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  card: {
    maxHeight: "80%",
    gap: 12,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "white",
  },
  title: {
    fontSize: 19,
    fontWeight: "bold",
  },
  loading: {
    marginVertical: 24,
  },
  error: {
    fontSize: 15,
    color: "red",
  },
  empty: {
    fontSize: 15,
    color: "gray",
    lineHeight: 22,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eef0f3",
  },
  date: {
    width: 44,
    fontSize: 14,
    color: "gray",
  },
  values: {
    flex: 1,
    fontSize: 15,
    color: "#4b5563",
  },
  current: {
    fontWeight: "700",
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d0d4da",
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#1f2937",
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});
