// Shared sizes for every screen: spacing, text styles, corner radius and
// motion. Colours live in colors.ts (they change with the theme); these don't.
import { cubicBezier } from "react-native-reanimated";

// 4-point grid. Screen edges use `lg`.
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Text styles without colour: add `color` from the theme in each style.
export const type = {
  title: { fontSize: 22, fontWeight: "700" },
  headline: { fontSize: 18, fontWeight: "600" },
  bodyStrong: { fontSize: 16, fontWeight: "600" },
  body: { fontSize: 16, fontWeight: "400" },
  subhead: { fontSize: 15, fontWeight: "400" },
  caption: { fontSize: 13, fontWeight: "400" },
  captionStrong: { fontSize: 13, fontWeight: "600" },
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999, // pills and circles
} as const;

// Durations in ms. Press feedback stays short: it happens many times a set.
export const motion = {
  press: 120,
  state: 180,
  enter: 200,
} as const;

// Strong ease-out for Reanimated CSS transitions.
export const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

// Minimum touch target (Android: 48dp).
export const TOUCH_TARGET = 48;

// Shadows as CSS boxShadow strings (not the old elevation prop).
export const shadows = {
  card: "0 1px 3px rgba(0, 0, 0, 0.08)",
  raised: "0 4px 12px rgba(0, 0, 0, 0.16)",
} as const;
