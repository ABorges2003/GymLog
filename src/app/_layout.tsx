import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";

import { AppHeader, headerTitleText } from "@/components/app-header";
import { AppStartup } from "@/components/app-startup";
import { DATABASE_NAME, initDatabase } from "@/db/database";
import { ThemeProvider } from "@/theme/theme";

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
      <AppStartup />
      <ThemeProvider>
        <Stack
          screenOptions={{
            header: ({ options, route, navigation, back }) => (
              <AppHeader
                title={headerTitleText(options, route.name)}
                onBack={back ? () => navigation.goBack() : undefined}
                isModal={options.presentation === "modal"}
                right={options.headerRight?.({ canGoBack: !!back })}
              />
            ),
          }}
        >
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
            name="diet/add"
            options={{ title: "Adicionar alimento", presentation: "modal" }}
          />
          <Stack.Screen name="exercises" options={{ title: "Exercícios" }} />
          <Stack.Screen
            name="export"
            options={{ title: "Exportar peso e dieta" }}
          />
          <Stack.Screen
            name="agenda/recurring/index"
            options={{ title: "Tarefas que se repetem" }}
          />
          <Stack.Screen
            name="agenda/recurring/new"
            options={{
              title: "Nova tarefa que se repete",
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="agenda/recurring/[id]"
            options={{ title: "Editar repetição", presentation: "modal" }}
          />
          <Stack.Screen
            name="agenda/new"
            options={{ title: "Novo evento", presentation: "modal" }}
          />
          <Stack.Screen
            name="agenda/edit/[id]"
            options={{ title: "Editar evento", presentation: "modal" }}
          />
          <Stack.Screen name="diet/meal" options={{ title: "Refeição" }} />
          <Stack.Screen
            name="diet/foods"
            options={{ title: "Os meus alimentos" }}
          />
          <Stack.Screen
            name="diet/food/new"
            options={{ title: "Novo alimento", presentation: "modal" }}
          />
          <Stack.Screen
            name="diet/food/edit/[id]"
            options={{ title: "Editar alimento", presentation: "modal" }}
          />
          <Stack.Screen
            name="diet/goals"
            options={{ title: "Objetivos", presentation: "modal" }}
          />
          <Stack.Screen name="phases" options={{ title: "Épocas" }} />
          <Stack.Screen name="phase/[id]" options={{ title: "Época" }} />
          <Stack.Screen
            name="phase/new"
            options={{ title: "Nova época", presentation: "modal" }}
          />
          <Stack.Screen
            name="phase/edit/[id]"
            options={{ title: "Editar época", presentation: "modal" }}
          />
          <Stack.Screen
            name="workout/add-exercises"
            options={{ title: "Adicionar exercícios", presentation: "modal" }}
          />
          <Stack.Screen
            name="workout/summary/[id]"
            options={{ title: "Resumo", presentation: "modal" }}
          />
        </Stack>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
