// The month's mission, pinned at the top of the game screen: steps to tick off and a progress bar.
// A step that got done since the last time the card was shown is celebrated (check pops, haptic, confetti).
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { buzz, DrawPath, PressScale } from "../onboarding/anim";
import { colors, font, springs } from "../theme";
import { Confetti } from "./Confetti";
import type { MissionStatus } from "./mission";

function Check({ done, celebrate }: { done: boolean; celebrate: boolean }) {
  const scale = useRef(new Animated.Value(celebrate ? 0.5 : 1)).current;
  useEffect(() => {
    if (!celebrate) return;
    const a = Animated.sequence([
      Animated.delay(250),
      Animated.spring(scale, { toValue: 1, ...springs.lively, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [celebrate, scale]);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Svg width={26} height={26} viewBox="0 0 26 26">
        <Circle
          cx={13}
          cy={13}
          r={11}
          fill={done ? colors.petrol800 : "none"}
          stroke={done ? colors.petrol800 : colors.line}
          strokeWidth={2}
        />
        {done ? (
          celebrate ? (
            <DrawPath
              length={20}
              delay={300}
              duration={320}
              d="M8 13.5l3.2 3.2 6.8-7.2"
              fill="none"
              stroke={colors.yellow}
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <Path
              d="M8 13.5l3.2 3.2 6.8-7.2"
              fill="none"
              stroke={colors.yellow}
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        ) : null}
      </Svg>
    </Animated.View>
  );
}

// Progress bar: a full-width fill slid in from the left (native driver).
function Progress({ fraction, from }: { fraction: number; from: number }) {
  const v = useRef(new Animated.Value(from)).current;
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const a = Animated.sequence([
      Animated.delay(250),
      Animated.spring(v, { toValue: fraction, ...springs.bar, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [fraction, v]);
  return (
    <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.fill,
            {
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-width, 0], extrapolate: "clamp" }) },
              ],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

export function MissionCard({
  monthName,
  status,
  celebrated,
  onCelebrated,
  onStep,
}: {
  monthName: string;
  status: MissionStatus;
  // Step ids that were already celebrated this month (kept by the game flow across screens).
  celebrated: ReadonlySet<string>;
  onCelebrated: (ids: string[]) => void;
  // Tap on a step that isn't done yet.
  onStep: (id: string) => void;
}) {
  // Decide once, on mount, what is new on this visit.
  const fresh = useRef(status.steps.filter((s) => s.done && !celebrated.has(s.id)).map((s) => s.id)).current;
  const prevDone = useRef(status.steps.filter((s) => s.done && celebrated.has(s.id)).length).current;
  const allDoneNow = status.allDone && fresh.length > 0;

  useEffect(() => {
    if (fresh.length === 0) return;
    const t = setTimeout(() => buzz(allDoneNow ? "success" : "light"), 300);
    onCelebrated(fresh);
    return () => clearTimeout(t);
    // Runs once per visit on purpose (empty dependency list).
  }, []);

  const total = status.steps.length;
  return (
    <View style={styles.shadow}>
      <View style={styles.card}>
        <View style={styles.bar} />
        <View style={styles.head}>
          <Text style={styles.small}>{`MISSION · ${monthName.toUpperCase()}`}</Text>
          <View style={[styles.pill, status.allDone ? styles.pillDone : null]}>
            <Text style={[styles.pillText, status.allDone ? { color: colors.petrol950 } : null]}>
              {`${status.doneCount}/${total}`}
            </Text>
          </View>
        </View>
        <Text style={styles.title}>{status.title}</Text>
        <Progress fraction={status.doneCount / total} from={prevDone / total} />
        {status.steps.map((s) => {
          const tappable = !s.done && s.id !== "all_paid";
          const row = (
            <View style={styles.step}>
              <Check done={s.done} celebrate={fresh.includes(s.id)} />
              <Text style={[styles.stepText, s.done ? styles.stepDone : null]}>{s.label}</Text>
              {tappable ? <Text style={styles.go}>›</Text> : null}
            </View>
          );
          return tappable ? (
            <PressScale key={s.id} onPress={() => onStep(s.id)} accessibilityLabel={s.label} style={styles.stepTap}>
              {row}
            </PressScale>
          ) : (
            <View key={s.id} style={styles.stepTap}>
              {row}
            </View>
          );
        })}
        {status.allDone ? (
          <Text style={styles.ready}>All set! Tap “End month” to see how it went.</Text>
        ) : null}
      </View>
      {allDoneNow ? <Confetti delay={350} count={36} spread={0.9} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    shadowColor: "#00262D",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  card: { borderRadius: 18, overflow: "hidden", padding: 14, paddingTop: 18, gap: 8 },
  bar: { position: "absolute", left: 0, top: 0, right: 0, height: 5, backgroundColor: colors.yellow },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  small: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 0.9, color: colors.petrol700 },
  pill: { backgroundColor: colors.petrol100, borderRadius: 99, paddingVertical: 3, paddingHorizontal: 9 },
  pillDone: { backgroundColor: colors.yellow },
  pillText: { fontFamily: font.extrabold, fontSize: 12, color: colors.petrol800, fontVariant: ["tabular-nums"] },
  title: { fontFamily: font.extrabold, fontSize: 17, lineHeight: 22, color: colors.petrol950 },
  track: { height: 8, borderRadius: 99, backgroundColor: colors.surface2, overflow: "hidden", marginBottom: 2 },
  fill: { borderRadius: 99, backgroundColor: colors.yellow },
  stepTap: { borderRadius: 12 },
  step: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  stepText: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  stepDone: { color: colors.muted, textDecorationLine: "line-through" },
  go: { fontFamily: font.extrabold, fontSize: 22, color: colors.petrol700, marginTop: -2 },
  ready: { fontFamily: font.bold, fontSize: 13.5, color: colors.success },
});
