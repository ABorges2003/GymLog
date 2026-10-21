import { normalizeSet, setTypeHasReps } from "@/lib/sets";
import type { PlannedSet } from "@/types/set";

// Values for the sets of an exercise when a workout starts from a routine:
// the routine's planned sets (which hold the values of the last workout,
// see mergeIntoPlanned), failure marks included.
export function buildWorkoutSets(planned: PlannedSet[]): PlannedSet[] {
  return planned.map(normalizeSet);
}

// Whether a routine exercise has nothing planned yet (e.g. just added to the
// routine): no weight, reps or failure mark in any set.
export function isBlankPlan(planned: PlannedSet[]): boolean {
  return planned.every(
    (set) => set.weightKg === null && set.reps === null && !set.toFailure,
  );
}

// Whether any set of a workout exercise was filled in.
export function hasValues(done: PlannedSet[]): boolean {
  return done.some(
    (set) => set.weightKg !== null || set.reps !== null || set.toFailure,
  );
}

// Index in `done` of the set that matches planned set `index`: the one in
// the same position if it has the same type; otherwise the done set of that
// type with the same number among its type (the 2nd feeder with the 2nd
// feeder...), so deleting or changing one set in the workout doesn't shift
// all the following ones. -1 when there is none.
function matchingDoneIndex(
  planned: PlannedSet[],
  done: PlannedSet[],
  index: number,
): number {
  const setType = planned[index].setType;
  if (done[index]?.setType === setType) return index;
  const nth = planned
    .slice(0, index)
    .filter((set) => set.setType === setType).length;
  const sameType = done
    .map((set, doneIndex) => ({ set, doneIndex }))
    .filter(({ set }) => set.setType === setType);
  const candidate = sameType[nth]?.doneIndex ?? -1;
  // A set already matched by position belongs to that planned set.
  if (candidate === -1) return -1;
  return planned[candidate]?.setType === setType ? -1 : candidate;
}

// New planned values for a routine exercise after a workout is finished.
// The routine keeps its structure; each planned set takes the values done in
// the matching set (see matchingDoneIndex). Values left empty in the workout
// keep the planned ones. A back-off done to failure stays to failure, and one
// done with a number of reps takes that number instead. A top set keeps the
// reps done with help of the workout (none if they were removed). Warm-ups
// and feeders never get reps.
export function mergeIntoPlanned(
  planned: PlannedSet[],
  done: PlannedSet[],
): PlannedSet[] {
  return planned.map((plannedSet, index) => {
    const doneIndex = matchingDoneIndex(planned, done, index);
    const doneSet = doneIndex === -1 ? undefined : done[doneIndex];
    const same = doneSet !== undefined;
    const weightKg = doneSet?.weightKg ?? plannedSet.weightKg;
    const assistedReps = same
      ? (doneSet.assistedReps ?? null)
      : plannedSet.assistedReps;
    if (same && doneSet.toFailure) {
      return normalizeSet({
        ...plannedSet,
        assistedReps,
        weightKg,
        reps: null,
        toFailure: true,
      });
    }
    if (same && doneSet.reps !== null && setTypeHasReps(plannedSet.setType)) {
      return normalizeSet({
        ...plannedSet,
        assistedReps,
        weightKg,
        reps: doneSet.reps,
        toFailure: false,
      });
    }
    return normalizeSet({ ...plannedSet, assistedReps, weightKg });
  });
}

// What the routine exercise becomes after a workout is finished: when it had
// nothing planned yet (e.g. an exercise added during this workout), it takes
// the sets of the workout as they were done, structure included; otherwise
// the values are merged into its structure (mergeIntoPlanned).
export function planAfterWorkout(
  planned: PlannedSet[],
  done: PlannedSet[],
): { sets: PlannedSet[]; replaceStructure: boolean } {
  if (isBlankPlan(planned) && hasValues(done)) {
    return { sets: done.map(normalizeSet), replaceStructure: true };
  }
  return { sets: mergeIntoPlanned(planned, done), replaceStructure: false };
}

// Whether a workout exercise has the same sets as its routine exercise: same
// number of sets, with the same type in each position.
export function sameStructure(
  planned: PlannedSet[],
  done: PlannedSet[],
): boolean {
  return (
    planned.length === done.length &&
    planned.every((set, index) => set.setType === done[index].setType)
  );
}

// The routine sets when the user keeps the structure of the workout (sets
// added, removed or with another type): the sets as they were done. A value
// left empty in the workout keeps the routine's one when the set in that
// position has the same type.
export function structureFromWorkout(
  planned: PlannedSet[],
  done: PlannedSet[],
): PlannedSet[] {
  return done.map((doneSet, index) => {
    const plannedSet = planned[index];
    const set: PlannedSet = {
      setType: doneSet.setType,
      reps: doneSet.reps,
      weightKg: doneSet.weightKg,
      toFailure: doneSet.toFailure,
      assistedReps: doneSet.assistedReps ?? null,
    };
    if (plannedSet?.setType !== doneSet.setType) return normalizeSet(set);
    return normalizeSet({
      ...set,
      weightKg: set.weightKg ?? plannedSet.weightKg,
      reps: set.reps === null && !set.toFailure ? plannedSet.reps : set.reps,
      toFailure:
        set.reps === null && !set.toFailure
          ? plannedSet.toFailure
          : set.toFailure,
    });
  });
}
