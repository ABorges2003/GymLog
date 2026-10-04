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

import { chooseProgression } from "@/components/choose-progression";
import { RoutineList } from "@/components/routine-list";
import { WorkoutExerciseCard } from "@/components/workout-exercise-card";
import { useActiveWorkout } from "@/hooks/use-active-workout";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { formatLongDate } from "@/lib/dates";

export default function WorkoutScreen() {
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
  } = useActiveWorkout();
  const [busy, setBusy] = useState(false);

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
    Alert.alert("Terminar treino?", "O treino fica guardado no histórico.", [
      { text: "Continuar a treinar", style: "cancel" },
      {
        text: "Terminar",
        onPress: () => run(finish, "Não foi possível terminar o treino."),
      },
    ]);
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
                onProgressionPress={
                  routineExerciseId
                    ? () =>
                        chooseProgression(
                          item.exercise.name,
                          item.progression,
                          (progression) => {
                            setProgression(
                              routineExerciseId,
                              progression,
                            ).catch(
                              showError("Não foi possível guardar a nota."),
                            );
                          },
                        )
                    : null
                }
                onInputFocus={(offsetY) =>
                  setFocusY((cardY.current.get(item.id) ?? 0) + offsetY)
                }
              />
            </View>
          );
        })}
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

const styles = StyleSheet.create({
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
    color: "red",
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
    backgroundColor: "white",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d0d4da",
  },
  headerLabel: {
    fontSize: 15,
    color: "gray",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  body: {
    gap: 12,
    padding: 16,
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
    borderColor: "#fca5a5",
    backgroundColor: "white",
  },
  cancelText: {
    color: "#dc2626",
  },
  finishButton: {
    backgroundColor: "#1f2937",
  },
  finishText: {
    color: "white",
  },
  actionText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
