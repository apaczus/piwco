// The month's random event (team spec steps 2–5). It hits in the middle of the month (after the player's first
// decision): a full-screen ALARM (red flash, shaking screen, alarm sound, strong haptics) with the push notification
// → "What happened" → 2–4 decision cards with an upfront preview of what each costs. If the chosen money isn't enough, the "plot twist" asks for a second source
// for the rest. Then the outcome: what was paid, and any new debt (it cracks the building in the city).
// Prepared events ("your past decision just paid off") end with a short look; late payments: wait it out or bridge.
import { financing as products, type GameEventDef } from "@piwco/content";
import { loanCost, type Action, type ActiveEvent, type GameState } from "@piwco/engine";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { buzz, Enter, PressScale, useReducedMotion } from "../onboarding/anim";
import { playSound } from "../sound";
import { ScreenLayout, type Dir } from "../onboarding/screens";
import { Cta, Eyebrow } from "../onboarding/ui";
import { colors, font, mix, shadow2, springs } from "../theme";
import { formatPln } from "./format";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function Notification({ def, delay = 0 }: { def: GameEventDef; delay?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => buzz("medium", "pop"), delay + 120);
    Animated.sequence([Animated.delay(delay), Animated.spring(v, { toValue: 1, ...springs.lively, useNativeDriver: true })]).start();
    return () => clearTimeout(t);
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        styles.notif,
        { opacity: v.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: "clamp" }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) }] },
      ]}
    >
      <View style={styles.notifHead}>
        <View style={styles.appIcon}>
          <View style={styles.appMark} />
        </View>
        <Text style={styles.notifApp}>PIWCO</Text>
        <Text style={styles.notifTime}>now</Text>
      </View>
      <Text style={styles.notifTitle}>{def.title}</Text>
      <Text style={styles.notifText}>{def.notification}</Text>
    </Animated.View>
  );
}

type Option = {
  key: string;
  title: string;
  preview: string;
  warn?: string;
  badge?: string;
  disabled?: string;
  action: Action | null;
};

function options(state: GameState, ev: ActiveEvent): Option[] {
  const due = ev.remaining;
  const used = new Set(ev.paid.map((p) => p.source));
  const nextMonth = MONTHS[state.month % 12];
  const loanOptions: Option[] = products
    .filter((p) => p.side === ev.side)
    .map((p) => {
      const terms = state.financing[p.id];
      if (!terms) return null;
      const { total, installment } = loanCost(due, terms);
      return {
        key: p.id,
        title: p.label,
        preview: `${formatPln(total)} in total · ${formatPln(installment)} × ${terms.months} from ${nextMonth}`,
        badge: p.id === "payday_loan" ? "Most expensive" : undefined,
        action: { type: "borrow_for_event", product: p.id } as Action,
      };
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);

  if (ev.side === "business") {
    const cash = state.business.cash;
    const company: Option = {
      key: "company",
      title: "From the company account",
      preview: `Company ${formatPln(cash)} → ${formatPln(Math.max(0, cash - due))}`,
      warn: cash < due ? `Covers only ${formatPln(cash)}` : "Less left to pay yourself this month",
      disabled: cash === 0 ? "The company account is empty" : used.has("company") ? "Already used" : undefined,
      action: cash > 0 ? { type: "cover_event", source: "company", amount: Math.min(cash, due) } : null,
    };
    return [company, ...loanOptions];
  }

  const fund = state.personal.emergencyFund;
  const cash = state.personal.cash;
  const bills = Object.entries(state.personal.monthlySpending).reduce((s, [k, v]) => (k === "savings" ? s : s + v), 0);
  const cushion: Option = {
    key: "cushion",
    title: "From my cushion",
    preview: `Cushion ${formatPln(fund)} → ${formatPln(Math.max(0, fund - due))}`,
    warn: fund > 0 && fund < due ? `Covers only ${formatPln(fund)}` : undefined,
    disabled: fund === 0 ? "Your cushion is empty" : undefined,
    action: fund > 0 ? { type: "cover_event", source: "cushion", amount: Math.min(fund, due) } : null,
  };
  const account: Option = {
    key: "personal",
    title: "From my personal account",
    preview: `Home ${formatPln(cash)} → ${formatPln(Math.max(0, cash - due))}`,
    warn: cash < due ? `Covers only ${formatPln(cash)}` : cash - due < bills ? "Your bills may not be covered" : undefined,
    disabled: cash === 0 ? "Your personal account is empty" : used.has("personal") ? "Already used" : undefined,
    action: cash > 0 ? { type: "cover_event", source: "personal", amount: Math.min(cash, due) } : null,
  };
  return [cushion, account, ...loanOptions].filter((o) => !(o.key === "cushion" && used.has("cushion")));
}

function OptionCard({
  o,
  onPick,
  delay,
  enabled,
  onPickNoAction,
}: {
  o: Option;
  onPick: (a: Action) => void;
  delay: number;
  // A choice without an engine action (e.g. "Wait it out").
  enabled?: boolean;
  onPickNoAction?: () => void;
}) {
  const off = !!o.disabled || (!o.action && !enabled);
  return (
    <Enter from="below" delay={delay} distance={14}>
      <PressScale
        disabled={off}
        onPress={() => (o.action ? onPick(o.action) : onPickNoAction?.())}
        accessibilityLabel={o.title}
        style={[styles.option, off ? styles.optionOff : null]}
      >
        <View style={styles.optionHead}>
          <Text style={[styles.optionTitle, off ? { color: colors.muted } : null]}>{o.title}</Text>
          {o.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{o.badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.preview}>{o.disabled ?? o.preview}</Text>
        {!o.disabled && o.warn ? <Text style={styles.warn}>{o.warn}</Text> : null}
      </PressScale>
    </Enter>
  );
}

function sourceLabel(s: string) {
  return s === "cushion" ? "Your cushion" : s === "personal" ? "Your personal account" : "The company account";
}

// Late payment: wait it out, or bridge the gap with a company overdraft (cash now, debt later).
function lateOptions(state: GameState, ev: ActiveEvent): Option[] {
  const nextMonth = MONTHS[state.month % 12];
  const product = products.find((p) => p.id === "business_overdraft");
  const terms = product ? state.financing[product.id] : undefined;
  const opts: Option[] = [
    {
      key: "wait",
      title: "Wait it out",
      preview: `${formatPln(ev.amount)} less in the company this month · it arrives in ${nextMonth}`,
      warn: "Check your pay and budget: less room this month",
      action: null,
    },
  ];
  if (product && terms) {
    const { total, installment } = loanCost(ev.amount, terms);
    opts.push({
      key: product.id,
      title: `Bridge it: ${product.label.toLowerCase()}`,
      preview: `+${formatPln(ev.amount)} now · ${formatPln(total)} in total · ${formatPln(installment)} × ${terms.months} from ${nextMonth}`,
      warn: `Costs ${formatPln(total - ev.amount)} in interest`,
      action: { type: "bridge_late_payment", product: product.id },
    });
  }
  return opts;
}

type Stage = "alarm" | "details" | "decide";

// Full-screen alarm: red flash + pulsing vignette, the screen shakes, alarm sound, three strong haptic hits.
function Alarm({ def, ev, onNext }: { def: GameEventDef; ev: ActiveEvent; onNext: () => void }) {
  const reduced = useReducedMotion();
  const shake = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const icon = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    playSound("alarm");
    const hits = [0, 170, 340].map((ms) =>
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), ms),
    );
    const again = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}), 900);
    Animated.timing(flash, { toValue: 0, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    Animated.spring(icon, { toValue: 1, ...springs.lively, useNativeDriver: true }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    if (!reduced) {
      const kick = (a: number) => Animated.timing(shake, { toValue: a, duration: 45, useNativeDriver: true });
      Animated.sequence([
        Animated.delay(60),
        kick(14), kick(-14), kick(11), kick(-11), kick(8), kick(-8), kick(4), kick(0),
        Animated.delay(700),
        kick(9), kick(-9), kick(6), kick(-6), kick(0),
      ]).start();
    }
    return () => {
      hits.forEach(clearTimeout);
      clearTimeout(again);
      loop.stop();
    };
  }, [flash, icon, pulse, shake, reduced]);

  const impact =
    ev.variant === "prepared"
      ? `${formatPln(ev.amount)} at stake`
      : ev.effect === "late_payment"
        ? `−${formatPln(ev.amount)} of this month's revenue`
        : `−${formatPln(ev.amount)} to pay now`;

  return (
    <View style={{ flex: 1 }}>
      {/* Red layer behind the content, bleeding to the screen edges. */}
      <View pointerEvents="none" style={styles.alarmBg} />
      <Animated.View pointerEvents="none" style={[styles.alarmBg, styles.alarmPulse, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] }) }]} />
      <Animated.View pointerEvents="none" style={[styles.alarmBg, { backgroundColor: "#FF3B30", opacity: flash }]} />
      <Animated.View style={{ flex: 1, transform: [{ translateX: shake }] }}>
        <ScreenLayout dir={1} footer={<Cta appear label="What happened? ›" onPress={onNext} />}>
          <View style={styles.alarmTop}>
            <Animated.View style={[styles.alarmIcon, { transform: [{ scale: icon }, { rotate: shake.interpolate({ inputRange: [-14, 14], outputRange: ["-8deg", "8deg"] }) }] }]}>
              <Text style={styles.alarmIconText}>!</Text>
            </Animated.View>
            <Text style={styles.alarmEyebrow}>{`ALERT · ${MONTHS[ev.month - 1]!.toUpperCase()}`}</Text>
            <Text style={styles.alarmTitle}>{def.title}</Text>
            <View style={styles.alarmImpact}>
              <Text style={styles.alarmImpactText}>{impact}</Text>
            </View>
          </View>
          <Notification def={def} delay={250} />
        </ScreenLayout>
      </Animated.View>
    </View>
  );
}

// "What happened": what it is, what it does to your money, and that a decision is needed now.
function Details({ def, ev, state, onNext }: { def: GameEventDef; ev: ActiveEvent; state: GameState; onNext: () => void }) {
  const nextMonth = MONTHS[state.month % 12];
  const prepared = ev.variant === "prepared";
  const where = ev.side === "business" ? "your company" : "your home budget";
  const lines = prepared
    ? [`It would cost ${formatPln(ev.amount)}.`, "But something you decided earlier covers it. Let's see."]
    : ev.effect === "late_payment"
      ? [
          `${formatPln(ev.amount)} of this month's revenue won't arrive until ${nextMonth}.`,
          "Your costs are still due at the end of this month.",
          "Decide now: wait it out, or bridge the gap with borrowed money.",
        ]
      : [
          `${formatPln(ev.amount)} has to be paid now, from ${where}.`,
          ev.side === "personal" ? `Your cushion: ${formatPln(state.personal.emergencyFund)} · Your account: ${formatPln(state.personal.cash)}` : `Company account: ${formatPln(state.business.cash)}`,
          "Decide now where the money comes from.",
        ];
  return (
    <ScreenLayout dir={1} footer={<Cta appear label={prepared ? "See what happens ›" : "Decide ›"} onPress={onNext} />}>
      <Eyebrow color={colors.danger}>What happened</Eyebrow>
      <Text style={styles.detailsTitle}>{def.title}</Text>
      <View style={[styles.outcome, { borderColor: colors.danger }]}>
        <Text style={styles.outcomeText}>{def.notification}</Text>
        <View style={styles.sep} />
        {lines.map((l, i) => (
          <Enter key={i} from="below" delay={200 + i * 140} distance={8}>
            <Text style={[styles.detailLine, i === 0 && !prepared ? { color: colors.danger } : null]}>{`• ${l}`}</Text>
          </Enter>
        ))}
      </View>
    </ScreenLayout>
  );
}

export function EventScreen({
  state,
  def,
  dir,
  onAction,
  onDone,
}: {
  state: GameState;
  def: GameEventDef;
  dir: Dir;
  onAction: (a: Action) => void;
  onDone: () => void;
}) {
  const ev = state.event!;
  const nextMonth = MONTHS[state.month % 12];
  // Something was already decided (e.g. coming back mid-way): straight to the decision / outcome.
  const started = ev.paid.length > 0 || ev.loans.length > 0;
  const [stage, setStage] = useState<Stage>(started ? "decide" : "alarm");
  // Late payment: "Wait it out" is not an engine action, only a choice on this screen.
  const [waited, setWaited] = useState(false);
  const goTo = (s: Stage) => {
    buzz("light");
    setStage(s);
  };

  if (stage === "alarm") return <Alarm def={def} ev={ev} onNext={() => goTo("details")} />;
  if (stage === "details") return <Details def={def} ev={ev} state={state} onNext={() => goTo("decide")} />;

  // Prepared: an earlier decision covers it (~10 s look).
  if (ev.variant === "prepared") {
    return (
      <ScreenLayout dir={dir} footer={<Cta appear label="Nice, back to the month" onPress={onDone} />}>
        <Eyebrow>{def.title}</Eyebrow>
        <Enter from="below">
          <View style={[styles.outcome, { borderColor: colors.success }]}>
            <Text style={[styles.outcomeTitle, { color: colors.success }]}>Your past decision just paid off ✓</Text>
            <Text style={styles.outcomeText}>
              {ev.coveredBy === "policy"
                ? `Your insurance covers the ${formatPln(ev.amount)}. You pay nothing this month.`
                : `You're covered: the ${formatPln(ev.amount)} doesn't come out of your pocket.`}
            </Text>
          </View>
        </Enter>
      </ScreenLayout>
    );
  }

  // Late payment: decide (wait / bridge), then the outcome.
  if (ev.effect === "late_payment") {
    const bridge = ev.loans[0];
    if (waited || bridge) {
      const terms = bridge ? state.financing[bridge.product] : undefined;
      return (
        <ScreenLayout dir={dir} footer={<Cta appear label="Back to the month" onPress={onDone} />}>
          <Eyebrow>{def.title}</Eyebrow>
          <Enter from="below">
            <View style={[styles.outcome, { borderColor: bridge ? colors.danger : colors.yellow700 }]}>
              <Text style={styles.outcomeTitle}>{bridge ? `+${formatPln(bridge.principal)} on the company account` : `${formatPln(ev.amount)} arrives in ${nextMonth}`}</Text>
              <Text style={styles.outcomeText}>
                {bridge
                  ? `You'll pay back ${formatPln(bridge.total)}: ${formatPln(bridge.installment)} a month for ${terms?.months ?? "?"} months from ${nextMonth}.`
                  : "Until then the company has less cash. Check what you pay yourself and your budget before the month ends."}
              </Text>
              {bridge ? (
                <Text style={styles.debtNote}>{`The bridge costs you ${formatPln(bridge.total - bridge.principal)} extra and shows as cracks on your company until it's paid off.`}</Text>
              ) : (
                <Text style={styles.okNote}>No debt. A business cushion would make a late client a non-event.</Text>
              )}
            </View>
          </Enter>
        </ScreenLayout>
      );
    }
    const opts = lateOptions(state, ev);
    return (
      <ScreenLayout dir={dir}>
        <Eyebrow color={colors.danger}>Your decision</Eyebrow>
        <View style={styles.dueRow}>
          <Text style={styles.dueLabel}>Missing this month</Text>
          <Text style={[styles.dueValue, { color: colors.danger }]}>{formatPln(ev.amount)}</Text>
        </View>
        <View style={{ gap: 10 }}>
          {opts.map((o, i) => (
            <OptionCard
              key={o.key}
              o={o}
              delay={100 + i * 80}
              enabled={o.key === "wait"}
              onPick={(a) => {
                buzz("medium", "error");
                onAction(a);
              }}
              onPickNoAction={() => {
                buzz("light");
                setWaited(true);
              }}
            />
          ))}
        </View>
      </ScreenLayout>
    );
  }

  const paidSoFar = ev.paid.reduce((s, p) => s + p.amount, 0);
  const borrowed = ev.loans.reduce((s, l) => s + l.principal, 0);

  // Outcome: fully covered.
  if (ev.remaining === 0) {
    const debt = ev.loans.reduce((a, l) => ({ total: a.total + l.total, installment: a.installment + l.installment }), { total: 0, installment: 0 });
    return (
      <ScreenLayout dir={dir} footer={<Cta appear label="Back to the month" onPress={onDone} />}>
        <Eyebrow>{def.title}</Eyebrow>
        <Enter from="below">
          <View style={[styles.outcome, { borderColor: debt.total > 0 ? colors.danger : colors.success }]}>
            <Text style={[styles.outcomeTitle, { color: debt.total > 0 ? colors.danger : colors.success }]}>
              {debt.total > 0 ? "Covered, with debt" : "Covered ✓"}
            </Text>
            {ev.paid.map((p, i) => (
              <Text key={i} style={styles.outcomeText}>{`${sourceLabel(p.source)}: ${formatPln(p.amount)}`}</Text>
            ))}
            {ev.loans.map((l, i) => (
              <Text key={`l${i}`} style={styles.outcomeText}>
                {`${products.find((p) => p.id === l.product)?.label ?? l.product}: ${formatPln(l.principal)} → you pay back ${formatPln(l.total)} (${formatPln(l.installment)} a month)`}
              </Text>
            ))}
            {debt.total > 0 ? (
              <Text style={styles.debtNote}>{`The debt costs you ${formatPln(debt.total - borrowed)} extra and shows as cracks in your city until it's paid off.`}</Text>
            ) : (
              <Text style={styles.okNote}>No debt. This is what a cushion is for.</Text>
            )}
          </View>
        </Enter>
      </ScreenLayout>
    );
  }

  // Decision (and the plot twist if a first source didn't cover everything).
  const twist = paidSoFar > 0;
  const opts = options(state, ev);
  return (
    <ScreenLayout dir={dir}>
      <Eyebrow color={colors.danger}>{twist ? "Plot twist" : "Your decision"}</Eyebrow>
      {twist ? (
        <Enter from="below">
          <View style={[styles.outcome, { borderColor: colors.danger }]}>
            <Text style={[styles.outcomeTitle, { color: colors.danger }]}>{`${formatPln(ev.remaining)} is still missing`}</Text>
            <Text style={styles.outcomeText}>{`You covered ${formatPln(paidSoFar)} of ${formatPln(ev.amount)}. Where does the rest come from?`}</Text>
          </View>
        </Enter>
      ) : null}
      <View style={styles.dueRow}>
        <Text style={styles.dueLabel}>{twist ? "Still to pay" : "To pay now"}</Text>
        <Text style={styles.dueValue}>{formatPln(ev.remaining)}</Text>
      </View>
      <View style={{ gap: 10 }}>
        {opts.map((o, i) => (
          <OptionCard
            key={o.key}
            o={o}
            delay={100 + i * 80}
            onPick={(a) => {
              buzz(a.type === "borrow_for_event" ? "medium" : "light", a.type === "borrow_for_event" ? "error" : "coin");
              onAction(a);
            }}
          />
        ))}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  alarmBg: { position: "absolute", top: -140, bottom: -80, left: -18, right: -18, backgroundColor: "#5A0B12" },
  alarmPulse: { backgroundColor: "#D62828" },
  alarmTop: { alignItems: "center", gap: 10, paddingTop: 8, paddingBottom: 6 },
  alarmIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.yellow, alignItems: "center", justifyContent: "center", borderWidth: 5, borderColor: "#FFFFFF" },
  alarmIconText: { fontFamily: font.extrabold, fontSize: 52, lineHeight: 60, color: "#5A0B12" },
  alarmEyebrow: { fontFamily: font.extrabold, fontSize: 13, letterSpacing: 2, color: colors.yellow },
  alarmTitle: { fontFamily: font.extrabold, fontSize: 30, lineHeight: 36, color: "#FFFFFF", textAlign: "center" },
  alarmImpact: { backgroundColor: "rgba(0,0,0,0.28)", borderRadius: 99, paddingVertical: 8, paddingHorizontal: 16 },
  alarmImpactText: { fontFamily: font.extrabold, fontSize: 17, color: "#FFFFFF", fontVariant: ["tabular-nums"] },
  detailsTitle: { fontFamily: font.extrabold, fontSize: 28, lineHeight: 34, color: colors.petrol950 },
  detailLine: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22, color: colors.ink },
  sep: { height: 1, backgroundColor: colors.line, marginVertical: 6 },
  notif: { backgroundColor: colors.surface, borderRadius: 20, padding: 14, gap: 4, ...shadow2 },
  notifHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  appIcon: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.petrol900, alignItems: "center", justifyContent: "center" },
  appMark: { width: 8, height: 8, borderRadius: 2, backgroundColor: colors.yellow, transform: [{ rotate: "45deg" }] },
  notifApp: { flex: 1, fontFamily: font.bold, fontSize: 12, letterSpacing: 0.8, color: colors.muted },
  notifTime: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  notifTitle: { fontFamily: font.extrabold, fontSize: 18, lineHeight: 23, color: colors.petrol950, marginTop: 4 },
  notifText: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.ink },
  dueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  dueLabel: { fontFamily: font.bold, fontSize: 14, color: colors.muted },
  dueValue: { fontFamily: font.extrabold, fontSize: 28, color: colors.petrol950, fontVariant: ["tabular-nums"] },
  option: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, padding: 14, gap: 3 },
  optionOff: { backgroundColor: colors.surface2, opacity: 0.7 },
  optionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  optionTitle: { flex: 1, fontFamily: font.extrabold, fontSize: 16, color: colors.petrol900 },
  preview: { fontFamily: font.semibold, fontSize: 13.5, color: colors.muted, fontVariant: ["tabular-nums"] },
  warn: { fontFamily: font.bold, fontSize: 12.5, color: colors.danger },
  badge: { backgroundColor: mix(colors.danger, colors.surface, 14), borderRadius: 99, paddingVertical: 3, paddingHorizontal: 8 },
  badgeText: { fontFamily: font.extrabold, fontSize: 10.5, letterSpacing: 0.6, color: colors.danger },
  outcome: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 2, padding: 16, gap: 6, ...shadow2 },
  outcomeTitle: { fontFamily: font.extrabold, fontSize: 19, color: colors.petrol950 },
  outcomeText: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.ink },
  debtNote: { fontFamily: font.bold, fontSize: 13.5, lineHeight: 19, color: colors.danger, marginTop: 4 },
  okNote: { fontFamily: font.bold, fontSize: 13.5, color: colors.success, marginTop: 4 },
});
