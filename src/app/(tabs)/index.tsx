import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, useNavigation, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  LayoutAnimationConfig,
} from "react-native-reanimated";

import { HeaderIconButton } from "@/components/header-icon-button";
import { PressableScale } from "@/components/pressable-scale";
import { RoutineList } from "@/components/routine-list";
import { WorkoutExerciseCard } from "@/components/workout-exercise-card";
import { WorkoutTimer } from "@/components/workout-timer";
import { useActiveWorkout } from "@/hooks/use-active-workout";
import { useExercisesWithHistory } from "@/hooks/use-exercises-with-history";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { formatLongDate } from "@/lib/dates";
import { progressKey } from "@/lib/progress";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { motion, radius, spacing, type } from "@/theme/tokens";

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
  const withHistory = useExercisesWithHistory(
    (detail?.exercises ?? []).map((item) => item.exercise.id),
  );
  const router = useRouter();
  const navigation = useNavigation();

  // The header has the button to the exercises. During a workout it also
  // shows the routine name and the timer, so the screen needs no header of
  // its own.
  const routineTitle = detail ? (detail.routineName ?? "Treino") : null;
  const startedAt = detail?.workout.startedAt ?? null;
  useEffect(() => {
    navigation.setOptions({
      headerTitle: routineTitle ?? undefined,
      headerRight: () => (
        <View style={styles.headerRight}>
          {startedAt && <WorkoutTimer startedAt={startedAt} />}
          <HeaderIconButton
            icon="list"
            label="Exercícios"
            onPress={() => router.push("/exercises")}
          />
        </View>
      ),
    });
  }, [navigation, routineTitle, startedAt, router, styles]);

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

  // Forget the focused set when the keyboard closes (while rendering, not in
  // an effect).
  const [lastKeyboardHeight, setLastKeyboardHeight] = useState(keyboardHeight);
  if (keyboardHeight !== lastKeyboardHeight) {
    setLastKeyboardHeight(keyboardHeight);
    if (keyboardHeight === 0) setFocusY(null);
  }

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
        <ActivityIndicator size="large" color={c.primary} />
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

  const { workout, exercises } = detail;

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: spacing.lg + keyboardHeight },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.date}>{formatLongDate(workout.startedAt)}</Text>

        {/* Cards and sets already there when the screen opens don't animate;
            ones added later fade in. */}
        <LayoutAnimationConfig skipEntering>
          {exercises.map((item) => {
            const { routineExerciseId } = item;
            return (
              <Animated.View
                key={item.id}
                entering={FadeIn.duration(motion.enter)}
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
              </Animated.View>
            );
          })}
        </LayoutAnimationConfig>

        <Link href="/workout/add-exercises" asChild>
          <PressableScale
            style={styles.addExercises}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={22} color={c.onPrimarySoft} />
            <Text style={styles.addExercisesText}>Adicionar exercícios</Text>
          </PressableScale>
        </Link>
      </ScrollView>

      <View style={styles.actions}>
        <PressableScale
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
        </PressableScale>
        <PressableScale
          onPress={confirmFinish}
          disabled={busy}
          style={[
            styles.actionButton,
            styles.finishButton,
            busy && styles.disabled,
          ]}
          accessibilityRole="button"
        >
          <Ionicons name="checkmark" size={22} color={c.onPrimary} />
          <Text style={[styles.actionText, styles.finishText]}>Terminar</Text>
        </PressableScale>
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    error: {
      ...type.body,
      color: c.danger,
      textAlign: "center",
    },
    noWorkout: {
      padding: spacing.lg,
      gap: spacing.xxl,
    },
    disabled: {
      opacity: 0.5,
    },
    date: {
      ...type.captionStrong,
      color: c.textMuted,
    },
    body: {
      gap: spacing.md,
      padding: spacing.lg,
    },
    // Tonal: clearly a button, without competing with "Terminar".
    addExercises: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 52,
      borderRadius: radius.lg,
      backgroundColor: c.primarySoft,
    },
    addExercisesText: {
      ...type.bodyStrong,
      color: c.onPrimarySoft,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: c.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    actionButton: {
      flexDirection: "row",
      gap: spacing.sm,
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.lg,
    },
    // Quiet: cancelling is rare and asks for confirmation anyway.
    cancelButton: {
      flex: 1,
    },
    cancelText: {
      color: c.danger,
    },
    finishButton: {
      flex: 2,
      backgroundColor: c.primary,
    },
    finishText: {
      color: c.onPrimary,
    },
    actionText: {
      ...type.bodyStrong,
      fontSize: 17,
      color: c.text,
    },
  });
}
