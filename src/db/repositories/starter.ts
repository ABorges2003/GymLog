import type { SQLiteDatabase } from "expo-sqlite";

import { createFood } from "@/db/repositories/diet";
import { createExercise } from "@/db/repositories/exercises";
import {
  planStarterPack,
  type StarterPack,
  type StarterPlan,
} from "@/lib/starter";

// Names taken by the user's exercises and foods, archived ones included (so an
// archived exercise is not added again).
async function existingNames(db: SQLiteDatabase) {
  const [exercises, foods] = await Promise.all([
    db.getAllAsync<{ name: string }>("SELECT name FROM exercises"),
    db.getAllAsync<{ name: string }>("SELECT name FROM foods"),
  ]);
  return {
    exercises: exercises.map((row) => row.name),
    foods: foods.map((row) => row.name),
  };
}

// What adding the pack would add and what is already there.
export async function previewStarterPack(
  db: SQLiteDatabase,
  pack: StarterPack,
): Promise<StarterPlan> {
  const names = await existingNames(db);
  return planStarterPack(pack, names.exercises, names.foods);
}

// Adds the pack's exercises and foods that are not in the app yet, in one
// transaction (worked out again inside it). Nothing is replaced, changed or
// deleted. Returns what was done.
export async function importStarterPack(
  db: SQLiteDatabase,
  pack: StarterPack,
): Promise<StarterPlan> {
  const result: { plan?: StarterPlan } = {};
  await db.withExclusiveTransactionAsync(async (txn) => {
    const names = await existingNames(txn);
    const plan = planStarterPack(pack, names.exercises, names.foods);
    for (const exercise of plan.newExercises) {
      await createExercise(txn, exercise);
    }
    for (const food of plan.newFoods) {
      await createFood(txn, food);
    }
    result.plan = plan;
  });
  if (!result.plan) throw new Error("Starter pack was not added");
  return result.plan;
}
