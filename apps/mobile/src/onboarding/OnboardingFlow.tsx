// The whole onboarding: state, navigation, screen transitions (artifact: render() / next() / back()).
import { setPlayerProfile } from "../game/profile";
import { onboarding, type AgeBandId } from "@piwco/content";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DEV_SKIP_INDUSTRY, DEV_SKIP_TO_GAME } from "../devFlags";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";
import { buzz } from "./anim";
import {
  currentItem,
  flowFor,
  initialOnboardingState,
  progressOf,
  questionsFor,
  type OnboardingState,
  type PlayerType,
} from "./flow";
import { Hud, WelcomeBackground } from "./Hud";
import {
  AgeScreen,
  BlockDoneScreen,
  ExplainScreen,
  FirmScreen,
  IndustryScreen,
  QuestionScreen,
  ResultScreen,
  TypeScreen,
  WelcomeScreen,
  type Dir,
} from "./screens";

const LAST_SLIDE = onboarding.welcomeSlides.length - 1;

export function OnboardingFlow() {
  const insets = useSafeAreaInsets();
  const [s, setS] = useState<OnboardingState>(initialOnboardingState);
  const [dir, setDir] = useState<Dir>(1);
  // Value just tapped on a single-choice screen; the screen is locked until it moves on.
  const [chosen, setChosen] = useState<string | null>(null);
  // Increments on every navigation; the new screen becomes visible only after it has rendered.
  const [navId, setNavId] = useState(0);
  const out = useRef(new Animated.Value(1)).current;
  // Exit slide distance (+28 going back, -28 going forward). An Animated.Value, so changing it doesn't re-render.
  const exitX = useRef(new Animated.Value(-28)).current;
  const busy = useRef(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const item = currentItem(s);
  const petrol = item.kind === "welcome";
  // Petrol welcome background fades in/out on the native thread (opacity only).
  const petrolAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(petrolAnim, { toValue: petrol ? 1 : 0, duration: 600, useNativeDriver: true }).start();
  }, [petrol, petrolAnim]);
  useEffect(() => () => {
    if (pending.current) clearTimeout(pending.current);
  }, []);

  // Show the container again only once the NEW screen is mounted. Resetting it right after setState
  // (before React had rendered) flashed the old screen for a moment, which looked like a refresh.
  useLayoutEffect(() => {
    out.setValue(1);
    busy.current = false;
  }, [navId, out]);

  // Old screen fades/slides out (170 ms), then the new one renders and its elements spring in.
  function go(update: (prev: OnboardingState) => OnboardingState, d: Dir) {
    if (busy.current) return;
    busy.current = true;
    exitX.setValue(d === -1 ? 28 : -28);
    Animated.timing(out, {
      toValue: 0,
      duration: 170,
      easing: Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: true,
    }).start(() => {
      setDir(d);
      setChosen(null);
      setS(update);
      setNavId((n) => n + 1);
    });
  }

  const next = () => go((p) => ({ ...p, step: Math.min(p.step + 1, flowFor(p).length - 1) }), 1);

  const back = () => {
    buzz("tick");
    if (item.kind === "welcome") {
      if (s.welcomeSlide > 0) go((p) => ({ ...p, welcomeSlide: p.welcomeSlide - 1 }), -1);
      return;
    }
    go((p) => ({ ...p, step: Math.max(0, p.step - 1) }), -1);
  };

  // Single choice: highlight, haptic tick, move on after a short pause.
  function choose(value: string, delay: number, apply: (p: OnboardingState) => OnboardingState) {
    if (chosen !== null) return;
    setChosen(value);
    buzz("tick");
    pending.current = setTimeout(
      () => go((p) => {
        const updated = apply(p);
        return { ...updated, step: Math.min(updated.step + 1, flowFor(updated).length - 1) };
      }, 1),
      delay,
    );
  }

  const progress = progressOf(s);
  const screenKey = item.kind === "welcome" ? `welcome-${s.welcomeSlide}` : `${item.kind}-${s.step}`;

  let screen: ReactNode = null;
  switch (item.kind) {
    case "welcome":
      screen = (
        <WelcomeScreen
          slide={s.welcomeSlide}
          dir={dir}
          onNext={() => {
            buzz("tick");
            if (s.welcomeSlide < LAST_SLIDE) go((p) => ({ ...p, welcomeSlide: p.welcomeSlide + 1 }), 1);
            else next();
          }}
          onPrev={() => {
            if (s.welcomeSlide > 0) go((p) => ({ ...p, welcomeSlide: p.welcomeSlide - 1 }), -1);
          }}
          onSkip={next}
        />
      );
      break;
    case "age":
      screen = (
        <AgeScreen
          dir={dir}
          picked={chosen ?? s.age}
          locked={chosen !== null}
          onPick={(age: AgeBandId) => choose(age, 420, (p) => ({ ...p, age }))}
        />
      );
      break;
    case "type":
      screen = (
        <TypeScreen
          dir={dir}
          age={s.age}
          picked={chosen ?? s.type}
          locked={chosen !== null}
          onPick={(type: PlayerType) => choose(type, 380, (p) => ({ ...p, type }))}
        />
      );
      break;
    case "industry":
      screen = (
        <IndustryScreen
          dir={dir}
          picked={chosen ?? s.industry}
          locked={chosen !== null}
          onPick={(industry) => choose(industry, 380, (p) => ({ ...p, industry }))}
        />
      );
      break;
    case "explain":
      screen = <ExplainScreen dir={dir} type={s.type} onNext={next} />;
      break;
    case "firm":
      screen = <FirmScreen dir={dir} onNext={next} />;
      break;
    case "question": {
      const q = questionsFor(s).find((x) => x.id === item.id);
      if (q) {
        screen = (
          <QuestionScreen
            dir={dir}
            question={q}
            answers={s.answers}
            chosen={chosen}
            onPick={(value) => choose(value, 420, (p) => ({ ...p, answers: { ...p.answers, [q.id]: value } }))}
            onToggle={(value) => {
              buzz("tick");
              setS((p) => {
                const cur = p.answers[q.id];
                const list = Array.isArray(cur) ? cur : [];
                const nextList = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
                return { ...p, answers: { ...p.answers, [q.id]: nextList } };
              });
            }}
            onNext={() => {
              buzz("tick");
              // An untouched multi-select counts as "I have none".
              setS((p) => (Array.isArray(p.answers[q.id]) ? p : { ...p, answers: { ...p.answers, [q.id]: [] } }));
              next();
            }}
          />
        );
      }
      break;
    }
    case "done":
      screen = <BlockDoneScreen dir={dir} account={item.account} state={s} onNext={next} />;
      break;
    case "result":
      screen = (
        <ResultScreen
          dir={dir}
          state={s}
          onRestart={() => go(() => ({ ...initialOnboardingState(), step: 1 }), -1)}
        />
      );
      break;
  }

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
        <Hud
          petrol={petrol}
          backHidden={item.kind === "welcome" && s.welcomeSlide === 0}
          onBack={back}
          fraction={progress.fraction}
          counter={progress.counter}
          onSkipToGame={
            DEV_SKIP_TO_GAME
              ? () => {
                  buzz("light");
                  // Skipping = no profile: the game uses the baseline (test profile A).
                  setPlayerProfile(null);
                  router.push({ pathname: "/game", params: { industry: DEV_SKIP_INDUSTRY } });
                }
              : undefined
          }
        />
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
