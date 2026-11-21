// The month's main screen: the mission on top (always visible), action bar (left) + HUD (right),
// and "End month", which pulses once the mission is complete.
import type { Level } from "@piwco/content";
import type { GameState } from "@piwco/engine";
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow } from "../onboarding/ui";
import { ActionBar, type ActionId } from "./ActionBar";
import { GameHud } from "./GameHud";
import { MissionCard } from "./MissionCard";
import { missionStatus } from "./mission";

function Pulse({ active, children }: { active: boolean; children: ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, v]);
  return (
    <Animated.View style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }] }}>
      {children}
    </Animated.View>
  );
}

export function GameScreen({
  state,
  level,
  dir,
  celebrated,
  onCelebrated,
  onAction,
  onEndMonth,
}: {
  state: GameState;
  level: Level;
  dir: Dir;
  celebrated: ReadonlySet<string>;
  onCelebrated: (ids: string[]) => void;
  onAction: (id: ActionId) => void;
  onEndMonth: () => void;
}) {
  const mission = missionStatus(level, state);
  return (
    <ScreenLayout
      dir={dir}
      footer={
        <Pulse active={!!mission?.allDone}>
          <Cta label={mission?.allDone ? "End month ✓" : "End month"} onPress={onEndMonth} />
        </Pulse>
      }
    >
      <Eyebrow>{`Month ${level.month} · ${level.monthName}`}</Eyebrow>
      {mission ? (
        <MissionCard
          monthName={level.monthName}
          status={mission}
          celebrated={celebrated}
          onCelebrated={onCelebrated}
          onStep={(id) => {
            if (id === "pay_yourself") onAction("draw");
            else if (id === "plan_budget") onAction("budget");
          }}
        />
      ) : null}
      <View style={styles.top}>
        <ActionBar month={state.month} onAction={onAction} />
        <View style={{ flex: 1 }}>
          <GameHud state={state} />
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
});
