import type { FoodValues } from "@/lib/diet";
import { normalizeForSearch } from "@/lib/exercises";
import type { Equipment, MuscleGroup } from "@/types/exercise";

// Example exercises and foods built into the app (src/data/starter-pack.ts),
// added only when the user asks for them. Adding them never replaces, changes
// or deletes anything the user already has.

export type StarterExercise = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment | null;
};

export type StarterPack = {
  exercises: StarterExercise[];
  foods: FoodValues[];
};

// What adding the pack would do, to show before confirming.
export type StarterPlan = {
  newExercises: StarterExercise[];
  newFoods: FoodValues[];
  // Names the user already has (accents and capitals ignored): kept as they are.
  existingExercises: string[];
  existingFoods: string[];
};

// The items whose names are not taken yet (accents and case ignored), also
// leaving out repeated names inside the pack itself.
export function missingByName<T extends { name: string }>(
  items: T[],
  existingNames: string[],
): T[] {
  const taken = new Set(existingNames.map(normalizeForSearch));
  const result: T[] = [];
  for (const item of items) {
    const key = normalizeForSearch(item.name);
    if (taken.has(key)) continue;
    taken.add(key);
    result.push(item);
  }
  return result;
}

export function planStarterPack(
  pack: StarterPack,
  existingExerciseNames: string[],
  existingFoodNames: string[],
): StarterPlan {
  const newExercises = missingByName(pack.exercises, existingExerciseNames);
  const newFoods = missingByName(pack.foods, existingFoodNames);
  const notNew = <T extends { name: string }>(items: T[], added: T[]) =>
    items.filter((item) => !added.includes(item)).map((item) => item.name);
  return {
    newExercises,
    newFoods,
    existingExercises: notNew(pack.exercises, newExercises),
    existingFoods: notNew(pack.foods, newFoods),
  };
}

// "Supino, Aveia, Remada e mais 4" (at most `max` names).
export function listNames(names: string[], max = 3): string {
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} e mais ${names.length - max}`;
}
