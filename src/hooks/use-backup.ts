import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import { readAsStringAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback } from "react";
import { Alert } from "react-native";

import {
  getSchemaVersion,
  readAllTables,
  replaceData,
} from "@/db/repositories/backup";
import { getEventsFrom } from "@/db/repositories/planner";
import {
  backupFileName,
  createBackup,
  isBackupFileName,
  parseBackup,
  type Backup,
  type BackupPart,
} from "@/lib/backup";
import { toDateKey } from "@/lib/dates";
import { syncEventReminders } from "@/notifications/agenda-reminders";

// Reads a picked file's text. The picker gives a content:// URI (not copied:
// Expo Go cannot read its own copy). Ways of reading differ between phones and
// file providers, so a few are tried in turn.
async function readPickedFile(uri: string): Promise<string> {
  const readers = [
    () => readAsStringAsync(uri),
    () => new File(uri).text(),
    async () => (await fetch(uri)).text(),
  ];
  let lastError: unknown;
  for (const read of readers) {
    try {
      return await read();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// Export the chosen parts to a JSON file shared with any app (Drive,
// email...), and import parts of such a file back. `onImported` runs after a
// successful import.
export function useBackup(onImported: () => void) {
  const db = useSQLiteContext();

  const exportBackup = useCallback(
    async (parts: BackupPart[]) => {
      const backup = createBackup(
        await readAllTables(db),
        await getSchemaVersion(db),
        parts,
      );
      // Earlier exports would pile up in the cache (one per day exported).
      try {
        for (const item of new Directory(Paths.cache).list()) {
          if (item instanceof File && isBackupFileName(item.name)) {
            item.delete();
          }
        }
      } catch {
        // Not worth stopping the export for.
      }
      const file = new File(Paths.cache, backupFileName());
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(backup));

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          "Erro",
          "Não é possível partilhar ficheiros neste aparelho.",
        );
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: "application/json",
        dialogTitle: "Guardar backup do GymLog",
      });
    },
    [db],
  );

  // Asks for a file and checks it. null if cancelled or not a valid backup
  // (the reason is already shown).
  const pickBackup = useCallback(async (): Promise<Backup | null> => {
    const picked = await DocumentPicker.getDocumentAsync({
      // Any file: apps like WhatsApp do not save .json files as
      // application/json, so a narrower filter hides them. parseBackup checks
      // the content anyway.
      type: "*/*",
      copyToCacheDirectory: false,
    });
    if (picked.canceled) return null;

    const [asset] = picked.assets;
    let text: string;
    try {
      text = await readPickedFile(asset.uri);
    } catch (error) {
      Alert.alert(
        "Não foi possível ler o ficheiro",
        `${asset.name}\n\n${String(error)}`,
      );
      return null;
    }
    const parsed = parseBackup(text, await getSchemaVersion(db));
    if (!parsed.ok) {
      Alert.alert("Backup inválido", parsed.error);
      return null;
    }
    return parsed.backup;
  }, [db]);

  const importBackup = useCallback(
    async (backup: Backup, parts: BackupPart[]) => {
      try {
        await replaceData(db, backup, parts);
      } catch {
        Alert.alert(
          "Erro",
          "Não foi possível importar. Os dados da app não foram alterados.",
        );
        return;
      }
      // The imported events need their reminders on this phone.
      if (parts.includes("agenda")) {
        try {
          await syncEventReminders(
            await getEventsFrom(db, toDateKey(new Date())),
          );
        } catch {
          // Reminders are rebuilt at the next start-up anyway.
        }
      }
      Alert.alert("Backup importado", "Os dados foram restaurados.");
      onImported();
    },
    [db, onImported],
  );

  return { exportBackup, pickBackup, importBackup };
}
