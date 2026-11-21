import { describe, expect, it } from "vitest";
import {
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
