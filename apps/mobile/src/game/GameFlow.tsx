// The game: welcome (first mission) -> play (mission, HUD, actions) -> draw / budget -> result -> roadmap.
import { levels } from "@piwco/content";
import type { HouseholdCategory } from "@piwco/engine";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buzz } from "../onboarding/anim";
import { WelcomeBackground } from "../onboarding/Hud";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow, Sub, Title } from "../onboarding/ui";
import { colors, font } from "../theme";
import type { ActionId } from "./ActionBar";
import { BudgetScreen } from "./BudgetScreen";
import { DrawSheet } from "./DrawSheet";
import { GameScreen } from "./GameScreen";
import { MonthIntro } from "./MonthIntro";
import { MonthResult, Roadmap } from "./MonthResult";
import { act, endMonth, newSession, randomSeed, replay, type Phase, type Session } from "./session";
import { WelcomeToGame } from "./WelcomeToGame";

export function GameFlow({ industryId }: { industryId: string | null }) {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null>(() =>
    industryId ? newSession(industryId, randomSeed()) : null,
  );
  const [dir, setDir] = useState<Dir>(1);
  const [navId, setNavId] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const out = useRef(new Animated.Value(1)).current;
  const exitX = useRef(new Animated.Value(-28)).current;
  const busy = useRef(false);
  // Mission steps already celebrated this month (the game screen remounts after every action screen).
  const celebrated = useRef(new Set<string>());

  // Dark petrol background (like the onboarding welcome) only on the "Welcome to the game" screen.
  const petrol = session?.phase === "welcome";
  const petrolAnim = useRef(new Animated.Value(petrol ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(petrolAnim, { toValue: petrol ? 1 : 0, duration: 600, useNativeDriver: true }).start();
  }, [petrol, petrolAnim]);

  // Same smooth transition as the onboarding: old screen out, new one in only after it has rendered.
  useLayoutEffect(() => {
    out.setValue(1);
    busy.current = false;
  }, [navId, out]);

  function go(update: (s: Session) => Session, d: Dir = 1) {
    if (busy.current) return;
    busy.current = true;
    exitX.setValue(d === -1 ? 28 : -28);
    Animated.timing(out, { toValue: 0, duration: 170, easing: Easing.bezier(0.4, 0, 1, 1), useNativeDriver: true }).start(
      () => {
        setDir(d);
        setError(null);
        setSession((s) => (s ? update(s) : s));
        setNavId((n) => n + 1);
      },
    );
  }

  const toPhase = (phase: Phase, d: Dir = 1) => go((s) => ({ ...s, phase }), d);

  let screen: ReactNode;
  if (!session) {
    screen = (
      <ScreenLayout dir={1} footer={<Cta label="Back to the analysis" onPress={() => router.back()} />}>
        <Eyebrow>Finance Quest</Eyebrow>
        <Title>This industry isn't playable yet</Title>
        <Sub>Gastronomy, IT & Software and Manufacturing are ready. The other industries are coming soon.</Sub>
      </ScreenLayout>
    );
  } else {
    const level = levels.find((l) => l.month === session.game.month) ?? levels[0]!;
    switch (session.phase) {
      case "welcome":
        screen = (
          <WelcomeToGame
            state={session.game}
            level={level}
            dir={dir}
            onAccept={() => {
              buzz("light");
              toPhase("play");
            }}
          />
        );
        break;
      case "intro":
        screen = <MonthIntro level={level} dir={dir} onStart={() => toPhase("play")} />;
        break;
      case "play":
        screen = (
          <GameScreen
            state={session.game}
            level={level}
            dir={dir}
            celebrated={celebrated.current}
            onCelebrated={(ids) => ids.forEach((id) => celebrated.current.add(id))}
            onAction={(id: ActionId) => {
              if (id === "draw") toPhase("draw");
              else if (id === "budget") toPhase("budget");
            }}
            onEndMonth={() => {
              buzz("medium");
              go(endMonth);
            }}
          />
        );
        break;
      case "draw":
        screen = (
          <DrawSheet
            state={session.game}
            dir={dir}
            onCancel={() => toPhase("play", -1)}
            onConfirm={(amount) => {
              buzz("light");
              go((s) => act(s, { type: "owner_draw", amount }).session, -1);
            }}
          />
        );
        break;
      case "budget":
        screen = (
          <BudgetScreen
            state={session.game}
            dir={dir}
            onCancel={() => toPhase("play", -1)}
            onSave={(spending: Record<HouseholdCategory, number>) => {
              const r = act(session, { type: "set_household_budget", spending });
              if (r.error) {
                setError(r.error);
                return;
              }
              buzz("light");
              go(() => r.session, -1);
            }}
          />
        );
        break;
      case "result":
        screen = session.result ? (
          <MonthResult
            level={level}
            report={session.result.report}
            goal={session.result.goal}
            dir={dir}
            onReplay={() => {
              celebrated.current = new Set();
              go(replay, -1);
            }}
            onContinue={() => toPhase("roadmap")}
          />
        ) : null;
        break;
      case "roadmap":
        screen = (
          <Roadmap
            completedMonth={session.completedMonth}
            dir={dir}
            onPlayAgain={() => {
              celebrated.current = new Set();
              go(() => newSession(industryId ?? "", randomSeed())!, -1);
            }}
          />
        );
        break;
    }
  }

  const screenKey = session ? `${session.phase}-${navId}` : "none";
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={petrol ? "light" : "dark"} />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.petrol900, opacity: petrolAnim }]}
      >
        <WelcomeBackground />
      </Animated.View>
      <View
        style={{
          flex: 1,
          paddingTop: Math.max(12, insets.top),
          paddingBottom: Math.max(16, insets.bottom),
          paddingHorizontal: 18,
        }}
      >
        {error ? (
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: colors.danger, paddingVertical: 6 }}>{error}</Text>
        ) : null}
        <Animated.View
          style={{
            flex: 1,
            opacity: out,
            transform: [
              { translateX: Animated.multiply(out.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), exitX) },
              { scale: out.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
            ],
          }}
        >
          <View key={screenKey} style={{ flex: 1 }}>
            {screen}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
