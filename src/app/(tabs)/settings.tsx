import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import {
  getBuiltInExerciseCounts,
  getDatabaseInfo,
  getTableInfo,
  type DatabaseInfo,
  type MuscleGroupCount,
  type TableInfo,
} from "@/db/repositories/diagnostics";
import { MUSCLE_GROUP_LABELS } from "@/lib/labels";

// For now this only shows database diagnostics (Phase 1).
export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [info, setInfo] = useState<DatabaseInfo | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [exerciseCounts, setExerciseCounts] = useState<MuscleGroupCount[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDatabaseInfo(db),
      getTableInfo(db),
      getBuiltInExerciseCounts(db),
    ])
      .then(([dbInfo, tableInfo, counts]) => {
        setInfo(dbInfo);
        setTables(tableInfo);
        setExerciseCounts(counts);
      })
      .catch((e: unknown) => setError(String(e)));
  }, [db]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Base de dados</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {!info && !error && <Text style={styles.row}>A carregar...</Text>}
      {info && (
        <>
          <Text style={styles.row}>Versão do SQLite: {info.sqliteVersion}</Text>
          <Text style={styles.row}>Versão do schema: {info.schemaVersion}</Text>
          <Text style={styles.row}>
            Chaves estrangeiras: {info.foreignKeysEnabled ? "ON" : "OFF"}
          </Text>
          <Text style={styles.row}>Modo do journal: {info.journalMode}</Text>

          <Text style={styles.title}>Tabelas</Text>
          {tables.map((table) => (
            <Text
              key={table.name}
              style={[styles.row, !table.exists && styles.error]}
            >
              {table.exists ? "✓" : "✗"} {table.name} ({table.rowCount} linhas)
            </Text>
          ))}

          <Text style={styles.title}>Exercícios pré-definidos</Text>
          {exerciseCounts.map((group) => (
            <Text key={group.muscleGroup} style={styles.row}>
              {MUSCLE_GROUP_LABELS[group.muscleGroup]}: {group.count}
            </Text>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    fontSize: 18,
  },
  error: {
    fontSize: 16,
    color: "red",
  },
});
