import { StyleSheet, View } from "react-native";

import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

type Props = {
  value: number;
  max: number;
  color?: string;
};

// Thin horizontal bar; turns red when the value goes over the max.
export function ProgressBar({ value, max, color }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const over = max > 0 && value > max;
  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          {
            width: `${ratio * 100}%`,
            backgroundColor: over ? c.danger : (color ?? c.accent),
          },
        ]}
      />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    track: {
      height: 8,
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor: c.subtle,
    },
    fill: {
      height: "100%",
      borderRadius: 4,
    },
  });
}
