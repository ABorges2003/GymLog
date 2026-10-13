import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";

import { EventForm } from "@/components/event-form";
import { PopupButton } from "@/components/popup";
import { warnAboutReminder } from "@/components/reminder-warning";
import {
  deleteEvent,
  getEventById,
  updateEvent,
} from "@/db/repositories/planner";
import {
  applyEventReminder,
  cancelEventReminder,
} from "@/notifications/agenda-reminders";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { spacing, type } from "@/theme/tokens";
import type { AgendaEvent } from "@/types/planner";

// Edits or deletes an agenda event.
export default function EditEventScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  // undefined while loading, null when not found.
  const [event, setEvent] = useState<AgendaEvent | null | undefined>();

  useEffect(() => {
    getEventById(db, id)
      .then(setEvent)
      .catch(() => setEvent(null));
  }, [db, id]);

  if (event === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (event === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Este evento já não existe.</Text>
      </View>
    );
  }

  function confirmDelete(current: AgendaEvent) {
    Alert.alert("Apagar evento?", current.title, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEvent(db, current.id);
            await cancelEventReminder(current.id).catch(() => {});
            router.back();
          } catch {
            Alert.alert("Erro", "Não foi possível apagar o evento.");
          }
        },
      },
    ]);
  }

  const { id: eventId, ...initial } = event;
  return (
    <EventForm
      initial={initial}
      submitLabel="Guardar"
      onSubmit={async (values) => {
        await updateEvent(db, eventId, values);
        warnAboutReminder(await applyEventReminder({ id: eventId, ...values }));
        router.back();
      }}
      footer={
        <PopupButton
          label="Apagar evento"
          variant="danger"
          onPress={() => confirmDelete(event)}
        />
      }
    />
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    error: {
      ...type.body,
      textAlign: "center",
      color: c.danger,
    },
  });
}
