import { Alert } from "react-native";

import type { Progression } from "@/types/routine";

// Asks which note to leave for next week. Android alerts show at most three
// buttons; tapping outside cancels.
export function chooseProgression(
  exerciseName: string,
  current: Progression | null,
  onChoose: (progression: Progression | null) => void,
) {
  Alert.alert(
    "Próxima semana",
    exerciseName,
    [
      { text: "Não aumentar", onPress: () => onChoose("keep") },
      { text: "Aumentar", onPress: () => onChoose("increase") },
      current
        ? {
            text: "Tirar nota",
            style: "destructive",
            onPress: () => onChoose(null),
          }
        : { text: "Cancelar", style: "cancel" },
    ],
    { cancelable: true },
  );
}
