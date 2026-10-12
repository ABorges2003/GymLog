import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";

import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";
import { type } from "@/theme/tokens";

// kcal per gram, to split the donut by where the calories come from.
const KCAL_PER_GRAM = { carbs: 4, protein: 4, fat: 9 } as const;
// Gap between segments, in px along the ring.
const SEGMENT_GAP = 3;
// Segments smaller than this don't get a % label (it wouldn't fit).
const MIN_LABEL_PERCENT = 8;

type Props = {
  carbsG: number;
  proteinG: number;
  fatG: number;
  // Shown in the middle.
  kcal: number;
  size?: number;
  strokeWidth?: number;
};

// Donut with the share of calories from carbs, protein and fat, each
// segment labelled with its percentage.
export function MacroDonut({
  carbsG,
  proteinG,
  fatG,
  kcal,
  size = 168,
  strokeWidth = 30,
}: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);

  const parts = [
    { key: "carbs", kcal: carbsG * KCAL_PER_GRAM.carbs, color: c.carbs },
    { key: "protein", kcal: proteinG * KCAL_PER_GRAM.protein, color: c.protein },
    { key: "fat", kcal: fatG * KCAL_PER_GRAM.fat, color: c.fat },
  ];
  const total = parts.reduce((sum, part) => sum + part.kcal, 0);

  const center = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  let start = 0; // fraction of the ring already used
  const segments = parts
    .filter((part) => part.kcal > 0 && total > 0)
    .map((part) => {
      const fraction = part.kcal / total;
      const segment = { ...part, fraction, start };
      start += fraction;
      return segment;
    });
  const gap = segments.length > 1 ? SEGMENT_GAP : 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={c.subtle}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {segments.map((segment) => {
          const length = Math.max(segment.fraction * circumference - gap, 0);
          return (
            <Circle
              key={segment.key}
              cx={center}
              cy={center}
              r={r}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${length} ${circumference}`}
              strokeDashoffset={-segment.start * circumference}
              fill="none"
              // Start at 12 o'clock, going clockwise.
              transform={`rotate(-90 ${center} ${center})`}
            />
          );
        })}
        {segments.map((segment) => {
          const percent = Math.round(segment.fraction * 100);
          if (percent < MIN_LABEL_PERCENT) return null;
          const angle =
            (segment.start + segment.fraction / 2) * 2 * Math.PI - Math.PI / 2;
          return (
            <SvgText
              key={`${segment.key}-label`}
              x={center + r * Math.cos(angle)}
              y={center + r * Math.sin(angle) + 4}
              // Near white in light mode, near black in dark mode, where the
              // segment colours are lighter.
              fill={c.background}
              fontSize={11}
              fontWeight="700"
              textAnchor="middle"
            >
              {`${percent}%`}
            </SvgText>
          );
        })}
      </Svg>
      <View style={styles.center}>
        <Text style={styles.kcal}>{Math.round(kcal)}</Text>
        <Text style={styles.unit}>kcal</Text>
      </View>
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    center: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
    },
    kcal: {
      fontSize: 28,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      color: c.text,
    },
    unit: {
      ...type.captionStrong,
      color: c.textMuted,
    },
  });
}
