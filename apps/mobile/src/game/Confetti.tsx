// Confetti burst: small pieces fly up and out, then fall with gravity. Runs on the native driver.
import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { accountColors, colors } from "../theme";

const PALETTE = [colors.yellow, "#FFFFFF", accountColors.cushion.color, accountColors.future.color, "#F2C200", "#5FD3BC"];

type Piece = {
  color: string;
  w: number;
  h: number;
  round: boolean;
  xs: number[];
  ys: number[];
  spins: string[];
};

const STEPS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];

// Ballistic path sampled at STEPS (Animated interpolation needs explicit points).
function makePiece(spread: number): Piece {
  const angle = (-90 + (Math.random() * 2 - 1) * 75) * (Math.PI / 180); // mostly upwards
  const speed = 260 + Math.random() * 260;
  const vx = Math.cos(angle) * speed * spread;
  const vy = Math.sin(angle) * speed;
  const g = 900;
  const t = 1.5; // seconds of flight mapped onto progress 0..1
  const spin = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540);
  return {
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? colors.yellow,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    round: Math.random() < 0.3,
    xs: STEPS.map((p) => vx * p * t),
    ys: STEPS.map((p) => vy * p * t + 0.5 * g * (p * t) ** 2),
    spins: STEPS.map((p) => `${spin * p}deg`),
  };
}

export function Confetti({ count = 40, delay = 0, spread = 1 }: { count?: number; delay?: number; spread?: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const pieces = useMemo(() => Array.from({ length: count }, () => makePiece(spread)), [count, spread]);
  useEffect(() => {
    const a = Animated.timing(progress, {
      toValue: 1,
      duration: 1600,
      delay,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [progress, delay]);

  return (
    // A zero-size anchor: place it where the burst should start; pieces fly out from here.
    <View pointerEvents="none" style={styles.anchor}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: p.w,
            height: p.round ? p.w : p.h,
            borderRadius: p.round ? p.w / 2 : 2,
            backgroundColor: p.color,
            opacity: progress.interpolate({ inputRange: [0, 0.02, 0.8, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: progress.interpolate({ inputRange: STEPS, outputRange: p.xs }) },
              { translateY: progress.interpolate({ inputRange: STEPS, outputRange: p.ys }) },
              { rotate: progress.interpolate({ inputRange: STEPS, outputRange: p.spins }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: "absolute", left: "50%", top: "50%", width: 0, height: 0, overflow: "visible", zIndex: 50 },
});
