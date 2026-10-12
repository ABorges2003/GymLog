import { useState, type ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { EASE_OUT, motion } from "@/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

// Button that shrinks a little while pressed, so every tap gets instant
// feedback. Uses a Reanimated CSS transition (runs on the UI thread). With
// "remove animations" on, it only dims.
export function PressableScale({
  style,
  children,
  onPressIn,
  onPressOut,
  ...props
}: Props) {
  const [pressed, setPressed] = useState(false);
  const reducedMotion = useReducedMotion();

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      pressRetentionOffset={16}
      style={[
        {
          transform: [{ scale: pressed && !reducedMotion ? 0.97 : 1 }],
          transitionProperty: "transform",
          transitionDuration: motion.press,
          transitionTimingFunction: EASE_OUT,
        },
        // After the transform so a caller's disabled opacity still applies.
        style,
        pressed && reducedMotion && { opacity: 0.7 },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
