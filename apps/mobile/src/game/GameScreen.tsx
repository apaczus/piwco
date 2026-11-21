// The month's main screen: the mission on top (always visible), action bar (left) + HUD (right),
// and "End month", which pulses once the mission is complete.
import type { Level } from "@piwco/content";
import type { GameState } from "@piwco/engine";
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow } from "../onboarding/ui";
import { ActionBar, type ActionId } from "./ActionBar";
import { GameHud, type HudMemory } from "./GameHud";
import { SoundToggle } from "./SoundToggle";
import { SwipeHint } from "./SwipeHint";
import { MissionCard } from "./MissionCard";
import { missionStatus } from "./mission";
import { CoachTarget } from "./coach";
import { HelpButton } from "./HelpButton";

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
  hudMemory,
  backdrop,
  showSwipeHint = false,
  onAction,
  onEndMonth,
  onHelp,
}: {
  // "?" in the header: the tutorial again.
  onHelp?: () => void;
  state: GameState;
  level: Level;
  dir: Dir;
  celebrated: ReadonlySet<string>;
  onCelebrated: (ids: string[]) => void;
  // What the HUD showed last time, so its numbers roll from there (kept by GameFlow).
  hudMemory: { current: HudMemory | null };
  // The player's city drawn faintly behind the content (static).
  backdrop?: ReactNode;
  showSwipeHint?: boolean;
  onAction: (id: ActionId) => void;
  onEndMonth: () => void;
}) {
  const mission = missionStatus(level, state);
  return (
    <View style={{ flex: 1 }}>
      {backdrop ? (
        <View pointerEvents="none" style={styles.backdrop}>
          {backdrop}
        </View>
      ) : null}
      <ScreenLayout
        dir={dir}
        footer={
          <CoachTarget id="endMonth">
            <Pulse active={!!mission?.allDone}>
              <Cta label={mission?.allDone ? "End month ✓" : "End month"} onPress={onEndMonth} />
            </Pulse>
          </CoachTarget>
        }
      >
        <View style={styles.headRow}>
          <Eyebrow>{`Month ${level.month} · ${level.monthName}`}</Eyebrow>
          <CoachTarget id="icons">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {onHelp ? <HelpButton onPress={onHelp} /> : null}
              <SoundToggle />
            </View>
          </CoachTarget>
        </View>
        {mission ? (
          <CoachTarget id="mission">
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
          </CoachTarget>
        ) : null}
        <View style={styles.top}>
          <CoachTarget id="actions">
            <ActionBar month={state.month} onAction={onAction} />
          </CoachTarget>
          <View style={{ flex: 1 }}>
            <GameHud state={state} memory={hudMemory} />
          </View>
        </View>
        {showSwipeHint ? <SwipeHint /> : null}
      </ScreenLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  // Above the "End month" button, behind the cards (which are opaque, so numbers stay readable).
  backdrop: { position: "absolute", left: 0, right: 0, bottom: 74, opacity: 0.16 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  top: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
});
