// The game: welcome (first mission) -> play (mission, HUD, actions) -> draw / budget -> receipt -> result -> lesson -> city -> roadmap.
import { levels } from "@piwco/content";
import { cityLevels, forecastCity, netWorth, type HouseholdCategory } from "@piwco/engine";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cityConfigFor } from "../city/buildings";
import { CityGrew } from "../city/CityGrew";
import { CityPage } from "../city/CityPage";
import { changedBuildings, type Levels } from "../city/levelUp";
import { CityScene } from "../city/CityScene";
import { GamePager } from "../city/GamePager";
import { buzz } from "../onboarding/anim";
import { preloadSounds } from "../sound";
import { Sky, type TimeOfDay } from "../sky/Sky";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow, SkyToneContext, Sub, Title } from "../onboarding/ui";
import { colors, font } from "../theme";
import type { ActionId } from "./ActionBar";
import { BudgetScreen } from "./BudgetScreen";
import { DrawSheet } from "./DrawSheet";
import type { HudMemory } from "./GameHud";
import { GameScreen } from "./GameScreen";
import { MonthIntro } from "./MonthIntro";
import { MonthResult, Roadmap } from "./MonthResult";
import { fillLesson } from "./lesson";
import { buildReceipt } from "./receipt";
import { SettlementReceipt } from "./SettlementReceipt";
import { SwipeLesson } from "./SwipeLesson";
import { MonthSheet } from "./MonthSheet";
import {
  act,
  endMonth,
  endReview,
  newSession,
  randomSeed,
  replay,
  rewindTo,
  startReview,
  undoEndMonth,
  type Phase,
  type Session,
} from "./session";
import { BackButton } from "./BackButton";
import { WelcomeToGame } from "./WelcomeToGame";

function timeOfDay(phase: Phase): TimeOfDay {
  switch (phase) {
    case "intro":
    case "play":
    case "draw":
    case "budget":
      return "day";
    case "receipt":
      return "sunset";
    case "welcome":
    case "result":
    case "lesson":
    case "city":
    case "roadmap":
      return "night";
  }
}

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
  // The "Swipe left to see your city" hint shows until CITY was opened once in this session.
  const [cityOpened, setCityOpened] = useState(false);
  useEffect(() => preloadSounds(), []);
  // Last numbers shown by the HUD (it rolls from them after every action screen). Reset on a new game.
  const hudMemory = useRef<HudMemory | null>(null);
  // City levels / net worth the player has already seen (CITY shows these, the difference plays as a level up).
  // null until the first game screen: then it starts at the forecast, so a new game starts without a badge.
  const [shown, setShown] = useState<{ levels: Levels; worth: number } | null>(null);
  // Seen levels at the start of each month: replaying a month goes back to them (no animation).
  const monthStartShown = useRef<Record<number, { levels: Levels; worth: number }>>({});
  // Badge value on the previous game screen (a higher one gets a haptic tick).
  const lastBadge = useRef(0);
  // Seen city levels just before each "End month": going back from the receipt restores them, "Review" replays
  // the month's level up from them.
  const shownBeforeEnd = useRef<Record<number, { levels: Levels; worth: number }>>({});
  // "Review": what the replayed city has shown so far (the real progress is not touched).
  const [reviewShown, setReviewShown] = useState<{ levels: Levels; worth: number } | null>(null);
  // Completed month tapped on the year map (Review / Replay card).
  const [sheetMonth, setSheetMonth] = useState<number | null>(null);
  // CITY page currently visible (starts the level up).
  const [onCity, setOnCity] = useState(false);

  // The city during the month = the month-end forecast (same as the HUD). Only while playing the month.
  const playForecast =
    session && session.phase === "play"
      ? forecastCity(session.game, session.completedMonth, cityConfigFor(session.game))
      : null;
  useEffect(() => {
    if (!playForecast || !session) return;
    const start = shown ?? { levels: playForecast.city.levels, worth: playForecast.netWorth };
    if (!shown) setShown(start);
    monthStartShown.current[session.game.month] ??= start;
  }, [playForecast, shown, session]);
  const badge = playForecast && shown ? changedBuildings(playForecast.city.levels, shown.levels).length : 0;
  useEffect(() => {
    if (session?.phase === "play") lastBadge.current = badge;
  });

  // Day/night cycle, tied to the game phase (decided): the month is played in daylight, the receipt is the
  // sunset, everything after the month (result, lesson, city, year) is night; "Accept mission" / replay = sunrise.
  const time: TimeOfDay = session ? timeOfDay(session.phase) : "day";
  const night = time === "night";

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
        setOnCity(false);
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
        <Eyebrow>Piwco</Eyebrow>
        <Title>This industry isn't playable yet</Title>
        <Sub>Gastronomy, IT & Software and Manufacturing are ready. The other industries are coming soon.</Sub>
      </ScreenLayout>
    );
  } else {
    // "Review" shows a completed month's pass from the history; otherwise the month being played.
    const rec = session.reviewing !== null ? session.history.find((h) => h.month === session.reviewing) : undefined;
    const viewResult = rec ? { report: rec.report, goal: rec.goal } : session.result;
    const viewGame = rec ? rec.settled : session.game;
    const viewCompleted = rec ? rec.month : session.completedMonth;
    const level = levels.find((l) => l.month === (rec ? rec.month : session.game.month)) ?? levels[0]!;
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
      case "play": {
        const config = cityConfigFor(session.game);
        const forecast = playForecast ?? forecastCity(session.game, session.completedMonth, config);
        const seen = shown ?? { levels: forecast.city.levels, worth: forecast.netWorth };
        const learn = (
          <GameScreen
            state={session.game}
            level={level}
            dir={dir}
            celebrated={celebrated.current}
            onCelebrated={(ids) => ids.forEach((id) => celebrated.current.add(id))}
            hudMemory={hudMemory}
            backdrop={<CityScene city={forecast.city} />}
            showSwipeHint={!cityOpened}
            onAction={(id: ActionId) => {
              if (id === "draw") toPhase("draw");
              else if (id === "budget") toPhase("budget");
            }}
            onEndMonth={() => {
              buzz("medium", "pop");
              if (shown) shownBeforeEnd.current[session.game.month] = shown;
              go(endMonth);
            }}
          />
        );
        screen = (
          <GamePager
            learn={learn}
            city={
              <CityPage
                city={forecast.city}
                netWorth={forecast.netWorth}
                config={config}
                shown={seen.levels}
                shownWorth={seen.worth}
                active={onCity}
                onSeen={() => setShown({ levels: forecast.city.levels, worth: forecast.netWorth })}
              />
            }
            cityBadge={badge}
            badgeFrom={lastBadge.current}
            onPage={(p) => {
              setOnCity(p === 1);
              if (p === 1) setCityOpened(true);
            }}
          />
        );
        break;
      }
      case "draw":
        screen = (
          <DrawSheet
            state={session.game}
            dir={dir}
            onCancel={() => toPhase("play", -1)}
            onConfirm={(amount) => {
              buzz("light", "coin");
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
      case "receipt":
        screen = viewResult ? (
          <SettlementReceipt
            receipt={buildReceipt(viewResult.report, viewGame.log)}
            monthName={level.monthName}
            dir={dir}
            onContinue={() => toPhase("result")}
          />
        ) : null;
        break;
      case "result":
        screen = viewResult ? (
          <MonthResult
            level={level}
            report={viewResult.report}
            goal={viewResult.goal}
            dir={dir}
            onReplay={() => {
              celebrated.current = new Set();
              // Back to the city as seen at the start of the month, without a level up.
              setShown(monthStartShown.current[session.game.month] ?? null);
              lastBadge.current = 0;
              go(replay, -1);
            }}
            onContinue={() => toPhase(level.lesson ? "lesson" : "city")}
          />
        ) : null;
        break;
      case "lesson":
        screen =
          level.lesson && viewResult ? (
            <SwipeLesson
              title={level.lesson.title}
              monthName={level.monthName}
              cards={fillLesson(level.lesson, viewResult.report)}
              onDone={() => toPhase("city")}
            />
          ) : null;
        break;
      case "city": {
        // The month is settled: the city of the real state (no forecast).
        const config = cityConfigFor(viewGame);
        const real = cityLevels(viewGame, viewCompleted, config);
        const worth = netWorth(viewGame);
        const seen = rec ? reviewShown : shown;
        screen = (
          <CityGrew
            city={real}
            netWorth={worth}
            shown={seen?.levels ?? real.levels}
            shownWorth={seen?.worth ?? worth}
            onSeen={() => (rec ? setReviewShown : setShown)({ levels: real.levels, worth })}
            monthName={level.monthName}
            dir={dir}
            onContinue={() => (rec ? go(endReview) : toPhase("roadmap"))}
          />
        );
        break;
      }
      case "roadmap":
        screen = (
          <>
            <Roadmap
              completedMonth={session.completedMonth}
              dir={dir}
              onPickMonth={(m) => {
                buzz("tick");
                setSheetMonth(m);
              }}
              onNewGame={() => {
                celebrated.current = new Set();
                hudMemory.current = null;
                setShown(null);
                monthStartShown.current = {};
                shownBeforeEnd.current = {};
                lastBadge.current = 0;
                go(() => newSession(industryId ?? "", randomSeed())!, -1);
              }}
            />
            {sheetMonth !== null ? (
              <MonthSheet
                level={levels.find((l) => l.month === sheetMonth) ?? levels[0]!}
                laterMonths={session.history.filter((h) => h.month > sheetMonth).length}
                onClose={() => setSheetMonth(null)}
                onReview={() => {
                  const m = sheetMonth;
                  setSheetMonth(null);
                  setReviewShown(shownBeforeEnd.current[m] ?? null);
                  go((s) => startReview(s, m));
                }}
                onReplay={() => {
                  const m = sheetMonth;
                  setSheetMonth(null);
                  // Time goes back: the city as seen at that month's start, mission and badge start over.
                  celebrated.current = new Set();
                  setShown(monthStartShown.current[m] ?? null);
                  lastBadge.current = 0;
                  go((s) => rewindTo(s, m), -1);
                }}
              />
            ) : null}
          </>
        );
        break;
    }
  }

  // ‹ back: after the month, step by step back to the month itself (the receipt undoes "End month").
  let back: (() => void) | null = null;
  if (session) {
    const lvl = levels.find((l) => l.month === (session.reviewing ?? session.game.month)) ?? levels[0]!;
    switch (session.phase) {
      case "welcome":
        back = router.canGoBack() ? () => router.back() : null;
        break;
      case "receipt":
        back =
          session.reviewing !== null
            ? () => go(endReview, -1)
            : () => {
                setShown(shownBeforeEnd.current[session.game.month] ?? null);
                go(undoEndMonth, -1);
              };
        break;
      case "result":
        back = () => toPhase("receipt", -1);
        break;
      case "lesson":
        back = () => toPhase("result", -1);
        break;
      case "city":
        back = () => toPhase(lvl.lesson ? "lesson" : "result", -1);
        break;
      case "roadmap":
        back = () => toPhase("city", -1);
        break;
      default:
        back = null;
    }
  }

  const screenKey = session ? `${session.phase}-${navId}` : "none";
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={night ? "light" : "dark"} />
      <Sky time={time} />
      <View
        style={{
          flex: 1,
          paddingTop: Math.max(12, insets.top),
          paddingBottom: Math.max(16, insets.bottom),
          paddingHorizontal: 18,
        }}
      >
        {back ? (
          <View style={{ paddingBottom: 4, alignItems: "flex-start" }}>
            <BackButton onPress={back} night={night} />
          </View>
        ) : null}
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
            <SkyToneContext.Provider value={night ? "night" : "day"}>{screen}</SkyToneContext.Provider>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
