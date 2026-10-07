import type { SQLiteDatabase } from "expo-sqlite";

import { getSetting, setSetting } from "@/db/repositories/settings";
import { createTestDatabase } from "@/test-utils/sqlite";

let db: SQLiteDatabase;

beforeEach(async () => {
  db = await createTestDatabase();
});

describe("settings repository", () => {
  it("saves, updates and removes a setting", async () => {
    expect(await getSetting(db, "body_weight_goal_kg")).toBeNull();

    await setSetting(db, "body_weight_goal_kg", "75");
    await setSetting(db, "body_weight_goal_kg", "74.5");
    expect(await getSetting(db, "body_weight_goal_kg")).toBe("74.5");

    await setSetting(db, "body_weight_goal_kg", null);
    expect(await getSetting(db, "body_weight_goal_kg")).toBeNull();
  });
});
