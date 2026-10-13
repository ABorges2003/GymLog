import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated from "react-native-reanimated";

import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";
import { PressableScale } from "@/components/pressable-scale";
import {
  EVERY_DAY,
  TASK_TITLE_MAX_LENGTH,
  WEEKDAY_SHORT,
  WEEKEND,
  WEEK_ORDER,
  WORK_DAYS,
  cleanTitle,
  describeWeekdays,
  hasWeekday,
  toggleWeekday,
} from "@/lib/planner";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { EASE_OUT, motion, radius, spacing, type } from "@/theme/tokens";

const PRESETS = [
  { label: "Todos os dias", weekdays: EVERY_DAY },
  { label: "Dias úteis", weekdays: WORK_DAYS },
  { label: "Fins de semana", weekdays: WEEKEND },
];

const DAY_SIZE = 42;

type Props = {
  initial: { title: string; weekdays: number };
  submitLabel: string;
  // Saves the task; throws if saving fails.
  onSubmit: (task: { title: string; weekdays: number }) => Promise<void>;
  // Extra content below the save button (e.g. a stop button).
  footer?: ReactNode;
};

// Title and days of the week of a task that repeats every week.
export function RecurringTaskForm({
  initial,
  submitLabel,
  onSubmit,
  footer,
}: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [text, setText] = useState(initial.title);
  const [weekdays, setWeekdays] = useState(initial.weekdays);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const title = cleanTitle(text, TASK_TITLE_MAX_LENGTH);
    if (title === null) {
      setError("Escreve o que tens de fazer.");
      return;
    }
    if (weekdays === 0) {
      setError("Escolhe pelo menos um dia.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ title, weekdays });
    } catch {
      setError("Não foi possível guardar a tarefa.");
      setSaving(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.field}>
        <Text style={styles.label}>Tarefa</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Ex.: Passear a cadela, Levar o lixo"
          placeholderTextColor={c.textFaint}
          maxLength={TASK_TITLE_MAX_LENGTH}
          autoCapitalize="sentences"
          cursorColor={c.primary}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Repete</Text>
        <View style={styles.presets}>
          {PRESETS.map((preset) => {
            const selected = weekdays === preset.weekdays;
            return (
              <PressableScale
                key={preset.label}
                onPress={() => setWeekdays(preset.weekdays)}
                style={[styles.preset, selected && styles.selected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.presetText,
                    selected && styles.selectedText,
                  ]}
                >
                  {preset.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <View style={styles.days}>
          {WEEK_ORDER.map((day) => {
            const selected = hasWeekday(weekdays, day);
            return (
              <PressableScale
                key={day}
                onPress={() => setWeekdays(toggleWeekday(weekdays, day))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={WEEKDAY_SHORT[day]}
              >
                <Animated.View
                  style={[
                    styles.day,
                    {
                      backgroundColor: selected ? c.primary : c.card,
                      transitionProperty: "backgroundColor",
                      transitionDuration: motion.press,
                      transitionTimingFunction: EASE_OUT,
                    },
                  ]}
                >
                  <Text
                    style={[styles.dayText, selected && styles.selectedText]}
                  >
                    {WEEKDAY_SHORT[day]}
                  </Text>
                </Animated.View>
              </PressableScale>
            );
          })}
        </View>
        <Text style={styles.summary}>
          {weekdays === 0 ? "Nenhum dia escolhido" : describeWeekdays(weekdays)}
        </Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <PressableScale
        onPress={submit}
        disabled={saving}
        style={[styles.button, saving && styles.disabled]}
        accessibilityRole="button"
      >
        {saving ? (
          <ActivityIndicator color={c.onPrimary} />
        ) : (
          <Text style={styles.buttonText}>{submitLabel}</Text>
        )}
      </PressableScale>
      {footer}
    </KeyboardAwareScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: spacing.lg,
      padding: spacing.lg,
    },
    field: {
      gap: spacing.sm,
    },
    label: {
      ...type.bodyStrong,
      color: c.text,
    },
    input: {
      ...type.body,
      fontSize: 17,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: c.card,
      color: c.text,
    },
    presets: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    preset: {
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      backgroundColor: c.card,
    },
    presetText: {
      ...type.subhead,
      fontWeight: "600",
      color: c.text,
    },
    selected: {
      backgroundColor: c.primary,
    },
    selectedText: {
      color: c.onPrimary,
    },
    days: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: spacing.xs,
    },
    day: {
      width: DAY_SIZE,
      height: DAY_SIZE,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
    },
    dayText: {
      ...type.captionStrong,
      color: c.text,
    },
    summary: {
      ...type.subhead,
      color: c.textMuted,
    },
    error: {
      ...type.subhead,
      color: c.danger,
    },
    button: {
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.lg,
      backgroundColor: c.primary,
    },
    buttonText: {
      ...type.bodyStrong,
      fontSize: 17,
      color: c.onPrimary,
    },
    disabled: {
      opacity: 0.5,
    },
  });
}
