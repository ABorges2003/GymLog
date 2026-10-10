import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatElapsed } from "@/lib/dates";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

type Props = {
  // When the workout started (ISO 8601).
  startedAt: string;
};

// How long the workout has been going, updated every second. A component of
// its own so only it re-renders, not the workout and its inputs.
export function WorkoutTimer({ startedAt }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = formatElapsed(startedAt, now);
  return (
    <View
      style={styles.timer}
      accessible
      accessibilityLabel={`Tempo de treino: ${elapsed}`}
    >
      <Ionicons name="stopwatch-outline" size={18} color={c.accent} />
      <Text style={styles.text}>{elapsed}</Text>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    timer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    text: {
      fontSize: 17,
      fontWeight: "700",
      // Digits of the same width, so the text does not jump every second.
      fontVariant: ["tabular-nums"],
      color: c.accent,
    },
  });
}
