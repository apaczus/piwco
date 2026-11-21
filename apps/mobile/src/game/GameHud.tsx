// HUD (top right): one card for the company and one for the home. Big balance now, revenue/costs or bills,
// and "at month end" from the same settlement the engine runs on "End month" (green ✓ / red ✗).
// Numbers roll from what the HUD showed last time (the game screen remounts after every action screen),
// and a card flashes green (bounce) or orange (shake) when its month-end forecast flips.
import { settleMonth, type GameState } from "@piwco/engine";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { buzz, useReducedMotion } from "../onboarding/anim";
import { accountColors, colors, font, shadow1 } from "../theme";
import { formatPln } from "./format";
import { RollingNumber } from "./RollingNumber";
import { CoachTarget } from "./coach";

type CardValues = { cash: number; end: number; ok: boolean };
export type HudMemory = { company: CardValues; home: CardValues };

// The game screen slides in first; numbers start rolling once it is visible.
const ROLL_DELAY = 320;

function AccountCard({
  title,
  color,
  now,
  before,
  detail,
  extra,
}: {
  title: string;
  color: string;
  now: CardValues;
  before: CardValues | null;
  detail: string;
  extra?: string;
}) {
  const reduced = useReducedMotion();
  const flash = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const flipped = before !== null && before.ok !== now.ok;

  useEffect(() => {
    if (!flipped) return;
    const t = setTimeout(() => buzz(now.ok ? "success" : "medium", now.ok ? "success" : "error"), ROLL_DELAY);
    if (reduced) return () => clearTimeout(t);
    const flashA = Animated.sequence([
      Animated.delay(ROLL_DELAY),
      Animated.timing(flash, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 650, useNativeDriver: true }),
    ]);
    const moveA = now.ok
      ? Animated.sequence([
          Animated.delay(ROLL_DELAY),
          Animated.timing(bounce, { toValue: 1.06, duration: 120, useNativeDriver: true }),
          Animated.spring(bounce, { toValue: 1, stiffness: 300, damping: 11, mass: 1, useNativeDriver: true }),
        ])
      : Animated.sequence([
          Animated.delay(ROLL_DELAY),
          ...[7, -6, 5, -3, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 55, useNativeDriver: true })),
        ]);
    flashA.start();
    moveA.start();
    return () => {
      clearTimeout(t);
      flashA.stop();
      moveA.stop();
    };
  }, [flipped, now.ok, reduced, flash, bounce, shake]);

  // The forecast number only rolls when the ✓/✗ side stays the same (otherwise it means something else).
  const endFrom = before && before.ok === now.ok ? before.end : now.end;
  return (
    <Animated.View style={[styles.card, { borderLeftColor: color, transform: [{ scale: bounce }, { translateX: shake }] }]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.flash, { backgroundColor: now.ok ? colors.success : colors.danger, opacity: Animated.multiply(flash, 0.28) }]}
      />
      <Text style={styles.title}>{title}</Text>
      <RollingNumber
        value={now.cash}
        from={before?.cash}
        delay={ROLL_DELAY}
        style={styles.cash}
        numberOfLines={1}
        adjustsFontSizeToFit
      />
      <Text style={styles.detail} numberOfLines={1} adjustsFontSizeToFit>
        {detail}
      </Text>
      <View style={[styles.end, { backgroundColor: now.ok ? "#E4F4EF" : colors.dangerBg }]}>
        <RollingNumber
          value={now.end}
          from={endFrom}
          delay={ROLL_DELAY}
          format={(n) => (now.ok ? `Month end: ${formatPln(n)} ✓` : `${formatPln(n)} unpaid ✗`)}
          style={[styles.endText, { color: now.ok ? colors.success : colors.danger }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        />
      </View>
      {extra ? <Text style={styles.extra}>{extra}</Text> : null}
    </Animated.View>
  );
}

const short = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

export function GameHud({ state, memory }: { state: GameState; memory?: { current: HudMemory | null } }) {
  const b = state.business;
  const p = state.personal;
  const { report } = settleMonth(state);
  const costs = report.business.costs;
  const bills = report.personal.bills.reduce((s, x) => s + x.budgeted, 0) + report.personal.installmentDue;
  const bizOk = report.business.arrearsAdded === 0;
  const homeOk = report.personal.arrearsAdded === 0;

  const now: HudMemory = {
    company: { cash: b.cash, ok: bizOk, end: bizOk ? report.business.endCash : report.business.arrearsAdded },
    home: { cash: p.cash, ok: homeOk, end: homeOk ? report.personal.endCash : report.personal.arrearsAdded },
  };
  // What the HUD showed before this mount (null on the first visit: no roll, no flash).
  const before = useRef(memory?.current ?? null).current;
  useEffect(() => {
    if (memory) memory.current = now;
  });

  const bizExtra = b.arrears > 0 ? `Arrears ${formatPln(b.arrears)}` : undefined;
  const homeExtra = [
    p.arrears > 0 ? `Arrears ${formatPln(p.arrears)}` : null,
    p.emergencyFund > 0 ? `Cushion ${formatPln(p.emergencyFund)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.wrap}>
      <CoachTarget id="hudCompany">
      <AccountCard
        title="COMPANY"
        color={colors.petrol700}
        now={now.company}
        before={before?.company ?? null}
        detail={`+${short(b.monthlyRevenue)} revenue · −${short(costs)} costs`}
        extra={bizExtra}
      />
      </CoachTarget>
      <CoachTarget id="hudHome">
      <AccountCard
        title="HOME"
        color={accountColors.main.color}
        now={now.home}
        before={before?.home ?? null}
        detail={`−${short(bills)} bills this month`}
        extra={homeExtra || undefined}
      />
      </CoachTarget>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingVertical: 9,
    paddingHorizontal: 11,
    gap: 2,
    ...shadow1,
  },
  flash: { borderRadius: 14 },
  title: { fontFamily: font.extrabold, fontSize: 11, letterSpacing: 0.9, color: colors.muted },
  cash: { fontFamily: font.extrabold, fontSize: 22, lineHeight: 27, color: colors.petrol950, fontVariant: ["tabular-nums"] },
  detail: { fontFamily: font.medium, fontSize: 12, color: colors.muted },
  end: { alignSelf: "flex-start", borderRadius: 8, paddingVertical: 3, paddingHorizontal: 7, marginTop: 4 },
  endText: { fontFamily: font.extrabold, fontSize: 12.5, fontVariant: ["tabular-nums"] },
  extra: { fontFamily: font.semibold, fontSize: 11.5, color: colors.muted, marginTop: 2 },
});
