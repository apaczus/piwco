import { describe, expect, it } from "vitest";
import {
  investProgress,
  allocationOf,
  alternatives,
  backStage,
  balancedIn10Years,
  insights,
  newInvest,
  placed,
  runEvents,
  runTry,
  setDraft,
  START,
  startTry1,
  startTry2,
  retryTry2,
  try2Better,
  try2Edge,
} from "./investSession";

describe("investing chapter: try 1", () => {
  it("unplaced money stays on the account", () => {
    let s = newInvest();
    s = setDraft(s, "etf", 6000);
    s = setDraft(s, "bonds", 1500);
    expect(allocationOf(s.draft)).toEqual({ deposit: 0, bonds: 1500, etf: 6000, stock: 0, cash: 2500 });
  });

  it("a slider can't take more than the free money", () => {
    let s = setDraft(newInvest(), "etf", 8000);
    s = setDraft(s, "stock", 5000);
    expect(s.draft.stock).toBe(2000);
    expect(placed(s.draft)).toBe(START);
    expect(allocationOf(s.draft).cash).toBe(0);
  });

  it("all NovaTech for a year goes badly, with the recall and inflation as events", () => {
    const s = startTry1(setDraft(newInvest(), "stock", START));
    expect(s.stage).toBe("run1");
    const t = s.try1!;
    expect(t.result.nominal).toBe(6000);
    expect(runEvents(t).map((e) => e.month)).toEqual([4, 12]);
    expect(insights(t)[0]).toMatch(/100% into one company/);
    expect(alternatives(12).best.nominal).toBeGreaterThan(t.result.nominal);
  });

  it("all on the account: no market events, a real loss and an inflation insight", () => {
    const t = startTry1(newInvest()).try1!;
    expect(t.result.nominal).toBe(START);
    expect(t.result.real).toBeLessThan(START);
    expect(runEvents(t)).toHaveLength(1);
    expect(insights(t).join(" ")).toMatch(/Inflation/);
  });

  it("a balanced mix in try 1 is close to flat, and 10 years of it doubles the money", () => {
    const s = ["etf", "bonds", "deposit"].reduce((a, id, i) => setDraft(a, id, [6000, 3000, 1000][i]), newInvest());
    const t = startTry1(s).try1!;
    expect(Math.abs(t.result.nominal - START)).toBeLessThan(300);
    expect(runEvents(t).map((e) => e.month)).toEqual([7, 12]);
    expect(balancedIn10Years()).toBeGreaterThan(1.9 * START);
  });

  it("insights are 2–3 lines and deterministic", () => {
    const drafts: Record<string, number>[] = [{}, { stock: 7000, etf: 3000 }, { deposit: 10000 }, { etf: 10000 }];
    for (const draft of drafts) {
      const t = runTry(allocationOf(draft), 12, 0);
      const a = insights(t);
      expect(a.length).toBeGreaterThanOrEqual(2);
      expect(a.length).toBeLessThanOrEqual(3);
      expect(insights(t)).toEqual(a);
    }
  });

  it("back goes one screen at a time; the split goes back to the intro", () => {
    expect(backStage("split1")).toBe("intro");
    expect(backStage("result1")).toBe("split1");
    expect(backStage("intro")).toBeNull();
  });
});

describe("investing chapter: try 2", () => {
  const afterTry1 = (draft: Record<string, number>) => startTry1(Object.entries(draft).reduce((s, [id, v]) => setDraft(s, id, v), newInvest()));
  const try2 = (s: ReturnType<typeof newInvest>, horizon: number, draft2: Record<string, number>, topUp: number) =>
    startTry2({ ...s, horizon, draft2, topUp });

  it("(a) all NovaTech for a year, then 10 years 60% ETF + 40% bonds + 100 PLN/month: clearly better", () => {
    const s = try2(afterTry1({ stock: 10000 }), 10, { etf: 6000, bonds: 4000 }, 100);
    expect(s.stage).toBe("run2");
    expect(s.try2!.result.nominal).toBe(38073);
    expect(s.try2!.result.contributed).toBe(22000);
    expect(try2Edge(s)).toBeGreaterThan(5000);
    expect(try2Better(s)).toBe(true);
    // The bad years of what the player holds show up during the run.
    expect(runEvents(s.try2!).map((e) => e.month)).toEqual([7, 72, 120]);
  });

  it("(b) all on the account in both tries: a real loss both times, and longer is worse", () => {
    const s = try2(afterTry1({}), 10, {}, 0);
    expect(s.try1!.result.realGain).toBeLessThan(0);
    expect(s.try2!.result.realGain).toBeLessThan(0);
    expect(try2Better(s)).toBe(false);
  });

  it("(c) a balanced mix in try 1, the same mix for 5 years beats it", () => {
    const mix = { etf: 6000, bonds: 3000, deposit: 1000 };
    const s = try2(afterTry1(mix), 5, mix, 0);
    expect(try2Better(s)).toBe(true);
  });

  it("all NovaTech again for 1 year is not better (honest), and Try again keeps the choices", () => {
    const s = try2(afterTry1({ stock: 10000 }), 1, { stock: 10000 }, 0);
    expect(try2Better(s)).toBe(false);
    const r = retryTry2(s);
    expect(r.stage).toBe("horizon");
    expect(r.try2).toBeNull();
    expect(r.horizon).toBe(1);
    expect(r.draft2).toEqual({ stock: 10000 });
    expect(try2({ ...r }, 10, { etf: 6000, bonds: 4000 }, 100).attempts).toBe(2);
  });

  it("back goes one screen at a time through try 2", () => {
    expect(backStage("horizon")).toBe("lesson");
    expect(backStage("split2")).toBe("horizon");
    expect(backStage("topup")).toBe("split2");
    expect(backStage("result2")).toBe("topup");
  });
});

describe("investing chapter: Future tower progress", () => {
  it("try 1 done → lesson done → try 2 better, in that order", () => {
    expect(investProgress(null)).toBeUndefined();
    let s = newInvest();
    expect(investProgress(s)).toEqual({ try1Done: false, lessonDone: false, try2Better: false });
    s = startTry1({ ...s, draft: { stock: 10000 } });
    expect(investProgress(s)).toEqual({ try1Done: true, lessonDone: false, try2Better: false });
    s = { ...s, lessonDone: true, horizon: 10, draft2: { etf: 6000, bonds: 4000 }, topUp: 100 };
    s = startTry2(s);
    expect(investProgress(s)).toEqual({ try1Done: true, lessonDone: true, try2Better: true });
  });
});
