import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getDatabaseInfo,
  getExerciseCountsByMuscleGroup,
  getTableInfo,
  type DatabaseInfo,
  type MuscleGroupCount,
  type TableInfo,
} from "@/db/repositories/diagnostics";
import { FilterChips, type ChipOption } from "@/components/filter-chips";
import { useBackup } from "@/hooks/use-backup";
import { MUSCLE_GROUP_LABELS } from "@/lib/labels";
import type { ThemeColors } from "@/theme/colors";
import {
  useColors,
  useTheme,
  useThemedStyles,
  type ThemeMode,
} from "@/theme/theme";

const THEME_OPTIONS: ChipOption<ThemeMode>[] = [
  { value: "system", label: "Automático" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

export default function SettingsScreen() {
  const { mode, setMode } = useTheme();
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const [info, setInfo] = useState<DatabaseInfo | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [exerciseCounts, setExerciseCounts] = useState<MuscleGroupCount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);

  const loadDiagnostics = useCallback(() => {
    Promise.all([
      getDatabaseInfo(db),
      getTableInfo(db),
      getExerciseCountsByMuscleGroup(db),
    ])
      .then(([dbInfo, tableInfo, counts]) => {
        setInfo(dbInfo);
        setTables(tableInfo);
        setExerciseCounts(counts);
      })
      .catch((e: unknown) => setError(String(e)));
  }, [db]);

  useFocusEffect(loadDiagnostics);

  const { exportBackup, importBackup } = useBackup(loadDiagnostics);

  async function run(kind: "export" | "import", action: () => Promise<void>) {
    setBusy(kind);
    try {
      await action();
    } catch (error) {
      // Show the real error: these failures depend on the phone and the app
      // the file came from, so the details help to fix them.
      Alert.alert(
        kind === "export"
          ? "Não foi possível exportar o backup"
          : "Não foi possível importar o backup",
        String(error),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Aparência</Text>
        <FilterChips
          options={THEME_OPTIONS}
          selected={mode}
          onSelect={(next) => {
            setMode(next).catch(() =>
              Alert.alert("Erro", "Não foi possível guardar a aparência."),
            );
          }}
          wrap
        />
        <Text style={styles.hint}>
          Automático segue o modo claro/escuro do telemóvel.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Backup</Text>
        <Text style={styles.hint}>
          Guarda todos os teus exercícios, rotinas e treinos num ficheiro
          (Google Drive, email...). Num telemóvel novo ou depois de reinstalar,
          importa esse ficheiro para recuperar tudo.
        </Text>

        <Pressable
          onPress={() => run("export", exportBackup)}
          disabled={busy !== null}
          style={[styles.button, styles.primaryButton, busy && styles.disabled]}
          accessibilityRole="button"
        >
          {busy === "export" ? (
            <ActivityIndicator color={c.onPrimary} />
          ) : (
            <>
              <Ionicons name="share-outline" size={22} color={c.onPrimary} />
              <Text style={[styles.buttonText, styles.primaryText]}>
                Exportar backup
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => run("import", importBackup)}
          disabled={busy !== null}
          style={[
            styles.button,
            styles.secondaryButton,
            busy && styles.disabled,
          ]}
          accessibilityRole="button"
        >
          {busy === "import" ? (
            <ActivityIndicator />
          ) : (
            <>
              <Ionicons name="download-outline" size={22} color={c.text} />
              <Text style={styles.buttonText}>Importar backup</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Base de dados</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        {!info && !error && <ActivityIndicator />}
        {info && (
          <>
            <Text style={styles.row}>
              Versão do schema: {info.schemaVersion}
            </Text>
            <Text style={styles.row}>
              Versão do SQLite: {info.sqliteVersion}
            </Text>
            <Text style={styles.row}>
              Chaves estrangeiras: {info.foreignKeysEnabled ? "ON" : "OFF"}
            </Text>

            <Text style={styles.subtitle}>Tabelas</Text>
            {tables.map((table) => (
              <Text
                key={table.name}
                style={[styles.row, !table.exists && styles.error]}
              >
                {table.exists ? "✓" : "✗"} {table.name} ({table.rowCount}{" "}
                linhas)
              </Text>
            ))}

            <Text style={styles.subtitle}>Exercícios por grupo muscular</Text>
            {exerciseCounts.map((group) => (
              <Text key={group.muscleGroup} style={styles.row}>
                {MUSCLE_GROUP_LABELS[group.muscleGroup]}: {group.count}
              </Text>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 16,
      padding: 16,
    },
    card: {
      gap: 10,
      padding: 16,
      borderRadius: 12,
      backgroundColor: c.card,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: c.text,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: "bold",
      marginTop: 8,
      color: c.text,
    },
    hint: {
      fontSize: 15,
      color: c.textMuted,
      lineHeight: 21,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 52,
      borderRadius: 12,
    },
    primaryButton: {
      backgroundColor: c.primary,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: c.border,
    },
    buttonText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.text,
    },
    primaryText: {
      color: c.onPrimary,
    },
    disabled: {
      opacity: 0.6,
    },
    row: {
      fontSize: 15,
      color: c.text,
    },
    error: {
      fontSize: 15,
      color: c.danger,
    },
  });
}
