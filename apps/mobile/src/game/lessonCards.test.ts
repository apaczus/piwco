import { levels, type SwipeCard } from "@piwco/content";
import { describe, expect, it } from "vitest";
import { fillCards, isMythFact, swipeLabels, swipePartStarts } from "./lesson";

const mf = (statement: string, extra: object = {}): SwipeCard => ({ statement, isFact: true, explain: "x", ...extra });
const sort = (statement: string): SwipeCard => mf(statement, { leftLabel: "BAD DEBT", rightLabel: "GOOD DEBT" });
const info: SwipeCard = { kind: "info", title: "t", text: "x" };
const quiz: SwipeCard = { kind: "quiz", question: "{n} PLN?", options: ["+{n}", "b", "c"], correct: 1, explain: "{n}" };

describe("swipe card labels", () => {
  it("myth / fact by default, own labels on sort cards", () => {
    expect(swipeLabels(mf("a") as never)).toEqual({ left: "MYTH", right: "FACT" });
    expect(swipeLabels(sort("a") as never)).toEqual({ left: "BAD DEBT", right: "GOOD DEBT" });
  });

  it("quiz / info / choice are not myth / fact cards", () => {
    expect(isMythFact(quiz)).toBe(false);
    expect(isMythFact(info)).toBe(false);
    expect(isMythFact(mf("a"))).toBe(true);
  });
});

describe("QUIZ TIME alert: where a swipe part starts", () => {
  it("first card, after info, and when the labels change", () => {
    const cards = [info, sort("1"), sort("2"), info, mf("3"), sort("4"), mf("5"), mf("6"), quiz];
    expect(cards.map((_, i) => swipePartStarts(cards, i))).toEqual([false, true, false, false, true, true, true, false, false]);
  });

  it("January's lesson: only the first card (unchanged behaviour)", () => {
    const jan = levels.find((l) => l.month === 1)!.lesson!.cards;
    expect(jan.map((_, i) => swipePartStarts(jan, i)).filter(Boolean)).toHaveLength(1);
    expect(swipePartStarts(jan, 0)).toBe(true);
  });

  it("August's lesson: once, at the first myth / fact card", () => {
    const aug = levels.find((l) => l.month === 8)!.lesson!.cards;
    const starts = aug.map((_, i) => (swipePartStarts(aug, i) ? i : -1)).filter((i) => i >= 0);
    expect(starts).toEqual([aug.findIndex((c) => isMythFact(c))]);
  });
});

describe("fillCards: quiz", () => {
  it("fills the question, every option and the explanation", () => {
    const [q] = fillCards([quiz], { n: "115" });
    expect(q).toEqual({ ...quiz, question: "115 PLN?", options: ["+115", "b", "c"], explain: "115" });
  });
});
