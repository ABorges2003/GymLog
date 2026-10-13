import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { AppHeader, headerTitleText } from "@/components/app-header";
import { useColors } from "@/theme/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

// Outline in the tab bar, filled in the header circle.
const TAB_ICONS: Record<string, { tab: IconName; header: IconName }> = {
  index: { tab: "barbell-outline", header: "barbell" },
  diet: { tab: "nutrition-outline", header: "nutrition" },
  "body-weight": { tab: "scale-outline", header: "scale" },
  agenda: { tab: "calendar-outline", header: "calendar" },
  settings: { tab: "settings-outline", header: "settings" },
};

function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        header: ({ options }) => (
          <AppHeader
            title={headerTitleText(options, route.name)}
            icon={TAB_ICONS[route.name]?.header}
            right={options.headerRight?.({
              tintColor: c.text,
              canGoBack: false,
            })}
          />
        ),
        tabBarInactiveTintColor: c.textMuted,
      })}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Treino", tabBarIcon: tabIcon(TAB_ICONS.index.tab) }}
      />
      <Tabs.Screen
        name="diet"
        options={{ title: "Dieta", tabBarIcon: tabIcon(TAB_ICONS.diet.tab) }}
      />
      <Tabs.Screen
        name="body-weight"
        options={{
          title: "Peso",
          tabBarIcon: tabIcon(TAB_ICONS["body-weight"].tab),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: "Agenda",
          tabBarIcon: tabIcon(TAB_ICONS.agenda.tab),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Definições",
          tabBarIcon: tabIcon(TAB_ICONS.settings.tab),
        }}
      />
    </Tabs>
  );
}
