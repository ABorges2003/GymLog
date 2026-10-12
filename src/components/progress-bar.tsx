import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { EASE_OUT, radius } from "@/theme/tokens";

type Props = {
  value: number;
  max: number;
  color?: string;
};

// Thin horizontal bar; turns red when the value goes over the max. The fill
// is absolutely positioned with no children, so animating its width doesn't
// re-lay-out anything else.
export function ProgressBar({ value, max, color }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const over = max > 0 && value > max;
  return (
    <View style={styles.track}>
      <Animated.View
        style={[
          styles.fill,
          {
            width: `${ratio * 100}%`,
            backgroundColor: over ? c.danger : (color ?? c.primary),
            transitionProperty: "width",
            transitionDuration: 500,
            transitionTimingFunction: EASE_OUT,
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
      borderRadius: radius.full,
      overflow: "hidden",
      backgroundColor: c.subtle,
    },
    fill: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      borderRadius: radius.full,
    },
  });
}
