import type { SQLiteDatabase } from "expo-sqlite";

import {
  getBodyWeightEntries,
  saveBodyWeight,
} from "@/db/repositories/body-weight";
import {
  createPhase,
  deletePhase,
  getPhaseById,
  getPhases,
  updatePhase,
} from "@/db/repositories/body-weight-phases";
import { createTestDatabase } from "@/test-utils/sqlite";

// expo-crypto is a native module; use Node's UUIDs in tests.
jest.mock("expo-crypto", () => ({
  randomUUID: () => require("node:crypto").randomUUID(),
}));

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createTestDatabase();
});

describe("body weight phases repository", () => {
  it("creates, lists (newest first), edits and deletes phases", async () => {
    const cut = await createPhase(db, {
      name: "Cut verão",
      startDate: "2026-04-01",
      endDate: "2026-06-30",
    });
    const bulk = await createPhase(db, {
      name: "Bulk",
      startDate: "2026-10-01",
      endDate: null,
    });
    expect((await getPhases(db)).map((phase) => phase.name)).toEqual([
      "Bulk",
      "Cut verão",
    ]);

    await updatePhase(db, bulk, {
      name: "Bulk inverno",
      startDate: "2026-10-01",
      endDate: "2026-12-23",
    });
    expect(await getPhaseById(db, bulk)).toEqual({
      id: bulk,
      name: "Bulk inverno",
      startDate: "2026-10-01",
      endDate: "2026-12-23",
    });

    await deletePhase(db, cut);
    expect(await getPhaseById(db, cut)).toBeNull();
    expect(await getPhases(db)).toHaveLength(1);
  });

  it("rejects an end before the start", async () => {
    await expect(
      createPhase(db, {
        name: "Errada",
        startDate: "2026-10-10",
        endDate: "2026-10-01",
      }),
    ).rejects.toThrow();
  });

  it("keeps the body weight entries when a phase is deleted", async () => {
    await saveBodyWeight(db, "2026-10-02", 72);
    const id = await createPhase(db, {
      name: "Bulk",
      startDate: "2026-10-01",
      endDate: null,
    });
    await deletePhase(db, id);
    expect(await getBodyWeightEntries(db)).toHaveLength(1);
  });
});
