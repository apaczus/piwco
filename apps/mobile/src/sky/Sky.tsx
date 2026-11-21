// Sky behind the whole game: day, sunset or night, chosen by the game phase (not the clock).
// Three stacked layers crossfade on the native driver. Content always sits on top; the sky only tints the
// background, so texts and numbers keep their contrast (cards are opaque).
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { WelcomeBackground } from "../onboarding/Hud";
import { useReducedMotion } from "../onboarding/anim";
import { colors } from "../theme";
import { Celestial } from "./Celestial";

export type TimeOfDay = "day" | "sunset" | "night";

const TIMES: TimeOfDay[] = ["day", "sunset", "night"];
const FADE_MS = 900;

export function Sky({ time }: { time: TimeOfDay }) {
  const reduced = useReducedMotion();
  const layers = useRef(TIMES.map((t) => new Animated.Value(t === time ? 1 : 0))).current;

  useEffect(() => {
    const a = Animated.parallel(
      TIMES.map((t, i) =>
        Animated.timing(layers[i]!, { toValue: t === time ? 1 : 0, duration: reduced ? 250 : FADE_MS, useNativeDriver: true }),
      ),
    );
    a.start();
    return () => a.stop();
  }, [time, reduced, layers]);

  return (
    <>
      {/* Day: the app's light background with a warm glow at the top. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: layers[0] }]}>
        <LinearGradient
          colors={["#FFF1D6", "#F6F4EC", colors.bg]}
          locations={[0, 0.22, 0.5]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* Sunset: peach and rose at the top, still light where the content is. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: layers[1] }]}>
        <LinearGradient
          colors={["#F7A98B", "#FFD2B0", "#FBE9DC", colors.bg]}
          locations={[0, 0.16, 0.38, 0.7]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {/* Night: the petrol welcome background (drifting soft circles). */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.petrol900, opacity: layers[2] }]}>
        <WelcomeBackground />
      </Animated.View>
      <Celestial time={time} />
    </>
  );
}
