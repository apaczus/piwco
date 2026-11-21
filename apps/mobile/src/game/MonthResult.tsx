// After "End month": lesson card (success) or "what went wrong" + replay (failure). Plus the year roadmap.
import { levels, type Level } from "@piwco/content";
import type { GoalReason, GoalResult, MonthReport } from "@piwco/engine";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { buzz } from "../onboarding/anim";
import { DoneCheck, ScreenLayout, type Dir } from "../onboarding/screens";
import { Confetti } from "./Confetti";
import { Cta, Eyebrow, LinkButton, Panel, Sub, Title } from "../onboarding/ui";
import { colors, font, mix, shadow2 } from "../theme";
import { categoryLabel, formatPln } from "./format";

function reasonText(r: GoalReason): string {
  switch (r.kind) {
    case "costs_unpaid":
      return `Company: ${formatPln(r.amount)} of costs unpaid`;
    case "installment_unpaid":
      return `Loan installment: ${formatPln(r.amount)} unpaid`;
    case "bill_unpaid":
      return `${categoryLabel(r.category)}: ${formatPln(r.amount)} unpaid`;
    case "below_minimum":
      return `${categoryLabel(r.category)}: budget ${formatPln(r.amount)} below the minimum`;
  }
}

// One practical tip per kind of mistake (shown once each).
function tips(reasons: GoalReason[]): string[] {
  const kinds = new Set(reasons.map((r) => r.kind));
  const out: string[] = [];
  if (kinds.has("costs_unpaid")) {
    out.push("You took too much out of the company. Its costs come first: pay yourself only what the company can spare.");
  }
  if (kinds.has("bill_unpaid") || kinds.has("installment_unpaid")) {
    out.push("Your personal account ran out. Pay yourself more from the company, or plan a smaller household budget.");
  }
  if (kinds.has("below_minimum")) {
    out.push("Housing and food have a minimum. Cut other categories instead of rent and groceries.");
  }
  return out;
}

// Celebratory haptic once, when the success screen appears (renders nothing).
function SuccessBuzz() {
  useEffect(() => {
    const t = setTimeout(() => buzz("success"), 300);
    return () => clearTimeout(t);
  }, []);
  return null;
}

function LessonCard({ level }: { level: Level }) {
  if (!level.lessonCard) return null;
  return (
    <View style={styles.lessonShadow}>
      <View style={styles.lesson}>
        <View style={styles.lessonBar} />
        <Text style={styles.lessonSmall}>LESSON</Text>
        <Text style={styles.lessonTitle}>{level.lessonCard.title}</Text>
        {level.lessonCard.points.map((p) => (
          <View key={p} style={styles.point}>
            <View style={styles.bullet} />
            <Text style={styles.pointText}>{p}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function MonthResult({
  level,
  report,
  goal,
  dir,
  onReplay,
  onContinue,
}: {
  level: Level;
  report: MonthReport;
  goal: GoalResult;
  dir: Dir;
  onReplay: () => void;
  onContinue: () => void;
}) {
  if (goal.passed) {
    return (
      <ScreenLayout dir={dir} footer={<Cta label="Continue" onPress={onContinue} />}>
        <View style={styles.done}>
          <SuccessBuzz />
          <DoneCheck />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>MISSION COMPLETE!</Text>
          </View>
          <Confetti delay={250} count={48} />
        </View>
        <Title>{`You got through ${level.monthName}!`}</Title>
        <Sub>
          {`Company: ${formatPln(report.business.endCash)} left. Home: ${formatPln(report.personal.endCash)} left` +
            (report.personal.savedToFund > 0 ? `, ${formatPln(report.personal.savedToFund)} in your cushion.` : ".")}
        </Sub>
        <LessonCard level={level} />
      </ScreenLayout>
    );
  }
  return (
    <ScreenLayout
      dir={dir}
      footer={<Cta label="Replay the month" onPress={onReplay} />}
    >
      <Eyebrow color={colors.danger} ink={colors.danger}>{`Month ${level.month} not passed`}</Eyebrow>
      <Title>What went wrong</Title>
      <View style={styles.reasons}>
        {goal.reasons.map((r, i) => (
          <View key={i} style={styles.reason}>
            <Text style={styles.reasonMark}>✕</Text>
            <Text style={styles.reasonText}>{reasonText(r)}</Text>
          </View>
        ))}
      </View>
      {tips(goal.reasons).map((t) => (
        <Panel key={t} title="Tip" text={t} />
      ))}
      <Sub>The month starts again from the same point. You learn from your decisions, including your mistakes.</Sub>
    </ScreenLayout>
  );
}

function LockIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Rect x={5} y={11} width={14} height={10} rx={3} fill="none" stroke={colors.muted} strokeWidth={2} />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke={colors.muted} strokeWidth={2} />
    </Svg>
  );
}

// The 12-month learning program: done / coming soon / locked (visible, not clickable).
export function Roadmap({ completedMonth, dir, onPlayAgain }: { completedMonth: number; dir: Dir; onPlayAgain: () => void }) {
  const nextLevel = levels.find((l) => l.month === completedMonth + 1);
  return (
    <ScreenLayout
      dir={dir}
      footer={<LinkButton label={`Play ${levels[completedMonth - 1]?.monthName ?? "the month"} again`} onPress={onPlayAgain} />}
    >
      <Eyebrow>Your year</Eyebrow>
      <Title>{nextLevel ? `${nextLevel.monthName} is coming soon` : "That's the whole year!"}</Title>
      {nextLevel ? <Sub>{`Next: ${nextLevel.title}. ${nextLevel.subtitle}.`}</Sub> : null}
      <View style={styles.roadmap}>
        {levels.map((l) => {
          const done = l.month <= completedMonth;
          return (
            <View key={l.id} style={[styles.month, done ? styles.monthDone : null, !done && !l.playable ? { opacity: 0.55 } : null]}>
              <Text style={styles.monthNo}>{String(l.month).padStart(2, "0")}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.monthName}>{l.monthName}</Text>
                <Text style={styles.monthTitle}>{l.title}</Text>
              </View>
              {done ? (
                <Text style={styles.doneMark}>✓</Text>
              ) : l.playable ? (
                <Text style={styles.soon}>SOON</Text>
              ) : (
                <LockIcon />
              )}
            </View>
          );
        })}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  done: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: { backgroundColor: colors.yellow, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 12 },
  badgeText: { fontFamily: font.extrabold, fontSize: 12.5, letterSpacing: 0.9, color: colors.petrol950 },
  lessonShadow: { borderRadius: 20, backgroundColor: colors.surface, ...shadow2 },
  lesson: { borderRadius: 20, overflow: "hidden", padding: 16, paddingTop: 18, gap: 10 },
  lessonBar: { position: "absolute", left: 0, top: 0, right: 0, height: 4, backgroundColor: colors.yellow },
  lessonSmall: { fontFamily: font.extrabold, fontSize: 11.5, letterSpacing: 0.9, color: colors.petrol700 },
  lessonTitle: { fontFamily: font.extrabold, fontSize: 21, lineHeight: 26, color: colors.petrol950 },
  point: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  bullet: { width: 7, height: 7, marginTop: 7, backgroundColor: colors.yellow, transform: [{ rotate: "45deg" }] },
  pointText: { flex: 1, fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.ink },
  reasons: { backgroundColor: colors.dangerBg, borderRadius: 16, padding: 14, gap: 8 },
  reason: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  reasonMark: { fontFamily: font.extrabold, fontSize: 14, color: colors.danger, lineHeight: 21 },
  reasonText: { flex: 1, fontFamily: font.semibold, fontSize: 14.5, lineHeight: 21, color: colors.ink },
  roadmap: { gap: 6 },
  month: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  monthDone: { borderColor: colors.success, backgroundColor: mix(colors.success, colors.surface, 8) },
  monthNo: { fontFamily: font.extrabold, fontSize: 13, color: colors.muted, width: 22 },
  monthName: { fontFamily: font.extrabold, fontSize: 14, color: colors.ink },
  monthTitle: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  doneMark: { fontFamily: font.extrabold, fontSize: 16, color: colors.success },
  soon: { fontFamily: font.extrabold, fontSize: 10.5, letterSpacing: 0.8, color: colors.muted },
});
