// "Welcome to the game": shown right after the onboarding. Confetti, the business badge,
// the starter pack counting up, and the first mission.
import { tutorial, type Level } from "@piwco/content";
import type { GameState } from "@piwco/engine";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { buzz, Enter, useMountSpring } from "../onboarding/anim";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta } from "../onboarding/ui";
import { colors, font, springs } from "../theme";
import { Confetti } from "./Confetti";
import { formatPln } from "./format";
import { usePrivatePlayer } from "./privatePlayer";

const BUSINESS_NOUN: Record<string, string> = {
  gastronomy: "restaurant",
  it_software: "software house",
  manufacturing: "workshop",
};

function IndustryIcon({ industry }: { industry: string }) {
  const s = { fill: "none", stroke: colors.yellow, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <Svg width={52} height={52} viewBox="0 0 24 24">
      {industry === "gastronomy" ? (
        <>
          <Path d="M5 16a7 7 0 0 1 14 0" {...s} />
          <Path d="M3 18.5h18" {...s} />
          <Circle cx={12} cy={7.5} r={1.2} fill={colors.yellow} />
        </>
      ) : industry === "it_software" ? (
        <>
          <Rect x={4} y={5} width={16} height={11} rx={2} {...s} />
          <Path d="M2 19h20" {...s} />
          <Path d="M10 8.5l-2 2 2 2M14 8.5l2 2-2 2" {...s} />
        </>
      ) : (
        <>
          <Path d="M3 20V10l5 3v-3l5 3V6h4v14z" {...s} />
          <Path d="M2 20h20" {...s} />
        </>
      )}
    </Svg>
  );
}

// The badge pops in with a springy overshoot.
function Badge({ industry }: { industry: string }) {
  const v = useMountSpring(springs.lively, 150);
  return (
    <Animated.View
      style={[
        styles.badge,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
        },
      ]}
    >
      <IndustryIcon industry={industry} />
    </Animated.View>
  );
}

// A number that counts up from 0 (JS-driven text, so it runs only briefly).
function CountUp({ to, delay }: { to: number; delay: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const a = new Animated.Value(0);
    const id = a.addListener(({ value: v }) => setValue(Math.round(v / 10) * 10));
    Animated.timing(a, {
      toValue: to,
      duration: 1000,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => setValue(to));
    return () => {
      a.removeListener(id);
      a.stopAnimation();
    };
  }, [to, delay]);
  return <Text style={styles.statValue}>{formatPln(value)}</Text>;
}

function Stat({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <CountUp to={value} delay={delay} />
    </View>
  );
}

function StarIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"
        fill={colors.yellow}
        stroke={colors.yellow700}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function WelcomeToGame({
  state,
  level,
  dir,
  onAccept,
  warmUp = false,
}: {
  state: GameState;
  level: Level;
  dir: Dir;
  onAccept: () => void;
  // The player knows the basics but no later chapter is playable yet: January is a warm-up.
  warmUp?: boolean;
}) {
  const industry = state.business.industry;
  // Private persons have no company: no industry badge, home money and cushion instead.
  const priv = usePrivatePlayer();
  const mission = level.mission;
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const t = setTimeout(() => buzz("success"), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <ScreenLayout dir={dir} center footer={<Cta label="Accept mission" onPress={onAccept} onPetrol appear />}>
      <View style={styles.brand}>
        <View style={styles.brandMark} />
        <Text style={styles.brandText}>PIWCO</Text>
      </View>
      <View style={styles.badgeWrap}>
        {priv ? <View style={{ height: 8 }} /> : <Badge industry={industry} />}
        <Confetti delay={300} count={44} />
      </View>
      <Text style={styles.title}>Welcome to the game!</Text>
      <Text style={styles.sub}>
        {priv ? tutorial.privatePlayer.welcomeSub : `Your ${BUSINESS_NOUN[industry] ?? "business"} is open. Here's what you start with:`}
      </Text>
      {priv ? (
        <View style={styles.stats}>
          <Stat label="Home cash" value={state.personal.cash} delay={500} />
          <Stat label="Cushion" value={state.personal.emergencyFund} delay={650} />
        </View>
      ) : (
        <View style={styles.stats}>
          <Stat label="Company cash" value={state.business.cash} delay={500} />
          <Stat label="Revenue / month" value={state.business.monthlyRevenue} delay={650} />
          <Stat label="Home cash" value={state.personal.cash} delay={800} />
        </View>
      )}
      {mission ? (
        <Enter from="below" distance={40} delay={900} spring={springs.lively} style={{ alignSelf: "stretch" }}>
          <View style={styles.missionShadow}>
            <View style={styles.mission}>
              <View style={styles.missionBar} />
              <Text style={styles.missionSmall}>{`YOUR FIRST MISSION · ${level.monthName.toUpperCase()}`}</Text>
              <Text style={styles.missionTitle}>{mission.title}</Text>
              {mission.steps.map((s, i) => (
                <View key={s.id} style={styles.step}>
                  <View style={styles.stepNo}>
                    <Text style={styles.stepNoText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{s.label}</Text>
                </View>
              ))}
              <View style={styles.reward}>
                <StarIcon />
                <Text style={styles.rewardText}>{mission.reward}</Text>
              </View>
            </View>
          </View>
        </Enter>
      ) : null}
      {warmUp ? (
        <Enter from="below" delay={1100}>
          <Text style={styles.warmUp}>
            You know the basics: the credit and investing chapters are coming. Start with a quick January warm-up.
          </Text>
        </Enter>
      ) : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  warmUp: { fontFamily: font.semibold, fontSize: 13.5, lineHeight: 19, color: colors.onPetrolSub, textAlign: "center", paddingHorizontal: 8 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: { width: 10.5, height: 10.5, borderRadius: 3, backgroundColor: colors.yellow, transform: [{ rotate: "45deg" }] },
  brandText: { fontFamily: font.extrabold, fontSize: 12.5, letterSpacing: 1.75, color: colors.yellow },
  badgeWrap: { alignItems: "center", justifyContent: "center", marginTop: 4 },
  badge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.petrol800,
    borderWidth: 4,
    borderColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.yellow,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  title: {
    fontFamily: font.extrabold,
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.6,
    color: colors.onPetrol,
    textAlign: "center",
  },
  sub: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.onPetrolSub, textAlign: "center", maxWidth: 320 },
  stats: { flexDirection: "row", gap: 8, alignSelf: "stretch" },
  stat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
  },
  statLabel: { fontFamily: font.bold, fontSize: 11, color: colors.onPetrolMuted, textAlign: "center" },
  statValue: { fontFamily: font.extrabold, fontSize: 14.5, color: "#FFFFFF", fontVariant: ["tabular-nums"] },
  missionShadow: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  mission: { borderRadius: 20, overflow: "hidden", padding: 16, paddingTop: 20, gap: 10 },
  missionBar: { position: "absolute", left: 0, top: 0, right: 0, height: 6, backgroundColor: colors.yellow },
  missionSmall: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 0.9, color: colors.petrol700 },
  missionTitle: { fontFamily: font.extrabold, fontSize: 20, lineHeight: 25, color: colors.petrol950 },
  step: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepNo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.petrol100,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNoText: { fontFamily: font.extrabold, fontSize: 13, color: colors.petrol800 },
  stepText: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  reward: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    backgroundColor: "#FFF8D6",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  rewardText: { flex: 1, fontFamily: font.bold, fontSize: 13.5, color: colors.petrol900 },
});
