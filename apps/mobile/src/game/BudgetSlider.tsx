// Budget slider (decided: own slider on PanResponder, no library). Drag or tap the track; small − / + for
// precision. Steps of 50 PLN with a haptic tick; a marker shows the minimum; below it the slider glows red,
// shakes once and says "Too little". The amount rolls (RollingNumber).
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { buzz, PressScale, useReducedMotion } from "../onboarding/anim";
import { colors, font, mix, springs } from "../theme";
import { formatPln } from "./format";
import { RollingNumber } from "./RollingNumber";

const STEP = 50;
const THUMB = 28;

export function BudgetSlider({
  label,
  hint,
  value,
  max,
  minimum,
  color,
  // The money runs out before this bill (paid in order at the month end).
  shortfall,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  max: number;
  minimum: number;
  color: string;
  shortfall: boolean;
  onChange: (v: number) => void;
}) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const live = useRef({ width, max, value, onChange });
  live.current = { width, max, value, onChange };
  const lastTick = useRef(value);
  // Page x of the track's left edge, taken when the finger lands (children don't take touches).
  const origin = useRef(0);
  const shake = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const grab = useRef(new Animated.Value(0)).current;
  const tooLittle = value < minimum;
  const wasTooLittle = useRef(tooLittle);

  // Entering "too little": shake + haptic; the red glow pulses while it stays there.
  useEffect(() => {
    if (tooLittle && !wasTooLittle.current) {
      buzz("medium", null);
      if (!reduced) {
        Animated.sequence(
          [6, -5, 4, -2, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 45, useNativeDriver: true })),
        ).start();
      }
    }
    wasTooLittle.current = tooLittle;
    if (!tooLittle || reduced) {
      glow.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.35, duration: 650, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [tooLittle, reduced, shake, glow]);

  const setFromX = (x: number) => {
    const { width: w, max: m, value: v, onChange: change } = live.current;
    if (w <= 0) return;
    const ratio = Math.min(1, Math.max(0, (x - THUMB / 2) / (w - THUMB)));
    const next = Math.round((ratio * m) / STEP) * STEP;
    if (next === v) return;
    // A tick every 100 PLN of movement, so a fast drag doesn't buzz constantly.
    if (Math.abs(next - lastTick.current) >= 100) {
      lastTick.current = next;
      buzz("tick");
    }
    change(next);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        origin.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
        Animated.spring(grab, { toValue: 1, ...springs.snappy, useNativeDriver: true }).start();
        setFromX(e.nativeEvent.locationX);
      },
      onPanResponderMove: (_, g) => setFromX(g.moveX - origin.current),
      onPanResponderRelease: () => Animated.spring(grab, { toValue: 0, ...springs.lively, useNativeDriver: true }).start(),
      onPanResponderTerminate: () => Animated.spring(grab, { toValue: 0, ...springs.lively, useNativeDriver: true }).start(),
    }),
  ).current;

  const track = Math.max(0, width - THUMB);
  const pos = max > 0 ? (Math.min(value, max) / max) * track : 0;
  const minPos = max > 0 ? (Math.min(minimum, max) / max) * track : 0;
  const red = tooLittle;
  const tint = red ? colors.danger : color;

  const step = (d: number) => {
    const next = Math.max(0, Math.min(max, value + d));
    if (next !== value) {
      buzz("tick");
      onChange(next);
    }
  };

  return (
    <Animated.View
      style={[
        styles.card,
        red || shortfall ? { borderColor: mix(colors.danger, colors.surface, 70) } : null,
        { transform: [{ translateX: shake }] },
      ]}
    >
      <View style={styles.head}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.hint, red ? { color: colors.danger } : shortfall ? { color: colors.danger } : null]} numberOfLines={1}>
            {red ? `Too little: min ${formatPln(minimum)}` : shortfall ? "Not enough money left for this" : hint ?? (minimum > 0 ? `min ${formatPln(minimum)}` : " ")}
          </Text>
        </View>
        <RollingNumber value={value} duration={220} style={[styles.amount, red ? { color: colors.danger } : null]} />
      </View>

      <View style={styles.row}>
        <PressScale onPress={() => step(-100)} accessibilityLabel={`Less for ${label}`} style={styles.pm}>
          <Text style={styles.pmText}>−</Text>
        </PressScale>
        <View
          style={styles.trackBox}
          onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
          {...responder.panHandlers}
          accessibilityRole="adjustable"
          accessibilityLabel={`${label}: ${formatPln(value)}`}
        >
          <View pointerEvents="none" style={styles.track} />
          <View pointerEvents="none" style={[styles.fill, { width: pos + THUMB / 2, backgroundColor: tint }]} />
          {red && !reduced ? (
            <Animated.View pointerEvents="none" style={[styles.glow, { width: pos + THUMB / 2, opacity: glow }]} />
          ) : null}
          {minimum > 0 ? <View pointerEvents="none" style={[styles.minMark, { left: minPos + THUMB / 2 - 1 }]} /> : null}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.thumb,
              {
                borderColor: tint,
                transform: [{ translateX: pos }, { scale: grab.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }],
              },
            ]}
          />
        </View>
        <PressScale onPress={() => step(100)} accessibilityLabel={`More for ${label}`} style={styles.pm}>
          <Text style={styles.pmText}>+</Text>
        </PressScale>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, padding: 12, gap: 10 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  label: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  hint: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted },
  amount: { fontFamily: font.extrabold, fontSize: 18, color: colors.petrol950, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  pm: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  pmText: { fontFamily: font.extrabold, fontSize: 18, lineHeight: 20, color: colors.petrol800 },
  trackBox: { flex: 1, height: THUMB + 8, justifyContent: "center" },
  track: { position: "absolute", left: THUMB / 2, right: THUMB / 2, height: 10, borderRadius: 5, backgroundColor: colors.surface2 },
  fill: { position: "absolute", left: 0, height: 10, borderRadius: 5, marginLeft: 0 },
  glow: { position: "absolute", left: 0, height: 18, borderRadius: 9, backgroundColor: colors.danger, opacity: 0.3 },
  minMark: { position: "absolute", width: 2, height: 22, borderRadius: 1, backgroundColor: colors.petrol900, opacity: 0.55 },
  thumb: {
    position: "absolute",
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.surface,
    borderWidth: 3,
    shadowColor: "#00262D",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
