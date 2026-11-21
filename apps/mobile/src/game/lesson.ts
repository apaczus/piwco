// Pure lesson helpers (no UI): fill the player's numbers into the "myth or fact?" cards.
import type { MythFactCard, SwipeLesson } from "@piwco/content";
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

export function fillLesson(lesson: SwipeLesson, report: MonthReport): MythFactCard[] {
  const values = lessonValues(report);
  return lesson.cards.map((c) => ({
    ...c,
    statement: fillText(c.statement, values),
    explain: fillText(c.explain, values),
  }));
}
