import { normalizeForSearch } from "@/lib/exercises";
import { formatWeight } from "@/lib/sets";
import type { Food, FoodBasis, FoodInput, Macros, Meal } from "@/types/diet";

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: "Pequeno-almoço",
  morning_snack: "Lanche da manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da tarde",
  dinner: "Jantar",
  supper: "Ceia",
};

export const FOOD_NAME_MAX_LENGTH = 60;
export const MAX_GRAMS = 5000;
export const MAX_UNITS = 100;

const ZERO: Macros = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

const round1 = (value: number) => Math.round(value * 10) / 10;

function parseDecimal(text: string): number | null {
  const trimmed = text.trim().replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(trimmed) ? Number(trimmed) : null;
}

// A number above 0 and up to `max`, typed with "," or "."; null otherwise.
export function parsePositive(text: string, max: number): number | null {
  const value = parseDecimal(text);
  return value !== null && value > 0 && value <= max ? value : null;
}

// Zero or more, up to `max` (macros can be 0); null otherwise.
export function parseNonNegative(text: string, max: number): number | null {
  const value = parseDecimal(text);
  return value !== null && value <= max ? value : null;
}

// Grams, ml or units typed when logging a food.
export function parseAmount(text: string, basis: FoodBasis): number | null {
  return parsePositive(text, basis === "unit" ? MAX_UNITS : MAX_GRAMS);
}

// Short unit shown next to an amount: "g", "ml" or "un.".
export function amountUnit(basis: FoodBasis): string {
  if (basis === "ml") return "ml";
  return basis === "grams" ? "g" : "un.";
}

// Values for `amount` grams/units of a food: kcal rounded to whole numbers,
// macros to one decimal.
export function scaleMacros(
  food: Pick<Food, "basisAmount" | "kcal" | "proteinG" | "carbsG" | "fatG">,
  amount: number,
): Macros {
  const factor = amount / food.basisAmount;
  return {
    kcal: Math.round(food.kcal * factor),
    proteinG: round1(food.proteinG * factor),
    carbsG: round1(food.carbsG * factor),
    fatG: round1(food.fatG * factor),
  };
}

// Values of a logged entry for a new amount, worked out from the values it was
// logged with (so editing the food since then changes nothing).
export function rescaleEntry(
  entry: Macros & { amount: number },
  amount: number,
): Macros {
  return scaleMacros({ ...entry, basisAmount: entry.amount }, amount);
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce(
    (total, item) => ({
      kcal: total.kcal + item.kcal,
      proteinG: round1(total.proteinG + item.proteinG),
      carbsG: round1(total.carbsG + item.carbsG),
      fatG: round1(total.fatG + item.fatG),
    }),
    ZERO,
  );
}

// "80 g", "250 ml" or "2 un.".
export function formatAmount(amount: number, basis: FoodBasis): string {
  return `${formatWeight(amount)} ${amountUnit(basis)}`;
}

// "por 100 g", "por 100 ml" or "por 1 un.".
export function formatBasis(food: Pick<Food, "basis" | "basisAmount">): string {
  return `por ${formatAmount(food.basisAmount, food.basis)}`;
}

// "300 kcal · P 10 · C 54 · G 6".
export function formatMacros(macros: Macros): string {
  return [
    `${Math.round(macros.kcal)} kcal`,
    `P ${formatWeight(round1(macros.proteinG))}`,
    `C ${formatWeight(round1(macros.carbsG))}`,
    `G ${formatWeight(round1(macros.fatG))}`,
  ].join(" · ");
}

export type FoodValues = Omit<Food, "id" | "isArchived">;

export type FoodInputErrors = Partial<
  Record<"name" | "basisAmount" | "macros", string>
>;

// Checks the food form; returns the values to save, or the errors to show.
export function validateFood(
  input: FoodInput,
  existing: { id: string; name: string }[],
  editingId?: string,
): { ok: true; values: FoodValues } | { ok: false; errors: FoodInputErrors } {
  const errors: FoodInputErrors = {};
  const name = input.name.trim();
  if (name.length === 0) {
    errors.name = "Escreve um nome.";
  } else if (name.length > FOOD_NAME_MAX_LENGTH) {
    errors.name = `O nome pode ter no máximo ${FOOD_NAME_MAX_LENGTH} caracteres.`;
  } else {
    const normalized = normalizeForSearch(name);
    const duplicate = existing.find(
      (food) =>
        food.id !== editingId && normalizeForSearch(food.name) === normalized,
    );
    if (duplicate) {
      errors.name = `Já existe um alimento com este nome: "${duplicate.name}".`;
    }
  }

  const basisAmount = parseAmount(input.basisAmountText, input.basis);
  if (basisAmount === null) {
    errors.basisAmount =
      input.basis === "unit"
        ? "Escreve as unidades (ex.: 1)."
        : `Escreve os ${input.basis === "ml" ? "ml" : "gramas"} (ex.: 100).`;
  }

  const kcal = parseNonNegative(input.kcalText, 10000);
  const proteinG = parseNonNegative(input.proteinText, 1000);
  const carbsG = parseNonNegative(input.carbsText, 1000);
  const fatG = parseNonNegative(input.fatText, 1000);
  if (kcal === null || proteinG === null || carbsG === null || fatG === null) {
    errors.macros =
      "Preenche as kcal, proteína, carbos e gordura (0 se não tiver).";
  }

  if (
    errors.name ||
    basisAmount === null ||
    kcal === null ||
    proteinG === null ||
    carbsG === null ||
    fatG === null
  ) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    values: {
      name,
      basis: input.basis,
      basisAmount,
      kcal,
      proteinG,
      carbsG,
      fatG,
    },
  };
}

// Text for the food form from a saved food, or the defaults for a new one.
export function foodToInput(food: Food | null): FoodInput {
  if (!food) {
    return {
      name: "",
      basis: "grams",
      basisAmountText: "100",
      kcalText: "",
      proteinText: "",
      carbsText: "",
      fatText: "",
    };
  }
  return {
    name: food.name,
    basis: food.basis,
    basisAmountText: formatWeight(food.basisAmount),
    kcalText: formatWeight(food.kcal),
    proteinText: formatWeight(food.proteinG),
    carbsText: formatWeight(food.carbsG),
    fatText: formatWeight(food.fatG),
  };
}

// Foods matching a search (ignoring case and accents), sorted by name.
export function searchFoods<T extends { name: string }>(
  foods: T[],
  query: string,
): T[] {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  return foods
    .filter((food) =>
      terms.every((term) => normalizeForSearch(food.name).includes(term)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

// Water: quick amounts to add, the most a day can hold, and the scale of the
// bottle when there is no goal (never shown as a number).
export const WATER_STEPS_ML = [250, 500] as const;
export const MAX_WATER_ML = 20000;
export const MAX_WATER_GOAL_ML = 10000;
export const WATER_BOTTLE_DEFAULT_ML = 2000;

// The day's water after adding (or, if negative, taking away) some ml:
// never below 0 or above the maximum.
export function addWaterMl(current: number, deltaMl: number): number {
  return Math.min(MAX_WATER_ML, Math.max(0, Math.round(current + deltaMl)));
}

// "750 ml", "1 L", "1,25 L": litres from 1000 ml on, up to 2 decimals.
export function formatWater(ml: number): string {
  if (ml < 1000) return `${Math.round(ml)} ml`;
  const litres = Math.round(ml / 10) / 100;
  return `${String(litres).replace(".", ",")} L`;
}

export type WaterUnit = "ml" | "L";

// Water typed in ml or litres ("330", "1,5"), as whole ml; null when it is
// not a positive amount up to `maxMl`.
export function parseWaterAmount(
  text: string,
  unit: WaterUnit,
  maxMl: number,
): number | null {
  const value = parsePositive(text, unit === "L" ? maxMl / 1000 : maxMl);
  if (value === null) return null;
  const ml = Math.round(unit === "L" ? value * 1000 : value);
  return ml > 0 ? ml : null;
}
