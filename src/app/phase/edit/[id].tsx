import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PhaseForm } from "@/components/phase-form";
import {
  deletePhase,
  getPhaseById,
  updatePhase,
} from "@/db/repositories/body-weight-phases";
import type { Phase } from "@/lib/body-weight-phases";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

// Changes the name or the dates of a phase, or deletes it.
export default function EditPhaseScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getPhaseById(db, id)
      .then((result) => (result ? setPhase(result) : setNotFound(true)))
      .catch(() => setNotFound(true));
  }, [db, id]);

  if (notFound) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Esta época já não existe.</Text>
      </View>
    );
  }

  if (!phase) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  function confirmDelete() {
    if (!phase) return;
    Alert.alert(
      "Apagar época?",
      `${phase.name}\n\nOs registos de peso ficam como estão.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: () => {
            deletePhase(db, phase.id)
              // Back to the list, past the phase screen: it no longer exists.
              .then(() => router.dismissTo("/phases"))
              .catch(() =>
                Alert.alert("Erro", "Não foi possível apagar a época."),
              );
          },
        },
      ],
    );
  }

  return (
    <PhaseForm
      initial={phase}
      submitLabel="Guardar alterações"
      onSubmit={async (input) => {
        await updatePhase(db, phase.id, input);
        router.back();
      }}
      footer={
        <Pressable
          onPress={confirmDelete}
          style={styles.deleteButton}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={20} color={c.danger} />
          <Text style={styles.deleteText}>Apagar época</Text>
        </Pressable>
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
      padding: 16,
    },
    error: {
      fontSize: 16,
      color: c.danger,
      textAlign: "center",
    },
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 52,
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.danger,
    },
    deleteText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.danger,
    },
  });
}
