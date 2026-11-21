// A number that rolls to its new value (fast ease-out) and gives a small pop when it changes.
// With "reduce motion" on it just shows the new value.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useReducedMotion } from "../onboarding/anim";
import { formatPln } from "./format";

export function RollingNumber({
  value,
  from,
  format = formatPln,
  duration = 450,
  delay = 0,
  style,
  containerStyle,
  numberOfLines,
  adjustsFontSizeToFit,
}: {
  value: number;
  // Start value on mount (e.g. what the HUD showed before an action screen); defaults to `value` (no roll).
  from?: number;
  format?: (n: number) => string;
  duration?: number;
  delay?: number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(from ?? value);
  const shownRef = useRef(shown);
  const pop = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    const start = shownRef.current;
    const end = value;
    const isFirst = first.current;
    first.current = false;
    if (start === end) return;
    if (reduced) {
      shownRef.current = end;
      setShown(end);
      return;
    }
    const wait = isFirst ? delay : 0;
    Animated.sequence([
      Animated.delay(wait),
      Animated.timing(pop, { toValue: 1.07, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, stiffness: 320, damping: 14, mass: 1, useNativeDriver: true }),
    ]).start();
    const t0 = Date.now() + wait;
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, Math.max(0, (Date.now() - t0) / duration));
      const eased = 1 - (1 - p) ** 3;
      const v = Math.round(start + (end - start) * eased);
      if (v !== shownRef.current) {
        shownRef.current = v;
        setShown(v);
      }
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced, duration, delay, pop]);

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale: pop }] }]}>
      <Text style={style} numberOfLines={numberOfLines} adjustsFontSizeToFit={adjustsFontSizeToFit}>
        {format(shown)}
      </Text>
    </Animated.View>
  );
}
