import type { SQLiteDatabase } from "expo-sqlite";

// Keys of the app_settings table.
export type SettingKey = "body_weight_goal_kg" | "theme";

export async function getSetting(
  db: SQLiteDatabase,
  key: SettingKey,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = ?",
    key,
  );
  return row?.value ?? null;
}

// Saves a setting; null removes it.
export async function setSetting(
  db: SQLiteDatabase,
  key: SettingKey,
  value: string | null,
): Promise<void> {
  if (value === null) {
    await db.runAsync("DELETE FROM app_settings WHERE key = ?", key);
    return;
  }
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}
