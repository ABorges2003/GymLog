import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { Popup, PopupButton } from "@/components/popup";
import { PROGRESSION_LABELS } from "@/lib/routines";
import type { Progression } from "@/types/routine";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

type Props = {
  exerciseName: string;
  progression: Progression | null;
  // null removes the note.
  onChange: (progression: Progression | null) => void;
};

const OPTIONS: Progression[] = ["keep", "maybe", "increase"];

const ICONS: Record<Progression, ComponentProps<typeof Ionicons>["name"]> = {
  keep: "pause-circle",
  maybe: "help-circle",
  increase: "arrow-up-circle",
};

// Green "keep", yellow "maybe" or red "increase" for the next workout.
function useNoteColors(): Record<
  Progression,
  { text: string; background: string }
> {
  const c = useColors();
  return {
    keep: { text: c.success, background: c.successBg },
    maybe: { text: c.warningText, background: c.warningBg },
    increase: { text: c.danger, background: c.dangerBg },
  };
}

// The note for the next workout, or a button to add one. Tapping it opens a
// popup to choose, change or remove the note.
export function ProgressionNote({
  exerciseName,
  progression,
  onChange,
}: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const colors = useNoteColors();
  const [open, setOpen] = useState(false);

  function choose(next: Progression | null) {
    setOpen(false);
    if (next !== progression) onChange(next);
  }

  return (
    <>
      {progression ? (
        <Pressable
          onPress={() => setOpen(true)}
          style={[
            styles.note,
            { backgroundColor: colors[progression].background },
          ]}
          accessibilityRole="button"
          accessibilityHint="Mudar ou tirar a nota"
        >
          <Ionicons
            name={ICONS[progression]}
            size={20}
            color={colors[progression].text}
          />
          <Text style={[styles.noteText, { color: colors[progression].text }]}>
            {PROGRESSION_LABELS[progression]}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => setOpen(true)}
          style={styles.empty}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={18} color={c.textMuted} />
          <Text style={styles.emptyText}>Nota para a próxima semana</Text>
        </Pressable>
      )}

      <Popup
        visible={open}
        title="Próxima semana"
        subtitle={exerciseName}
        onClose={() => setOpen(false)}
      >
        {OPTIONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => choose(option)}
            style={[
              styles.option,
              { backgroundColor: colors[option].background },
              option === progression && {
                borderColor: colors[option].text,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: option === progression }}
          >
            <Ionicons
              name={ICONS[option]}
              size={22}
              color={colors[option].text}
            />
            <Text style={[styles.noteText, { color: colors[option].text }]}>
              {PROGRESSION_LABELS[option]}
            </Text>
          </Pressable>
        ))}
        {progression ? (
          <PopupButton
            label="Tirar nota"
            variant="danger"
            onPress={() => choose(null)}
          />
        ) : (
          <PopupButton label="Cancelar" onPress={() => setOpen(false)} />
        )}
      </Popup>
    </>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    empty: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 44,
      paddingHorizontal: 16,
    },
    emptyText: {
      fontSize: 15,
      color: c.textMuted,
    },
    note: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 44,
      marginHorizontal: 12,
      marginBottom: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    noteText: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minHeight: 52,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "transparent",
    },
  });
}
