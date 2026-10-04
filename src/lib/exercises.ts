import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from "@/lib/labels";
import {
  MUSCLE_GROUPS,
  type Exercise,
  type ExerciseInput,
  type MuscleGroup,
} from "@/types/exercise";

export type ExerciseSection = {
  key: "favorites" | MuscleGroup;
  title: string;
  data: Exercise[];
};

function sortByName(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

// Favorites first, then one section per muscle group in MUSCLE_GROUPS order.
// Favorites also stay in their muscle group. Names are sorted with Portuguese
// rules, so accents sort correctly. Empty sections are left out.
export function groupExercisesByMuscleGroup(
  exercises: Exercise[],
): ExerciseSection[] {
  const favorites: ExerciseSection = {
    key: "favorites",
    title: "Favoritos",
    data: sortByName(exercises.filter((exercise) => exercise.isFavorite)),
  };
  const byMuscleGroup = MUSCLE_GROUPS.map((muscleGroup): ExerciseSection => ({
    key: muscleGroup,
    title: MUSCLE_GROUP_LABELS[muscleGroup],
    data: sortByName(
      exercises.filter((exercise) => exercise.muscleGroup === muscleGroup),
    ),
  }));
  return [favorites, ...byMuscleGroup].filter(
    (section) => section.data.length > 0,
  );
}

// Lowercase and without accents, so "biceps" matches "Bíceps".
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export type ExerciseFilter = {
  query: string;
  // Empty means every muscle group.
  muscleGroups: MuscleGroup[];
};

// Every word of the query must appear in the exercise name, muscle group or
// equipment, in any order: "supino halteres" matches "Supino Plano com Halteres".
export function filterExercises(
  exercises: Exercise[],
  { query, muscleGroups }: ExerciseFilter,
): Exercise[] {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean);

  return exercises.filter((exercise) => {
    if (
      muscleGroups.length > 0 &&
      !muscleGroups.includes(exercise.muscleGroup)
    ) {
      return false;
    }
    const searchable = normalizeForSearch(
      [
        exercise.name,
        MUSCLE_GROUP_LABELS[exercise.muscleGroup],
        exercise.equipment ? EQUIPMENT_LABELS[exercise.equipment] : "",
      ].join(" "),
    );
    return terms.every((term) => searchable.includes(term));
  });
}

export const EXERCISE_NAME_MAX_LENGTH = 60;

export type ExerciseInputErrors = {
  name?: string;
  muscleGroup?: string;
};

type NamedExercise = Pick<Exercise, "id" | "name" | "isArchived">;

// Checks the form before saving. `existing` is used to reject names already
// taken (ignoring case and accents); `editingId` skips the exercise being edited.
export function validateExerciseInput(
  input: ExerciseInput,
  existing: NamedExercise[],
  editingId?: string,
): ExerciseInputErrors {
  const errors: ExerciseInputErrors = {};
  const name = input.name.trim();

  if (name.length === 0) {
    errors.name = "Escreve um nome.";
  } else if (name.length > EXERCISE_NAME_MAX_LENGTH) {
    errors.name = `O nome pode ter no máximo ${EXERCISE_NAME_MAX_LENGTH} caracteres.`;
  } else {
    const normalized = normalizeForSearch(name);
    const duplicate = existing.find(
      (exercise) =>
        exercise.id !== editingId &&
        normalizeForSearch(exercise.name) === normalized,
    );
    if (duplicate) {
      errors.name = duplicate.isArchived
        ? `Já existe um exercício arquivado com este nome: "${duplicate.name}".`
        : `Já existe um exercício com este nome: "${duplicate.name}".`;
    }
  }

  if (!input.muscleGroup) {
    errors.muscleGroup = "Escolhe o grupo muscular.";
  }

  return errors;
}

export function hasErrors(errors: ExerciseInputErrors): boolean {
  return Object.keys(errors).length > 0;
}
