// The game: welcome (first mission) -> play (mission, HUD, actions) -> draw / budget -> receipt -> result -> lesson -> city -> roadmap.
import { gameEvents, levels } from "@piwco/content";
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
import { CITY_PAGE, GamePager, LEARN_PAGE, type PagerPage } from "../city/GamePager";
import { YearPage } from "./YearPage";
import { MonthDonePage } from "./MonthDonePage";
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
  addToPlan,
  afterDecision,
  endMonth,
  eventPending,
  endReview,
  monthStartPhase,
  newSession,
  openInvest,
  randomSeed,
  repairing,
  replay,
  rewindTo,
  startReview,
  undoEndMonth,
  visibleGame,
  type Phase,
  type Session,
} from "./session";
import { BackButton } from "./BackButton";
import { EventScreen } from "./EventScreen";
import { EventLesson } from "./EventLesson";
import { buildEventLesson, hasEventLesson } from "./eventLesson";
import { getPlayerProfile, householdAnswers, playerKnowledge } from "./profile";
import { skipsMonth, startMonthFor } from "./startMonth";
import { WelcomeToGame } from "./WelcomeToGame";
import { CoachOverlay, CoachProvider, type CoachRegistry } from "./coach";
import { InvestScreen } from "../invest/InvestFlow";
import { backStage, investNight } from "../invest/investSession";

function timeOfDay(phase: Phase): TimeOfDay {
  switch (phase) {
    case "intro":
    case "event":
    case "play":
    case "draw":
    case "budget":
    case "hub":
      return "day";
    case "receipt":
      return "sunset";
    case "welcome":
    case "result":
    case "eventLesson":
    case "lesson":
    case "city":
    case "roadmap":
      return "night";
    case "invest":
      return "day";
  }
}

// A new game for the industry, with the onboarding profile (if the player came through the onboarding).
function startSession(industryId: string | null, chapter: "invest" | null): Session | null {
  if (!industryId) return null;
  const profile = getPlayerProfile();
  const s = newSession(industryId, randomSeed(), householdAnswers(profile), profile?.flags ?? []);
  return s && chapter === "invest" ? openInvest(s) : s;
}

export function GameFlow({ industryId, startChapter = null }: { industryId: string | null; startChapter?: "invest" | null }) {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<Session | null>(() => startSession(industryId, startChapter));
  // Finance knowledge from the survey ("Skip to game" = intermediate): months it skips get a badge on the maps.
  const knowledge = playerKnowledge();
  const skipped = (month: number) => {
    const l = levels.find((x) => x.month === month);
    return !!l && skipsMonth(l, knowledge);
  };
  // Guided tour of the game screen: every time the game is entered (survey or "Skip to game"), before the first
  // move; "?" plays it again. "Start a new game" in the same visit doesn't repeat it.
  const [coachPending, setCoachPending] = useState(true);
  const pagerControl = useRef<{ goTo: (p: PagerPage) => void } | null>(null);
  const [coachOn, setCoachOn] = useState(false);
  const coachRegistry = useRef<CoachRegistry>(new Map()).current;

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
      ? forecastCity(visibleGame(session), session.completedMonth, cityConfigFor(session.game))
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
  const time: TimeOfDay = session
    ? session.phase === "invest" && session.invest
      ? investNight(session.invest.stage)
        ? "night"
        : "day"
      : timeOfDay(session.phase)
    : "day";
  const night = time === "night";

  // The tour starts once the game screen is in.
  useEffect(() => {
    if (!coachPending || session?.phase !== "play") {
      setCoachOn(false);
      return;
    }
    // After the game screen's entrance.
    const t = setTimeout(() => setCoachOn(true), 900);
    return () => clearTimeout(t);
  }, [coachPending, session?.phase, navId]);

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
    // The event lesson is part of the month's first pass only ("Review" skips it).
    const eventLessonNext = !rec && !!viewResult && hasEventLesson(viewResult.report);
    const afterEventLesson: Phase = level.lesson ? "lesson" : "city";
    switch (session.phase) {
      case "welcome":
        screen = (
          <WelcomeToGame
            warmUp={startMonthFor(knowledge, levels).fallback}
            state={session.game}
            level={level}
            dir={dir}
            onAccept={() => {
              buzz("light");
              toPhase(monthStartPhase(session.game));
            }}
          />
        );
        break;
      case "event": {
        const def = session.game.event ? gameEvents.find((e) => e.id === session.game.event!.id) : undefined;
        screen = def ? (
          <EventScreen
            state={session.game}
            def={def}
            dir={dir}
            onAction={(a) => {
              // Stays on the event screen (plot twist / outcome) without a screen transition.
              const r = act(session, a, "event");
              if (r.error) setError(r.error);
              else setSession(r.session);
            }}
            onDone={() => {
              buzz("light");
              toPhase("play");
            }}
          />
        ) : null;
        break;
      }
      case "intro":
        screen = <MonthIntro level={level} dir={dir} onStart={() => toPhase("play")} />;
        break;
      case "play": {
        const config = cityConfigFor(session.game);
        const forecast = playForecast ?? forecastCity(visibleGame(session), session.completedMonth, config);
        const seen = shown ?? { levels: forecast.city.levels, worth: forecast.netWorth };
        const learn = (
          <GameScreen
            state={visibleGame(session)}
            level={level}
            dir={dir}
            celebrated={celebrated.current}
            onCelebrated={(ids) => ids.forEach((id) => celebrated.current.add(id))}
            hudMemory={hudMemory}
            backdrop={<CityScene city={forecast.city} repairing={repairing(session.plan, forecast.city.damaged)} />}
            showSwipeHint={!cityOpened}
            onHelp={() => setCoachPending(true)}
            onAction={(id: ActionId) => {
              if (id === "draw") toPhase("draw");
              else if (id === "budget") toPhase("budget");
            }}
            onEndMonth={() => {
              // An event not seen yet hits before the month can end: the player has to decide first.
              if (eventPending(session)) {
                go(afterDecision);
                return;
              }
              buzz("medium", "pop");
              if (shown) shownBeforeEnd.current[session.game.month] = shown;
              go(endMonth);
            }}
          />
        );
        screen = (
          <GamePager
            controlRef={pagerControl}
            year={<YearPage completedMonth={session.completedMonth} currentMonth={session.game.month} skipped={skipped} />}
            learn={learn}
            city={
              <CityPage
                city={forecast.city}
                netWorth={forecast.netWorth}
                config={config}
                shown={seen.levels}
                shownWorth={seen.worth}
                plan={session.plan}
                active={onCity}
                onSeen={() => setShown({ levels: forecast.city.levels, worth: forecast.netWorth })}
              />
            }
            cityBadge={badge}
            badgeFrom={lastBadge.current}
            onPage={(p) => {
              setOnCity(p === CITY_PAGE);
              if (p === CITY_PAGE) setCityOpened(true);
            }}
          />
        );
        break;
      }
      case "invest":
        screen = session.invest ? (
          <InvestScreen state={session.invest} dir={dir} onChange={(next, d = 1) => go((s) => ({ ...s, invest: next }), d)} />
        ) : null;
        break;
      case "hub": {
        // Between months: the completed month's real city (no forecast, nothing left to level up).
        const config = cityConfigFor(session.game);
        const real = cityLevels(session.game, session.completedMonth, config);
        const worth = netWorth(session.game);
        const nextLevel = levels.find((l) => l.month === session.completedMonth + 1);
        screen = (
          <GamePager
            year={<YearPage completedMonth={session.completedMonth} currentMonth={null} backLabel={`Back to ${level.monthName}`} skipped={skipped} />}
            learn={
              <MonthDonePage
                level={level}
                next={nextLevel}
                backdrop={<CityScene city={real} repairing={repairing(session.plan, real.damaged)} />}
                onYear={() => toPhase("roadmap")}
              />
            }
            city={
              <CityPage
                city={real}
                netWorth={worth}
                config={config}
                shown={real.levels}
                shownWorth={worth}
                plan={session.plan}
                active={false}
                onSeen={() => {}}
                backLabel={`Back to ${level.monthName}`}
              />
            }
          />
        );
        break;
      }
      case "draw":
        screen = (
          <DrawSheet
            state={visibleGame(session)}
            dir={dir}
            onCancel={() => toPhase("play", -1)}
            onConfirm={(amount) => {
              buzz("light", "coin");
              // The month's event hits after the player's first decision (alarm screen), else back to the game.
              go((s) => afterDecision(act(s, { type: "owner_draw", amount }).session), -1);
            }}
          />
        );
        break;
      case "budget":
        screen = (
          <BudgetScreen
            state={visibleGame(session)}
            dir={dir}
            onCancel={() => toPhase("play", -1)}
            onSave={(spending: Record<HouseholdCategory, number>) => {
              const r = act(session, { type: "set_household_budget", spending });
              if (r.error) {
                setError(r.error);
                return;
              }
              buzz("light");
              go(() => afterDecision(r.session), -1);
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
            onContinue={() => toPhase(eventLessonNext ? "eventLesson" : afterEventLesson)}
          />
        ) : null;
        break;
      case "eventLesson": {
        const built = viewResult ? buildEventLesson(viewResult.report, viewGame.financing) : null;
        const damaged = built ? cityLevels(viewGame, viewCompleted, cityConfigFor(viewGame)).damaged[built.building] : false;
        screen = built ? (
          <EventLesson
            lesson={built}
            monthName={level.monthName}
            damaged={damaged}
            onDone={(added) => {
              const plan = built.plan;
              go((s) => {
                const next = { ...s, phase: afterEventLesson };
                return added && plan
                  ? addToPlan(next, { month: s.game.month, eventId: built.eventId, ...plan, building: built.building })
                  : next;
              });
            }}
          />
        ) : null;
        break;
      }
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
            repairing={repairing(rec ? session.plan.filter((p) => p.month <= rec.month) : session.plan, real.damaged)}
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
              skipped={skipped}
              completedMonth={session.completedMonth}
              dir={dir}
              plan={session.plan}
              onBackToGame={session.completedMonth > 0 ? () => toPhase("hub") : undefined}
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
                go((s) => startSession(industryId, null) ?? s, -1);
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
    const hadEventLesson = session.reviewing === null && !!session.result && hasEventLesson(session.result.report);
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
      case "eventLesson":
        back = () => toPhase("result", -1);
        break;
      case "lesson":
        back = () => toPhase(hadEventLesson ? "eventLesson" : "result", -1);
        break;
      case "city":
        back = () => toPhase(lvl.lesson ? "lesson" : hadEventLesson ? "eventLesson" : "result", -1);
        break;
      case "roadmap":
        back = () => toPhase("city", -1);
        break;
      case "hub":
        back = () => toPhase("roadmap", -1);
        break;
      case "invest": {
        const prev = session.invest ? backStage(session.invest.stage) : null;
        // TEMPORARY until step 5: leaving the chapter from its intro goes back to the onboarding.
        back = prev
          ? () => go((s) => ({ ...s, invest: s.invest ? { ...s.invest, stage: prev } : s.invest }), -1)
          : router.canGoBack()
            ? () => router.back()
            : null;
        break;
      }
      default:
        back = null;
    }
  }

  const screenKey = session ? `${session.phase}-${navId}` : "none";
  return (
    <CoachProvider registry={coachRegistry}>
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
    {coachOn ? (
      <CoachOverlay
        registry={coachRegistry}
        onPage={(p) => pagerControl.current?.goTo(p === "year" ? 0 : p === "city" ? CITY_PAGE : LEARN_PAGE)}
        onDone={() => {
          pagerControl.current?.goTo(LEARN_PAGE);
          setCoachOn(false);
          setCoachPending(false);
        }}
      />
    ) : null}
    </CoachProvider>
  );
}
