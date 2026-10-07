import {
  foodToInput,
  formatAmount,
  formatMacros,
  parseAmount,
  scaleMacros,
  searchFoods,
  sumMacros,
  validateFood,
} from "@/lib/diet";
import type { FoodInput } from "@/types/diet";

const oats = {
  basisAmount: 100,
  kcal: 380,
  proteinG: 13,
  carbsG: 67,
  fatG: 7,
};

describe("scaleMacros", () => {
  it("scales the values of a food per grams", () => {
    expect(scaleMacros(oats, 80)).toEqual({
      kcal: 304,
      proteinG: 10.4,
      carbsG: 53.6,
      fatG: 5.6,
    });
  });

  it("scales the values of a food per unit", () => {
    const egg = { basisAmount: 1, kcal: 70, proteinG: 6, carbsG: 0.5, fatG: 5 };
    expect(scaleMacros(egg, 3)).toEqual({
      kcal: 210,
      proteinG: 18,
      carbsG: 1.5,
      fatG: 15,
    });
  });
});

describe("sumMacros", () => {
  it("adds kcal and macros", () => {
    expect(
      sumMacros([
        { kcal: 304, proteinG: 10.4, carbsG: 53.6, fatG: 5.6 },
        { kcal: 210, proteinG: 18, carbsG: 1.5, fatG: 15 },
      ]),
    ).toEqual({ kcal: 514, proteinG: 28.4, carbsG: 55.1, fatG: 20.6 });
    expect(sumMacros([])).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

describe("parseAmount", () => {
  it("reads grams and units with a comma or a dot", () => {
    expect(parseAmount("80", "grams")).toBe(80);
    expect(parseAmount("1,5", "unit")).toBe(1.5);
    expect(parseAmount("250", "ml")).toBe(250);
  });

  it("rejects zero, text and huge amounts", () => {
    expect(parseAmount("0", "grams")).toBeNull();
    expect(parseAmount("abc", "grams")).toBeNull();
    expect(parseAmount("6000", "grams")).toBeNull();
    expect(parseAmount("150", "unit")).toBeNull();
  });
});

describe("formatting", () => {
  it("formats amounts and macros", () => {
    expect(formatAmount(80, "grams")).toBe("80 g");
    expect(formatAmount(1.5, "unit")).toBe("1,5 un.");
    expect(formatAmount(250, "ml")).toBe("250 ml");
    expect(
      formatMacros({ kcal: 304.4, proteinG: 10.4, carbsG: 53.6, fatG: 5.6 }),
    ).toBe("304 kcal · P 10,4 · C 53,6 · G 5,6");
  });
});

describe("validateFood", () => {
  const input = (changes: Partial<FoodInput> = {}): FoodInput => ({
    ...foodToInput(null),
    name: "Aveia",
    kcalText: "380",
    proteinText: "13",
    carbsText: "67",
    fatText: "7",
    ...changes,
  });

  it("returns the values of a valid food", () => {
    expect(validateFood(input(), [])).toEqual({
      ok: true,
      values: {
        name: "Aveia",
        basis: "grams",
        basisAmount: 100,
        kcal: 380,
        proteinG: 13,
        carbsG: 67,
        fatG: 7,
      },
    });
  });

  it("accepts foods measured in ml", () => {
    const result = validateFood(
      input({ name: "Leite", basis: "ml", basisAmountText: "100" }),
      [],
    );
    expect(result.ok && result.values).toMatchObject({
      basis: "ml",
      basisAmount: 100,
    });
  });

  it("accepts 0 for a macro", () => {
    expect(validateFood(input({ fatText: "0" }), []).ok).toBe(true);
  });

  it("requires a name, an amount and all values", () => {
    const result = validateFood(
      input({ name: " ", basisAmountText: "0", kcalText: "" }),
      [],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        "basisAmount",
        "macros",
        "name",
      ]);
    }
  });

  it("rejects duplicate names, except the food being edited", () => {
    const existing = [{ id: "1", name: "Aveia" }];
    expect(validateFood(input({ name: "AVEIA" }), existing).ok).toBe(false);
    expect(validateFood(input(), existing, "1").ok).toBe(true);
  });
});

describe("searchFoods", () => {
  it("finds foods ignoring case and accents, sorted by name", () => {
    const foods = [
      { name: "Pão" },
      { name: "Arroz" },
      { name: "Pão de forma" },
    ];
    expect(searchFoods(foods, "pao").map((food) => food.name)).toEqual([
      "Pão",
      "Pão de forma",
    ]);
    expect(searchFoods(foods, "").map((food) => food.name)).toEqual([
      "Arroz",
      "Pão",
      "Pão de forma",
    ]);
  });
});
