// Investing chapter screens (month 8 "Stocks and bonds"). Rendered by GameFlow in phase "invest" (it keeps the sky,
// ‹ back, transitions and sounds). Built only from the existing components; the line chart is the one new element.
// Try 1: intro → split → one year fast → result; the swipe lesson; Try 2: horizon → split → top-up → years fast →
// Try 1 vs Try 2. The city (step 5) is a placeholder for now.
import { invest, levels, type InvestInstrument } from "@piwco/content";
import { fillCards } from "../game/lesson";
import { SwipeLesson } from "../game/SwipeLesson";
import { investLessonValues } from "./lessonValues";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { buzz, useReducedMotion } from "../onboarding/anim";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow, LinkButton, Panel, Sub, Tile, Tiles, Title, Why } from "../onboarding/ui";
import { Confetti } from "../game/Confetti";
import { BudgetSlider } from "../game/BudgetSlider";
import { formatPln } from "../game/format";
import { MoneyBar } from "../game/MoneyBar";
import { Notification, notifyStyles } from "../game/notify";
import { RollingNumber } from "../game/RollingNumber";
import { colors, font } from "../theme";
import { instrumentColor } from "./colors";
import {
  allocationOf,
  alternatives,
  balancedIn10Years,
  INVEST_STEPS,
  insights,
  instrumentName,
  placed,
  runEvents,
  runTry,
  START,
  retryTry2,
  startTry1,
  startTry2,
  stepOf,
  try2Edge,
  type InvestState,
  type InvestTry,
  type RunEvent,
} from "./investSession";
import { LineChart, type ChartSeries } from "./LineChart";
import { LevelBars } from "./LevelBars";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function StepEyebrow({ state }: { state: InvestState }) {
  return <Eyebrow>{`Investing · Step ${stepOf(state.stage)} of ${INVEST_STEPS}`}</Eyebrow>;
}

// ---------- Screen 1: intro ----------

function IntroScreen({ state, dir, onNext }: { state: InvestState; dir: Dir; onNext: () => void }) {
  return (
    <ScreenLayout dir={dir} footer={<Cta label="Choose your investments" onPress={onNext} />}>
      <StepEyebrow state={state} />
      <Title>Your first investment</Title>
      <Sub>{`Your company had a good quarter. You have ${formatPln(START)} you don't need for a year. What do you do with it?`}</Sub>
      <View style={[notifyStyles.outcome, { borderColor: colors.yellow, alignItems: "center" }]}>
        <Text style={styles.bigLabel}>TO INVEST</Text>
        <Text style={styles.big}>{formatPln(START)}</Text>
        <Text style={styles.small}>for 1 year</Text>
      </View>
      <Why>Five ways to keep it, from "leave it on the account" to one company's shares. You choose the split.</Why>
    </ScreenLayout>
  );
}

// ---------- Screen 2: split ----------

// One instrument card. Memoized with stable callbacks, so dragging one slider doesn't rebuild the others' content.
const InstrumentSlider = memo(function InstrumentSlider({
  inst,
  value,
  limit,
  open,
  onToggleInfo,
  onChange,
}: {
  inst: InvestInstrument;
  value: number;
  limit: number;
  open: boolean;
  onToggleInfo: (id: string) => void;
  onChange: (id: string, v: number) => void;
}) {
  const color = instrumentColor(inst.color);
  const cash = inst.id === "cash";
  const onInfo = useCallback(() => onToggleInfo(inst.id), [onToggleInfo, inst.id]);
  const extra = useMemo(
    () => (
      <View style={{ gap: 6 }}>
        <Text style={styles.oneLiner}>{inst.oneLiner}</Text>
        <View style={styles.levels}>
          <LevelBars label="Return" value={inst.returnLevel} color={colors.success} />
          <LevelBars label="Risk" value={inst.riskLevel} color={colors.danger} />
        </View>
        {open ? <Panel tint={color} title="What can go wrong" text={inst.whatCanGoWrong} /> : null}
      </View>
    ),
    [inst, open, color],
  );
  return (
    <BudgetSlider
      id={inst.id}
      label={inst.name}
      hint={cash ? "whatever you don't place" : `${Math.round((value / START) * 100)}% of your money`}
      value={value}
      max={START}
      limit={limit}
      minimum={0}
      color={color}
      shortfall={false}
      onChange={onChange}
      step={500}
      tickEvery={1000}
      plusMinus={500}
      readOnly={cash}
      onInfo={onInfo}
      extra={extra}
    />
  );
});

function SplitScreen({
  state,
  dir,
  initial,
  title,
  cta,
  onSubmit,
}: {
  state: InvestState;
  dir: Dir;
  initial: Record<string, number>;
  title: string;
  cta: string;
  onSubmit: (draft: Record<string, number>) => void;
}) {
  const [draft, setDraft] = useState<Record<string, number>>(initial);
  const [info, setInfo] = useState<string | null>(null);
  // Stable (sliders are memoized): never more than the money still free.
  const onSlide = useCallback(
    (id: string, v: number) =>
      setDraft((d) => {
        const others = placed(d) - (d[id] ?? 0);
        return { ...d, [id]: Math.max(0, Math.min(v, START - others)) };
      }),
    [],
  );
  const onToggleInfo = useCallback((id: string) => {
    buzz("tick");
    setInfo((cur) => (cur === id ? null : id));
  }, []);
  const alloc = allocationOf(draft);
  const left = alloc.cash;

  return (
    <ScreenLayout dir={dir} footer={<Cta label={cta} onPress={() => onSubmit(draft)} />}>
      <StepEyebrow state={state} />
      <Title>{title}</Title>
      <Why>Drag the sliders. Whatever you don't place stays on your account. Tap "i" to learn more.</Why>

      <View style={styles.summary}>
        <MoneyBar total={START} parts={invest.instruments.map((i) => ({ key: i.id, value: alloc[i.id] ?? 0, color: instrumentColor(i.color) }))} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Left to place</Text>
          <Text style={[styles.summaryValue, { color: left > 0 ? colors.petrol950 : colors.success }]}>{formatPln(left)}</Text>
        </View>
      </View>

      <View style={styles.list}>
        {invest.instruments.map((inst) => (
          <InstrumentSlider
            key={inst.id}
            inst={inst}
            value={alloc[inst.id] ?? 0}
            limit={(draft[inst.id] ?? 0) + left}
            open={info === inst.id}
            onToggleInfo={onToggleInfo}
            onChange={onSlide}
          />
        ))}
      </View>
    </ScreenLayout>
  );
}

// ---------- The run, fast (Try 1: one year, month by month; Try 2: years, ~5 s for 10 years) ----------

function RunScreen({ state, t, dir, onDone }: { state: InvestState; t: InvestTry; dir: Dir; onDone: () => void }) {
  const reduced = useReducedMotion();
  const months = t.months;
  const years = Math.round(months / 12);
  const events = useRef(runEvents(t)).current;
  const stepM = months <= 12 ? 1 : months <= 60 ? 2 : 3;
  const frame = months <= 12 ? 260 : Math.max(90, Math.round(5000 / (months / stepM)));
  const [k, setK] = useState(reduced ? months : 0);
  const [notice, setNotice] = useState<RunEvent | null>(reduced ? events[events.length - 1] ?? null : null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Month of the last notification: the chart stops there for a moment.
  const stoppedAt = useRef(-1);

  useEffect(() => {
    if (k >= months) return;
    const wait = stoppedAt.current === k && k > 0 ? 1300 : frame;
    timer.current = setTimeout(() => {
      const next = Math.min(months, k + stepM);
      setK(next);
      // A moment from the market (news before the inflation note): the chart stops and the notification comes in.
      const hits = events.filter((e) => e.month > k && e.month <= next);
      const hit = hits.find((e) => !e.title.startsWith("Prices rose")) ?? hits[0];
      if (hit) {
        stoppedAt.current = next;
        setNotice(hit);
      } else if (months <= 12 || next % 12 === 0) buzz("tick");
    }, wait);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [k, months, events, frame, stepM]);

  const done = k >= months;
  const skip = () => {
    if (done) return;
    if (timer.current) clearTimeout(timer.current);
    setNotice(events[events.length - 1] ?? null);
    setK(months);
  };
  // Stable series: the memoized chart only redraws when `reveal` moves.
  const runSeries = useMemo<ChartSeries[]>(() => [{ key: "you", values: t.result.total, color: colors.petrol950, width: 3.5 }], [t]);
  const value = t.result.total[k] ?? 0;
  // Green while above what was paid in so far.
  const up = value >= t.result.total[0] + t.monthlyTopUp * k;

  return (
    <ScreenLayout dir={dir} footer={
        done ? (
          <Cta appear label="See the result" onPress={onDone} />
        ) : (
          // Skip (decided for step 6): to the end at once, with the last notification (the inflation note).
          <LinkButton label="Skip to the end ›" onPress={skip} />
        )
      }
    >
      <StepEyebrow state={state} />
      <Title>{years === 1 ? "One year, fast" : `${years} years, fast`}</Title>
      <Pressable onPress={skip} accessibilityLabel="Skip to the end">
        <View style={styles.chartCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {k === 0 ? "Start" : months <= 12 ? `${MONTHS[(k - 1) % 12]} · month ${k}` : `Year ${Math.ceil(k / 12)} · month ${k}`}
            </Text>
            <RollingNumber value={value} duration={Math.min(220, Math.round(frame * 0.8))} style={[styles.runValue, { color: up ? colors.success : colors.danger }]} />
          </View>
          <LineChart
            series={runSeries}
            reveal={k}
            baseline={START}
            startLabel={months <= 12 ? "Jan" : "Start"}
            endLabel={months <= 12 ? "Dec" : `Year ${years}`}
          />
        </View>
      </Pressable>
      {notice ? <Notification key={notice.month + notice.title} title={notice.title} text={notice.text} sound={notice.drop ? "error" : "pop"} /> : null}
    </ScreenLayout>
  );
}

// ---------- Screen 4: result ----------

function ResultScreen({ state, dir, onNext }: { state: InvestState; dir: Dir; onNext: () => void }) {
  const t = state.try1 as InvestTry;
  const r = t.result;
  const loss = r.real < r.contributed;
  // "Each instrument alone" (thin lines) + cash after inflation (dashed) + the player's portfolio (thick, on top).
  const [series] = useState<ChartSeries[]>(() => {
    const alone = invest.instruments
      .filter((i) => i.id !== "cash")
      .map((i) => ({ key: i.id, values: runTry({ [i.id]: START }, t.months, 0).result.total, color: instrumentColor(i.color), width: 1.6 }));
    const cashReal = runTry({ cash: START }, t.months, 0).result.realTotal;
    return [...alone, { key: "cashReal", values: cashReal, color: colors.danger, width: 1.6, dashed: true }, { key: "you", values: r.total, color: colors.petrol950, width: 3.5 }];
  });
  const [alt] = useState(() => alternatives(t.months));
  const balanced = alt.list.find((a) => a.id === "balanced");
  const [in10] = useState(balancedIn10Years);
  const [lines] = useState(() => insights(t));

  return (
    <ScreenLayout dir={dir} footer={<Cta label="Learn why" onPress={onNext} />}>
      <StepEyebrow state={state} />
      <Title>Your year is over</Title>
      <View style={[notifyStyles.outcome, { borderColor: loss ? colors.danger : colors.success }]}>
        <Text style={styles.bigLabel}>{`YOUR ${formatPln(START).toUpperCase()} IS NOW`}</Text>
        <RollingNumber value={r.nominal} from={START} duration={900} delay={300} style={styles.big} />
        <Text style={[styles.realLine, { color: loss ? colors.danger : colors.success }]}>
          {`Worth ${formatPln(r.real)} in today's money (after inflation)`}
        </Text>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Your year vs each option alone</Text>
        <LineChart series={series} baseline={START} draw startLabel="Jan" endLabel="Dec" />
        <View style={styles.legend}>
          <LegendItem color={colors.petrol950} label="You" thick />
          {invest.instruments
            .filter((i) => i.id !== "cash")
            .map((i) => (
              <LegendItem key={i.id} color={instrumentColor(i.color)} label={i.id === "stock" ? "NovaTech" : instrumentName(i.id)} />
            ))}
          <LegendItem color={colors.danger} label="Cash after inflation" dashed />
        </View>
      </View>

      <Panel title="What could have happened">
        <View style={{ gap: 4, marginTop: 4 }}>
          {balanced ? <Text style={styles.altLine}>{`A balanced mix (60% ETF, 30% bonds, 10% deposit): ${formatPln(balanced.nominal)}`}</Text> : null}
          <Text style={styles.altLine}>{`Best this year: ${alt.best.id === "balanced" ? "a balanced mix" : instrumentName(alt.best.id)}, ${formatPln(alt.best.nominal)}`}</Text>
          <Text style={[styles.altLine, styles.altStrong]}>{`And the balanced mix in 10 years: ${formatPln(in10)}`}</Text>
        </View>
      </Panel>

      <Panel title="What your choice did">
        <View style={{ gap: 6, marginTop: 4 }}>
          {lines.map((l) => (
            <View key={l} style={styles.point}>
              <View style={styles.bullet} />
              <Text style={styles.pointText}>{l}</Text>
            </View>
          ))}
        </View>
      </Panel>
    </ScreenLayout>
  );
}

function LegendItem({ color, label, thick, dashed }: { color: string; label: string; thick?: boolean; dashed?: boolean }) {
  return (
    <View style={styles.legendItem}>
      {dashed ? (
        <View style={{ flexDirection: "row", gap: 2 }}>
          <View style={[styles.swatch, { width: 6, backgroundColor: color }]} />
          <View style={[styles.swatch, { width: 6, backgroundColor: color }]} />
        </View>
      ) : (
        <View style={[styles.swatch, { backgroundColor: color, height: thick ? 4 : 2.5 }]} />
      )}
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

// ---------- Lesson (swipe cards, month 8 in levels.json, numbers from Try 1) ----------

function InvestLesson({ state, onDone }: { state: InvestState; onDone: () => void }) {
  const [cards] = useState(() => {
    const lesson = levels.find((l) => l.month === 8)?.lesson;
    return lesson && state.try1 ? fillCards(lesson.cards, investLessonValues(state.try1)) : [];
  });
  const title = levels.find((l) => l.month === 8)?.lesson?.title ?? "Investing basics";
  return (
    <SwipeLesson
      title={title}
      monthName="August"
      cards={cards}
      eyebrow={`INVESTING · STEP ${stepOf(state.stage)} OF ${INVEST_STEPS}`}
      doneSub="Now try again: you know more than a year ago."
      doneLabel="Second try"
      onDone={onDone}
    />
  );
}

// ---------- Try 2: horizon ----------

const HORIZON_HINTS: Record<number, string> = {
  1: "Short time, big swings",
  5: "Time to recover from a bad year",
  10: "Time does the heavy lifting",
};

function HorizonScreen({ state, dir, onNext }: { state: InvestState; dir: Dir; onNext: (years: number) => void }) {
  const [years, setYears] = useState<number | null>(state.horizon);
  return (
    <ScreenLayout dir={dir} footer={years !== null ? <Cta appear label="Next" onPress={() => onNext(years)} /> : null}>
      <StepEyebrow state={state} />
      <Title>Try again, smarter: how long do you invest?</Title>
      <Why>Same 10 000 PLN, same market history. This time you choose the time too.</Why>
      <Tiles>
        {invest.horizons.map((y) => (
          <Tile
            key={y}
            label={y === 1 ? "1 year" : `${y} years`}
            hint={HORIZON_HINTS[y]}
            mark="single"
            on={years === y}
            onPress={() => {
              buzz("tick");
              setYears(y);
            }}
          />
        ))}
      </Tiles>
      {years === 1 ? <Panel tint={colors.danger} title="Short time, big swings" text="In one year a bad market can still cost you. Your first try was exactly that." /> : null}
    </ScreenLayout>
  );
}

// ---------- Try 2: monthly top-up ----------

function TopUpScreen({ state, dir, onInvest }: { state: InvestState; dir: Dir; onInvest: (topUp: number) => void }) {
  const [topUp, setTopUp] = useState<number | null>(state.topUp);
  const years = state.horizon ?? 1;
  const span = years === 1 ? "1 year" : `${years} years`;
  return (
    <ScreenLayout dir={dir} footer={topUp !== null ? <Cta appear label={`Invest for ${span}`} onPress={() => onInvest(topUp)} /> : null}>
      <StepEyebrow state={state} />
      <Title>Add a little every month?</Title>
      <Why>A monthly top-up is split like your investments. Small amounts add up over time.</Why>
      <Tiles>
        {invest.monthlyTopUps.map((t) => (
          <Tile
            key={t}
            label={t === 0 ? "Nothing extra" : `${formatPln(t)} a month`}
            hint={t === 0 ? `Just the ${formatPln(START)}` : `${formatPln(t * 12 * years)} paid in over ${span}`}
            mark="single"
            on={topUp === t}
            onPress={() => {
              buzz("tick");
              setTopUp(t);
            }}
          />
        ))}
      </Tiles>
    </ScreenLayout>
  );
}

// ---------- Try 2: result (Try 1 vs Try 2) ----------

function TryColumn({ name, t, strong }: { name: string; t: InvestTry; strong?: boolean }) {
  const years = Math.round(t.months / 12);
  return (
    <View style={[styles.col, strong ? styles.colStrong : null]}>
      <Text style={styles.colName}>{name}</Text>
      <Text style={styles.colSub}>{`${years === 1 ? "1 year" : `${years} years`}${t.monthlyTopUp ? ` · +${formatPln(t.monthlyTopUp)}/mo` : ""}`}</Text>
      <Text style={styles.colBig}>{formatPln(t.result.nominal)}</Text>
      <Text style={styles.colLine}>{`Paid in ${formatPln(t.result.contributed)}`}</Text>
      <Text style={[styles.colLine, { color: t.result.realGain < 0 ? colors.danger : colors.success }]}>{`Today's money ${formatPln(t.result.real)}`}</Text>
    </View>
  );
}

function Result2Screen({
  state,
  dir,
  onCity,
  onRetry,
}: {
  state: InvestState;
  dir: Dir;
  onCity: () => void;
  onRetry: () => void;
}) {
  const t1 = state.try1 as InvestTry;
  const t2 = state.try2 as InvestTry;
  const edge = try2Edge(state);
  const better = edge > 0;
  const reduced = useReducedMotion();
  useEffect(() => {
    const t = setTimeout(() => (better ? buzz("success") : buzz("medium", "error")), 350);
    return () => clearTimeout(t);
  }, [better]);
  const years = Math.round(t2.months / 12);
  return (
    <ScreenLayout
      dir={dir}
      footer={
        better ? (
          <>
            <Cta appear label="See your city" onPress={onCity} />
            <LinkButton label="Try again" onPress={onRetry} />
          </>
        ) : (
          <>
            <Cta appear label="Try again" onPress={onRetry} />
            <LinkButton label="See your city anyway" onPress={onCity} />
          </>
        )
      }
    >
      <StepEyebrow state={state} />
      <Title>{better ? "Better than your first try!" : "Not better this time"}</Title>
      <View style={[notifyStyles.outcome, { borderColor: better ? colors.success : colors.danger, alignItems: "center" }]}>
        {better && !reduced ? <Confetti delay={250} count={48} /> : null}
        <RollingNumber
          value={Math.abs(edge)}
          from={0}
          duration={900}
          delay={300}
          format={(n) => `${better ? "+" : "−"}${formatPln(n)}`}
          style={[styles.big, { color: better ? colors.success : colors.danger }]}
        />
        <Text style={styles.edgeLine}>{better ? "better than your first try" : "worse than your first try"}</Text>
        <Text style={styles.small}>Gain in today's money, after what you paid in.</Text>
      </View>

      <View style={styles.cols}>
        <TryColumn name="Try 1" t={t1} />
        <TryColumn name="Try 2" t={t2} strong />
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>Both tries, same market</Text>
        <LineChart
          series={[
            { key: "t1", values: t1.result.total, color: colors.muted, width: 2.5 },
            { key: "t2", values: t2.result.total, color: colors.petrol950, width: 3.5 },
          ]}
          baseline={START}
          draw
          startLabel="Start"
          endLabel={years === 1 ? "Dec" : `Year ${years}`}
        />
        <View style={styles.legend}>
          <LegendItem color={colors.muted} label="Try 1" />
          <LegendItem color={colors.petrol950} label="Try 2" thick />
        </View>
      </View>

      {better ? null : <Panel tint={colors.yellow} title="Try a longer horizon and a mix" text="Give it 5 or 10 years, spread the money (an ETF and bonds), and add a little every month." />}
    </ScreenLayout>
  );
}

export function InvestScreen({
  state,
  dir,
  onChange,
}: {
  state: InvestState;
  dir: Dir;
  // New chapter state with a screen transition (d = -1 slides back).
  onChange: (next: InvestState, d?: Dir) => void;
}) {
  switch (state.stage) {
    case "intro":
      return <IntroScreen state={state} dir={dir} onNext={() => onChange({ ...state, stage: "split1" })} />;
    case "split1":
      return (
        <SplitScreen
          state={state}
          dir={dir}
          initial={state.draft}
          title={`Split your ${formatPln(START)}`}
          cta="Invest for 1 year"
          onSubmit={(draft) => onChange(startTry1({ ...state, draft }))}
        />
      );
    case "run1":
      return <RunScreen state={state} t={state.try1 as InvestTry} dir={dir} onDone={() => onChange({ ...state, stage: "result1" })} />;
    case "result1":
      return <ResultScreen state={state} dir={dir} onNext={() => onChange({ ...state, stage: "lesson" })} />;
    case "lesson":
      return <InvestLesson state={state} onDone={() => onChange({ ...state, stage: "horizon", lessonDone: true })} />;
    case "horizon":
      return <HorizonScreen state={state} dir={dir} onNext={(horizon) => onChange({ ...state, horizon, stage: "split2" })} />;
    case "split2":
      return (
        <SplitScreen
          state={state}
          dir={dir}
          // The sliders start from Try 1's choices.
          initial={state.draft2 ?? state.draft}
          title={`Split your ${formatPln(START)} again`}
          cta="Next"
          onSubmit={(draft2) => onChange({ ...state, draft2, stage: "topup" })}
        />
      );
    case "topup":
      return <TopUpScreen state={state} dir={dir} onInvest={(topUp) => onChange(startTry2({ ...state, topUp }))} />;
    case "run2":
      return <RunScreen state={state} t={state.try2 as InvestTry} dir={dir} onDone={() => onChange({ ...state, stage: "result2" })} />;
    case "result2":
      return (
        <Result2Screen
          state={state}
          dir={dir}
          onCity={() => onChange({ ...state, stage: "city" })}
          onRetry={() => onChange(retryTry2(state), -1)}
        />
      );
    case "city":
      // Drawn by the game (GameFlow): the city with the Future tower's level up.
      return null;
  }
}

const styles = StyleSheet.create({
  bigLabel: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 1, color: colors.muted },
  big: { fontFamily: font.extrabold, fontSize: 40, color: colors.petrol950, fontVariant: ["tabular-nums"] },
  small: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
  edgeLine: { fontFamily: font.extrabold, fontSize: 16, color: colors.petrol950 },
  cols: { flexDirection: "row", gap: 10 },
  col: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, padding: 12, gap: 3 },
  colStrong: { borderColor: colors.petrol700, borderWidth: 2 },
  colName: { fontFamily: font.extrabold, fontSize: 13, letterSpacing: 0.8, color: colors.petrol700 },
  colSub: { fontFamily: font.semibold, fontSize: 12, color: colors.muted },
  colBig: { fontFamily: font.extrabold, fontSize: 21, color: colors.petrol950, fontVariant: ["tabular-nums"], marginTop: 4 },
  colLine: { fontFamily: font.semibold, fontSize: 12.5, color: colors.muted, fontVariant: ["tabular-nums"] },
  realLine: { fontFamily: font.bold, fontSize: 14.5, lineHeight: 20 },
  summary: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 8, borderWidth: 1.5, borderColor: colors.line },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  summaryLabel: { fontFamily: font.medium, fontSize: 14, color: colors.muted },
  summaryValue: { fontFamily: font.extrabold, fontSize: 22, fontVariant: ["tabular-nums"] },
  list: { gap: 10 },
  oneLiner: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: colors.ink },
  levels: { flexDirection: "row", gap: 16 },
  chartCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1.5, borderColor: colors.line },
  cardTitle: { fontFamily: font.extrabold, fontSize: 15, color: colors.petrol950 },
  runValue: { fontFamily: font.extrabold, fontSize: 24, fontVariant: ["tabular-nums"] },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 16, height: 2.5, borderRadius: 2 },
  legendText: { fontFamily: font.semibold, fontSize: 12, color: colors.ink },
  altLine: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
  altStrong: { fontFamily: font.extrabold, color: colors.petrol900 },
  point: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.petrol700, marginTop: 7 },
  pointText: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.ink },
});

