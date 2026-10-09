import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { RoutineExerciseCard } from "@/components/routine-exercise-card";
import { useExercisesWithHistory } from "@/hooks/use-exercises-with-history";
import { useRoutine } from "@/hooks/use-routine";
import { progressKey } from "@/lib/progress";
import type { RoutineExercise } from "@/types/routine";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

export default function RoutineScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    routine,
    exercises,
    notFound,
    error,
    remove,
    removeExercise,
    moveExercise,
    setProgression,
  } = useRoutine(id);
  const withHistory = useExercisesWithHistory();

  function handleError(message: string) {
    return () => Alert.alert("Erro", message);
  }

  function confirmRemoveExercise(item: RoutineExercise) {
    Alert.alert(
      "Tirar exercício?",
      `Tirar "${item.exercise.name}" desta rotina?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Tirar",
          style: "destructive",
          onPress: () => {
            removeExercise(item.id).catch(
              handleError("Não foi possível tirar o exercício."),
            );
          },
        },
      ],
    );
  }

  if (error || notFound) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Rotina" }} />
        <Text style={styles.error}>
          {error ?? "Esta rotina já não existe."}
        </Text>
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Rotina" }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  function confirmDelete() {
    if (!routine) return;
    Alert.alert(
      "Apagar rotina?",
      `"${routine.name}" vai ser apagada. Os treinos que já fizeste com ela continuam no histórico.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: () => {
            remove()
              .then(() => router.back())
              .catch(() =>
                Alert.alert("Erro", "Não foi possível apagar a rotina."),
              );
          },
        },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: "Rotina" }} />

      <Link
        href={{ pathname: "/routine/rename/[id]", params: { id: routine.id } }}
        asChild
      >
        <Pressable style={styles.nameRow} accessibilityRole="button">
          <Text style={styles.name}>{routine.name}</Text>
          <Ionicons name="create-outline" size={22} color={c.textMuted} />
        </Pressable>
      </Link>

      {exercises.length === 0 && (
        <Text style={styles.empty}>
          Ainda não tem exercícios. Adiciona os exercícios que fazes neste
          treino, pela ordem em que os fazes.
        </Text>
      )}

      {exercises.map((item, index) => (
        <RoutineExerciseCard
          key={item.id}
          item={item}
          routineId={routine.id}
          hasHistory={
            withHistory
              ? withHistory.has(progressKey(routine.id, item.exercise.id))
              : null
          }
          isFirst={index === 0}
          isLast={index === exercises.length - 1}
          onMove={(direction) => {
            moveExercise(item.id, direction).catch(
              handleError("Não foi possível mudar a ordem."),
            );
          }}
          onRemove={() => confirmRemoveExercise(item)}
          onProgressionChange={(progression) => {
            setProgression(item.id, progression).catch(
              handleError("Não foi possível guardar a nota."),
            );
          }}
        />
      ))}

      <Link
        href={{
          pathname: "/routine/add-exercises/[id]",
          params: { id: routine.id },
        }}
        asChild
      >
        <Pressable style={styles.addButton} accessibilityRole="button">
          <Ionicons name="add" size={24} color={c.text} />
          <Text style={styles.addButtonText}>Adicionar exercícios</Text>
        </Pressable>
      </Link>

      <Pressable
        onPress={confirmDelete}
        style={styles.deleteButton}
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={22} color={c.danger} />
        <Text style={styles.deleteText}>Apagar rotina</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      padding: 16,
      gap: 12,
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
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 48,
    },
    name: {
      flexShrink: 1,
      fontSize: 26,
      fontWeight: "bold",
      color: c.text,
    },
    empty: {
      fontSize: 16,
      color: c.textMuted,
    },
    addButton: {
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
    addButtonText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.text,
    },
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 52,
      marginTop: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      backgroundColor: c.card,
    },
    deleteText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.danger,
    },
  });
}
