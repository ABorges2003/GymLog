// Meals of a day, in order.
export const MEALS = [
  "breakfast",
  "morning_snack",
  "lunch",
  "afternoon_snack",
  "dinner",
  "supper",
] as const;

export type Meal = (typeof MEALS)[number];

// A food's values refer to a number of grams (e.g. per 100 g), millilitres
// (e.g. milk per 100 ml) or units (e.g. per 1 egg).
export type FoodBasis = "grams" | "ml" | "unit";

export type Macros = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type Food = Macros & {
  id: string;
  name: string;
  basis: FoodBasis;
  // The amount the values refer to: grams/ml (e.g. 100) or units (e.g. 1).
  basisAmount: number;
  isArchived: boolean;
};

// What the user fills in when creating or editing a food (typed text).
export type FoodInput = {
  name: string;
  basis: FoodBasis;
  basisAmountText: string;
  kcalText: string;
  proteinText: string;
  carbsText: string;
  fatText: string;
};

// A food eaten on a day. Its values are stored when it is logged, so editing
// the food later does not change past days.
export type FoodEntry = Macros & {
  id: string;
  date: string;
  meal: Meal;
  foodId: string;
  foodName: string;
  basis: FoodBasis;
  // Grams, ml or units, depending on the basis.
  amount: number;
};

// Daily goals; macros are optional.
export type DietGoals = {
  kcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};
