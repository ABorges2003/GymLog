import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { StyleSheet } from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius } from "@/theme/tokens";

type IconName = ComponentProps<typeof Ionicons>["name"];

const SIZE = 40;

type Props = {
  icon: IconName;
  // Read by screen readers (the button has no text).
  label: string;
  onPress?: () => void;
};

// Round icon button for the right side of the app header.
export function HeaderIconButton({ icon, label, onPress }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <PressableScale
      onPress={onPress}
      style={styles.button}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={c.onPrimarySoft} />
    </PressableScale>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    button: {
      width: SIZE,
      height: SIZE,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
  });
}
