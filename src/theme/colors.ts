// App colours for the light and dark themes. Screens never use colour
// literals: they read these through useColors() / useThemedStyles().
export type ThemeColors = {
  background: string; // screen background
  card: string; // cards, rows, headers
  text: string;
  textMuted: string; // secondary text
  textFaint: string; // placeholders, disabled icons, dashed borders
  border: string;
  subtle: string; // section headers, row dividers
  input: string; // text input background
  primary: string; // main buttons, selected chips
  onPrimary: string; // text and icons on primary
  ripple: string;
  overlay: string; // behind popups
  accent: string; // charts
  star: string; // favorites
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  success: string;
  successBg: string;
  warning: string; // body weight goal
  warningText: string;
  warningBg: string;
};

export const LIGHT_COLORS: ThemeColors = {
  background: "#f2f3f5",
  card: "#ffffff",
  text: "#111827",
  textMuted: "#6b7280",
  textFaint: "#9ca3af",
  border: "#d0d4da",
  subtle: "#eef0f3",
  input: "#f9fafb",
  primary: "#1f2937",
  onPrimary: "#ffffff",
  ripple: "#e5e7eb",
  overlay: "rgba(0, 0, 0, 0.45)",
  accent: "#7c3aed",
  star: "#f5a524",
  danger: "#dc2626",
  dangerBg: "#fee2e2",
  dangerBorder: "#fca5a5",
  success: "#15803d",
  successBg: "#dcfce7",
  warning: "#f59e0b",
  warningText: "#d97706",
  warningBg: "#fff7e6",
};

export const DARK_COLORS: ThemeColors = {
  background: "#0f1115",
  card: "#1b1e24",
  text: "#f3f4f6",
  textMuted: "#9ca3af",
  textFaint: "#6b7280",
  border: "#374151",
  subtle: "#262a31",
  input: "#14171c",
  primary: "#e5e7eb",
  onPrimary: "#111827",
  ripple: "#2d323a",
  overlay: "rgba(0, 0, 0, 0.6)",
  accent: "#a78bfa",
  star: "#fbbf24",
  danger: "#f87171",
  dangerBg: "#3b1717",
  dangerBorder: "#7f1d1d",
  success: "#4ade80",
  successBg: "#14301f",
  warning: "#fbbf24",
  warningText: "#fbbf24",
  warningBg: "#3a2c0c",
};
