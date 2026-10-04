import { StyleSheet, Text, View } from "react-native";

import { SET_TYPE_COLORS, SET_TYPE_SHORT_LABELS } from "@/lib/sets";
import type { SetType } from "@/types/set";

type Props = {
  setType: SetType;
  size?: number;
};

// Coloured letter for a set type: W, F, T or B.
export function SetTypeBadge({ setType, size = 28 }: Props) {
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 4,
          backgroundColor: SET_TYPE_COLORS[setType],
        },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.5 }]}>
        {SET_TYPE_SHORT_LABELS[setType]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    color: "white",
    fontWeight: "bold",
  },
});
