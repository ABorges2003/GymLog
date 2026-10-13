import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";

import { Popup, PopupButton } from "@/components/popup";
import { TASK_TITLE_MAX_LENGTH, cleanTitle } from "@/lib/planner";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius, spacing, type } from "@/theme/tokens";
import type { DayTask } from "@/types/planner";

type Props = {
  task: DayTask;
  onClose: () => void;
  // Each throws if saving fails.
  onRename: (title: string) => Promise<void>;
  onMoveToNextDay: () => Promise<void>;
  // Deletes a one-off task; skips a repeating one on this day only.
  onDelete: () => Promise<void>;
  // Repeating tasks only.
  onStopRepeating: () => Promise<void>;
  onEditRepeat: () => void;
};

// Renames a task, and moves it to the next day or deletes it. A repeating
// task is only skipped that day, and can stop repeating or have its days
// changed. Render it only while open, so it starts with the task's title.
export function TaskPopup({
  task,
  onClose,
  onRename,
  onMoveToNextDay,
  onDelete,
  onStopRepeating,
  onEditRepeat,
}: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [text, setText] = useState(task.title);
  const [busy, setBusy] = useState(false);
  const title = cleanTitle(text, TASK_TITLE_MAX_LENGTH);
  const repeats = task.recurringId !== null;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      onClose();
    } catch {
      Alert.alert("Erro", "Não foi possível guardar a tarefa.");
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert("Apagar tarefa?", task.title, [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => run(onDelete) },
    ]);
  }

  function confirmStop() {
    Alert.alert(
      "Deixar de repetir?",
      `"${task.title}" deixa de aparecer a partir deste dia. Os dias anteriores ficam como estão.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Deixar de repetir",
          style: "destructive",
          onPress: () => run(onStopRepeating),
        },
      ],
    );
  }

  return (
    <Popup visible title="Tarefa" onClose={onClose}>
      {repeats && (
        <View style={styles.repeatNote}>
          <Ionicons name="repeat" size={16} color={c.onPrimarySoft} />
          <Text style={styles.repeatText}>
            Repete-se. O nome muda só neste dia.
          </Text>
        </View>
      )}
      <TextInput
        style={[styles.input, title === null && styles.inputError]}
        value={text}
        onChangeText={setText}
        maxLength={TASK_TITLE_MAX_LENGTH}
        autoFocus
        cursorColor={c.primary}
        placeholder="O que tens de fazer?"
        placeholderTextColor={c.textFaint}
        accessibilityLabel="Título da tarefa"
      />
      {title === null && (
        <Text style={styles.error}>Escreve o que tens de fazer.</Text>
      )}
      <PopupButton
        label="Guardar"
        variant="primary"
        disabled={title === null || busy}
        onPress={() => {
          if (title === null) return;
          run(() =>
            title === task.title ? Promise.resolve() : onRename(title),
          );
        }}
      />
      {repeats ? (
        <>
          <PopupButton
            label="Mudar os dias"
            disabled={busy}
            onPress={() => {
              onClose();
              onEditRepeat();
            }}
          />
          <PopupButton
            label="Saltar só neste dia"
            disabled={busy}
            onPress={() => run(onDelete)}
          />
          <PopupButton
            label="Deixar de repetir"
            variant="danger"
            disabled={busy}
            onPress={confirmStop}
          />
        </>
      ) : (
        <>
          <PopupButton
            label="Passar para o dia seguinte"
            disabled={busy}
            onPress={() => run(onMoveToNextDay)}
          />
          <PopupButton
            label="Apagar"
            variant="danger"
            disabled={busy}
            onPress={confirmDelete}
          />
        </>
      )}
    </Popup>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    repeatNote: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginTop: -spacing.xs,
    },
    repeatText: {
      ...type.caption,
      flex: 1,
      color: c.onPrimarySoft,
    },
    input: {
      ...type.body,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: "transparent",
      backgroundColor: c.subtle,
      color: c.text,
    },
    inputError: {
      borderColor: c.danger,
    },
    error: {
      ...type.caption,
      marginTop: -spacing.sm,
      color: c.danger,
    },
  });
}
