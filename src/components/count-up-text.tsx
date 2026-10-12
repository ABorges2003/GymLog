import { useEffect, useState } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

type Props = {
  value: number;
  format: (value: number) => string;
  style?: StyleProp<TextStyle>;
  // Wait before counting (to follow an entrance animation).
  delay?: number;
  duration?: number;
};

// Counts from 0 up to `value` once, when shown. Only for rare screens (the
// workout summary): it re-renders this one Text every frame for a moment.
export function CountUpText({
  value,
  format,
  style,
  delay = 0,
  duration = 700,
}: Props) {
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    let start: number | null = null;
    const timeout = setTimeout(() => {
      const tick = (now: number) => {
        start ??= now;
        const t = Math.min((now - start) / duration, 1);
        // Ease-out cubic: fast at first, settling on the final value.
        const eased = 1 - Math.pow(1 - t, 3);
        setShown(value * eased);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [value, delay, duration, reducedMotion]);

  return (
    <Text style={style} accessibilityLabel={format(value)}>
      {format(reducedMotion ? value : shown)}
    </Text>
  );
}
