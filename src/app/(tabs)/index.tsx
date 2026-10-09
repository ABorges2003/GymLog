import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { RoutineList } from "@/components/routine-list";
import { WorkoutExerciseCard } from "@/components/workout-exercise-card";
import { useActiveWorkout } from "@/hooks/use-active-workout";
import { useExercisesWithHistory } from "@/hooks/use-exercises-with-history";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { formatLongDate } from "@/lib/dates";
import { progressKey } from "@/lib/progress";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

export default function WorkoutScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const {
    detail,
    loading,
    error,
    start,
    finish,
    cancel,
    updateSet,
    addSet,
    deleteSet,
    setProgression,
    setAssisted,
  } = useActiveWorkout();
  const [busy, setBusy] = useState(false);
  const withHistory = useExercisesWithHistory();
  const router = useRouter();

  // Keeps the set being typed in visible above the keyboard (see the routine
  // set editor for the same idea).
  const scrollRef = useRef<ScrollView>(null);
  const cardY = useRef(new Map<string, number>());
  const [focusY, setFocusY] = useState<number | null>(null);
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (focusY === null || keyboardHeight === 0) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, focusY - 80),
      animated: true,
    });
  }, [focusY, keyboardHeight]);

  useEffect(() => {
    if (keyboardHeight === 0) setFocusY(null);
  }, [keyboardHeight]);

  function showError(message: string) {
    return () => Alert.alert("Erro", message);
  }

  function confirmDeleteSet(setId: string) {
    Alert.alert("Apagar série?", undefined, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => {
          deleteSet(setId).catch(showError("Não foi possível apagar a série."));
        },
      },
    ]);
  }

  // Runs an action once at a time and shows an alert if it fails.
  async function run(action: () => Promise<void>, errorMessage: string) {
    setBusy(true);
    try {
      await action();
    } catch {
      Alert.alert("Erro", errorMessage);
    } finally {
      setBusy(false);
    }
  }

  function confirmFinish() {
    if (!detail) return;
    const workoutId = detail.workout.id;
    Alert.alert(
      "Terminar treino?",
      "As cargas que fizeste passam para a rotina.",
      [
        { text: "Continuar a treinar", style: "cancel" },
        {
          text: "Terminar",
          onPress: () =>
            run(async () => {
              await finish();
              router.push({
                pathname: "/workout/summary/[id]",
                params: { id: workoutId },
              });
            }, "Não foi possível terminar o treino."),
        },
      ],
    );
  }

  function confirmCancel() {
    Alert.alert(
      "Cancelar treino?",
      "O treino e tudo o que registaste nele vão ser apagados.",
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Cancelar treino",
          style: "destructive",
          onPress: () => run(cancel, "Não foi possível cancelar o treino."),
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <ScrollView contentContainerStyle={styles.noWorkout}>
        <RoutineList
          starting={busy}
          onStart={(routineId) =>
            run(() => start(routineId), "Não foi possível começar o treino.")
          }
        />
      </ScrollView>
    );
  }

  const { workout, routineName, exercises } = detail;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{routineName ?? "Treino"}</Text>
        <Text style={styles.headerLabel}>
          {formatLongDate(workout.startedAt)}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: 16 + keyboardHeight },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {exercises.map((item) => {
          const { routineExerciseId } = item;
          return (
            <View
              key={item.id}
              onLayout={(event) =>
                cardY.current.set(item.id, event.nativeEvent.layout.y)
              }
            >
              <WorkoutExerciseCard
                item={item}
                routineId={workout.routineId}
                hasHistory={
                  withHistory
                    ? withHistory.has(
                        progressKey(workout.routineId, item.exercise.id),
                      )
                    : null
                }
                onUpdateSet={(setId, values) => {
                  updateSet(setId, values).catch(
                    showError("Não foi possível guardar a série."),
                  );
                }}
                onAddSet={() => {
                  addSet(item.id).catch(
                    showError("Não foi possível adicionar a série."),
                  );
                }}
                onDeleteSet={confirmDeleteSet}
                onAssistedRepsChange={(setId, reps) => {
                  setAssisted(setId, reps).catch(
                    showError("Não foi possível guardar as reps com ajuda."),
                  );
                }}
                onProgressionChange={
                  routineExerciseId
                    ? (progression) => {
                        setProgression(routineExerciseId, progression).catch(
                          showError("Não foi possível guardar a nota."),
                        );
                      }
                    : null
                }
                onInputFocus={(offsetY) =>
                  setFocusY((cardY.current.get(item.id) ?? 0) + offsetY)
                }
              />
            </View>
          );
        })}
        <Link href="/workout/add-exercises" asChild>
          <Pressable style={styles.addExercises} accessibilityRole="button">
            <Ionicons name="add" size={22} color={c.text} />
            <Text style={styles.addExercisesText}>Adicionar exercícios</Text>
          </Pressable>
        </Link>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          onPress={confirmCancel}
          disabled={busy}
          style={[
            styles.actionButton,
            styles.cancelButton,
            busy && styles.disabled,
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.actionText, styles.cancelText]}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={confirmFinish}
          disabled={busy}
          style={[
            styles.actionButton,
            styles.finishButton,
            busy && styles.disabled,
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.actionText, styles.finishText]}>Terminar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
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
    noWorkout: {
      padding: 16,
      gap: 32,
    },
    disabled: {
      opacity: 0.6,
    },
    header: {
      alignItems: "center",
      gap: 2,
      paddingVertical: 14,
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    headerLabel: {
      fontSize: 15,
      color: c.textMuted,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: c.text,
    },
    body: {
      gap: 12,
      padding: 16,
    },
    addExercises: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: c.textFaint,
    },
    addExercisesText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.text,
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      padding: 16,
    },
    actionButton: {
      flex: 1,
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: c.dangerBorder,
      backgroundColor: c.card,
    },
    cancelText: {
      color: c.danger,
    },
    finishButton: {
      backgroundColor: c.primary,
    },
    finishText: {
      color: c.onPrimary,
    },
    actionText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.text,
    },
  });
}
