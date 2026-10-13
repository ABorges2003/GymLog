import { Alert } from "react-native";

import type { ReminderResult } from "@/notifications/agenda-reminders";

// Tells the user when an event's reminder could not be set (the event itself
// is saved either way).
export function warnAboutReminder(result: ReminderResult): void {
  if (result === "no-permission") {
    Alert.alert(
      "Avisos desligados",
      "O evento foi guardado, mas a app não tem permissão para notificações. Podes ligá-la nas definições do Android.",
    );
  } else if (result === "unavailable") {
    Alert.alert(
      "Avisos só no APK",
      "O evento foi guardado. No Expo Go os avisos não funcionam: instala o APK para os receberes.",
    );
  } else if (result === "failed") {
    Alert.alert(
      "Aviso não marcado",
      "O evento foi guardado, mas não foi possível marcar o aviso.",
    );
  }
}
