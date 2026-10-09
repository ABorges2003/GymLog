import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Popup, PopupButton } from "@/components/popup";
import {
  BACKUP_PART_DETAILS,
  BACKUP_PART_LABELS,
  BACKUP_PARTS,
  describePart,
  type Backup,
  type BackupPart,
} from "@/lib/backup";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

export type BackupRequest =
  { kind: "export" } | { kind: "import"; backup: Backup };

type Props = {
  // For an import, only the parts the file holds are offered, with what each
  // one has.
  request: BackupRequest;
  onConfirm: (parts: BackupPart[]) => void;
  onClose: () => void;
};

// Checkboxes to choose which parts to export or import. Render it only while
// open, so every time it starts with everything ticked.
export function BackupPartsPopup({ request, onConfirm, onClose }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const offered =
    request.kind === "import" ? request.backup.parts : BACKUP_PARTS;
  const [selected, setSelected] = useState<BackupPart[]>(offered);

  function toggle(part: BackupPart) {
    setSelected((current) =>
      current.includes(part)
        ? current.filter((item) => item !== part)
        : [...current, part],
    );
  }

  const isImport = request.kind === "import";
  return (
    <Popup
      visible
      title={isImport ? "Importar backup" : "Exportar backup"}
      subtitle={isImport ? "O que queres importar?" : "O que queres exportar?"}
      onClose={onClose}
    >
      <View style={styles.list}>
        {offered.map((part) => {
          const checked = selected.includes(part);
          return (
            <Pressable
              key={part}
              onPress={() => toggle(part)}
              style={styles.row}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              <Ionicons
                name={checked ? "checkbox" : "square-outline"}
                size={26}
                color={checked ? c.accent : c.textMuted}
              />
              <View style={styles.rowText}>
                <Text style={styles.label}>{BACKUP_PART_LABELS[part]}</Text>
                <Text style={styles.detail}>
                  {request.kind === "import"
                    ? describePart(request.backup, part)
                    : BACKUP_PART_DETAILS[part]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {isImport && (
        <Text style={styles.warning}>
          O que escolheres é substituído pelo que está no backup. O resto fica
          como está.
        </Text>
      )}

      <PopupButton
        label={isImport ? "Importar" : "Exportar"}
        variant={isImport ? "danger" : "primary"}
        disabled={selected.length === 0}
        onPress={() =>
          // Keep the usual order whatever order they were ticked in.
          onConfirm(offered.filter((part) => selected.includes(part)))
        }
      />
      <PopupButton label="Cancelar" onPress={onClose} />
    </Popup>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    list: {
      gap: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 56,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    label: {
      fontSize: 17,
      fontWeight: "600",
      color: c.text,
    },
    detail: {
      fontSize: 14,
      color: c.textMuted,
    },
    warning: {
      fontSize: 14,
      lineHeight: 20,
      color: c.danger,
    },
  });
}
