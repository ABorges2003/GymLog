import { formatReps, formatWeight, setTypeHasReps } from "@/lib/sets";
import type { PlannedSet } from "@/types/set";

// The set used to measure an exercise in a workout: the heaviest top set
// (more reps wins a tie). Exercises without a filled-in top set use their
// heaviest set. Null if no set has a weight.
export type BestSet = {
  weightKg: number;
  reps: number | null;
};

export function bestSet(sets: PlannedSet[]): BestSet | null {
  const withWeight = sets.filter((set) => set.weightKg !== null);
  const tops = withWeight.filter((set) => set.setType === "top");
  const candidates = tops.length > 0 ? tops : withWeight;

  let best: BestSet | null = null;
  for (const set of candidates) {
    const current: BestSet = {
      weightKg: set.weightKg as number,
      reps: setTypeHasReps(set.setType) ? set.reps : null,
    };
    if (!best || compareBestSets(best, current) === "up") {
      best = current;
    }
  }
  return best;
}

export type Direction = "up" | "down" | "same";

// Progress from `previous` to `current`: more weight is up; with the same
// weight, more reps is up. Reps only count when both sets have them.
export function compareBestSets(
  previous: BestSet,
  current: BestSet,
): Direction {
  if (current.weightKg !== previous.weightKg) {
    return current.weightKg > previous.weightKg ? "up" : "down";
  }
  if (current.reps !== null && previous.reps !== null) {
    if (current.reps > previous.reps) return "up";
    if (current.reps < previous.reps) return "down";
  }
  return "same";
}

// "102,5 kg × 6", or "102,5 kg" without reps.
export function formatBestSet({ weightKg, reps }: BestSet): string {
  return reps === null
    ? `${formatWeight(weightKg)} kg`
    : `${formatWeight(weightKg)} kg × ${formatReps(reps)}`;
}

// One exercise done in a finished workout.
export type ExerciseEntry = {
  workoutId: string;
  startedAt: string;
  routineName: string | null;
  exerciseId: string;
  exerciseName: string;
  // Values done.
  sets: PlannedSet[];
  // Values the sets started with (from the routine); empty values for
  // workouts logged before they were stored.
  plannedSets: PlannedSet[];
};

export type ProgressChange = {
  exerciseId: string;
  exerciseName: string;
  direction: "up" | "down";
  previous: BestSet;
  current: BestSet;
};

// The changes of one workout.
export type ProgressGroup = {
  workoutId: string;
  startedAt: string;
  routineName: string | null;
  changes: ProgressChange[];
};

// Compares each exercise with the previous time it was done (in any routine);
// the first time, with the values the workout started with. Keeps only the
// workouts with progressions or regressions, newest first.
export function buildProgressHistory(
  entries: ExerciseEntry[],
): ProgressGroup[] {
  const chronological = [...entries].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );
  const lastBest = new Map<string, BestSet>();
  const groups = new Map<string, ProgressGroup>();

  for (const entry of chronological) {
    const current = bestSet(entry.sets);
    if (!current) continue;

    const previous =
      lastBest.get(entry.exerciseId) ?? bestSet(entry.plannedSets);
    lastBest.set(entry.exerciseId, current);
    if (!previous) continue;

    const direction = compareBestSets(previous, current);
    if (direction === "same") continue;

    const group = groups.get(entry.workoutId) ?? {
      workoutId: entry.workoutId,
      startedAt: entry.startedAt,
      routineName: entry.routineName,
      changes: [],
    };
    group.changes.push({
      exerciseId: entry.exerciseId,
      exerciseName: entry.exerciseName,
      direction,
      previous,
      current,
    });
    groups.set(entry.workoutId, group);
  }

  return [...groups.values()].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
}

export type WorkoutSummary = {
  exerciseCount: number;
  // Sets with a weight filled in.
  setCount: number;
  // Sum of weight × reps of the sets that have both (top sets and back-offs).
  volumeKg: number;
};

export function summarizeWorkout(
  exercises: { sets: PlannedSet[] }[],
): WorkoutSummary {
  const sets = exercises.flatMap((exercise) => exercise.sets);
  return {
    exerciseCount: exercises.length,
    setCount: sets.filter((set) => set.weightKg !== null).length,
    volumeKg: sets.reduce(
      (total, set) =>
        set.weightKg !== null &&
        set.reps !== null &&
        setTypeHasReps(set.setType)
          ? total + set.weightKg * set.reps
          : total,
      0,
    ),
  };
}

// Whole kilograms with a space every three digits: 12340.5 -> "12 341 kg".
export function formatVolume(volumeKg: number): string {
  const digits = String(Math.round(volumeKg));
  return `${digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} kg`;
}

// One workout in the progress of a single exercise.
export type ProgressPoint = {
  workoutId: string;
  startedAt: string;
  best: BestSet;
  // Compared with the previous point; null for the first one.
  direction: Direction | null;
};

// Best set of an exercise in each finished workout, oldest first. Workouts
// where no set has a weight are left out.
export function buildExerciseProgress(
  entries: ExerciseEntry[],
  exerciseId: string,
): ProgressPoint[] {
  const points: ProgressPoint[] = [];
  const chronological = entries
    .filter((entry) => entry.exerciseId === exerciseId)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  for (const entry of chronological) {
    const best = bestSet(entry.sets);
    if (!best) continue;
    const previous = points.at(-1);
    points.push({
      workoutId: entry.workoutId,
      startedAt: entry.startedAt,
      best,
      direction: previous ? compareBestSets(previous.best, best) : null,
    });
  }
  return points;
}

// Y axis for a weight chart: round steps around the values, with one step of
// room below and above, so small changes (100 -> 102.5 kg) are visible.
export type ChartScale = {
  // Value at the bottom of the axis.
  offset: number;
  step: number;
  sections: number;
};

const NICE_STEPS = [1, 2.5, 5, 10, 20, 25, 50, 100];

export function chartScale(values: number[]): ChartScale {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step =
    NICE_STEPS.find((candidate) => (max - min) / candidate <= 4) ??
    NICE_STEPS[NICE_STEPS.length - 1];
  const offset = Math.max(0, Math.floor(min / step) * step - step);
  const top = Math.ceil(max / step) * step + step;
  return { offset, step, sections: Math.round((top - offset) / step) };
}

// One progression or regression of a single exercise.
export type ExerciseChange = {
  workoutId: string;
  startedAt: string;
  direction: "up" | "down";
  previous: BestSet;
  current: BestSet;
};

// The progressions and regressions of one exercise, newest first.
export function buildExerciseChanges(
  entries: ExerciseEntry[],
  exerciseId: string,
): ExerciseChange[] {
  return buildProgressHistory(
    entries.filter((entry) => entry.exerciseId === exerciseId),
  ).flatMap((group) =>
    group.changes.map((change) => ({
      workoutId: group.workoutId,
      startedAt: group.startedAt,
      direction: change.direction,
      previous: change.previous,
      current: change.current,
    })),
  );
}

// Ids of the exercises with at least one progression or regression.
export function exercisesWithChanges(entries: ExerciseEntry[]): Set<string> {
  return new Set(
    buildProgressHistory(entries).flatMap((group) =>
      group.changes.map((change) => change.exerciseId),
    ),
  );
}
