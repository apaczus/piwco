// The "level up" moment. The city shows levels the player has already seen (`shown`); the game computes the
// current ones. When the city becomes visible (`active`) and they differ, each changed building pops to its new
// level one after another: up = grows 0.6 → 1.12 → 1 from its base + "Level up!" (+ confetti once),
// down = short shrink + "−1 level". Then `onSeen()` (the parent stores current as seen).
import { BUILDINGS, type BuildingId, type CityLevel } from "@piwco/engine";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { buzz, useReducedMotion } from "../onboarding/anim";
import { colors, font, springs } from "../theme";
import { Confetti } from "../game/Confetti";
import type { BuildingDecorator } from "./CityScene";

export type Levels = Record<BuildingId, CityLevel>;

const START_MS = 350;
const STAGGER_MS = 260;
const FLOAT_MS = 1000;

export function changedBuildings(current: Levels, shown: Levels): BuildingId[] {
  return BUILDINGS.filter((id) => current[id] !== shown[id]);
}

function AnimatedBar({ level, color }: { level: number; color: string }) {
  const v = useRef(new Animated.Value(level)).current;
  useEffect(() => {
    // Width can't use the native driver; it's one small bar.
    Animated.spring(v, { toValue: level, ...springs.bar, useNativeDriver: false }).start();
  }, [level, v]);
  return (
    <Animated.View
      style={[styles.bar, { backgroundColor: color, width: v.interpolate({ inputRange: [0, 3], outputRange: ["0%", "100%"] }) }]}
    />
  );
}

export function useLevelUp({
  current,
  shown,
  active,
  onSeen,
}: {
  current: Levels;
  shown: Levels;
  active: boolean;
  onSeen: () => void;
}) {
  const reduced = useReducedMotion();
  const changed = changedBuildings(current, shown);
  const key = changed.map((id) => `${id}:${shown[id]}>${current[id]}`).join(",");
  const [revealed, setRevealed] = useState<ReadonlySet<BuildingId>>(new Set());
  const [started, setStarted] = useState(false);
  const running = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const anims = useRef<Partial<Record<BuildingId, { scale: Animated.Value; float: Animated.Value; up: boolean }>>>({});
  const firstUp = useRef<BuildingId | null>(null);
  const onSeenRef = useRef(onSeen);
  onSeenRef.current = onSeen;

  const anim = (id: BuildingId) => (anims.current[id] ??= { scale: new Animated.Value(1), float: new Animated.Value(0), up: true });

  // Timers only stop when the page goes away (switching back to LEARN mid-way lets the moment finish).
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!active || changed.length === 0 || running.current) return;
    running.current = true;
    const ups = changed.filter((id) => current[id] > shown[id]);
    firstUp.current = ups[0] ?? null;
    const finish = () => {
      onSeenRef.current();
      setRevealed(new Set());
      setStarted(false);
      running.current = false;
    };
    if (reduced) {
      setStarted(true);
      setRevealed(new Set(changed));
      if (ups.length > 0) buzz("success");
      timers.current.push(setTimeout(finish, 700));
      return;
    }
    timers.current.push(setTimeout(() => setStarted(true), START_MS));
    changed.forEach((id, i) => {
      timers.current.push(
        setTimeout(() => {
          const a = anim(id);
          a.up = current[id] > shown[id];
          setRevealed((r) => new Set(r).add(id));
          a.float.setValue(0);
          Animated.timing(a.float, { toValue: 1, duration: FLOAT_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
          if (a.up) {
            a.scale.setValue(0.6);
            Animated.sequence([
              Animated.timing(a.scale, { toValue: 1.12, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.spring(a.scale, { toValue: 1, ...springs.lively, useNativeDriver: true }),
            ]).start();
            buzz(id === firstUp.current ? "success" : "light");
          } else {
            Animated.sequence([
              Animated.timing(a.scale, { toValue: 0.92, duration: 120, useNativeDriver: true }),
              Animated.spring(a.scale, { toValue: 1, ...springs.snappy, useNativeDriver: true }),
            ]).start();
            buzz("medium", null);
          }
        }, START_MS + i * STAGGER_MS),
      );
    });
    timers.current.push(setTimeout(finish, START_MS + (changed.length - 1) * STAGGER_MS + FLOAT_MS));
    // `key` captures what changed; the rest is read through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key, reduced]);

  const display = {} as Levels;
  for (const id of BUILDINGS) display[id] = revealed.has(id) ? current[id] : shown[id];

  const decorate: BuildingDecorator = (id, node, geo) => {
    const a = anims.current[id];
    if (!a) return node;
    const isRevealed = revealed.has(id);
    return (
      <Animated.View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { transformOrigin: `${geo.cxPct}% ${geo.basePct}%`, transform: [{ scale: a.scale }] }]}
      >
        {node}
        {isRevealed && !reduced ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.floatBox,
              {
                left: `${geo.cxPct}%`,
                top: `${geo.topPct}%`,
                opacity: a.float.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                transform: [{ translateX: -60 }, { translateY: a.float.interpolate({ inputRange: [0, 1], outputRange: [-6, -38] }) }],
              },
            ]}
          >
            <Text style={[styles.floatText, { color: a.up ? colors.yellow : colors.danger }]}>
              {a.up ? "Level up!" : "−1 level"}
            </Text>
          </Animated.View>
        ) : null}
        {isRevealed && !reduced && id === firstUp.current ? (
          <View pointerEvents="none" style={[styles.confetti, { left: `${geo.cxPct}%`, top: `${geo.topPct}%` }]}>
            <Confetti count={40} spread={0.9} />
          </View>
        ) : null}
      </Animated.View>
    );
  };

  const barFor = (id: BuildingId, color: string) => <AnimatedBar level={display[id]} color={color} />;

  // Waiting = there is something to show and it hasn't started yet (the net worth keeps its old value meanwhile).
  return { display, decorate, barFor, waiting: changed.length > 0 && !started };
}

const styles = StyleSheet.create({
  bar: { height: "100%", borderRadius: 4 },
  floatBox: { position: "absolute", width: 120, alignItems: "center" },
  floatText: {
    fontFamily: font.extrabold,
    fontSize: 15,
    textShadowColor: "rgba(0,38,45,0.55)",
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  confetti: { position: "absolute", width: 0, height: 0 },
});
