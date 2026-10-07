import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { formatBestSet, type ProgressChange } from "@/lib/progress";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

type Props = {
  change: ProgressChange;
};

// "▲ Supino   100 kg × 6 → 102,5 kg × 5" in green, or ▼ in red.
export function ProgressChangeRow({ change }: Props) {
  const styles = useThemedStyles(createStyles);
  const c = useColors();
  const colors =
    change.direction === "up"
      ? { text: c.success, background: c.successBg }
      : { text: c.danger, background: c.dangerBg };
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.background }]}>
        <Ionicons
          name={change.direction === "up" ? "arrow-up" : "arrow-down"}
          size={18}
          color={colors.text}
        />
      </View>
      <View style={styles.text}>
        <Text style={styles.name}>{change.exerciseName}</Text>
        <Text style={styles.values}>
          {formatBestSet(change.previous)}
          {"  →  "}
          <Text style={[styles.current, { color: colors.text }]}>
            {formatBestSet(change.current)}
          </Text>
        </Text>
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 56,
    },
    icon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    text: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    values: {
      fontSize: 15,
      color: c.textMuted,
    },
    current: {
      fontWeight: "700",
    },
  });
}
