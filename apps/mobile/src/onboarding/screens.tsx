// Onboarding screens, ported from the artifact's welcome() / ageScreen() / typeScreen() / industry() /
// explain() / firm() / question() / blockDone() / result().
import { setPlayerProfile } from "../game/profile";
import {
  onboarding,
  type AccountId,
  type AgeBandId,
  type OnboardingQuestion,
} from "@piwco/content";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { accountColors, colors, font } from "../theme";
import { buzz, DrawCircle, DrawPath, Enter, useMountSpring } from "./anim";
import {
  ACCOUNT_ORDER,
  FOUNDATION_FIRST,
  accountById,
  answerLabel,
  knowledgeLine,
  knowledgeOf,
  buildProfile,
  questionsFor,
  type Answers,
  type OnboardingState,
  type PlayerType,
} from "./flow";
import { FinalFocusCard, FocusCard, Stairs } from "./Stairs";
import { Cta, Eyebrow, InGamePanel, KeyValue, LinkButton, Panel, Sub, Tile, Tiles, Title, Why } from "./ui";
import { WelcomeArt } from "./WelcomeArt";

export type Dir = 1 | -1;

// ---------- Layout ----------

// Scrollable screen: content centered vertically (artifact: .screen::before + .spacer), footer pinned at the bottom.
// Every direct child slides in, staggered by 50 ms; <Tiles> animate on their own.
export function ScreenLayout({
  children,
  footer,
  dir,
  center,
}: {
  children: ReactNode;
  footer?: ReactNode;
  dir: Dir;
  center?: boolean;
}) {
  const items = Children.toArray(children);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={layout.scroll}
        contentContainerStyle={[layout.content, center ? { alignItems: "center" } : null]}
        showsVerticalScrollIndicator={false}
      >
        <View style={layout.topSpacer} />
        {items.map((child, i) =>
          isValidElement(child) && child.type === Tiles ? (
            <View key={i} style={{ alignSelf: "stretch" }}>
              {child}
            </View>
          ) : (
            <Enter
              key={i}
              delay={i * 50}
              from={dir === -1 ? "left" : "right"}
              // Earlier elements stay on top, so an overlay (e.g. the expanded action bar) covers what follows.
              style={[
                center ? { alignSelf: "stretch", alignItems: "center" } : { alignSelf: "stretch" },
                { zIndex: items.length - i },
              ]}
            >
              {child}
            </Enter>
          ),
        )}
        <View style={layout.spacer} />
      </ScrollView>
      {footer ? <View style={layout.footer}>{footer}</View> : null}
    </View>
  );
}

// ---------- Welcome ----------

function Dots({ count, active }: { count: number; active: number }) {
  const grow = useMountSpring({ stiffness: 260, damping: 14, mass: 1 }, 0, false);
  return (
    <View style={welcome.dots}>
      {Array.from({ length: count }, (_, i) =>
        i === active ? (
          <Animated.View
            key={i}
            style={[welcome.dot, { backgroundColor: colors.yellow, width: grow.interpolate({ inputRange: [0, 1], outputRange: [8, 26] }) }]}
          />
        ) : (
          <View key={i} style={welcome.dot} />
        ),
      )}
    </View>
  );
}

export function WelcomeScreen({
  slide,
  dir,
  onNext,
  onPrev,
  onSkip,
}: {
  slide: number;
  dir: Dir;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const slides = onboarding.welcomeSlides;
  const last = slide === slides.length - 1;
  const current = slides[slide] ?? slides[0]!;
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  onNextRef.current = onNext;
  onPrevRef.current = onPrev;
  // Swipe left / right between slides.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) onNextRef.current();
        else if (g.dx > 50) onPrevRef.current();
      },
    }),
  ).current;

  return (
    <View style={{ flex: 1 }} {...pan.panHandlers}>
      <ScreenLayout
        dir={dir}
        center
        footer={
          <>
            <Cta label={last ? "Start with a short analysis" : "Next"} onPress={onNext} onPetrol />
            <LinkButton label="Skip intro" onPress={onSkip} onPetrol hidden={last} />
          </>
        }
      >
        <View style={welcome.brand}>
          <View style={welcome.brandMark} />
          <Text style={welcome.brandText}>{onboarding.brand}</Text>
        </View>
        <View style={welcome.artBox}>
          <LinearGradient
            colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0.03)"]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <WelcomeArt slide={slide} />
        </View>
        <Dots count={slides.length} active={slide} />
        <Text style={welcome.title}>{current.title}</Text>
        <Text style={welcome.sub}>{current.text}</Text>
        {last ? (
          <View style={welcome.pills}>
            {onboarding.welcomePills.map((p) => (
              <View key={p} style={welcome.pill}>
                <Text style={welcome.pillText}>{p}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScreenLayout>
    </View>
  );
}

// ---------- Age / type / industry ----------

export function AgeScreen({
  dir,
  picked,
  locked,
  onPick,
}: {
  dir: Dir;
  picked: string | null;
  locked: boolean;
  onPick: (age: AgeBandId) => void;
}) {
  return (
    <ScreenLayout dir={dir}>
      <Eyebrow>Short analysis</Eyebrow>
      <Title>How old are you?</Title>
      <Why>
        Your age sets your horizon in the game: how much time you have for decisions and for recovering from their
        effects. We'll tailor the questions to it.
      </Why>
      <Tiles>
        {onboarding.ageBands.map((a) => (
          <Tile
            key={a.id}
            label={a.label}
            hint={a.hint}
            mark="single"
            on={picked === a.id}
            dim={locked && picked !== a.id}
            disabled={locked}
            onPress={() => onPick(a.id)}
          />
        ))}
      </Tiles>
    </ScreenLayout>
  );
}

function PersonIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx={12} cy={8} r={4} fill="none" stroke={colors.petrol800} strokeWidth={2} />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke={colors.petrol800} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ShopIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M3 10l2-6h14l2 6M4 10v10h16V10M3 10h18M9 20v-5h6v5"
        fill="none"
        stroke={colors.petrol800}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TypeScreen({
  dir,
  age,
  picked,
  locked,
  onPick,
}: {
  dir: Dir;
  age: AgeBandId | null;
  picked: string | null;
  locked: boolean;
  onPick: (t: PlayerType) => void;
}) {
  const privateHint =
    age === "65"
      ? "Retired, maybe some part-time work"
      : age === "18"
        ? "Studies, first job, contract"
        : "Employed, on contract, or not working";
  const tile = (t: PlayerType, label: string, hint: string, icon: ReactNode) => (
    <Tile
      key={t}
      label={label}
      hint={hint}
      icon={icon}
      on={picked === t}
      dim={locked && picked !== t}
      disabled={locked}
      onPress={() => onPick(t)}
    />
  );
  return (
    <ScreenLayout dir={dir}>
      <Eyebrow>Short analysis</Eyebrow>
      <Title>Who are you?</Title>
      <Sub>We'll move your answers into the game. We don't judge anything.</Sub>
      <Tiles>
        {[
          tile("private", "Private person", privateHint, <PersonIcon />),
          tile("business", "Entrepreneur", "I run a business: sole proprietorship or a company", <ShopIcon />),
        ]}
      </Tiles>
    </ScreenLayout>
  );
}

export function IndustryScreen({
  dir,
  picked,
  locked,
  onPick,
}: {
  dir: Dir;
  picked: string | null;
  locked: boolean;
  onPick: (industryId: string) => void;
}) {
  return (
    <ScreenLayout dir={dir}>
      <Eyebrow>Your company</Eyebrow>
      <Title>What industry are you in?</Title>
      <Why>In the game you'll run a company from this industry, with its typical costs and seasonality.</Why>
      <Tiles twoColumns>
        {onboarding.industries.map((ind) => (
          <Tile
            key={ind.id}
            label={ind.label}
            hint={ind.hint}
            locked={!ind.playable}
            on={picked === ind.id}
            dim={locked && picked !== ind.id}
            disabled={locked}
            onPress={() => onPick(ind.id)}
            style={{ minHeight: 84 }}
          />
        ))}
      </Tiles>
    </ScreenLayout>
  );
}

// ---------- The 4-account rule ----------

export function ExplainScreen({ dir, type, onNext }: { dir: Dir; type: PlayerType | null; onNext: () => void }) {
  const [seen, setSeen] = useState<AccountId[]>([]);
  const [finished, setFinished] = useState(false);
  const [ctaShown, setCtaShown] = useState(false);

  const reveal = (id: AccountId) => {
    setSeen((prev) => (prev.includes(id) ? prev : [...prev, id]));
    buzz("tick");
  };

  useEffect(() => {
    const t1 = setTimeout(() => reveal("main"), 700);
    const t2 = setTimeout(() => setCtaShown(true), 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const step = () => {
    if (finished) return onNext();
    const nextId = ACCOUNT_ORDER.find((id) => !seen.includes(id));
    if (nextId) return reveal(nextId);
    setFinished(true);
  };

  const lastSeen = seen[seen.length - 1];
  const landDelays = Object.fromEntries(seen.map((id) => [id, 0])) as Partial<Record<AccountId, number>>;
  return (
    <ScreenLayout
      dir={dir}
      footer={
        ctaShown ? (
          <Cta
            appear
            label={finished ? (type === "business" ? "Next" : "Check your 4 accounts") : "Next"}
            onPress={step}
          />
        ) : (
          <View style={{ height: 58 }} />
        )
      }
    >
      <Eyebrow>The 4-account rule</Eyebrow>
      <Title>The basic rule of managing money</Title>
      <Sub>Every złoty has its place. Meet the 4 accounts, from the top down to the foundation.</Sub>
      <Stairs
        compact
        built={seen}
        landDelays={landDelays}
        arrows={{
          ids: seen.filter((id) => id !== "main"),
          animate: finished || !lastSeen || lastSeen === "main" ? [] : [lastSeen],
        }}
      />
      <View>
        {finished ? <FinalFocusCard /> : lastSeen ? <FocusCard key={lastSeen} id={lastSeen} /> : null}
      </View>
    </ScreenLayout>
  );
}

export function FirmScreen({ dir, onNext }: { dir: Dir; onNext: () => void }) {
  const [arrowsOn, setArrowsOn] = useState(false);
  const [firmOn, setFirmOn] = useState(false);
  const [ctaShown, setCtaShown] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const placeFirm = () => {
    setFirmOn((on) => {
      if (!on) buzz("medium");
      return true;
    });
  };

  useEffect(() => {
    timers.current = [
      setTimeout(() => setArrowsOn(true), 1300),
      setTimeout(placeFirm, 3600),
      setTimeout(() => setCtaShown(true), 6200),
    ];
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const skip = () => {
    timers.current.forEach(clearTimeout);
    setArrowsOn(true);
    placeFirm();
    timers.current = [setTimeout(() => setCtaShown(true), 300)];
  };

  const landDelays = Object.fromEntries(FOUNDATION_FIRST.map((id, i) => [id, 250 + i * 200])) as Partial<
    Record<AccountId, number>
  >;
  return (
    <ScreenLayout
      dir={dir}
      footer={
        <>
          {ctaShown ? <Cta appear label="Let's check your 4 accounts" onPress={onNext} /> : <View style={{ height: 58 }} />}
          <LinkButton label="Skip animation" onPress={skip} hidden={ctaShown} />
        </>
      }
    >
      <Eyebrow>For entrepreneurs</Eyebrow>
      <Title>Personal finances first, then the company</Title>
      <Sub>You can only manage a company well once your own finances are in order.</Sub>
      <Stairs
        built={ACCOUNT_ORDER}
        landDelays={landDelays}
        firm={{ on: firmOn, animate: true }}
        arrows={arrowsOn ? { ids: ["cushion", "future", "protection"], animate: ["cushion", "future", "protection"] } : null}
      />
      {firmOn ? (
        <Enter key="step2" from="below" distance={10}>
          <Panel
            tint={colors.petrol700}
            title="Step 2: the company on the foundation"
            text="Only on this base do you build company management: a separate account, a tax reserve, growth decisions. That's why the analysis starts with you."
          />
        </Enter>
      ) : (
        <Panel
          tint={accountColors.protection.color}
          title="Step 1: your 4 accounts"
          text="Well-organised personal finances are a stable base. Without a cushion at home, every weak month in the company ends with taking money out of it or with a loan."
        />
      )}
    </ScreenLayout>
  );
}

// ---------- Questions ----------

export function QuestionScreen({
  dir,
  question,
  answers,
  chosen,
  onPick,
  onToggle,
  onNext,
}: {
  dir: Dir;
  question: OnboardingQuestion;
  answers: Answers;
  // Value just tapped on a single-choice question (screen is locked while it moves on).
  chosen: string | null;
  onPick: (value: string) => void;
  onToggle: (value: string) => void;
  onNext: () => void;
}) {
  // "About you" questions (no account) use the petrol eyebrow.
  const account = question.account ? accountById(question.account) : null;
  const { color, ink } = question.account ? accountColors[question.account] : { color: colors.petrol700, ink: colors.petrol700 };
  const index = question.account ? ACCOUNT_ORDER.indexOf(question.account) + 1 : 0;
  const current = answers[question.id];
  const multiPicked = Array.isArray(current) ? current : [];
  // A question with a default starts with it selected; "Next" accepts it.
  const singlePicked = chosen ?? (typeof current === "string" ? current : (question.default ?? null));
  const locked = chosen !== null;

  return (
    <ScreenLayout
      dir={dir}
      footer={
        question.multi ? (
          <Cta label={multiPicked.length ? `Next (${multiPicked.length})` : "I have none"} onPress={onNext} />
        ) : question.default ? (
          <Cta label="Next ›" onPress={() => !locked && onNext()} />
        ) : undefined
      }
    >
      <Eyebrow color={color} ink={ink}>{account ? `${index} of 4 · ${account.name}` : "About you"}</Eyebrow>
      <Title>{question.question}</Title>
      <Why>{question.why}</Why>
      <Tiles twoColumns={question.twoColumns}>
        {question.options.map((o) => {
          const on = question.multi ? multiPicked.includes(o.value) : singlePicked === o.value;
          return (
            <Tile
              key={o.value}
              label={o.label}
              hint={o.note}
              mark={question.multi ? "multi" : "single"}
              on={on}
              dim={locked && !on}
              disabled={locked}
              onPress={() => (question.multi ? onToggle(o.value) : onPick(o.value))}
            />
          );
        })}
      </Tiles>
    </ScreenLayout>
  );
}

export function BlockDoneScreen({
  dir,
  account: id,
  state,
  onNext,
}: {
  dir: Dir;
  account: AccountId;
  state: OnboardingState;
  onNext: () => void;
}) {
  const account = accountById(id);
  const { color, ink } = accountColors[id];
  const idx = ACCOUNT_ORDER.indexOf(id) + 1;
  const inGame = state.age === "65" && id === "future" ? onboarding.seniorFutureInGame : account.inGame;
  useEffect(() => buzz("light"), []);
  return (
    <ScreenLayout
      dir={dir}
      footer={<Cta label={idx < 4 ? "Next account" : "See your profile"} onPress={onNext} />}
    >
      <Eyebrow color={color} ink={ink}>{`Saved ${idx} of 4`}</Eyebrow>
      <Title>{`${account.name} goes into the game`}</Title>
      <Stairs
        built={ACCOUNT_ORDER.slice(0, idx)}
        landDelays={{ [id]: 380 }}
        firm={state.type === "business" ? { on: true, animate: false } : undefined}
        arrows={idx === 4 ? { ids: ["cushion", "future", "protection"], animate: ["cushion", "future", "protection"], delay: 900 } : null}
      />
      <InGamePanel label="In the game" text={inGame} />
    </ScreenLayout>
  );
}

// ---------- Result ----------

export function DoneCheck() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <DrawCircle length={125} delay={200} duration={600} cx={22} cy={22} r={19} fill="none" stroke={colors.yellow} strokeWidth={3.5} />
      <DrawPath
        length={30}
        delay={650}
        duration={380}
        d="M13.5 22.5l6 6 11-12"
        fill="none"
        stroke={colors.petrol900}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ResultScreen({
  dir,
  state,
  onRestart,
}: {
  dir: Dir;
  state: OnboardingState;
  onRestart: () => void;
}) {
  // Text shown on the CTA instead of "Start game" (private persons, or a navigation error).
  const [ctaNote, setCtaNote] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const qs = questionsFor(state);
  const industry = onboarding.industries.find((i) => i.id === state.industry);
  const horizon = state.age ? onboarding.horizons[state.age] : null;
  const landDelays = Object.fromEntries(FOUNDATION_FIRST.map((id, i) => [id, 300 + i * 160])) as Partial<
    Record<AccountId, number>
  >;

  return (
    <ScreenLayout
      dir={dir}
      footer={
        <>
          <Cta
            label={ctaNote ?? "Start game"}
            onPress={() => {
              buzz("light");
              // Entrepreneurs with a playable industry go to the game; private persons: not built yet.
              if (state.type !== "business" || !industry?.playable) {
                setCtaNote("The game is for entrepreneurs for now: private persons coming soon");
                return;
              }
              try {
                setPlayerProfile(buildProfile(state));
                router.push({ pathname: "/game", params: { industry: industry.id } });
              } catch (e) {
                setCtaNote(`Could not start the game: ${e instanceof Error ? e.message : String(e)}`);
              }
            }}
          />
          <LinkButton label="Fill in again" onPress={onRestart} />
        </>
      }
    >
      <View style={result.done}>
        <DoneCheck />
        <Eyebrow>Your profile is ready</Eyebrow>
      </View>
      <Title>This is your start in the game</Title>
      <Sub>
        {state.type === "business"
          ? `A ${industry?.label ?? ""} company and your personal finances, moved into the simulation.`
          : "Your personal finances, moved into the simulation."}
      </Sub>
      <Panel title="About you" text={knowledgeLine(knowledgeOf(state.answers.knowledge))} />
      <Stairs
        built={ACCOUNT_ORDER}
        landDelays={landDelays}
        firm={state.type === "business" ? { on: true, animate: false } : undefined}
        arrows={{ ids: ["cushion", "future", "protection"], animate: ["cushion", "future", "protection"], delay: 1100 }}
      />
      {ACCOUNT_ORDER.map((id) => {
        const tint = accountColors[id].color;
        return (
          <Panel key={id} tint={tint} title={accountById(id).name} style={{ gap: 6 }}>
            {qs
              .filter((q) => q.account === id)
              .map((q) => (
                <KeyValue key={q.id} k={q.shortLabel} v={answerLabel(q, state.answers)} tint={tint} />
              ))}
          </Panel>
        );
      })}
      <InGamePanel
        label="What's next"
        text="We don't judge your answers. The game will move your situation into the simulation, and the coming months and random events will show whether your finances are ready for them. If something goes wrong, you'll see why and try again. You learn from your decisions, including your mistakes."
      />
      {horizon ? <Panel title="Your horizon" text={horizon} /> : null}
      {__DEV__ ? (
        <View>
          <Pressable onPress={() => setShowJson((v) => !v)}>
            <Text style={result.details}>{`${showJson ? "▾" : "▸"} Profile for the game engine (JSON)`}</Text>
          </Pressable>
          {showJson ? (
            <View style={result.pre}>
              <Text style={result.preText}>{JSON.stringify(buildProfile(state), null, 2)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScreenLayout>
  );
}

const layout = StyleSheet.create({
  scroll: { flex: 1, marginHorizontal: -18 },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16, gap: 14 },
  topSpacer: { flexGrow: 1, flexBasis: 0, marginBottom: -14 },
  spacer: { flexGrow: 1, flexBasis: 0 },
  footer: { paddingTop: 8 },
});

const welcome = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: { width: 10.5, height: 10.5, borderRadius: 3, backgroundColor: colors.yellow, transform: [{ rotate: "45deg" }] },
  brandText: { fontFamily: font.extrabold, fontSize: 12.5, letterSpacing: 1.75, color: colors.yellow },
  artBox: {
    width: "100%",
    maxWidth: 330,
    aspectRatio: 1 / 0.8,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  dots: { flexDirection: "row", gap: 6, justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.28)" },
  // Bold (700) instead of ExtraBold and no negative tracking: at this size ExtraBold's small counters
  // (b, d, e) closed up and looked filled on phones (user report).
  title: {
    fontFamily: font.bold,
    fontSize: 29,
    lineHeight: 35,
    letterSpacing: 0,
    color: colors.onPetrol,
    textAlign: "center",
  },
  sub: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: colors.onPetrolSub, textAlign: "center", maxWidth: 320 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  pill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillText: { fontFamily: font.bold, fontSize: 13, color: colors.onPetrolPill },
});

const result = StyleSheet.create({
  done: { flexDirection: "row", alignItems: "center", gap: 12 },
  details: { fontFamily: font.semibold, fontSize: 13, color: colors.muted },
  pre: { backgroundColor: colors.surface2, borderRadius: 10, padding: 10, marginTop: 6 },
  preText: { fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }), fontSize: 11.5, color: colors.muted },
});
