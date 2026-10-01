import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { Equipment, MuscleGroup } from "@/types/exercise";

type BuiltInExercise = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
};

// Built-in exercises (is_custom = 0). Names must stay unique: they are how the
// seed knows an exercise already exists. New entries can be added at any time.
const BUILT_IN_EXERCISES: BuiltInExercise[] = [
  // Chest
  { name: "Supino Reto com Barra", muscleGroup: "chest", equipment: "barbell" },
  { name: "Supino Inclinado com Barra", muscleGroup: "chest", equipment: "barbell" },
  { name: "Supino Reto com Halteres", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Supino Inclinado com Halteres", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Supino Inclinado na Smith", muscleGroup: "chest", equipment: "smith_machine" },
  { name: "Supino na Máquina", muscleGroup: "chest", equipment: "machine" },
  { name: "Peck Deck", muscleGroup: "chest", equipment: "machine" },
  { name: "Peck Deck com Alteres", muscleGroup: "chest", equipment: "barbell" },
  { name: "Cruzamento na Polia", muscleGroup: "chest", equipment: "cable" },
  { name: "Dips nas Paralelas", muscleGroup: "chest", equipment: "bodyweight" },

  // Back
  { name: "Remada TBar na máquina", muscleGroup: "back", equipment: "machine" },
  { name: "Remada Unilateral na máquina", muscleGroup: "back", equipment: "machine" },
  { name: "Remada com Barra", muscleGroup: "back", equipment: "barbell" },
  { name: "Remada Unilateral com Halter", muscleGroup: "back", equipment: "dumbbell" },
  { name: "Elevações na Barra", muscleGroup: "back", equipment: "bodyweight" },
  { name: "Puxada à Frente", muscleGroup: "back", equipment: "cable" },
  { name: "Remada Sentada na Polia", muscleGroup: "back", equipment: "cable" },
  { name: "Remada em T", muscleGroup: "back", equipment: "machine" },
  { name: "Remada na Máquina com Apoio no Peito", muscleGroup: "back", equipment: "machine" },

  // Shoulders
  { name: "Press Militar com Barra", muscleGroup: "shoulders", equipment: "barbell" },
  { name: "Press de Ombros com Halteres", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Press de Ombros na Máquina", muscleGroup: "shoulders", equipment: "machine" },
  { name: "Elevações Laterais com Halteres", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Elevação Lateral na máquina", muscleGroup: "shoulders", equipment: "machine" },
  { name: "Peck Deck Invertido", muscleGroup: "shoulders", equipment: "machine" },
  { name: "Face Pull", muscleGroup: "shoulders", equipment: "cable" },
  { name: "Peck Deck Invertido na polia", muscleGroup: "shoulders", equipment: "cable" },

  // Biceps
  { name: "Curl com Barra", muscleGroup: "biceps", equipment: "barbell" },
  { name: "Curl com Halteres", muscleGroup: "biceps", equipment: "dumbbell" },
  { name: "Curl Martelo", muscleGroup: "biceps", equipment: "dumbbell" },
  { name: "Curl Inclinado com Halteres", muscleGroup: "biceps", equipment: "dumbbell" },
  { name: "Curl Scott na Máquina", muscleGroup: "biceps", equipment: "machine" },
  { name: "Curl na Polia", muscleGroup: "biceps", equipment: "cable" },

  // Triceps
  { name: "Supino com Pega Fechada", muscleGroup: "triceps", equipment: "barbell" },
  { name: "Extensão de Tríceps Deitado (Testa)", muscleGroup: "triceps", equipment: "barbell" },
  { name: "Extensão de Tríceps na Polia", muscleGroup: "triceps", equipment: "cable" },
  { name: "Extensão de Tríceps Acima da Cabeça na Polia", muscleGroup: "triceps", equipment: "cable" },
  { name: "Dips na Máquina", muscleGroup: "triceps", equipment: "machine" },

  // Quads
  { name: "Agachamento com Barra", muscleGroup: "quads", equipment: "barbell" },
  { name: "Agachamento Pendulo", muscleGroup: "quads", equipment: "machine" },
  { name: "Hack Squat", muscleGroup: "quads", equipment: "machine" },
  { name: "Prensa", muscleGroup: "quads", equipment: "machine" },
  { name: "Maquina Extensora", muscleGroup: "quads", equipment: "machine" },
  { name: "Agachamento Búlgaro na Smith", muscleGroup: "quads", equipment: "smith_machine" },
  { name: "Agachamento na Smith", muscleGroup: "quads", equipment: "smith_machine" },
  { name: "Máquina Adutora", muscleGroup: "quads", equipment: "machine" },

  // Hamstrings
  { name: "Curl Femoral de Pé", muscleGroup: "hamstrings", equipment: "machine" },
  { name: "Peso Morto Romeno com Halteres", muscleGroup: "hamstrings", equipment: "dumbbell" },
  { name: "Curl Femoral Deitado", muscleGroup: "hamstrings", equipment: "machine" },
  { name: "Curl Femoral Sentado", muscleGroup: "hamstrings", equipment: "machine" },

  // Glutes
  { name: "Hip Thrust com Barra", muscleGroup: "glutes", equipment: "barbell" },
  { name: "Hip Thrust na Máquina", muscleGroup: "glutes", equipment: "machine" },
  { name: "Máquina Abdutora", muscleGroup: "glutes", equipment: "machine" },
  { name: "Kickback de Glúteo na Polia", muscleGroup: "glutes", equipment: "cable" },

  // Calves
  { name: "Gémeos em Pé", muscleGroup: "calves", equipment: "machine" },
  { name: "Gémeos Sentado", muscleGroup: "calves", equipment: "machine" },
  { name: "Gémeos na Prensa", muscleGroup: "calves", equipment: "machine" },

  // Core
  { name: "Crunch na máquina", muscleGroup: "core", equipment: "machine" },
  { name: "Elevação de Pernas Suspenso", muscleGroup: "core", equipment: "bodyweight" },
  { name: "Crunch na Máquina", muscleGroup: "core", equipment: "machine" },
  { name: "Prancha", muscleGroup: "core", equipment: "bodyweight" },
];

// Inserts any built-in exercise that is missing. Safe to run on every app start:
// existing exercises (and user edits to custom ones) are never touched.
export async function seedExercises(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const exercise of BUILT_IN_EXERCISES) {
      await txn.runAsync(
        `INSERT INTO exercises (id, name, muscle_group, equipment, is_custom, is_archived)
         SELECT ?, ?, ?, ?, 0, 0
         WHERE NOT EXISTS (
           SELECT 1 FROM exercises WHERE is_custom = 0 AND name = ?
         )`,
        randomUUID(),
        exercise.name,
        exercise.muscleGroup,
        exercise.equipment,
        exercise.name,
      );
    }
  });
}
