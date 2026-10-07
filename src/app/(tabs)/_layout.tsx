import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{ title: "Treino", tabBarIcon: tabIcon("barbell-outline") }}
      />
      <Tabs.Screen
        name="diet"
        options={{ title: "Dieta", tabBarIcon: tabIcon("nutrition-outline") }}
      />
      <Tabs.Screen
        name="body-weight"
        options={{ title: "Peso", tabBarIcon: tabIcon("scale-outline") }}
      />
      <Tabs.Screen
        name="exercises"
        options={{ title: "Exercícios", tabBarIcon: tabIcon("list-outline") }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Definições",
          tabBarIcon: tabIcon("settings-outline"),
        }}
      />
    </Tabs>
  );
}
