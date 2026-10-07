import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import {
  DEFAULT_SETS,
  MAX_SETS_PER_EXERCISE,
  SET_TYPE_COLORS,
  SET_TYPE_LABELS,
  SET_TYPE_SHORT_LABELS,
  formatReps,
  formatWeight,
  parseReps,
  parseWeight,
  setTypeHasReps,
  validateSetCount,
} from "@/lib/sets";
import { SET_TYPES, type PlannedSet, type SetType } from "@/types/set";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

// A set while it is being edited: numbers are kept as the typed text.
type DraftSet = {
  key: number;
  setType: SetType;
  repsText: string;
  weightText: string;
};

type Props = {
  initialSets: PlannedSet[];
  // Saves the sets; throws if saving fails.
  onSave: (sets: PlannedSet[]) => Promise<void>;
};

// Edits the planned sets (type, reps, weight) of one exercise.
export function SetStructureEditor({ initialSets, onSave }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  // Stable keys so inputs keep focus when sets are added or removed.
  const nextKey = useRef(0);
  const toDraft = (set: PlannedSet): DraftSet => ({
    key: nextKey.current++,
    setType: set.setType,
    repsText: set.reps === null ? "" : formatReps(set.reps),
    weightText: set.weightKg === null ? "" : formatWeight(set.weightKg),
  });

  const [drafts, setDrafts] = useState<DraftSet[]>(() =>
    initialSets.map(toDraft),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Keeps the set being typed in visible above the keyboard: remember where
  // each set card is and scroll to the focused one when the keyboard opens.
  const scrollRef = useRef<ScrollView>(null);
  const cardY = useRef(new Map<number, number>());
  const [focusedKey, setFocusedKey] = useState<number | null>(null);
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (focusedKey === null || keyboardHeight === 0) return;
    const y = cardY.current.get(focusedKey);
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }
  }, [focusedKey, keyboardHeight]);

  function update(key: number, changes: Partial<DraftSet>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, ...changes } : draft,
      ),
    );
  }

  function remove(key: number) {
    setDrafts((current) => current.filter((draft) => draft.key !== key));
  }

  // A new set copies the last one (type and values), or is an empty top set.
  function addSet() {
    setDrafts((current) => {
      const last = current.at(-1);
      return [
        ...current,
        last
          ? { ...last, key: nextKey.current++ }
          : toDraft({ setType: "top", reps: null, weightKg: null }),
      ];
    });
  }

  async function save() {
    const countError = validateSetCount(drafts);
    if (countError) {
      setError(countError);
      return;
    }
    const sets: PlannedSet[] = [];
    for (const draft of drafts) {
      const hasReps = setTypeHasReps(draft.setType);
      const reps = hasReps ? parseReps(draft.repsText) : null;
      const weight = parseWeight(draft.weightText);
      if ((reps && !reps.ok) || !weight.ok) {
        setError("Corrige os valores a vermelho.");
        return;
      }
      sets.push({
        setType: draft.setType,
        // Warm-ups and feeders never store reps.
        reps: reps?.ok ? reps.value : null,
        weightKg: weight.value,
      });
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(sets);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: 16 + keyboardHeight },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.legend}>
          {SET_TYPES.map(
            (setType) =>
              `${SET_TYPE_SHORT_LABELS[setType]} = ${SET_TYPE_LABELS[setType]}`,
          ).join("   ")}
        </Text>

        {drafts.map((draft, index) => {
          const hasReps = setTypeHasReps(draft.setType);
          const repsInvalid = hasReps && !parseReps(draft.repsText).ok;
          const weightInvalid = !parseWeight(draft.weightText).ok;
          return (
            <View
              key={draft.key}
              style={styles.card}
              onLayout={(event) =>
                cardY.current.set(draft.key, event.nativeEvent.layout.y)
              }
            >
              <View style={styles.typeRow}>
                <Text style={styles.rowLabel}>{index + 1}.</Text>
                <View style={styles.segments}>
                  {SET_TYPES.map((setType) => {
                    const isSelected = setType === draft.setType;
                    return (
                      <Pressable
                        key={setType}
                        onPress={() => update(draft.key, { setType })}
                        style={[
                          styles.segment,
                          isSelected && {
                            backgroundColor: SET_TYPE_COLORS[setType],
                            borderColor: SET_TYPE_COLORS[setType],
                          },
                        ]}
                        accessibilityRole="radio"
                        accessibilityLabel={SET_TYPE_LABELS[setType]}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            isSelected && styles.segmentTextSelected,
                          ]}
                        >
                          {SET_TYPE_SHORT_LABELS[setType]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  onPress={() => remove(draft.key)}
                  style={styles.removeButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Apagar série ${index + 1}`}
                >
                  <Ionicons name="trash-outline" size={22} color={c.danger} />
                </Pressable>
              </View>

              <View style={styles.valuesRow}>
                <TextInput
                  style={[styles.input, weightInvalid && styles.inputError]}
                  value={draft.weightText}
                  onChangeText={(weightText) =>
                    update(draft.key, { weightText })
                  }
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={c.textFaint}
                  maxLength={7}
                  selectTextOnFocus
                  onFocus={() => setFocusedKey(draft.key)}
                  onBlur={() => setFocusedKey(null)}
                  accessibilityLabel={`Kg da série ${index + 1}`}
                />
                <Text style={styles.unit}>kg</Text>
                {hasReps ? (
                  <>
                    <Text style={styles.unit}>×</Text>
                    <TextInput
                      style={[styles.input, repsInvalid && styles.inputError]}
                      value={draft.repsText}
                      onChangeText={(repsText) =>
                        update(draft.key, { repsText })
                      }
                      keyboardType="decimal-pad"
                      placeholder="—"
                      placeholderTextColor={c.textFaint}
                      maxLength={5}
                      selectTextOnFocus
                      onFocus={() => setFocusedKey(draft.key)}
                      onBlur={() => setFocusedKey(null)}
                      accessibilityLabel={`Reps da série ${index + 1}`}
                    />
                    <Text style={styles.unit}>reps</Text>
                  </>
                ) : (
                  // Keeps the weight input the same width as in rows with reps.
                  <View style={styles.repsPlaceholder} />
                )}
              </View>
            </View>
          );
        })}

        <View style={styles.buttons}>
          <Pressable
            onPress={addSet}
            disabled={drafts.length >= MAX_SETS_PER_EXERCISE}
            style={[
              styles.secondaryButton,
              drafts.length >= MAX_SETS_PER_EXERCISE && styles.disabled,
            ]}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={22} color={c.text} />
            <Text style={styles.secondaryText}>Adicionar série</Text>
          </Pressable>
          <Pressable
            onPress={() => setDrafts(DEFAULT_SETS.map(toDraft))}
            style={styles.secondaryButton}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={20} color={c.text} />
            <Text style={styles.secondaryText}>
              Repor{" "}
              {DEFAULT_SETS.map(
                (set) => SET_TYPE_SHORT_LABELS[set.setType],
              ).join("·")}
            </Text>
          </Pressable>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={save}
          disabled={saving}
          style={[styles.saveButton, saving && styles.disabled]}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color={c.onPrimary} />
          ) : (
            <Text style={styles.saveText}>Guardar</Text>
          )}
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
    container: {
      padding: 16,
      gap: 10,
    },
    legend: {
      fontSize: 14,
      color: c.textMuted,
      marginBottom: 4,
    },
    card: {
      paddingLeft: 12,
      paddingBottom: 10,
      borderRadius: 12,
      backgroundColor: c.card,
    },
    typeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    rowLabel: {
      width: 24,
      fontSize: 16,
      color: c.textMuted,
    },
    segments: {
      flex: 1,
      flexDirection: "row",
      gap: 6,
      paddingVertical: 8,
    },
    segment: {
      flex: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    segmentText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.textMuted,
    },
    // On the set type colour, the same in both themes.
    segmentTextSelected: {
      color: "#ffffff",
    },
    removeButton: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    valuesRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingLeft: 32,
      paddingRight: 12,
    },
    input: {
      flex: 1,
      minHeight: 48,
      paddingHorizontal: 8,
      fontSize: 20,
      fontWeight: "600",
      textAlign: "center",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.input,
      color: c.text,
    },
    inputError: {
      borderColor: c.danger,
      backgroundColor: c.dangerBg,
    },
    unit: {
      fontSize: 15,
      color: c.textMuted,
    },
    repsPlaceholder: {
      flex: 1,
    },
    buttons: {
      gap: 10,
      marginTop: 6,
    },
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: c.textFaint,
    },
    secondaryText: {
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    disabled: {
      opacity: 0.4,
    },
    error: {
      fontSize: 14,
      color: c.danger,
    },
    footer: {
      padding: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.card,
    },
    saveButton: {
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    saveText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.onPrimary,
    },
  });
}
