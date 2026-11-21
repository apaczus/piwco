// Pure lesson helpers (no UI): fill the player's numbers into the "myth or fact?" cards.
import type { SwipeCard, SwipeLesson } from "@piwco/content";
import type { MonthReport } from "@piwco/engine";
import { formatPln } from "./format";

// Placeholder -> value from the month report. Keep in sync with the comment on MythFactCard.
export function lessonValues(report: MonthReport): Record<string, string> {
  return {
    revenue: formatPln(report.business.revenue),
    costs: formatPln(report.business.costs),
    companyLeft: formatPln(report.business.endCash),
    homeLeft: formatPln(report.personal.endCash),
  };
}

// Replaces {name} with its value. Unknown placeholders throw, so a typo in the content is caught early.
export function fillText(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = values[name];
    if (v === undefined) throw new Error(`Unknown lesson placeholder {${name}}`);
    return v;
  });
}

// Fills every text of every card kind.
export function fillCards(cards: SwipeCard[], values: Record<string, string>): SwipeCard[] {
  const f = (t: string) => fillText(t, values);
  return cards.map((c): SwipeCard => {
    if (c.kind === "info") {
      const v = c.visual;
      return {
        ...c,
        title: f(c.title),
        text: f(c.text),
        readMore: c.readMore === undefined ? undefined : f(c.readMore),
        visual:
          v?.type === "number"
            ? { ...v, value: f(v.value), label: f(v.label) }
            : v?.type === "rows"
              ? { ...v, rows: v.rows.map((r) => ({ label: f(r.label), text: f(r.text) })) }
              : v,
      };
    }
    if (c.kind === "choice") {
      return {
        ...c,
        question: f(c.question),
        left: { title: f(c.left.title), text: f(c.left.text) },
        right: { title: f(c.right.title), text: f(c.right.text) },
        explain: f(c.explain),
      };
    }
    return { ...c, statement: f(c.statement), explain: f(c.explain) };
  });
}

export function fillLesson(lesson: SwipeLesson, report: MonthReport): SwipeCard[] {
  return fillCards(lesson.cards, lessonValues(report));
}
