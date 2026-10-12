import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { usePhases } from "@/hooks/use-phases";
import {
  PHASE_STATUS_LABELS,
  formatPhaseDates,
  phaseStatus,
} from "@/lib/body-weight-phases";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

// All body weight phases (most recent first), opened from the Peso tab.
export default function PhasesScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { phases, error } = usePhases();

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!phases) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Link href="/phase/new" asChild>
        <Pressable style={styles.newButton} accessibilityRole="button">
          <Ionicons name="add" size={22} color={c.onPrimary} />
          <Text style={styles.newText}>Nova época</Text>
        </Pressable>
      </Link>

      {phases.length === 0 ? (
        <Text style={styles.empty}>
          Uma época é um período com um objetivo, como um bulk ou um cut. Cria
          uma para veres o gráfico, a diferença e o ritmo por semana desse
          período.
        </Text>
      ) : (
        <View style={styles.card}>
          {phases.map((phase, index) => {
            const status = phaseStatus(phase);
            return (
              <Link
                key={phase.id}
                href={{ pathname: "/phase/[id]", params: { id: phase.id } }}
                asChild
              >
                <Pressable
                  // Link asChild does not accept style arrays.
                  style={StyleSheet.flatten([
                    styles.row,
                    index > 0 && styles.rowDivider,
                  ])}
                  accessibilityRole="button"
                >
                  <View style={styles.rowText}>
                    <Text style={styles.name}>{phase.name}</Text>
                    <Text style={styles.dates}>{formatPhaseDates(phase)}</Text>
                  </View>
                  {status === "ongoing" && (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>
                        {PHASE_STATUS_LABELS.ongoing}
                      </Text>
                    </View>
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={c.textFaint}
                  />
                </Pressable>
              </Link>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 12,
      padding: 16,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
    error: {
      fontSize: 16,
      color: c.danger,
      textAlign: "center",
    },
    newButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 52,
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    newText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.onPrimary,
    },
    empty: {
      fontSize: 15,
      lineHeight: 22,
      color: c.textMuted,
      textAlign: "center",
      marginTop: 8,
    },
    card: {
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: c.card,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 64,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 17,
      fontWeight: "600",
      color: c.text,
    },
    dates: {
      fontSize: 14,
      color: c.textMuted,
    },
    chip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: c.successBg,
    },
    chipText: {
      fontSize: 12,
      fontWeight: "600",
      color: c.success,
    },
  });
}
