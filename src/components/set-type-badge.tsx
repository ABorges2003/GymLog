import { StyleSheet, Text } from "react-native";
import Animated from "react-native-reanimated";

import { SET_TYPE_COLORS, SET_TYPE_SHORT_LABELS } from "@/lib/sets";
import type { SetType } from "@/types/set";
import { EASE_OUT, motion } from "@/theme/tokens";

type Props = {
  setType: SetType;
  size?: number;
};

// Coloured letter for a set type: W, F, T or B. The colour fades when the
// type changes, so tapping through the types reads as one control.
export function SetTypeBadge({ setType, size = 28 }: Props) {
  return (
    <Animated.View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 4,
          backgroundColor: SET_TYPE_COLORS[setType],
          transitionProperty: "backgroundColor",
          transitionDuration: motion.state,
          transitionTimingFunction: EASE_OUT,
        },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.5 }]}>
        {SET_TYPE_SHORT_LABELS[setType]}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    color: "white",
    fontWeight: "700",
  },
});
