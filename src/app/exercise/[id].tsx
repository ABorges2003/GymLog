import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useExercise } from "@/hooks/use-exercise";
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from "@/lib/labels";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

function InfoRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function workoutCountLabel(count: number): string {
  if (count === 0) return "Nunca usado";
  return count === 1 ? "1 treino" : `${count} treinos`;
}

export default function ExerciseDetailScreen() {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { detail, notFound, error, toggleFavorite, remove } = useExercise(id);

  if (error || notFound) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Exercício" }} />
        <Text style={styles.error}>
          {error ?? "Este exercício já não existe."}
        </Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Exercício" }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { exercise, workoutCount, inUse } = detail;

  // Unused exercises are deleted; used ones are archived (see removeExercise).
  function confirmRemove() {
    const title = inUse ? "Arquivar exercício?" : "Apagar exercício?";
    const message = inUse
      ? `"${exercise.name}" já foi usado em treinos. Vai deixar de aparecer nas listas, mas o histórico mantém-se.`
      : `"${exercise.name}" vai ser apagado. Esta ação não pode ser desfeita.`;

    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: inUse ? "Arquivar" : "Apagar",
        style: "destructive",
        onPress: () => {
          remove()
            .then(() => router.back())
            .catch(() =>
              Alert.alert("Erro", "Não foi possível remover o exercício."),
            );
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: "Exercício" }} />

      <Text style={styles.name}>{exercise.name}</Text>
      {exercise.isArchived && (
        <Text style={styles.archived}>
          Arquivado: não aparece nas listas, só no histórico.
        </Text>
      )}

      <View style={styles.card}>
        <InfoRow
          label="Grupo muscular"
          value={MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
        />
        <InfoRow
          label="Equipamento"
          value={
            exercise.equipment ? EQUIPMENT_LABELS[exercise.equipment] : "—"
          }
        />
        <InfoRow label="Usado em" value={workoutCountLabel(workoutCount)} />
      </View>

      <Pressable
        onPress={toggleFavorite}
        style={[styles.button, exercise.isFavorite && styles.buttonActive]}
        accessibilityRole="button"
      >
        <Ionicons
          name={exercise.isFavorite ? "star" : "star-outline"}
          size={22}
          color={exercise.isFavorite ? c.star : c.text}
        />
        <Text style={styles.buttonText}>
          {exercise.isFavorite ? "Nos favoritos" : "Adicionar aos favoritos"}
        </Text>
      </Pressable>

      <Link
        href={{
          pathname: "/exercise/progress/[id]",
          params: { id: exercise.id },
        }}
        asChild
      >
        <Pressable style={styles.button} accessibilityRole="button">
          <Ionicons name="trending-up" size={22} color={c.text} />
          <Text style={styles.buttonText}>Ver progresso</Text>
        </Pressable>
      </Link>

      <Link
        href={{
          pathname: "/exercise/edit/[id]",
          params: { id: exercise.id },
        }}
        asChild
      >
        <Pressable style={styles.button} accessibilityRole="button">
          <Ionicons name="create-outline" size={22} color={c.text} />
          <Text style={styles.buttonText}>Editar</Text>
        </Pressable>
      </Link>

      {!exercise.isArchived && (
        <Pressable
          onPress={confirmRemove}
          style={[styles.button, styles.buttonDanger]}
          accessibilityRole="button"
        >
          <Ionicons
            name={inUse ? "archive-outline" : "trash-outline"}
            size={22}
            color={c.danger}
          />
          <Text style={[styles.buttonText, styles.buttonDangerText]}>
            {inUse ? "Arquivar" : "Apagar"}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      padding: 16,
      gap: 16,
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
    name: {
      fontSize: 26,
      fontWeight: "bold",
      color: c.text,
    },
    card: {
      borderRadius: 12,
      backgroundColor: c.card,
      paddingHorizontal: 16,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: 48,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    infoLabel: {
      fontSize: 16,
      color: c.textMuted,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: "500",
      color: c.text,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    buttonActive: {
      borderColor: c.star,
      backgroundColor: c.warningBg,
    },
    buttonText: {
      fontSize: 17,
      fontWeight: "600",
      color: c.text,
    },
    buttonDanger: {
      borderColor: c.dangerBorder,
      marginTop: 16,
    },
    buttonDangerText: {
      color: c.danger,
    },
    archived: {
      fontSize: 15,
      color: c.textMuted,
    },
  });
}
