import { StyleSheet, View, useWindowDimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";

import { chartScale } from "@/lib/progress";
import { formatWeight } from "@/lib/sets";

type Props = {
  // `average` (optional) is drawn as a second, dashed line without points.
  points: { label: string; weightKg: number; average?: number }[];
};

const Y_AXIS_WIDTH = 44;
const POINT_SPACING = 64;

// Line chart of weights over time, with an optional average line; scrolls
// sideways when there are many points.
export function WeightChart({ points }: Props) {
  const { width } = useWindowDimensions();
  const averages = points.flatMap((point) =>
    point.average === undefined ? [] : [point.average],
  );
  const scale = chartScale([
    ...points.map((point) => point.weightKg),
    ...averages,
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
          averages.length === points.length
            ? averages.map((value) => ({ value }))
            : undefined
        }
        color2="#f59e0b"
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
        color="#7c3aed"
        thickness={3}
        dataPointsColor="#7c3aed"
        dataPointsRadius={5}
        textColor="#1f2937"
        textFontSize={12}
        textShiftY={-10}
        textShiftX={-8}
        yAxisColor="#d0d4da"
        xAxisColor="#d0d4da"
        rulesColor="#eef0f3"
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        scrollToEnd
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    overflow: "hidden",
  },
  axisText: {
    fontSize: 11,
    color: "gray",
  },
});
