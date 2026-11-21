// Investing chapter screens (month 8 "Stocks and bonds"). Rendered by GameFlow in phase "invest" (it keeps the sky,
// ‹ back, transitions and sounds). Built only from the existing components; the line chart is the one new element.
// Try 1: intro → split → one year fast → result; then the swipe lesson. Try 2 (step 4) is a placeholder for now.
import { invest, levels, type InvestInstrument } from "@piwco/content";
import { fillCards } from "../game/lesson";
import { SwipeLesson } from "../game/SwipeLesson";
import { investLessonValues } from "./lessonValues";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { buzz, useReducedMotion } from "../onboarding/anim";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow, Panel, Sub, Title, Why } from "../onboarding/ui";
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
  startTry1,
  stepOf,
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

function SplitScreen({ state, dir, onInvest }: { state: InvestState; dir: Dir; onInvest: (draft: Record<string, number>) => void }) {
  const [draft, setDraft] = useState<Record<string, number>>(state.draft);
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
    <ScreenLayout dir={dir} footer={<Cta label="Invest for 1 year" onPress={() => onInvest(draft)} />}>
      <StepEyebrow state={state} />
      <Title>{`Split your ${formatPln(START)}`}</Title>
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

// ---------- Screen 3: the year, fast ----------

function RunScreen({ state, dir, onDone }: { state: InvestState; dir: Dir; onDone: () => void }) {
  const t = state.try1 as InvestTry;
  const reduced = useReducedMotion();
  const months = t.months;
  const events = useRef(runEvents(t)).current;
  const [k, setK] = useState(reduced ? months : 0);
  const [notice, setNotice] = useState<RunEvent | null>(reduced ? events[events.length - 1] ?? null : null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (k >= months) return;
    // A moment from the market: the chart stops and the notification comes in.
    const ev = events.find((e) => e.month === k);
    const wait = ev && k > 0 ? 1300 : 260;
    timer.current = setTimeout(() => {
      const next = k + 1;
      setK(next);
      const hit = events.find((e) => e.month === next);
      if (hit) setNotice(hit);
      else buzz("tick");
    }, wait);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [k, months, events]);

  const done = k >= months;
  const skip = () => {
    if (done) return;
    if (timer.current) clearTimeout(timer.current);
    setNotice(events[events.length - 1] ?? null);
    setK(months);
  };
  const value = t.result.total[k];
  const up = value >= t.result.total[0];

  return (
    <ScreenLayout dir={dir} footer={done ? <Cta appear label="See the result" onPress={onDone} /> : <Text style={styles.tapHint}>Tap to skip</Text>}>
      <StepEyebrow state={state} />
      <Title>One year, fast</Title>
      <Pressable onPress={skip} accessibilityLabel="Skip to the end of the year">
        <View style={styles.chartCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{k === 0 ? "Start" : `${MONTHS[(k - 1) % 12]} · month ${k}`}</Text>
            <RollingNumber value={value} duration={220} style={[styles.runValue, { color: up ? colors.success : colors.danger }]} />
          </View>
          <LineChart
            series={[{ key: "you", values: t.result.total, color: colors.petrol950, width: 3.5 }]}
            reveal={k}
            baseline={START}
            startLabel="Jan"
            endLabel="Dec"
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

// ---------- Try 2: placeholder until step 4 ----------

function Try2Placeholder({ state, dir, onAgain }: { state: InvestState; dir: Dir; onAgain: () => void }) {
  return (
    <ScreenLayout dir={dir} footer={<Cta label="Play try 1 again" onPress={onAgain} />}>
      <StepEyebrow state={state} />
      <Title>The second try comes next</Title>
      <Sub>Horizon, monthly top-ups and the same market history. It's being built in the next step.</Sub>
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
      return <SplitScreen state={state} dir={dir} onInvest={(draft) => onChange(startTry1({ ...state, draft }))} />;
    case "run1":
      return <RunScreen state={state} dir={dir} onDone={() => onChange({ ...state, stage: "result1" })} />;
    case "result1":
      return <ResultScreen state={state} dir={dir} onNext={() => onChange({ ...state, stage: "lesson" })} />;
    case "lesson":
      return <InvestLesson state={state} onDone={() => onChange({ ...state, stage: "try2", lessonDone: true })} />;
    case "try2":
      return <Try2Placeholder state={state} dir={dir} onAgain={() => onChange({ ...state, stage: "split1" }, -1)} />;
  }
}

const styles = StyleSheet.create({
  bigLabel: { fontFamily: font.extrabold, fontSize: 12, letterSpacing: 1, color: colors.muted },
  big: { fontFamily: font.extrabold, fontSize: 40, color: colors.petrol950, fontVariant: ["tabular-nums"] },
  small: { fontFamily: font.semibold, fontSize: 14, color: colors.muted },
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
  tapHint: { textAlign: "center", fontFamily: font.semibold, fontSize: 13, color: colors.muted, paddingVertical: 14 },
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

