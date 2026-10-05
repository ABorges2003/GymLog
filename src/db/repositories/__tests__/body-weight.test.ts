import type { SQLiteDatabase } from "expo-sqlite";

import {
  deleteBodyWeight,
  getBodyWeightEntries,
  saveBodyWeight,
} from "@/db/repositories/body-weight";
import { createTestDatabase } from "@/test-utils/sqlite";

// expo-crypto is a native module; use Node's UUIDs in tests.
jest.mock("expo-crypto", () => ({
  randomUUID: () => require("node:crypto").randomUUID(),
}));

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createTestDatabase();
});

describe("body weight repository", () => {
  it("saves entries and lists them oldest first", async () => {
    await saveBodyWeight(db, "2026-10-05", 78.4);
    await saveBodyWeight(db, "2026-10-03", 79);

    expect(await getBodyWeightEntries(db)).toEqual([
      { date: "2026-10-03", weightKg: 79 },
      { date: "2026-10-05", weightKg: 78.4 },
    ]);
  });

  it("keeps one entry per day: saving the same day updates it", async () => {
    await saveBodyWeight(db, "2026-10-05", 78.4);
    await saveBodyWeight(db, "2026-10-05", 78.1);

    expect(await getBodyWeightEntries(db)).toEqual([
      { date: "2026-10-05", weightKg: 78.1 },
    ]);
  });

  it("deletes a day", async () => {
    await saveBodyWeight(db, "2026-10-04", 78.6);
    await saveBodyWeight(db, "2026-10-05", 78.4);

    await deleteBodyWeight(db, "2026-10-04");

    expect(await getBodyWeightEntries(db)).toEqual([
      { date: "2026-10-05", weightKg: 78.4 },
    ]);
  });

  it("rejects impossible weights", async () => {
    await expect(saveBodyWeight(db, "2026-10-05", 0)).rejects.toThrow();
  });
});
