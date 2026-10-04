import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { formatBestSet, type ProgressChange } from "@/lib/progress";

const COLORS = {
  up: { text: "#15803d", background: "#dcfce7" },
  down: { text: "#b91c1c", background: "#fee2e2" },
};

type Props = {
  change: ProgressChange;
};

// "▲ Supino   100 kg × 6 → 102,5 kg × 5" in green, or ▼ in red.
export function ProgressChangeRow({ change }: Props) {
  const colors = COLORS[change.direction];
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

const styles = StyleSheet.create({
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
  },
  values: {
    fontSize: 15,
    color: "gray",
  },
  current: {
    fontWeight: "700",
  },
});
