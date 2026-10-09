import { normalizeSet, setTypeHasReps } from "@/lib/sets";
import type { PlannedSet } from "@/types/set";

// Values for the sets of an exercise when a workout starts from a routine:
// the routine's planned sets (which hold the values of the last workout,
// see mergeIntoPlanned), failure marks included.
export function buildWorkoutSets(planned: PlannedSet[]): PlannedSet[] {
  return planned.map(normalizeSet);
}

// New planned values for a routine exercise after a workout is finished.
// The routine keeps its structure; each planned set takes the values done in
// the same set (same position and type). Values left empty in the workout
// keep the planned ones. A back-off done to failure stays to failure, and one
// done with a number of reps takes that number instead. Warm-ups and feeders
// never get reps.
export function mergeIntoPlanned(
  planned: PlannedSet[],
  done: PlannedSet[],
): PlannedSet[] {
  return planned.map((plannedSet, index) => {
    const doneSet = done[index];
    const same = doneSet && doneSet.setType === plannedSet.setType;
    const weightKg = (same ? doneSet.weightKg : null) ?? plannedSet.weightKg;
    if (same && doneSet.toFailure) {
      return normalizeSet({
        ...plannedSet,
        weightKg,
        reps: null,
        toFailure: true,
      });
    }
    if (same && doneSet.reps !== null && setTypeHasReps(plannedSet.setType)) {
      return normalizeSet({
        ...plannedSet,
        weightKg,
        reps: doneSet.reps,
        toFailure: false,
      });
    }
    return normalizeSet({ ...plannedSet, weightKg });
  });
}
