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

// Loan math behind the September cards (annuity; the fee is added to the loan; APR = effective yearly rate).
function installment(principal: number, yearlyRate: number, months: number): number {
  const r = yearlyRate / 12;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}
function apr(received: number, pay: number, months: number): number {
  let lo = 1e-6;
  let hi = 0.2;
  for (let k = 0; k < 200; k++) {
    const m = (lo + hi) / 2;
    if ((pay * (1 - Math.pow(1 + m, -months))) / m > received) lo = m;
    else hi = m;
  }
  return Math.pow(1 + lo, 12) - 1;
}
const pln = (v: number) => Math.round(v).toLocaleString("en-US").replace(/,/g, " ");

describe("September lesson: the numbers on the cards add up", () => {
  const sep = levels.find((l) => l.month === 9)!;
  const all = JSON.stringify(sep.lesson);
  const a = installment(54000, 0.075, 60);
  const b = installment(50000, 0.09, 36);

  it("is a lesson-only month with 13 cards", () => {
    expect(sep.lessonOnly).toBe(true);
    expect(sep.lesson!.cards).toHaveLength(13);
  });

  it("Offer A: 1 082 a month, 64 923 total, APR 11.3%", () => {
    expect(pln(a)).toBe("1 082");
    expect(pln(a * 60)).toBe("64 923");
    expect((apr(50000, a, 60) * 100).toFixed(1)).toBe("11.3");
    expect(all).toContain("1 082 PLN a month");
    expect(all).toContain("64 923");
  });

  it("Offer B: 1 590 a month, 57 240 total, APR 9.4%; B about 7 700 cheaper", () => {
    expect(pln(b)).toBe("1 590");
    expect(pln(b * 36)).toBe("57 240");
    expect((apr(50000, b, 36) * 100).toFixed(1)).toBe("9.4");
    expect(Math.round((a * 60 - b * 36) / 100) * 100).toBe(7700);
    expect(all).toContain("57 240");
    expect(all).toContain("+7 240 PLN");
  });

  it("the trap: A has the lower installment and the lower nominal rate, B is right", () => {
    const choice = sep.lesson!.cards.find((c) => c.kind === "choice")!;
    expect(choice.kind === "choice" && choice.correct).toBe("right");
    expect(a).toBeLessThan(b);
  });
});
