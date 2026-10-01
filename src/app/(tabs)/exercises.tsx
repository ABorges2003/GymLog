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

import { FilterChips, type ChipOption } from "@/components/filter-chips";
import { SearchBar } from "@/components/search-bar";
import { useExercises } from "@/hooks/use-exercises";
import { filterExercises, groupExercisesByMuscleGroup } from "@/lib/exercises";
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from "@/lib/labels";
import {
  MUSCLE_GROUPS,
  type Exercise,
  type MuscleGroup,
} from "@/types/exercise";

const MUSCLE_GROUP_OPTIONS: ChipOption<MuscleGroup | null>[] = [
  { value: null, label: "Todos" },
  ...MUSCLE_GROUPS.map((muscleGroup) => ({
    value: muscleGroup,
    label: MUSCLE_GROUP_LABELS[muscleGroup],
  })),
];

type ExerciseRowProps = {
  exercise: Exercise;
  onToggleFavorite: (exercise: Exercise) => void;
};

function ExerciseRow({ exercise, onToggleFavorite }: ExerciseRowProps) {
  const details = [
    exercise.equipment ? EQUIPMENT_LABELS[exercise.equipment] : null,
    exercise.isCustom ? "Criado por mim" : null,
  ].filter(Boolean);

  return (
    <View style={styles.row}>
      <Link
        href={{ pathname: "/exercise/[id]", params: { id: exercise.id } }}
        asChild
      >
        <Pressable
          style={styles.rowText}
          android_ripple={{ color: "#e5e7eb" }}
          accessibilityRole="button"
        >
          <Text style={styles.name}>{exercise.name}</Text>
          {details.length > 0 && (
            <Text style={styles.details}>{details.join(" · ")}</Text>
          )}
        </Pressable>
      </Link>
      <Pressable
        onPress={() => onToggleFavorite(exercise)}
        style={styles.star}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          exercise.isFavorite
            ? "Remover dos favoritos"
            : "Adicionar aos favoritos"
        }
      >
        <Ionicons
          name={exercise.isFavorite ? "star" : "star-outline"}
          size={24}
          color={exercise.isFavorite ? "#f5a524" : "#9ca3af"}
        />
      </Pressable>
    </View>
  );
}

export default function ExercisesScreen() {
  const { exercises, error, toggleFavorite } = useExercises();
  const [query, setQuery] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);

  const sections = useMemo(
    () =>
      groupExercisesByMuscleGroup(
        filterExercises(exercises ?? [], { query, muscleGroup }),
      ),
    [exercises, query, muscleGroup],
  );

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!exercises) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
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
        <FilterChips
          options={MUSCLE_GROUP_OPTIONS}
          selected={muscleGroup}
          onSelect={setMuscleGroup}
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(exercise) => exercise.id}
        renderItem={({ item }) => (
          <ExerciseRow exercise={item} onToggleFavorite={toggleFavorite} />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum exercício encontrado</Text>
        }
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  empty: {
    fontSize: 16,
    color: "gray",
    textAlign: "center",
    marginTop: 32,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    fontSize: 16,
    color: "red",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#eef0f3",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionCount: {
    fontSize: 14,
    color: "gray",
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "white",
  },
  rowText: {
    flex: 1,
    minHeight: 56,
    justifyContent: "center",
    paddingLeft: 16,
    paddingVertical: 10,
  },
  star: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 17,
  },
  details: {
    fontSize: 14,
    color: "gray",
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
    backgroundColor: "#d0d4da",
  },
});
