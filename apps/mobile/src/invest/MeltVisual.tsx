// "Doing nothing costs money": the money on the account melts year by year (lesson info card, visual "melt").
// Years tick 0 → N with a haptic each, the amount rolls down to what it can still buy, the purchasing-power bar
// shrinks (the lost part shows red), then a loss stamp lands with an error haptic + sound. Reduced motion: the end
// state at once.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { buzz, useReducedMotion } from "../onboarding/anim";
import { formatPln } from "../game/format";
import { RollingNumber } from "../game/RollingNumber";
import { colors, font, mix, springs } from "../theme";

const YEAR_MS = 190;
const START_DELAY = 650;

// "10 000 PLN" (non-breaking spaces) -> 10000.
const amountOf = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

export function MeltVisual({ from, to, years, label }: { from: string; to: string; years: number; label: string }) {
  const reduced = useReducedMotion();
  const a = amountOf(from);
  const b = amountOf(to);
  const kept = a > 0 ? b / a : 1;
  const [year, setYear] = useState(reduced ? years : 0);
  const bar = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const stamp = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const done = year >= years;

  useEffect(() => {
    if (reduced) return;
    const anim = Animated.sequence([
      Animated.delay(START_DELAY),
      Animated.timing(bar, { toValue: 1, duration: years * YEAR_MS, easing: Easing.linear, useNativeDriver: true }),
    ]);
    anim.start();
    let y = 0;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      y += 1;
      setYear(y);
      if (y < years) {
        buzz("tick");
        t = setTimeout(tick, YEAR_MS);
      }
    };
    t = setTimeout(tick, START_DELAY + YEAR_MS);
    return () => {
      anim.stop();
      clearTimeout(t);
    };
  }, [reduced, years, bar]);

  useEffect(() => {
    if (!done) return;
    buzz("medium", "error");
    if (!reduced) Animated.spring(stamp, { toValue: 1, ...springs.lively, useNativeDriver: true }).start();
  }, [done, reduced, stamp]);

  const value = Math.round(a * Math.pow(kept, year / years));
  const lostPct = Math.round((1 - kept) * 100);
  return (
    <View style={styles.box}>
      <View style={styles.top}>
        <Text style={styles.year}>{year === 0 ? "Today" : `Year ${year}`}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
      <RollingNumber value={value} duration={YEAR_MS - 20} style={[styles.amount, { color: year === 0 ? colors.petrol950 : colors.danger }]} />
      <View style={styles.track}>
        <View style={[StyleSheet.absoluteFill, styles.lost]} />
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.kept,
            { transform: [{ scaleX: bar.interpolate({ inputRange: [0, 1], outputRange: [1, kept] }) }] },
          ]}
        />
      </View>
      <View style={styles.bottom}>
        <Text style={styles.small}>{`${formatPln(a)} on your account, ${years} years, no investing`}</Text>
        <Animated.View
          style={[
            styles.stamp,
            {
              opacity: stamp,
              transform: [{ rotate: "-8deg" }, { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [1.8, 1] }) }],
            },
          ]}
        >
          <Text style={styles.stampText}>{`−${lostPct}%`}</Text>
        </Animated.View>
      </View>
      {done ? <Text style={styles.gone}>{`${formatPln(a - b)} of buying power gone. You did nothing wrong: you just waited.`}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: mix(colors.danger, colors.surface, 7), borderRadius: 16, padding: 14, gap: 8, borderWidth: 1.5, borderColor: mix(colors.danger, colors.surface, 30) },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  year: { fontFamily: font.extrabold, fontSize: 15, color: colors.danger, fontVariant: ["tabular-nums"] },
  label: { fontFamily: font.semibold, fontSize: 12.5, color: colors.muted },
  amount: { fontFamily: font.extrabold, fontSize: 40, fontVariant: ["tabular-nums"] },
  track: { height: 14, borderRadius: 7, overflow: "hidden" },
  lost: { backgroundColor: colors.danger, opacity: 0.85 },
  kept: { backgroundColor: colors.petrol800, transformOrigin: "left" },
  bottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  small: { flex: 1, fontFamily: font.semibold, fontSize: 12.5, color: colors.muted },
  stamp: { borderWidth: 3, borderColor: colors.danger, borderRadius: 10, paddingVertical: 2, paddingHorizontal: 10, backgroundColor: colors.surface },
  stampText: { fontFamily: font.extrabold, fontSize: 24, color: colors.danger, letterSpacing: 1 },
  gone: { fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: colors.danger },
});
