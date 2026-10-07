import { StyleSheet, View, useWindowDimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";

import { chartScale } from "@/lib/progress";
import { formatWeight } from "@/lib/sets";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

type Props = {
  // `secondary` (optional) is drawn as a second, dashed line without points
  // (e.g. a goal).
  points: { label: string; weightKg: number; secondary?: number }[];
};

const Y_AXIS_WIDTH = 44;
const POINT_SPACING = 64;

// Line chart of weights over time, with an optional second line; scrolls
// sideways when there are many points.
export function WeightChart({ points }: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const secondary = points.flatMap((point) =>
    point.secondary === undefined ? [] : [point.secondary],
  );
  const scale = chartScale([
    ...points.map((point) => point.weightKg),
    ...secondary,
  ]);
  // Card padding (16 × 2), screen padding (16 × 2) and the y axis labels.
  const chartWidth = width - 64 - Y_AXIS_WIDTH;

  return (
    <View style={styles.container}>
      <LineChart
        data={points.map((point) => ({
          value: point.weightKg,
          label: point.label,
          dataPointText: formatWeight(point.weightKg),
        }))}
        data2={
          secondary.length === points.length
            ? secondary.map((value) => ({ value }))
            : undefined
        }
        color2={c.warning}
        thickness2={2}
        strokeDashArray2={[6, 4]}
        hideDataPoints2
        width={chartWidth}
        height={200}
        yAxisOffset={scale.offset}
        stepValue={scale.step}
        noOfSections={scale.sections}
        maxValue={scale.step * scale.sections}
        formatYLabel={(label) => formatWeight(Number(label))}
        yAxisLabelWidth={Y_AXIS_WIDTH}
        spacing={POINT_SPACING}
        initialSpacing={24}
        endSpacing={24}
        color={c.accent}
        thickness={3}
        dataPointsColor={c.accent}
        dataPointsRadius={5}
        textColor={c.text}
        textFontSize={12}
        textShiftY={-10}
        textShiftX={-8}
        yAxisColor={c.border}
        xAxisColor={c.border}
        rulesColor={c.subtle}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        scrollToEnd
      />
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      paddingTop: 16,
      overflow: "hidden",
    },
    axisText: {
      fontSize: 11,
      color: c.textMuted,
    },
  });
}
