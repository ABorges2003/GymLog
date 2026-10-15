import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
} from "react-native-reanimated";

import { DayTaskRow } from "@/components/day-task-row";
import { KeyboardAwareScrollView } from "@/components/keyboard-aware-scroll-view";
import { PressableScale } from "@/components/pressable-scale";
import { ProgressBar } from "@/components/progress-bar";
import { SegmentedControl } from "@/components/segmented-control";
import { TaskPopup } from "@/components/task-popup";
import { useAgendaEvents } from "@/hooks/use-agenda-events";
import { useDayTasks } from "@/hooks/use-day-tasks";
import { useSelectedDay } from "@/hooks/use-today";
import { addDaysToKey, formatDayLabel } from "@/lib/dates";
import {
  REMINDER_LABELS,
  TASK_TITLE_MAX_LENGTH,
  cleanTitle,
  groupEventsByDate,
} from "@/lib/planner";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { motion, radius, spacing, type } from "@/theme/tokens";
import type { AgendaEvent, DayTask } from "@/types/planner";

type AgendaView = "tasks" | "events";

const VIEWS: { value: AgendaView; label: string }[] = [
  { value: "tasks", label: "Dia a dia" },
  { value: "events", label: "Agenda" },
];

// Agenda tab: the day's tasks, and the agenda of important events.
export default function AgendaScreen() {
  const styles = useThemedStyles(createStyles);
  const [view, setView] = useState<AgendaView>("tasks");

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <SegmentedControl options={VIEWS} selected={view} onSelect={setView} />
      {view === "tasks" ? <TasksView /> : <EventsView />}
    </KeyboardAwareScrollView>
  );
}

function TasksView() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  // Follows the date when the app stays open overnight (see useSelectedDay).
  const { date, setDate, today } = useSelectedDay();
  const {
    tasks,
    error,
    add,
    toggle,
    rename,
    moveToNextDay,
    remove,
    stopRepeating,
  } = useDayTasks(date);
  const router = useRouter();
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const [editing, setEditing] = useState<DayTask | null>(null);

  const title = cleanTitle(text, TASK_TITLE_MAX_LENGTH);
  const doneCount = tasks?.filter((task) => task.done).length ?? 0;

  // With nothing typed yet, the + just opens the keyboard on the input.
  async function submit() {
    if (title === null) {
      inputRef.current?.focus();
      return;
    }
    setText("");
    try {
      await add(title);
    } catch {
      setText(title);
      Alert.alert("Erro", "Não foi possível guardar a tarefa.");
    }
  }

  function showError(promise: Promise<void>) {
    promise.catch(() =>
      Alert.alert("Erro", "Não foi possível guardar a tarefa."),
    );
  }

  return (
    <>
      <View style={styles.dayRow}>
        <PressableScale
          onPress={() => setDate(addDaysToKey(date, -1))}
          style={styles.dayButton}
          accessibilityRole="button"
          accessibilityLabel="Dia anterior"
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </PressableScale>
        <Pressable
          onPress={() => setDate(today)}
          disabled={date === today}
          style={styles.dayLabelTouch}
          accessibilityRole="button"
          accessibilityHint="Voltar a hoje"
        >
          <Text style={styles.dayLabel}>{formatDayLabel(date)}</Text>
        </Pressable>
        <PressableScale
          onPress={() => setDate(addDaysToKey(date, 1))}
          style={styles.dayButton}
          accessibilityRole="button"
          accessibilityLabel="Dia seguinte"
        >
          <Ionicons name="chevron-forward" size={24} color={c.text} />
        </PressableScale>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {!tasks && !error && <ActivityIndicator color={c.primary} />}

      {tasks && tasks.length > 0 && (
        <View style={styles.progress}>
          <Text style={styles.muted}>
            {doneCount} de {tasks.length} feitas
          </Text>
          <ProgressBar value={doneCount} max={tasks.length} />
        </View>
      )}

      {tasks && (
        <View style={styles.card}>
          {/* Tasks already there don't animate; new and deleted ones fade. */}
          <LayoutAnimationConfig skipEntering>
            {tasks.map((task, index) => (
              <Animated.View
                key={task.id}
                entering={FadeIn.duration(motion.enter)}
                exiting={FadeOut.duration(motion.state)}
              >
                {index > 0 && <View style={styles.divider} />}
                <DayTaskRow
                  task={task}
                  onToggle={() => showError(toggle(task))}
                  onEdit={() => setEditing(task)}
                />
              </Animated.View>
            ))}
          </LayoutAnimationConfig>
          {tasks.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="checkbox"
                  size={32}
                  color={c.onPrimarySoft}
                />
              </View>
              <Text style={styles.emptyText}>
                Sem tarefas para este dia. Escreve uma em baixo.
              </Text>
            </View>
          )}
          <View
            style={[styles.addRow, tasks.length > 0 && styles.addDivider]}
          >
            <TextInput
              ref={inputRef}
              style={styles.addInput}
              value={text}
              onChangeText={setText}
              onSubmitEditing={submit}
              submitBehavior="submit"
              returnKeyType="done"
              placeholder="Nova tarefa"
              placeholderTextColor={c.textFaint}
              maxLength={TASK_TITLE_MAX_LENGTH}
              cursorColor={c.primary}
              accessibilityLabel="Nova tarefa"
            />
            {/* Same task, but repeating on chosen days of the week. */}
            <PressableScale
              onPress={() => {
                router.push({
                  pathname: "/agenda/recurring/new",
                  params: { date, title: title ?? "" },
                });
                setText("");
              }}
              style={styles.repeatButton}
              accessibilityRole="button"
              accessibilityLabel="Criar tarefa que se repete"
            >
              <Ionicons name="repeat" size={22} color={c.onPrimarySoft} />
            </PressableScale>
            <PressableScale
              onPress={submit}
              style={styles.addButton}
              accessibilityRole="button"
              accessibilityLabel="Adicionar tarefa"
            >
              <Ionicons name="add" size={24} color={c.onPrimary} />
            </PressableScale>
          </View>
        </View>
      )}

      <Pressable
        onPress={() => router.push("/agenda/recurring")}
        style={styles.pastToggle}
        hitSlop={8}
        accessibilityRole="button"
      >
        <Ionicons name="repeat" size={16} color={c.primary} />
        <Text style={styles.link}>Tarefas que se repetem</Text>
      </Pressable>

      {editing && (
        <TaskPopup
          task={editing}
          onClose={() => setEditing(null)}
          onRename={(newTitle) => rename(editing, newTitle)}
          onMoveToNextDay={() => moveToNextDay(editing)}
          onDelete={() => remove(editing)}
          onStopRepeating={() => stopRepeating(editing)}
          onEditRepeat={() => {
            if (!editing.recurringId) return;
            router.push({
              pathname: "/agenda/recurring/[id]",
              params: { id: editing.recurringId },
            });
          }}
        />
      )}
    </>
  );
}

function EventsView() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { events, error } = useAgendaEvents();
  const [showPast, setShowPast] = useState(false);

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!events) return <ActivityIndicator color={c.primary} />;

  return (
    <>
      <PressableScale
        onPress={() => router.push("/agenda/new")}
        style={styles.newEvent}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={22} color={c.onPrimarySoft} />
        <Text style={styles.newEventText}>Novo evento</Text>
      </PressableScale>

      {events.coming.length === 0 && (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar" size={32} color={c.onPrimarySoft} />
          </View>
          <Text style={styles.emptyText}>
            Sem eventos marcados. Junta consultas e outras coisas importantes,
            com um aviso antes.
          </Text>
        </View>
      )}

      <EventGroups events={events.coming} />

      {events.past.length > 0 && (
        <Pressable
          onPress={() => setShowPast((value) => !value)}
          style={styles.pastToggle}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={styles.link}>
            {showPast
              ? "Esconder eventos passados"
              : `Ver eventos passados (${events.past.length})`}
          </Text>
          <Ionicons
            name={showPast ? "chevron-up" : "chevron-down"}
            size={16}
            color={c.primary}
          />
        </Pressable>
      )}
      {showPast && <EventGroups events={events.past} past />}
    </>
  );
}

function EventGroups({
  events,
  past = false,
}: {
  events: AgendaEvent[];
  past?: boolean;
}) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  return groupEventsByDate(events).map((group) => (
    <View key={group.date} style={styles.group}>
      <Text style={styles.groupTitle}>{formatDayLabel(group.date)}</Text>
      <View style={[styles.card, past && styles.pastCard]}>
        {group.events.map((event, index) => (
          <View key={event.id}>
            {index > 0 && <View style={styles.divider} />}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/agenda/edit/[id]",
                  params: { id: event.id },
                })
              }
              android_ripple={{ color: c.ripple }}
              style={styles.event}
              accessibilityRole="button"
              accessibilityHint="Editar o evento"
            >
              <View style={styles.timePill}>
                <Text style={styles.timeText}>{event.time}</Text>
              </View>
              <View style={styles.eventText}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {event.title}
                </Text>
                {event.notes && (
                  <Text style={styles.muted} numberOfLines={1}>
                    {event.notes}
                  </Text>
                )}
                {event.remindMinutes !== null && !past && (
                  <View style={styles.reminder}>
                    <Ionicons
                      name="notifications"
                      size={13}
                      color={c.onPrimarySoft}
                    />
                    <Text style={styles.reminderText}>
                      {REMINDER_LABELS[event.remindMinutes]}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  ));
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
    muted: {
      fontSize: 14,
      color: c.textMuted,
    },
    dayRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    dayButton: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.card,
    },
    dayLabelTouch: {
      flex: 1,
    },
    dayLabel: {
      ...type.headline,
      textAlign: "center",
      color: c.text,
    },
    progress: {
      gap: spacing.xs,
    },
    card: {
      borderRadius: radius.lg,
      backgroundColor: c.card,
      overflow: "hidden",
    },
    pastCard: {
      opacity: 0.7,
    },
    divider: {
      marginHorizontal: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
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
    addRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.sm,
      paddingLeft: spacing.lg,
    },
    addDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    addInput: {
      ...type.body,
      flex: 1,
      minHeight: 48,
      color: c.text,
    },
    repeatButton: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primary,
    },
    newEvent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 52,
      borderRadius: radius.lg,
      backgroundColor: c.primarySoft,
    },
    newEventText: {
      ...type.bodyStrong,
      fontSize: 17,
      color: c.onPrimarySoft,
    },
    group: {
      gap: spacing.sm,
    },
    groupTitle: {
      ...type.captionStrong,
      fontSize: 14,
      marginLeft: spacing.xs,
      color: c.textMuted,
    },
    event: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 64,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    timePill: {
      minWidth: 58,
      alignItems: "center",
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: c.primarySoft,
    },
    timeText: {
      ...type.bodyStrong,
      fontSize: 15,
      fontVariant: ["tabular-nums"],
      color: c.onPrimarySoft,
    },
    eventText: {
      flex: 1,
      gap: spacing.xxs,
    },
    eventTitle: {
      ...type.bodyStrong,
      fontSize: 17,
      color: c.text,
    },
    reminder: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    reminderText: {
      ...type.caption,
      color: c.onPrimarySoft,
    },
    pastToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingVertical: spacing.sm,
    },
    link: {
      ...type.subhead,
      fontWeight: "600",
      color: c.primary,
    },
  });
}
