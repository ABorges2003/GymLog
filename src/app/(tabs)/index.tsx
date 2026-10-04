import { useState } from "react";
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
import { useActiveWorkout } from "@/hooks/use-active-workout";
import { formatLongDate } from "@/lib/dates";

export default function WorkoutScreen() {
  const { workout, loading, error, finish, cancel } = useActiveWorkout();
  const [busy, setBusy] = useState(false);

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

  if (!workout) {
    return (
      <ScrollView contentContainerStyle={styles.noWorkout}>
        <RoutineList />
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Treino em curso</Text>
        <Text style={styles.headerDate}>
          {formatLongDate(workout.startedAt)}
        </Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.placeholder}>
          Os exercícios do treino vão aparecer aqui.
        </Text>
      </View>

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
    gap: 4,
    paddingVertical: 20,
    backgroundColor: "white",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d0d4da",
  },
  headerLabel: {
    fontSize: 15,
    color: "gray",
  },
  headerDate: {
    fontSize: 22,
    fontWeight: "bold",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  placeholder: {
    fontSize: 16,
    color: "gray",
    textAlign: "center",
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
