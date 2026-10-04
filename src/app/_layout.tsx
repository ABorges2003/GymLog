import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";

import { DATABASE_NAME, initDatabase } from "@/db/database";

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
      <Stack>
        {/* The tabs have their own header, so hide the stack one. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="exercise/new"
          options={{ title: "Novo exercício", presentation: "modal" }}
        />
        <Stack.Screen
          name="exercise/edit/[id]"
          options={{ title: "Editar exercício", presentation: "modal" }}
        />
        <Stack.Screen
          name="routine/new"
          options={{ title: "Nova rotina", presentation: "modal" }}
        />
        <Stack.Screen
          name="routine/rename/[id]"
          options={{ title: "Mudar nome", presentation: "modal" }}
        />
        <Stack.Screen
          name="routine/add-exercises/[id]"
          options={{ title: "Adicionar exercícios", presentation: "modal" }}
        />
        <Stack.Screen
          name="routine/sets/[id]"
          options={{ title: "Séries", presentation: "modal" }}
        />
        <Stack.Screen
          name="workout/summary/[id]"
          options={{ title: "Resumo", presentation: "modal" }}
        />
      </Stack>
    </SQLiteProvider>
  );
}
