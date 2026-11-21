// Pure event-lesson helpers (no UI): which lesson the month's event has, and its cards filled with the player's numbers.
import { financing, gameEvents, type EventLesson, type MythFactCard } from "@piwco/content";
import type { FinancingTerms, MonthReport } from "@piwco/engine";
import { formatPln } from "./format";
import { fillText } from "./lesson";

export type InfoCard = { kicker: string; title: string; text: string; lines?: string[] };

export type BuiltEventLesson = {
  eventId: string;
  prepared: boolean;
  // "What happened" / "What is X" / "The math" (only "The math" for a prepared event).
  cards: InfoCard[];
  // Empty for a prepared event.
  quiz: MythFactCard[];
  plan: EventLesson["plan"] | null;
  building: EventLesson["building"];
};

const SOURCE_LABELS: Record<string, string> = {
  cushion: "From your cushion",
  personal: "From your personal account",
  company: "From the company account",
};

// The month's event has a lesson (late payments and costs alike; a month without an event has none).
export function hasEventLesson(report: MonthReport): boolean {
  const ev = report.event;
  return !!ev && !!gameEvents.find((d) => d.id === ev.id)?.lesson;
}

// Placeholder -> value. Keep in sync with the comment on GameEventDef.lesson in @piwco/content.
export function eventLessonValues(report: MonthReport, terms: Record<string, FinancingTerms>): Record<string, string> {
  const ev = report.event;
  const loans = ev?.loans ?? [];
  const borrowed = loans.reduce((a, l) => a + l.principal, 0);
  const total = loans.reduce((a, l) => a + l.total, 0);
  const installment = loans.reduce((a, l) => a + l.installment, 0);
  const months = Math.max(0, ...loans.map((l) => terms[l.product]?.months ?? 0));
  return {
    amount: formatPln(ev?.amount ?? 0),
    revenue: formatPln(report.business.revenue),
    costs: formatPln(report.business.costs),
    companyLeft: formatPln(report.business.endCash),
    homeLeft: formatPln(report.personal.endCash),
    cushionLeft: formatPln(report.personal.endEmergencyFund),
    borrowed: formatPln(borrowed),
    loanTotal: formatPln(total),
    installment: formatPln(installment),
    months: String(months),
    interest: formatPln(total - borrowed),
  };
}

// How the event was paid, one line per source (for the "What happened" card).
function paidLines(report: MonthReport): string[] {
  const ev = report.event;
  if (!ev || ev.effect !== "cost") return [];
  if (ev.variant === "prepared") return ["Covered by your policy"];
  const lines = ev.paidBefore.map((p) => `${SOURCE_LABELS[p.source] ?? p.source}: ${formatPln(p.amount)}`);
  for (const l of ev.loans) {
    const label = financing.find((f) => f.id === l.product)?.label ?? l.product;
    lines.push(`Borrowed (${label}): ${formatPln(l.principal)}`);
  }
  const side = ev.side === "business" ? "the company account" : "your personal account";
  if (ev.leftoverPaid > 0) lines.push(`At month end, from ${side}: ${formatPln(ev.leftoverPaid)}`);
  if (ev.unpaid > 0) lines.push(`Unpaid: ${formatPln(ev.unpaid)}`);
  return lines;
}

export function buildEventLesson(report: MonthReport, terms: Record<string, FinancingTerms>): BuiltEventLesson | null {
  const ev = report.event;
  const def = ev ? gameEvents.find((d) => d.id === ev.id) : undefined;
  const lesson = def?.lesson;
  if (!ev || !def || !lesson) return null;
  const values = eventLessonValues(report, terms);
  const fill = (t: string) => fillText(t, values);
  const prepared = ev.variant === "prepared";
  const borrowed = ev.loans.length > 0;
  const mathText = prepared ? lesson.mathPrepared ?? lesson.math : borrowed ? lesson.mathBorrowed ?? lesson.math : lesson.math;
  const math: InfoCard = { kicker: "The math", title: prepared ? "Your past decision just paid off" : "What it really cost", text: fill(mathText) };
  if (prepared) {
    return { eventId: ev.id, prepared, cards: [math], quiz: [], plan: null, building: lesson.building };
  }
  return {
    eventId: ev.id,
    prepared,
    cards: [
      { kicker: "What happened", title: def.title, text: fill(lesson.happened), lines: paidLines(report) },
      { kicker: `What is it · ${lesson.concept}`, title: lesson.whatIs.title, text: fill(lesson.whatIs.text) },
      math,
    ],
    quiz: lesson.quiz.map((c) => ({ ...c, statement: fill(c.statement), explain: fill(c.explain) })),
    plan: lesson.plan,
    building: lesson.building,
  };
}
