import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Popup, PopupButton } from "@/components/popup";
import { PressableScale } from "@/components/pressable-scale";
import { WaterBottle } from "@/components/water-bottle";
import {
  MAX_WATER_GOAL_ML,
  MAX_WATER_ML,
  WATER_BOTTLE_DEFAULT_ML,
  WATER_STEPS_ML,
  formatWater,
  parseWaterAmount,
  type WaterUnit,
} from "@/lib/diet";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { radius, spacing, type } from "@/theme/tokens";

type Props = {
  // null while loading.
  ml: number | null;
  goalMl: number | null;
  // Each throws if saving fails.
  onAdd: (deltaMl: number) => Promise<void>;
  onSet: (totalMl: number) => Promise<void>;
  onSetGoal: (goalMl: number | null) => Promise<void>;
};

// What the popup is open for: adding any amount, correcting the day's total
// or setting the daily goal.
type Editing = "add" | "total" | "goal";

// The day's water: a bottle that fills up, quick buttons to add, one to take
// a glass away, any amount in ml or L, the day's total to correct and the
// daily goal.
export function WaterCard({ ml, goalMl, onAdd, onSet, onSetGoal }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const total = ml ?? 0;
  const scale = goalMl ?? WATER_BOTTLE_DEFAULT_ML;
  const reached = goalMl !== null && total >= goalMl;

  async function change(deltaMl: number) {
    setBusy(true);
    try {
      await onAdd(deltaMl);
    } catch {
      Alert.alert("Erro", "Não foi possível guardar a água.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <WaterBottle ratio={total / scale} height={132} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Ionicons name="water" size={18} color={c.water} />
          <Text style={styles.title}>Água</Text>
          {reached && (
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={c.success}
              accessibilityLabel="Meta atingida"
            />
          )}
          <Pressable
            onPress={() => setEditing("goal")}
            style={styles.goalButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              goalMl === null ? "Definir meta de água" : "Mudar meta de água"
            }
          >
            <Ionicons name="flag-outline" size={14} color={c.textMuted} />
            <Text style={styles.goalButtonText}>
              {goalMl === null ? "Definir meta" : `Meta ${formatWater(goalMl)}`}
            </Text>
          </Pressable>
        </View>
        <PressableScale
          onPress={() => setEditing("total")}
          disabled={ml === null}
          accessibilityRole="button"
          accessibilityHint="Corrigir a água do dia"
          style={styles.totalButton}
        >
          <Text style={styles.total}>{formatWater(total)}</Text>
          {goalMl !== null && (
            <Text style={styles.goal}>de {formatWater(goalMl)}</Text>
          )}
          <Ionicons name="create-outline" size={16} color={c.textFaint} />
        </PressableScale>
        <View style={styles.buttons}>
          {WATER_STEPS_ML.map((step) => (
            <PressableScale
              key={step}
              onPress={() => change(step)}
              disabled={busy || ml === null}
              style={styles.addButton}
              accessibilityRole="button"
              accessibilityLabel={`Adicionar ${step} ml`}
            >
              <Text style={styles.addText}>+{step}</Text>
            </PressableScale>
          ))}
          <PressableScale
            onPress={() => setEditing("add")}
            disabled={busy || ml === null}
            style={styles.addButton}
            accessibilityRole="button"
            accessibilityLabel="Adicionar outra quantidade"
          >
            <Text style={styles.addText}>+ Outra</Text>
          </PressableScale>
          <PressableScale
            onPress={() => change(-WATER_STEPS_ML[0])}
            disabled={busy || total === 0}
            style={[styles.removeButton, total === 0 && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel={`Tirar ${WATER_STEPS_ML[0]} ml`}
          >
            <Ionicons name="remove" size={20} color={c.textMuted} />
          </PressableScale>
        </View>
      </View>

      {editing === "add" && (
        <WaterPopup
          title="Adicionar água"
          subtitle="Quanto bebeste?"
          initialMl={null}
          maxMl={MAX_WATER_ML}
          saveLabel="Adicionar"
          onClose={() => setEditing(null)}
          onSave={onAdd}
        />
      )}
      {editing === "total" && (
        <WaterPopup
          title="Água do dia"
          subtitle="O total que bebeste neste dia."
          initialMl={total}
          maxMl={MAX_WATER_ML}
          saveLabel="Guardar total"
          allowZero
          onClose={() => setEditing(null)}
          onSave={onSet}
        />
      )}
      {editing === "goal" && (
        <WaterPopup
          title="Meta de água"
          subtitle="Quanto queres beber por dia."
          initialMl={goalMl}
          maxMl={MAX_WATER_GOAL_ML}
          saveLabel="Guardar meta"
          onClose={() => setEditing(null)}
          onSave={onSetGoal}
          onRemove={goalMl === null ? undefined : () => onSetGoal(null)}
          removeLabel="Tirar meta"
        />
      )}
    </View>
  );
}

// An amount of water in ml or litres. Render it only while open.
function WaterPopup({
  title,
  subtitle,
  initialMl,
  maxMl,
  saveLabel,
  onClose,
  onSave,
  onRemove,
  removeLabel,
  allowZero = false,
}: {
  title: string;
  subtitle: string;
  initialMl: number | null;
  maxMl: number;
  saveLabel: string;
  onClose: () => void;
  onSave: (ml: number) => Promise<void>;
  onRemove?: () => Promise<void>;
  removeLabel?: string;
  // The day's total may be set back to 0.
  allowZero?: boolean;
}) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  // Litres for amounts from 1 L on, so 2500 ml shows as "2,5" L.
  const [unit, setUnit] = useState<WaterUnit>(
    initialMl !== null && initialMl >= 1000 ? "L" : "ml",
  );
  const [text, setText] = useState(() => {
    if (initialMl === null || initialMl === 0) return "";
    return unit === "L"
      ? String(initialMl / 1000).replace(".", ",")
      : String(initialMl);
  });
  const [saving, setSaving] = useState(false);
  const value =
    allowZero && text.trim() === "0"
      ? 0
      : parseWaterAmount(text, unit, maxMl);

  async function run(action: () => Promise<void>) {
    setSaving(true);
    try {
      await action();
      onClose();
    } catch {
      Alert.alert("Erro", "Não foi possível guardar a água.");
      setSaving(false);
    }
  }

  return (
    <Popup visible title={title} subtitle={subtitle} onClose={onClose}>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            text !== "" && value === null && styles.inputError,
          ]}
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          maxLength={6}
          autoFocus
          selectTextOnFocus
          cursorColor={c.primary}
          placeholder={unit === "L" ? "1,5" : "330"}
          placeholderTextColor={c.textFaint}
          accessibilityLabel={`Água em ${unit === "L" ? "litros" : "ml"}`}
        />
        <View style={styles.units}>
          {(["ml", "L"] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setUnit(option)}
              style={[styles.unit, unit === option && styles.unitSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected: unit === option }}
            >
              <Text
                style={[
                  styles.unitText,
                  unit === option && styles.unitTextSelected,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <PopupButton
        label={saveLabel}
        variant="primary"
        disabled={value === null || saving}
        onPress={() => {
          if (value !== null) run(() => onSave(value));
        }}
      />
      {onRemove && removeLabel && (
        <PopupButton
          label={removeLabel}
          variant="danger"
          disabled={saving}
          onPress={() => run(onRemove)}
        />
      )}
      <PopupButton label="Cancelar" onPress={onClose} />
    </Popup>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lg,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.card,
    },
    body: {
      flex: 1,
      gap: spacing.sm,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    title: {
      ...type.headline,
      color: c.text,
    },
    goalButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xxs,
      marginLeft: "auto",
      paddingVertical: spacing.xxs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.subtle,
    },
    goalButtonText: {
      ...type.captionStrong,
      color: c.textMuted,
    },
    totalButton: {
      flexDirection: "row",
      alignItems: "baseline",
      alignSelf: "flex-start",
      gap: spacing.xs,
    },
    total: {
      fontSize: 30,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      color: c.text,
    },
    goal: {
      ...type.subhead,
      color: c.textMuted,
    },
    buttons: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    addButton: {
      flexGrow: 1,
      minHeight: 44,
      paddingHorizontal: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: c.waterSoft,
    },
    addText: {
      ...type.bodyStrong,
      fontSize: 14,
      color: c.text,
    },
    removeButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: c.subtle,
    },
    disabled: {
      opacity: 0.4,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
    },
    input: {
      width: 130,
      minHeight: 56,
      fontSize: 26,
      fontWeight: "700",
      textAlign: "center",
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: "transparent",
      backgroundColor: c.subtle,
      color: c.text,
    },
    inputError: {
      borderColor: c.danger,
    },
    units: {
      flexDirection: "row",
      padding: spacing.xxs,
      gap: spacing.xxs,
      borderRadius: radius.full,
      backgroundColor: c.subtle,
    },
    unit: {
      minWidth: 48,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
    },
    unitSelected: {
      backgroundColor: c.primary,
    },
    unitText: {
      ...type.bodyStrong,
      color: c.textMuted,
    },
    unitTextSelected: {
      color: c.onPrimary,
    },
  });
}
