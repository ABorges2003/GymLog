import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/pressable-scale";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius, shadows, spacing, type } from "@/theme/tokens";

type IconName = ComponentProps<typeof Ionicons>["name"];

const CIRCLE_SIZE = 40;

// The title a navigator would show: headerTitle when it is text, else title.
export function headerTitleText(
  options: { title?: string; headerTitle?: unknown },
  routeName: string,
): string {
  if (typeof options.headerTitle === "string") return options.headerTitle;
  return options.title ?? routeName;
}

type Props = {
  title: string;
  // Tab screens: the tab's icon in a filled circle.
  icon?: IconName;
  // Stack screens: a back (or close, for modals) button in the circle.
  onBack?: () => void;
  isModal?: boolean;
  // Header actions (timer, edit button...).
  right?: ReactNode;
};

// Header used by every screen: a rounded bar floating on the screen
// background, with a circle on the left and the title next to it.
export function AppHeader({ title, icon, onBack, isModal, right }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.bar}>
        {onBack ? (
          <PressableScale
            onPress={onBack}
            style={[styles.circle, styles.backCircle]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={isModal ? "Fechar" : "Voltar"}
          >
            <Ionicons
              name={isModal ? "close" : "arrow-back"}
              size={22}
              color={c.onPrimarySoft}
            />
          </PressableScale>
        ) : icon ? (
          <View style={styles.circle}>
            <Ionicons name={icon} size={20} color={c.onPrimary} />
          </View>
        ) : null}
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: c.background,
    },
    bar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 56,
      paddingLeft: spacing.sm,
      paddingRight: spacing.md,
      borderRadius: radius.full,
      backgroundColor: c.card,
      boxShadow: shadows.card,
    },
    circle: {
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      borderRadius: CIRCLE_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primary,
    },
    backCircle: {
      backgroundColor: c.primarySoft,
    },
    title: {
      ...type.headline,
      flex: 1,
      fontSize: 20,
      color: c.text,
    },
    right: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
  });
}
