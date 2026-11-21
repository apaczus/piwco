// The month's random event (team spec steps 2–5): a push notification slides in, then 2–4 decision cards with an
// upfront preview of what each costs. If the chosen money isn't enough, the "plot twist" asks for a second source
// for the rest. Then the outcome: what was paid, and any new debt (it cracks the building in the city).
// Prepared events ("your past decision just paid off") and late payments only need a short look.
import { financing as products, type GameEventDef } from "@piwco/content";
import { loanCost, type Action, type ActiveEvent, type GameState } from "@piwco/engine";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { buzz, Enter, PressScale } from "../onboarding/anim";
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

function OptionCard({ o, onPick, delay }: { o: Option; onPick: (a: Action) => void; delay: number }) {
  const off = !!o.disabled || !o.action;
  return (
    <Enter from="below" delay={delay} distance={14}>
      <PressScale
        disabled={off}
        onPress={() => o.action && onPick(o.action)}
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

  // Prepared: an earlier decision covers it (~10 s look).
  if (ev.variant === "prepared") {
    return (
      <ScreenLayout dir={dir} footer={<Cta appear label="Nice, back to the month" onPress={onDone} />}>
        <Eyebrow>{`${MONTHS[state.month - 1]} · something happened`}</Eyebrow>
        <Notification def={def} />
        <Enter from="below" delay={500}>
          <View style={[styles.outcome, { borderColor: colors.success }]}>
            <Text style={[styles.outcomeTitle, { color: colors.success }]}>Your past decision just paid off ✓</Text>
            <Text style={styles.outcomeText}>
              {`${ev.coveredBy === "policy" ? "Your insurance" : "The protection you already have"} covers the ${formatPln(ev.amount)}. Nothing leaves your accounts.`}
            </Text>
          </View>
        </Enter>
      </ScreenLayout>
    );
  }

  // Late payment: nothing to pay, but less cash this month.
  if (ev.effect === "late_payment") {
    return (
      <ScreenLayout dir={dir} footer={<Cta appear label="Plan around it" onPress={onDone} />}>
        <Eyebrow>{`${MONTHS[state.month - 1]} · something happened`}</Eyebrow>
        <Notification def={def} />
        <Enter from="below" delay={500}>
          <View style={[styles.outcome, { borderColor: colors.yellow700 }]}>
            <Text style={styles.outcomeTitle}>{`${formatPln(ev.amount)} arrives in ${nextMonth}`}</Text>
            <Text style={styles.outcomeText}>
              This month your company gets less than it earned. Your costs don't wait: keep that in mind when you pay yourself.
            </Text>
          </View>
        </Enter>
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
                {`Borrowed ${formatPln(l.principal)}: you'll pay back ${formatPln(l.total)} (${formatPln(l.installment)} a month from ${nextMonth})`}
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
      <Eyebrow>{`${MONTHS[state.month - 1]} · something happened`}</Eyebrow>
      {twist ? (
        <Enter from="below">
          <View style={[styles.outcome, { borderColor: colors.danger }]}>
            <Text style={[styles.outcomeTitle, { color: colors.danger }]}>{`${formatPln(ev.remaining)} is still missing`}</Text>
            <Text style={styles.outcomeText}>{`You covered ${formatPln(paidSoFar)} of ${formatPln(ev.amount)}. Where does the rest come from?`}</Text>
          </View>
        </Enter>
      ) : (
        <Notification def={def} />
      )}
      <View style={styles.dueRow}>
        <Text style={styles.dueLabel}>{twist ? "Still to pay" : "To pay now"}</Text>
        <Text style={styles.dueValue}>{formatPln(ev.remaining)}</Text>
      </View>
      <View style={{ gap: 10 }}>
        {opts.map((o, i) => (
          <OptionCard
            key={o.key}
            o={o}
            delay={(twist ? 100 : 600) + i * 80}
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
