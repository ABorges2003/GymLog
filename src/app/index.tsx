import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import {
  getDatabaseInfo,
  getTableInfo,
  type DatabaseInfo,
  type TableInfo,
} from "@/db/repositories/diagnostics";

// Temporary screen to check the database setup (Phase 1).
export default function Index() {
  const db = useSQLiteContext();
  const [info, setInfo] = useState<DatabaseInfo | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDatabaseInfo(db), getTableInfo(db)])
      .then(([dbInfo, tableInfo]) => {
        setInfo(dbInfo);
        setTables(tableInfo);
      })
      .catch((e: unknown) => setError(String(e)));
  }, [db]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Database</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {!info && !error && <Text style={styles.row}>Loading...</Text>}
      {info && (
        <>
          <Text style={styles.row}>SQLite version: {info.sqliteVersion}</Text>
          <Text style={styles.row}>Schema version: {info.schemaVersion}</Text>
          <Text style={styles.row}>
            Foreign keys: {info.foreignKeysEnabled ? "ON" : "OFF"}
          </Text>
          <Text style={styles.row}>Journal mode: {info.journalMode}</Text>

          <Text style={styles.title}>Tables</Text>
          {tables.map((table) => (
            <Text
              key={table.name}
              style={[styles.row, !table.exists && styles.error]}
            >
              {table.exists ? "✓" : "✗"} {table.name} ({table.rowCount} rows)
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
