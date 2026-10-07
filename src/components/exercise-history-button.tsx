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
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

type Props = {
  exerciseId: string;
  exerciseName: string;
  // Progress is per routine: only this routine's history is shown.
  routineId: string | null;
  // Green when the exercise has history, red when not, grey while unknown.
  hasHistory: boolean | null;
};

// Icon that opens a popup with the exercise's progressions (green ▲) and
// regressions (red ▼): the top set before and after.
export function ExerciseHistoryButton({
  exerciseId,
  exerciseName,
  hasHistory,
  routineId,
}: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const { changes, error } = useExerciseChanges(exerciseId, routineId, open);
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
            hasHistory === null
              ? c.textFaint
              : hasHistory
                ? c.success
                : c.danger
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
                    color={change.direction === "up" ? c.success : c.danger}
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
                        {
                          color:
                            change.direction === "up" ? c.success : c.danger,
                        },
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
                    params: routineId
                      ? { id: exerciseId, routineId }
                      : { id: exerciseId },
                  });
                }}
                style={styles.secondaryButton}
                accessibilityRole="button"
              >
                <Ionicons name="trending-up" size={20} color={c.text} />
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

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
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
      backgroundColor: c.overlay,
    },
    card: {
      maxHeight: "80%",
      gap: 12,
      padding: 20,
      borderRadius: 16,
      backgroundColor: c.card,
    },
    title: {
      fontSize: 19,
      fontWeight: "bold",
      color: c.text,
    },
    loading: {
      marginVertical: 24,
    },
    error: {
      fontSize: 15,
      color: c.danger,
    },
    empty: {
      fontSize: 15,
      color: c.textMuted,
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
      borderBottomColor: c.subtle,
    },
    date: {
      width: 44,
      fontSize: 14,
      color: c.textMuted,
    },
    values: {
      flex: 1,
      fontSize: 15,
      color: c.textMuted,
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
      borderColor: c.border,
    },
    secondaryText: {
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    primaryButton: {
      flex: 1,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    primaryText: {
      fontSize: 16,
      fontWeight: "600",
      color: c.onPrimary,
    },
  });
}
