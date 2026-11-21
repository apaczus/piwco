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

describe("October lesson: the numbers on the cards add up", () => {
  const oct = levels.find((l) => l.month === 10)!;
  const all = JSON.stringify(oct.lesson);

  it("is a lesson-only month with 8 cards, a quiz and a consolidation choice", () => {
    expect(oct.lessonOnly).toBe(true);
    expect(oct.lesson!.cards).toHaveLength(8);
    expect(oct.lesson!.cards.some((c) => c.kind === "quiz")).toBe(true);
  });

  it("stress test: 8 000 of 40 000 = 20%, after −25% = 27%", () => {
    expect(Math.round((8000 / 40000) * 100)).toBe(20);
    expect(Math.round((8000 / 30000) * 100)).toBe(27);
    expect(all).toContain("20% → 27%");
  });

  it("quiz: 200 000 over 15 years, 7% → 8% = +114 (about +115), about 20 500 over 15 years", () => {
    const p7 = installment(200000, 0.07, 180);
    const p8 = installment(200000, 0.08, 180);
    expect(pln(p7)).toBe("1 798");
    expect(pln(p8)).toBe("1 911");
    expect(Math.round(p8 - p7)).toBe(114);
    expect(Math.round(((p8 - p7) * 180) / 500) * 500).toBe(20500);
    const quiz = oct.lesson!.cards.find((c) => c.kind === "quiz")!;
    expect(quiz.kind === "quiz" && quiz.options[quiz.correct]).toBe("About +115 PLN");
    expect(all).toContain("1 798 → 1 911");
  });

  it("consolidation: 50 400 now vs 60 000 (9 600 more), implied APR about 12% (decided)", () => {
    expect(24 * (1200 + 900)).toBe(50400);
    expect(60 * 1000).toBe(60000);
    // What is left of the two loans if they run at 10%: about 45 500 PLN; 1 000 × 60 on that ≈ 12% APR.
    const r = 0.1 / 12;
    const left = (2100 * (1 - Math.pow(1 + r, -24))) / r;
    expect(Math.round(left / 100) * 100).toBe(45500);
    expect(Math.round(apr(left, 1000, 60) * 100)).toBe(12);
    expect(all).toContain("50 400");
    expect(all).toContain("60 000");
    expect(all).toContain("9 600");
  });
});
