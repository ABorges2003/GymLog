import { setTypeHasReps } from "@/lib/sets";
import type { PlannedSet } from "@/types/set";

// Values for the sets of an exercise when a workout starts from a routine:
// the routine's planned sets (which hold the values of the last workout,
// see mergeIntoPlanned). Warm-ups and feeders never get reps.
export function buildWorkoutSets(planned: PlannedSet[]): PlannedSet[] {
  return planned.map((set) => ({
    setType: set.setType,
    reps: setTypeHasReps(set.setType) ? set.reps : null,
    weightKg: set.weightKg,
  }));
}

// New planned values for a routine exercise after a workout is finished.
// The routine keeps its structure; each planned set takes the values done in
// the same set (same position and type). Values left empty in the workout
// keep the planned ones. Warm-ups and feeders never get reps.
export function mergeIntoPlanned(
  planned: PlannedSet[],
  done: PlannedSet[],
): PlannedSet[] {
  return planned.map((plannedSet, index) => {
    const doneSet = done[index];
    const same = doneSet && doneSet.setType === plannedSet.setType;
    return {
      setType: plannedSet.setType,
      reps: setTypeHasReps(plannedSet.setType)
        ? ((same ? doneSet.reps : null) ?? plannedSet.reps)
        : null,
      weightKg: (same ? doneSet.weightKg : null) ?? plannedSet.weightKg,
    };
  });
}
