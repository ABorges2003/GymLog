import Ionicons from "@expo/vector-icons/Ionicons";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useState, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";
import { PressableScale } from "@/components/pressable-scale";
import { formatDayLabel, toDateKey } from "@/lib/dates";
import {
  EVENT_NOTES_MAX_LENGTH,
  EVENT_TITLE_MAX_LENGTH,
  REMINDER_LABELS,
  eventStart,
  toTimeKey,
  validateEvent,
} from "@/lib/planner";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius, spacing, type } from "@/theme/tokens";
import {
  REMINDER_MINUTES,
  type AgendaEventInput,
  type ReminderMinutes,
} from "@/types/planner";

type IconName = ComponentProps<typeof Ionicons>["name"];

const REMINDER_CHOICES: { value: ReminderMinutes | null; label: string }[] = [
  { value: null, label: "Sem aviso" },
  ...REMINDER_MINUTES.map((minutes) => ({
    value: minutes,
    label: REMINDER_LABELS[minutes],
  })),
];

type Props = {
  initial: AgendaEventInput;
  submitLabel: string;
  // Saves the event; throws if saving fails.
  onSubmit: (event: AgendaEventInput) => Promise<void>;
  // Extra content below the save button (e.g. a delete button).
  footer?: ReactNode;
};

// Title, day, time, notes and reminder of an agenda event. Day and time use
// the phone's own pickers.
export function EventForm({ initial, submitLabel, onSubmit, footer }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [remindMinutes, setRemindMinutes] = useState(initial.remindMinutes);
  const [picking, setPicking] = useState<"date" | "time" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const result = validateEvent({ title, date, time, notes, remindMinutes });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit(result.event);
    } catch {
      setError("Não foi possível guardar o evento.");
      setSaving(false);
    }
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.field}>
        <Text style={styles.label}>Título</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ex.: Dentista, Nutricionista"
          placeholderTextColor={c.textFaint}
          maxLength={EVENT_TITLE_MAX_LENGTH}
          autoCapitalize="sentences"
          cursorColor={c.primary}
        />
      </View>

      <View style={styles.pickers}>
        <PickerButton
          icon="calendar"
          label="Dia"
          value={formatDayLabel(date)}
          onPress={() => setPicking("date")}
        />
        <PickerButton
          icon="time"
          label="Hora"
          value={time}
          onPress={() => setPicking("time")}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Aviso</Text>
        <View style={styles.chips}>
          {REMINDER_CHOICES.map((choice) => {
            const selected = choice.value === remindMinutes;
            return (
              <PressableScale
                key={choice.label}
                onPress={() => setRemindMinutes(choice.value)}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                {choice.value !== null && (
                  <Ionicons
                    name="notifications"
                    size={14}
                    color={selected ? c.onPrimary : c.textMuted}
                  />
                )}
                <Text
                  style={[styles.chipText, selected && styles.chipTextSelected]}
                >
                  {choice.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Notas (opcional)</Text>
        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Ex.: levar o cartão de utente"
          placeholderTextColor={c.textFaint}
          maxLength={EVENT_NOTES_MAX_LENGTH}
          multiline
          textAlignVertical="top"
          cursorColor={c.primary}
        />
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

      {/* The pickers open as the phone's own dialogs. */}
      {picking !== null && (
        <DateTimePicker
          value={eventStart({ date, time })}
          mode={picking}
          is24Hour
          accentColor={c.primary}
          onValueChange={(_, picked) => {
            setPicking(null);
            if (picking === "date") setDate(toDateKey(picked));
            else setTime(toTimeKey(picked));
          }}
          onDismiss={() => setPicking(null)}
        />
      )}
    </KeyboardAwareScrollView>
  );
}

function PickerButton({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      style={styles.pickerButton}
      android_ripple={{ color: c.ripple }}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={styles.pickerIcon}>
        <Ionicons name={icon} size={18} color={c.onPrimarySoft} />
      </View>
      <View style={styles.pickerText}>
        <Text style={styles.pickerLabel}>{label}</Text>
        <Text style={styles.pickerValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </Pressable>
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
    notes: {
      minHeight: 96,
      paddingTop: spacing.md,
    },
    pickers: {
      flexDirection: "row",
      gap: spacing.md,
    },
    pickerButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 64,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.card,
      overflow: "hidden",
    },
    pickerIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    pickerText: {
      flex: 1,
    },
    pickerLabel: {
      ...type.caption,
      color: c.textMuted,
    },
    pickerValue: {
      ...type.bodyStrong,
      fontSize: 17,
      color: c.text,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      minHeight: 40,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      backgroundColor: c.card,
    },
    chipSelected: {
      backgroundColor: c.primary,
    },
    chipText: {
      ...type.subhead,
      fontWeight: "600",
      color: c.text,
    },
    chipTextSelected: {
      color: c.onPrimary,
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
