import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

import type { ThemeColors } from "@/theme/colors";
import { useThemedStyles } from "@/theme/theme";

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  // Tapping outside the card or the back button.
  onClose: () => void;
  children: ReactNode;
};

// Centered card over a dark backdrop.
export function Popup({ visible, title, subtitle, onClose, children }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          {/* Inner Pressable stops taps on the card from closing the popup. */}
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
};

// Full-width button for popups.
export function PopupButton({
  label,
  onPress,
  variant = "secondary",
  disabled = false,
}: ButtonProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === "primary" && styles.primary,
        variant === "danger" && styles.danger,
        disabled && styles.disabled,
      ]}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.buttonText,
          variant === "primary" && styles.primaryText,
          variant === "danger" && styles.dangerText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    backdrop: {
      flex: 1,
      justifyContent: "center",
      padding: 20,
      backgroundColor: c.overlay,
    },
    card: {
      maxHeight: "85%",
      gap: 12,
      padding: 20,
      borderRadius: 16,
      backgroundColor: c.card,
    },
    title: {
      fontSize: 19,
      fontWeight: "bold",
      color: c.text,
    },
    subtitle: {
      marginTop: -6,
      fontSize: 15,
      color: c.textMuted,
    },
    button: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    primary: {
      borderColor: c.primary,
      backgroundColor: c.primary,
    },
    danger: {
      borderColor: c.danger,
    },
    disabled: {
      opacity: 0.4,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    primaryText: {
      color: c.onPrimary,
    },
    dangerText: {
      color: c.danger,
    },
  });
}
