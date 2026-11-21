// Budget slider (decided: own slider on PanResponder, no library). Drag or tap the track; small − / + for
// precision. Smooth: the thumb and the fill follow the finger through an Animated value (no React re-render per
// pixel, transforms only); the amount snaps to 50 PLN steps (haptic tick every 100) and the thumb springs to the
// step when released. A marker shows the minimum; below it the slider glows red, shakes once and says "Too little".
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { buzz, PressScale, useReducedMotion } from "../onboarding/anim";
import { colors, font, mix, springs } from "../theme";
import { formatPln } from "./format";

const THUMB = 28;

type Props = {
  id: string;
  label: string;
  hint?: string;
  value: number;
  max: number;
  minimum: number;
  color: string;
  // The money runs out before this bill (paid in order at the month end).
  shortfall: boolean;
  // Must be stable (useCallback): sliders are memoized so only the dragged one re-renders.
  onChange: (id: string, v: number) => void;
  // Snap step, haptic tick distance and the − / + amount (household budget: 50 / 100 / 100).
  step?: number;
  tickEvery?: number;
  plusMinus?: number;
  // Extra content under the label row (e.g. the investing chapter's description and Return / Risk bars).
  extra?: ReactNode;
  // Small "i" button next to the amount.
  onInfo?: () => void;
  // No track and no − / + (e.g. "Keep it on your account" = whatever is left).
  readOnly?: boolean;
};

function BudgetSliderImpl({
  id,
  label,
  hint,
  value,
  max,
  minimum,
  color,
  shortfall,
  onChange,
  step: STEP = 50,
  tickEvery = 100,
  plusMinus = 100,
  extra,
  onInfo,
  readOnly,
}: Props) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const track = Math.max(1, width - THUMB);
  const toPx = (v: number) => (max > 0 ? (Math.min(Math.max(v, 0), max) / max) * track : 0);

  // Thumb position in px (left edge of the thumb). Driven directly while dragging, sprung otherwise.
  const pos = useRef(new Animated.Value(0)).current;
  const dragging = useRef(false);
  const live = useRef({ track, max, value, onChange, id, STEP, tickEvery });
  live.current = { track, max, value, onChange, id, STEP, tickEvery };
  const lastTick = useRef(value);
  const origin = useRef(0);
  const grab = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const tooLittle = value < minimum;
  const wasTooLittle = useRef(tooLittle);

  // Value changed from outside (− / +, first layout): glide the thumb there.
  useEffect(() => {
    if (dragging.current || width === 0) return;
    Animated.spring(pos, { toValue: toPx(value), ...springs.snappy, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, width, max]);

  // Entering "too little": shake + haptic; the red glow pulses while it stays there.
  useEffect(() => {
    if (tooLittle && !wasTooLittle.current) {
      buzz("medium", null);
      if (!reduced) {
        Animated.sequence([6, -5, 4, -2, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 45, useNativeDriver: true }))).start();
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

  const follow = (fingerX: number) => {
    const l = live.current;
    const px = Math.min(l.track, Math.max(0, fingerX - THUMB / 2));
    pos.setValue(px);
    const next = Math.round(((px / l.track) * l.max) / l.STEP) * l.STEP;
    if (next === l.value) return;
    if (Math.abs(next - lastTick.current) >= l.tickEvery) {
      lastTick.current = next;
      buzz("tick");
    }
    l.onChange(l.id, next);
  };

  const release = () => {
    dragging.current = false;
    Animated.spring(grab, { toValue: 0, ...springs.lively, useNativeDriver: true }).start();
    // Snap the thumb onto the chosen step.
    const l = live.current;
    Animated.spring(pos, { toValue: l.max > 0 ? (l.value / l.max) * l.track : 0, ...springs.snappy, useNativeDriver: true }).start();
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        dragging.current = true;
        pos.stopAnimation();
        origin.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
        Animated.spring(grab, { toValue: 1, ...springs.snappy, useNativeDriver: true }).start();
        follow(e.nativeEvent.locationX);
      },
      onPanResponderMove: (_, g) => follow(g.moveX - origin.current),
      onPanResponderRelease: release,
      onPanResponderTerminate: release,
    }),
  ).current;

  const nudge = (d: number) => {
    const next = Math.max(0, Math.min(max, value + d));
    if (next !== value) {
      buzz("tick");
      onChange(id, next);
    }
  };

  const tint = tooLittle ? colors.danger : color;
  const full = Math.max(1, width);
  // Fill = scaled full-width bar (transform only, no layout per frame).
  const fillScale = Animated.multiply(Animated.add(pos, THUMB / 2), 1 / full);
  const minPos = toPx(minimum);

  return (
    <Animated.View
      style={[styles.card, tooLittle || shortfall ? { borderColor: mix(colors.danger, colors.surface, 70) } : null, { transform: [{ translateX: shake }] }]}
    >
      <View style={styles.head}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.hint, tooLittle || shortfall ? { color: colors.danger } : null]} numberOfLines={1}>
            {tooLittle ? `Too little: min ${formatPln(minimum)}` : shortfall ? "Not enough money left for this" : hint ?? (minimum > 0 ? `min ${formatPln(minimum)}` : " ")}
          </Text>
        </View>
        <Text style={[styles.amount, tooLittle ? { color: colors.danger } : null]}>{formatPln(value)}</Text>
        {onInfo ? (
          <PressScale onPress={onInfo} accessibilityLabel={`About ${label}`} style={styles.info}>
            <Text style={styles.infoText}>i</Text>
          </PressScale>
        ) : null}
      </View>
      {extra}

      {readOnly ? null : (
      <View style={styles.row}>
        <PressScale onPress={() => nudge(-plusMinus)} accessibilityLabel={`Less for ${label}`} style={styles.pm}>
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
          {width > 0 ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={[styles.fill, { width: full, backgroundColor: tint, transform: [{ scaleX: fillScale }] }]}
              />
              {tooLittle && !reduced ? (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.glow, { width: full, opacity: Animated.multiply(glow, 0.35), transform: [{ scaleX: fillScale }] }]}
                />
              ) : null}
              {minimum > 0 ? <View pointerEvents="none" style={[styles.minMark, { left: minPos + THUMB / 2 - 1 }]} /> : null}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.thumb,
                  { borderColor: tint, transform: [{ translateX: pos }, { scale: grab.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }] },
                ]}
              />
            </>
          ) : null}
        </View>
        <PressScale onPress={() => nudge(plusMinus)} accessibilityLabel={`More for ${label}`} style={styles.pm}>
          <Text style={styles.pmText}>+</Text>
        </PressScale>
      </View>
      )}
    </Animated.View>
  );
}

export const BudgetSlider = memo(BudgetSliderImpl);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, padding: 12, gap: 10 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  label: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  hint: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted },
  amount: { fontFamily: font.extrabold, fontSize: 18, color: colors.petrol950, fontVariant: ["tabular-nums"] },
  info: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: colors.petrol700, alignItems: "center", justifyContent: "center" },
  infoText: { fontFamily: font.extrabold, fontSize: 13, lineHeight: 16, color: colors.petrol700 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  pm: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  pmText: { fontFamily: font.extrabold, fontSize: 18, lineHeight: 20, color: colors.petrol800 },
  trackBox: { flex: 1, height: THUMB + 10, justifyContent: "center" },
  track: { position: "absolute", left: THUMB / 2, right: THUMB / 2, height: 10, borderRadius: 5, backgroundColor: colors.surface2 },
  fill: { position: "absolute", left: 0, height: 10, borderRadius: 5, transformOrigin: "left" },
  glow: { position: "absolute", left: 0, height: 18, borderRadius: 9, backgroundColor: colors.danger, transformOrigin: "left" },
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
