// Sun, moon and stars for the sky, driven by the game's time of day (not the clock).
// Everything stays in the top band of the screen, behind the content, and runs on the native driver.
//  - sunrise (night → day): the sun climbs from the right horizon; during the day it drifts slowly;
//  - sunset (receipt): it slides down the arc and turns orange;
//  - night: the sun is gone, a crescent moon rises with a soft glow, faint stars twinkle.
// Reduced motion: no arc travel, drift or twinkle; things just fade.
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import { useReducedMotion } from "../onboarding/anim";
import type { TimeOfDay } from "./Sky";

const SUN = 40;
const GLOW = 150;
const MOON = 30;
// Sun path p: 0 = rising at the right edge, ~0.3–0.6 = day, 0.82 = setting (low, orange), 1 = gone.
const ARC_STEPS = [0, 0.25, 0.5, 0.75, 1];
const DAY_START = 0.32;
const DAY_END = 0.6;
const SUNSET = 0.82;

function Glow({ size, color, id }: { size: number; color: string; id: string }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.55} />
          <Stop offset="0.45" stopColor={color} stopOpacity={0.18} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

// Stars at fixed pseudo-random spots in the top band (same every time).
const STARS = Array.from({ length: 22 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return { x: r(1), y: r(2), size: 1.4 + r(3) * 1.6, period: 1600 + r(4) * 1800, delay: r(5) * 1500 };
});

function Star({ x, y, size, period, delay, still }: (typeof STARS)[number] & { still: boolean }) {
  const v = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.25, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [still, v, period, delay]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: `${x * 100}%`,
        top: 8 + y * 170,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#FFFFFF",
        opacity: v,
      }}
    />
  );
}

export function Celestial({ time }: { time: TimeOfDay }) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const sunP = useRef(new Animated.Value(time === "day" ? DAY_START : time === "sunset" ? SUNSET : 1)).current;
  const sunO = useRef(new Animated.Value(time === "night" ? 0 : 1)).current;
  const moon = useRef(new Animated.Value(time === "night" ? 1 : 0)).current;
  const stars = useRef(new Animated.Value(time === "night" ? 1 : 0)).current;
  const prev = useRef<TimeOfDay>(time);

  useEffect(() => {
    const from = prev.current;
    prev.current = time;
    const t = (v: Animated.Value, toValue: number, duration: number, delay = 0, easing = Easing.inOut(Easing.cubic)) =>
      Animated.timing(v, { toValue, duration: reduced ? Math.min(duration, 300) : duration, delay: reduced ? 0 : delay, easing, useNativeDriver: true });
    let a: Animated.CompositeAnimation;
    if (time === "day") {
      // Sunrise from the night (or straight into the day): climb, then drift very slowly.
      if (from === "night" && !reduced) sunP.setValue(0.02);
      a = Animated.parallel([
        t(moon, 0, 700),
        t(stars, 0, 700),
        t(sunO, 1, 900, 150),
        Animated.sequence([
          t(sunP, DAY_START, reduced ? 0 : 2400, 150, Easing.out(Easing.cubic)),
          ...(reduced ? [] : [t(sunP, DAY_END, 120_000, 0, Easing.linear)]),
        ]),
      ]);
    } else if (time === "sunset") {
      a = Animated.parallel([t(sunO, 1, 400), t(moon, 0, 400), t(stars, 0, 400), t(sunP, SUNSET, 2600, 0, Easing.inOut(Easing.quad))]);
    } else {
      // Night: the sun sinks out, the moon rises, stars come out.
      a = Animated.parallel([
        t(sunP, 1, 1400, 0, Easing.in(Easing.quad)),
        t(sunO, 0, 1200),
        t(moon, 1, 1600, 500, Easing.out(Easing.cubic)),
        t(stars, 1, 1800, 700),
      ]);
    }
    a.start();
    return () => a.stop();
  }, [time, reduced, sunP, sunO, moon, stars]);

  // Arc in the top band: rises at the right edge (x 1.05·W), sets towards the middle (0.42·W); peak 38 px from the top.
  const xs = ARC_STEPS.map((p) => width * (1.05 - 0.63 * p) - SUN / 2);
  const ys = ARC_STEPS.map((p) => 150 - Math.sin(p * Math.PI) * 112 - SUN / 2);
  const sunX = sunP.interpolate({ inputRange: ARC_STEPS, outputRange: xs });
  const sunY = sunP.interpolate({ inputRange: ARC_STEPS, outputRange: ys });
  // Warm at the horizon: orange while rising and setting, yellow in the day.
  const orange = sunP.interpolate({ inputRange: [0, 0.15, 0.65, 0.8, 1], outputRange: [0.7, 0, 0, 1, 1], extrapolate: "clamp" });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: stars }]}>
        {STARS.map((s, i) => (
          <Star key={i} {...s} still={reduced} />
        ))}
      </Animated.View>

      <Animated.View style={[styles.abs, { opacity: sunO, transform: [{ translateX: sunX }, { translateY: sunY }] }]}>
        <View style={[styles.abs, { left: SUN / 2 - GLOW / 2, top: SUN / 2 - GLOW / 2 }]}>
          <Glow size={GLOW} color="#FFC94D" id="sunGlow" />
        </View>
        <View style={[styles.sun, { backgroundColor: "#FFD84D" }]} />
        <Animated.View style={[styles.sun, styles.abs, { backgroundColor: "#FF8A4C", opacity: orange }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.abs,
          {
            left: width * 0.8,
            top: 46,
            opacity: moon,
            transform: [{ translateY: moon.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }],
          },
        ]}
      >
        <View style={[styles.abs, { left: MOON / 2 - 60, top: MOON / 2 - 60 }]}>
          <Glow size={120} color="#E9F1FF" id="moonGlow" />
        </View>
        <Svg width={MOON} height={MOON} viewBox="0 0 30 30">
          <Path d="M19 2 A13 13 0 1 0 28 22 A11 11 0 1 1 19 2 Z" fill="#F4EBC8" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: "absolute", left: 0, top: 0 },
  sun: { width: SUN, height: SUN, borderRadius: SUN / 2 },
});
