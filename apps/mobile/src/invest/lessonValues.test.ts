import { levels } from "@piwco/content";
import { describe, expect, it } from "vitest";
import { formatPln } from "../game/format";
import { fillCards } from "../game/lesson";
import { allocationOf, runTry } from "./investSession";
import { investLessonValues } from "./lessonValues";

const august = levels.find((l) => l.month === 8)!;

describe("investing lesson", () => {
  it("has the cards in the planned order: 9 info / choice cards, then 3 myth-or-fact", () => {
    const kinds = august.lesson!.cards.map((c) => c.kind ?? "mythfact");
    expect(kinds).toEqual(["info", "info", "info", "info", "choice", "info", "info", "info", "info", "mythfact", "mythfact", "mythfact"]);
  });

  it("fills every placeholder for any try 1 (an unknown one would throw)", () => {
    const drafts: Record<string, number>[] = [{}, { stock: 10000 }, { stock: 7000, etf: 3000 }, { etf: 6000, bonds: 3000, deposit: 1000 }];
    for (const d of drafts) {
      const cards = fillCards(august.lesson!.cards, investLessonValues(runTry(allocationOf(d), 12, 0)));
      expect(JSON.stringify(cards)).not.toMatch(/\{\w+\}/);
    }
  });

  it("uses the engine's numbers and the player's try", () => {
    const v = investLessonValues(runTry(allocationOf({ stock: 7000, etf: 3000 }), 12, 0));
    expect(v.etf1y).toBe(formatPln(9500));
    expect(v.etf10y).toBe(formatPln(21073));
    expect(v.cashReal10y).toBe(formatPln(6139));
    expect(v.monthlyPaid).toBe(formatPln(12000));
    expect(v.yourNovatech).toBe(`In your first try NovaTech was 70% of your money and lost ${formatPln(2800)}.`);
    expect(investLessonValues(runTry(allocationOf({}), 12, 0)).yourNovatech).toMatch(/skipped NovaTech/);
  });
});
