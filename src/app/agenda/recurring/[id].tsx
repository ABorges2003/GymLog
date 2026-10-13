import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import { PopupButton } from "@/components/popup";
import { RecurringTaskForm } from "@/components/recurring-task-form";
import {
  getRecurringTaskById,
  stopRecurringTask,
  updateRecurringTask,
} from "@/db/repositories/planner";
import { toDateKey } from "@/lib/dates";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { spacing, type } from "@/theme/tokens";
import type { RecurringTask } from "@/types/planner";

// Changes or stops a task that repeats. Changes apply from today on; the
// days before stay as they were.
export default function EditRecurringTaskScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  // undefined while loading, null when not found.
  const [task, setTask] = useState<RecurringTask | null | undefined>();

  useEffect(() => {
    getRecurringTaskById(db, id)
      .then(setTask)
      .catch(() => setTask(null));
  }, [db, id]);

  if (task === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (task === null || task.endDate !== null) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Esta tarefa já não se repete.</Text>
      </View>
    );
  }

  function confirmStop(current: RecurringTask) {
    Alert.alert(
      "Deixar de repetir?",
      `"${current.title}" deixa de aparecer a partir de hoje. Os dias anteriores ficam como estão.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Deixar de repetir",
          style: "destructive",
          onPress: async () => {
            try {
              await stopRecurringTask(db, current.id, toDateKey(new Date()));
              router.back();
            } catch {
              Alert.alert("Erro", "Não foi possível guardar.");
            }
          },
        },
      ],
    );
  }

  return (
    <RecurringTaskForm
      initial={{ title: task.title, weekdays: task.weekdays }}
      submitLabel="Guardar"
      onSubmit={async (values) => {
        await updateRecurringTask(
          db,
          task.id,
          values,
          toDateKey(new Date()),
        );
        router.back();
      }}
      footer={
        <PopupButton
          label="Deixar de repetir"
          variant="danger"
          onPress={() => confirmStop(task)}
        />
      }
    />
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    error: {
      ...type.body,
      textAlign: "center",
      color: c.danger,
    },
  });
}
