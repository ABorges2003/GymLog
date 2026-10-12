import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useColors } from "@/theme/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Gauge fill: strong ease-out, a bit longer than a press so the fill reads.
const FILL_EASING = Easing.bezier(0.23, 1, 0.32, 1);
const FILL_DURATION = 600;

type Props = {
  value: number;
  max: number;
  size: number;
  strokeWidth: number;
  // Fill colour (turns red when the value goes over the max).
  color: string;
  // How much of the circle the ring covers, in degrees. 360 is a full
  // circle; less leaves a gap at the bottom, like a gauge.
  sweep?: number;
  // Shown in the middle of the ring.
  children?: ReactNode;
};

// Open ring that fills up to value / max, animating when the value changes.
export function ProgressRing({
  value,
  max,
  size,
  strokeWidth,
  color,
  sweep = 270,
  children,
}: Props) {
  const c = useColors();
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const over = max > 0 && value > max;

  const center = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const arc = (circumference * sweep) / 360;
  // SVG circles start at 3 o'clock; turn so the gap is centred at the bottom.
  const rotation = 90 + (360 - sweep) / 2;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(
      withTiming(ratio, {
        duration: FILL_DURATION,
        easing: FILL_EASING,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [progress, ratio]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: arc * (1 - progress.get()),
    // A zero-length dash with round caps still draws a dot.
    strokeOpacity: progress.get() > 0.001 ? 1 : 0,
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={c.subtle}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          fill="none"
          transform={`rotate(${rotation} ${center} ${center})`}
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={r}
          stroke={over ? c.danger : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
          transform={`rotate(${rotation} ${center} ${center})`}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
