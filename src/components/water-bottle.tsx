import { useEffect } from "react";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { ClipPath, Defs, Path, Rect } from "react-native-svg";

import { useColors } from "@/theme/theme";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Drawn in a 60 × 120 box: cap on top, then the neck and the body.
const VIEW_WIDTH = 60;
const VIEW_HEIGHT = 120;
const BODY_PATH =
  "M22 14 H38 V20 C38 25 48 28 48 38 V106 C48 113 43 118 36 118 H24 C17 118 12 113 12 106 V38 C12 28 22 25 22 20 Z";
// Water fills the body between these heights.
const WATER_TOP = 18;
const WATER_BOTTOM = 118;

const FILL_EASING = Easing.bezier(0.23, 1, 0.32, 1);
const FILL_DURATION = 600;

type Props = {
  // 0 (empty) to 1 (full); larger values show a full bottle.
  ratio: number;
  height: number;
};

// Bottle that fills up to `ratio`, animating when it changes.
export function WaterBottle({ ratio, height }: Props) {
  const c = useColors();
  const level = useSharedValue(0);
  const clamped = Math.max(0, Math.min(ratio, 1));

  useEffect(() => {
    level.set(
      withTiming(clamped, {
        duration: FILL_DURATION,
        easing: FILL_EASING,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [level, clamped]);

  const waterProps = useAnimatedProps(() => {
    const top = WATER_BOTTOM - level.get() * (WATER_BOTTOM - WATER_TOP);
    return { y: top, height: WATER_BOTTOM - top };
  });

  return (
    <Svg
      width={(height * VIEW_WIDTH) / VIEW_HEIGHT}
      height={height}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
    >
      <Defs>
        <ClipPath id="bottle-body">
          <Path d={BODY_PATH} />
        </ClipPath>
      </Defs>
      <Rect x={20} y={3} width={20} height={9} rx={3} fill={c.water} />
      <Path d={BODY_PATH} fill={c.waterSoft} />
      <AnimatedRect
        x={0}
        width={VIEW_WIDTH}
        fill={c.water}
        clipPath="url(#bottle-body)"
        animatedProps={waterProps}
      />
      {/* Glass outline and a soft highlight on the left. */}
      <Path d={BODY_PATH} fill="none" stroke={c.water} strokeWidth={2.5} />
      <Rect
        x={17}
        y={44}
        width={4}
        height={48}
        rx={2}
        fill={c.card}
        opacity={0.35}
      />
    </Svg>
  );
}
