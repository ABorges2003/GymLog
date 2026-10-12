import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AssistedRepsButton } from "@/components/assisted-reps-button";
import {
  FAILURE_TOGGLE_WIDTH,
  FailureBox,
  FailureToggle,
  REPS_LABEL_WIDTH,
} from "@/components/failure-toggle";
import { SetTypeBadge } from "@/components/set-type-badge";
import {
  SET_TYPE_LABELS,
  formatReps,
  formatWeight,
  inputFontSize,
  parseReps,
  parseWeight,
  setTypeCanFail,
  setTypeHasAssistedReps,
  setTypeHasReps,
} from "@/lib/sets";
import { SET_TYPES, type PlannedSet, type SetType } from "@/types/set";
import type { WorkoutSet } from "@/types/workout";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius, spacing, type } from "@/theme/tokens";

type Props = {
  set: WorkoutSet;
  index: number;
  exerciseName: string;
  // Saves the set; called on every valid change.
  onSave: (values: PlannedSet) => void;
  onDelete: () => void;
  // null removes them.
  onAssistedRepsChange: (reps: number | null) => void;
  // Called when one of the inputs gets focus (to keep it above the keyboard).
  onFocus: () => void;
};

// Next type when the badge is tapped: W -> F -> T -> B -> W.
function nextSetType(setType: SetType): SetType {
  return SET_TYPES[(SET_TYPES.indexOf(setType) + 1) % SET_TYPES.length];
}

// One set of a workout: type (tap to change), weight and reps (top/backoff
// only). Top sets have a hand icon for reps done with help; back-offs a
// flame to mark them done to failure instead of typing reps.
export function WorkoutSetRow({
  set,
  index,
  exerciseName,
  onSave,
  onDelete,
  onAssistedRepsChange,
  onFocus,
}: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  // The typed text is kept here so half-typed values ("102,") are not lost.
  const [setType, setSetType] = useState(set.setType);
  const [weightText, setWeightText] = useState(
    set.weightKg === null ? "" : formatWeight(set.weightKg),
  );
  const [repsText, setRepsText] = useState(
    set.reps === null ? "" : formatReps(set.reps),
  );
  const [toFailure, setToFailure] = useState(set.toFailure);
  // Kept here too: the database drops it when the set stops being a top set.
  const [assistedReps, setAssistedReps] = useState(set.assistedReps);
  // Which input has focus (only for its highlighted border).
  const [focused, setFocused] = useState<"weight" | "reps" | null>(null);

  const hasReps = setTypeHasReps(setType);
  const failed = toFailure && setTypeCanFail(setType);
  const weight = parseWeight(weightText);
  const reps = parseReps(repsText);

  // Saves when every shown value is valid.
  function save(next: {
    setType: SetType;
    weightText: string;
    repsText: string;
    toFailure: boolean;
  }) {
    const nextWeight = parseWeight(next.weightText);
    const nextReps = parseReps(next.repsText);
    const nextFailed = next.toFailure && setTypeCanFail(next.setType);
    const nextHasReps = setTypeHasReps(next.setType) && !nextFailed;
    if (!nextWeight.ok || (nextHasReps && !nextReps.ok)) return;
    if (!setTypeHasAssistedReps(next.setType)) setAssistedReps(null);
    onSave({
      setType: next.setType,
      weightKg: nextWeight.value,
      reps: nextHasReps && nextReps.ok ? nextReps.value : null,
      toFailure: nextFailed,
    });
  }

  function changeFailure(value: boolean) {
    setToFailure(value);
    save({ setType, weightText, repsText, toFailure: value });
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => {
          const next = nextSetType(setType);
          setSetType(next);
          save({ setType: next, weightText, repsText, toFailure });
        }}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Série ${index + 1}: ${SET_TYPE_LABELS[setType]}. Tocar para mudar o tipo`}
      >
        <SetTypeBadge setType={setType} size={36} />
      </Pressable>

      <TextInput
        style={[
          styles.input,
          { fontSize: inputFontSize(weightText) },
          focused === "weight" && styles.inputFocused,
          !weight.ok && styles.inputError,
        ]}
        value={weightText}
        onChangeText={(text) => {
          setWeightText(text);
          save({ setType, weightText: text, repsText, toFailure });
        }}
        onFocus={() => {
          setFocused("weight");
          onFocus();
        }}
        onBlur={() => setFocused(null)}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={c.textFaint}
        cursorColor={c.primary}
        maxLength={7}
        selectTextOnFocus
        accessibilityLabel={`Kg da série ${index + 1}`}
      />
      <Text style={styles.unit}>kg</Text>

      {hasReps ? (
        <>
          <Text style={styles.unit}>×</Text>
          {failed ? (
            <>
              <FailureBox onPress={() => changeFailure(false)} minHeight={46} />
              {/* Invisible: keeps the row as wide as one with reps. */}
              <Text style={[styles.unit, styles.repsLabel, styles.hidden]}>
                reps
              </Text>
            </>
          ) : (
            <>
              <TextInput
                style={[
                  styles.input,
                  { fontSize: inputFontSize(repsText) },
                  focused === "reps" && styles.inputFocused,
                  !reps.ok && styles.inputError,
                ]}
                value={repsText}
                onChangeText={(text) => {
                  setRepsText(text);
                  save({ setType, weightText, repsText: text, toFailure });
                }}
                onFocus={() => {
                  setFocused("reps");
                  onFocus();
                }}
                onBlur={() => setFocused(null)}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={c.textFaint}
                cursorColor={c.primary}
                maxLength={5}
                selectTextOnFocus
                accessibilityLabel={`Reps da série ${index + 1}`}
              />
              <Text style={[styles.unit, styles.repsLabel]} numberOfLines={1}>
                reps
              </Text>
            </>
          )}
          {setTypeHasAssistedReps(setType) ? (
            <AssistedRepsButton
              title={`${exerciseName} · série ${index + 1}`}
              reps={assistedReps}
              onSave={(value) => {
                setAssistedReps(value);
                onAssistedRepsChange(value);
              }}
            />
          ) : (
            <FailureToggle
              value={failed}
              onChange={changeFailure}
              label={`série ${index + 1}`}
            />
          )}
        </>
      ) : (
        // Keeps the weight input the same width as in rows with reps.
        <>
          <View style={styles.repsPlaceholder} />
          <View style={styles.assistedPlaceholder} />
        </>
      )}

      <Pressable
        onPress={onDelete}
        style={styles.deleteButton}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`Apagar série ${index + 1}`}
      >
        <Ionicons name="close" size={20} color={c.textFaint} />
      </Pressable>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: 52,
    },
    // Filled, no visible border until focused: calmer than a grid of boxes.
    input: {
      flex: 1,
      minHeight: 46,
      paddingHorizontal: spacing.xxs,
      fontSize: 20,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
      textAlign: "center",
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: "transparent",
      backgroundColor: c.subtle,
      color: c.text,
    },
    inputFocused: {
      borderColor: c.primary,
      backgroundColor: c.card,
    },
    inputError: {
      borderColor: c.danger,
      backgroundColor: c.dangerBg,
    },
    unit: {
      ...type.subhead,
      color: c.textMuted,
    },
    hidden: {
      opacity: 0,
    },
    repsLabel: {
      width: REPS_LABEL_WIDTH,
    },
    repsPlaceholder: {
      flex: 1.6,
    },
    // Same width as AssistedRepsButton and FailureToggle.
    assistedPlaceholder: {
      width: FAILURE_TOGGLE_WIDTH,
    },
    deleteButton: {
      width: 36,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
