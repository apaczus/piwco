// Animation building blocks (React Native Animated + react-native-svg), mirroring the artifact's motion.
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Circle, G, Path, type CircleProps, type PathProps } from "react-native-svg";
import { playSound, type SoundName } from "../sound";
import { springs } from "../theme";

type SpringConfig = { stiffness: number; damping: number; mass: number };

// The phone's "reduce motion" setting: when on, skip decorative motion (tilts, wiggles, confetti, rolling numbers).
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

export const drawEasing = Easing.bezier(0.6, 0, 0.2, 1);

// Light haptic tick (the artifact's navigator.vibrate). "success" = the celebratory double tap.
// Haptic + sound. Default sounds: "success" -> success chime, "light" -> soft pop; "tick" and "medium" are silent
// unless a sound is passed (e.g. "error" for a wrong answer, "coin" for a transfer). null = haptic only.
export function buzz(strength: "tick" | "light" | "medium" | "success" = "tick", sound?: SoundName | null) {
  const s = sound === undefined ? (strength === "success" ? "success" : strength === "light" ? "pop" : null) : sound;
  if (s) playSound(s);
  // The web version (GitHub Pages) has no haptics: browsers block or ignore vibration.
  if (Platform.OS === "web") return;
  const p =
    strength === "tick"
      ? Haptics.selectionAsync()
      : strength === "success"
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(
            strength === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
          );
  p.catch(() => {});
}

// 0 -> 1 spring that starts on mount (after `delay` ms). Runs once: later re-renders never restart it.
export function useMountSpring(spring: SpringConfig, delay = 0, useNativeDriver = true) {
  const v = useRef(new Animated.Value(0)).current;
  const config = useRef({ spring, delay, useNativeDriver }).current;
  useEffect(() => {
    const a = Animated.sequence([
      Animated.delay(config.delay),
      Animated.spring(v, { toValue: 1, ...config.spring, useNativeDriver: config.useNativeDriver }),
    ]);
    a.start();
    return () => a.stop();
  }, [v, config]);
  return v;
}

const clamp01 = { inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" as const };

// Element entrance: fade + slide in (staggered by the caller through `delay`).
export function Enter({
  children,
  delay = 0,
  from = "right",
  distance,
  spring = springs.soft,
  style,
}: {
  children: ReactNode;
  delay?: number;
  from?: "right" | "left" | "below";
  distance?: number;
  spring?: SpringConfig;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useMountSpring(spring, delay);
  const d = distance ?? (from === "below" ? 14 : 22);
  const offset = v.interpolate({
    inputRange: [0, 1],
    outputRange: [from === "left" ? -d : d, 0],
  });
  const transform = from === "below" ? [{ translateY: offset }] : [{ translateX: offset }];
  return (
    <Animated.View style={[style, { opacity: v.interpolate(clamp01), transform }]}>{children}</Animated.View>
  );
}

// Button press: shrink to .965 while held, springy release.
export function PressScale({
  children,
  onPress,
  disabled,
  style,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() =>
        Animated.timing(scale, {
          toValue: 0.965,
          duration: 110,
          easing: Easing.bezier(0.3, 0, 0.5, 1),
          useNativeDriver: true,
        }).start()
      }
      onPressOut={() => Animated.spring(scale, { toValue: 1, ...springs.snappy, useNativeDriver: true }).start()}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

// SVG line that draws itself. `length` must be >= the real path length (an over-estimate is fine).
export function DrawPath({
  length,
  delay = 0,
  duration = 900,
  ...props
}: PathProps & { length: number; delay?: number; duration?: number }) {
  const offset = useRef(new Animated.Value(length)).current;
  useEffect(() => {
    const a = Animated.timing(offset, {
      toValue: 0,
      duration,
      delay,
      easing: drawEasing,
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [offset, delay, duration]);
  return <AnimatedPath {...props} strokeDasharray={[length, length]} strokeDashoffset={offset} />;
}

export function DrawCircle({
  length,
  delay = 0,
  duration = 600,
  ...props
}: CircleProps & { length: number; delay?: number; duration?: number }) {
  const offset = useRef(new Animated.Value(length)).current;
  useEffect(() => {
    const a = Animated.timing(offset, {
      toValue: 0,
      duration,
      delay,
      easing: drawEasing,
      useNativeDriver: false,
    });
    a.start();
    return () => a.stop();
  }, [offset, delay, duration]);
  return <AnimatedCircle {...props} strokeDasharray={[length, length]} strokeDashoffset={offset} />;
}

// SVG group that fades in after `delay` (the artifact's "pop").
export function PopG({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const v = useMountSpring(springs.lively, delay, false);
  return <AnimatedG opacity={v.interpolate(clamp01)}>{children}</AnimatedG>;
}
