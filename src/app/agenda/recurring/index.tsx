import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PressableScale } from "@/components/pressable-scale";
import { useRecurringTasks } from "@/hooks/use-recurring-tasks";
import { describeWeekdays } from "@/lib/planner";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius, spacing, type } from "@/theme/tokens";

// The tasks that repeat every week, to add, change or stop them.
export default function RecurringTasksScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { tasks, error } = useRecurringTasks();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <PressableScale
        onPress={() => router.push("/agenda/recurring/new")}
        style={styles.newButton}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={22} color={c.onPrimarySoft} />
        <Text style={styles.newText}>Nova tarefa que se repete</Text>
      </PressableScale>

      {error && <Text style={styles.error}>{error}</Text>}
      {!tasks && !error && <ActivityIndicator color={c.primary} />}

      {tasks && tasks.length === 0 && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="repeat" size={32} color={c.onPrimarySoft} />
          </View>
          <Text style={styles.emptyText}>
            Coisas que fazes sempre nos mesmos dias, como passear a cadela às
            terças e quintas ou levar o lixo aos sábados. Aparecem sozinhas no
            Dia a dia.
          </Text>
        </View>
      )}

      {tasks && tasks.length > 0 && (
        <View style={styles.card}>
          {tasks.map((task, index) => (
            <View key={task.id}>
              {index > 0 && <View style={styles.divider} />}
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/agenda/recurring/[id]",
                    params: { id: task.id },
                  })
                }
                android_ripple={{ color: c.ripple }}
                style={styles.row}
                accessibilityRole="button"
                accessibilityHint="Editar a repetição"
              >
                <View style={styles.icon}>
                  <Ionicons name="repeat" size={18} color={c.onPrimarySoft} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.title}>{task.title}</Text>
                  <Text style={styles.days}>
                    {describeWeekdays(task.weekdays)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={c.textFaint}
                />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.md,
      padding: spacing.lg,
    },
    error: {
      ...type.body,
      textAlign: "center",
      color: c.danger,
    },
    newButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 52,
      borderRadius: radius.lg,
      backgroundColor: c.primarySoft,
    },
    newText: {
      ...type.bodyStrong,
      fontSize: 17,
      color: c.onPrimarySoft,
    },
    empty: {
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    emptyText: {
      ...type.body,
      textAlign: "center",
      color: c.textMuted,
    },
    card: {
      borderRadius: radius.lg,
      backgroundColor: c.card,
      overflow: "hidden",
    },
    divider: {
      marginHorizontal: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 64,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    rowText: {
      flex: 1,
      gap: spacing.xxs,
    },
    title: {
      ...type.bodyStrong,
      fontSize: 17,
      color: c.text,
    },
    days: {
      fontSize: 14,
      color: c.textMuted,
    },
  });
}
