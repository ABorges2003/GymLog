import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ChipOption } from "@/components/filter-chips";
import { SearchBar } from "@/components/search-bar";
import { ToggleChips } from "@/components/toggle-chips";
import { filterExercises, groupExercisesByMuscleGroup } from "@/lib/exercises";
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from "@/lib/labels";
import {
  MUSCLE_GROUPS,
  type Exercise,
  type MuscleGroup,
} from "@/types/exercise";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

const MUSCLE_GROUP_OPTIONS: ChipOption<MuscleGroup>[] = MUSCLE_GROUPS.map(
  (muscleGroup) => ({
    value: muscleGroup,
    label: MUSCLE_GROUP_LABELS[muscleGroup],
  }),
);

type Props = {
  exercises: Exercise[];
  // Exercises shown but not selectable (e.g. already in the routine).
  disabledIds: Set<string>;
  disabledLabel: string;
  // Called with the chosen ids, in the order they were picked.
  onConfirm: (exerciseIds: string[]) => Promise<void>;
};

// Searchable, multi-select list of exercises with favorites first.
export function ExercisePicker({
  exercises,
  disabledIds,
  disabledLabel,
  onConfirm,
}: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [query, setQuery] = useState("");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const sections = useMemo(
    () =>
      groupExercisesByMuscleGroup(
        filterExercises(exercises, { query, muscleGroups }),
      ),
    [exercises, query, muscleGroups],
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function confirm() {
    setSaving(true);
    try {
      await onConfirm(selected);
    } finally {
      setSaving(false);
    }
  }

  if (exercises.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Ainda não tens exercícios.</Text>
        <Link href="/exercise/new" asChild>
          <Pressable style={styles.createButton} accessibilityRole="button">
            <Ionicons name="add" size={22} color={c.text} />
            <Text style={styles.createButtonText}>Criar exercício</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Pesquisar exercício"
      />
      <View>
        <ToggleChips
          options={MUSCLE_GROUP_OPTIONS}
          selected={muscleGroups}
          onChange={setMuscleGroups}
          allLabel="Todos"
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(exercise) => exercise.id}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const disabled = disabledIds.has(item.id);
          const isSelected = selected.includes(item.id);
          return (
            <Pressable
              onPress={() => toggle(item.id)}
              disabled={disabled}
              style={styles.row}
              android_ripple={{ color: c.ripple }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected, disabled }}
            >
              <Ionicons
                name={disabled || isSelected ? "checkbox" : "square-outline"}
                size={26}
                color={disabled ? c.border : c.text}
              />
              <View style={styles.rowText}>
                <Text style={[styles.name, disabled && styles.disabledText]}>
                  {item.name}
                </Text>
                <Text style={styles.details}>
                  {disabled
                    ? disabledLabel
                    : item.equipment
                      ? EQUIPMENT_LABELS[item.equipment]
                      : MUSCLE_GROUP_LABELS[item.muscleGroup]}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum exercício encontrado</Text>
        }
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      <View style={styles.footer}>
        <Pressable
          onPress={confirm}
          disabled={selected.length === 0 || saving}
          style={[
            styles.confirmButton,
            (selected.length === 0 || saving) && styles.confirmDisabled,
          ]}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color={c.onPrimary} />
          ) : (
            <Text style={styles.confirmText}>
              {selected.length === 0
                ? "Escolhe exercícios"
                : `Adicionar (${selected.length})`}
            </Text>
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
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 16,
    },
    empty: {
      fontSize: 16,
      color: c.textMuted,
      textAlign: "center",
      marginTop: 32,
    },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 52,
      paddingHorizontal: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    createButtonText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.text,
    },
    sectionHeader: {
      fontSize: 16,
      fontWeight: "bold",
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: c.subtle,
      color: c.text,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 60,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: c.card,
    },
    rowText: {
      flex: 1,
    },
    name: {
      fontSize: 17,
      color: c.text,
    },
    disabledText: {
      color: c.textFaint,
    },
    details: {
      fontSize: 14,
      color: c.textMuted,
      marginTop: 2,
    },
    footer: {
      padding: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.card,
    },
    confirmButton: {
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    confirmDisabled: {
      opacity: 0.4,
    },
    confirmText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.onPrimary,
    },
  });
}
