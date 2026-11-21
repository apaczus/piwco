import { invest } from "@piwco/content";
import { describe, expect, it } from "vitest";
import { compareAlternatives, marketPath, realValue, simulatePortfolio, splitByShares } from "./invest";

const market = marketPath(invest);
const sim = (shares: Record<string, number>, months: number, topUp = 0) =>
  simulatePortfolio({
    allocation: splitByShares(invest.startAmount, shares),
    monthly: splitByShares(topUp, shares),
    months,
    market,
    inflation: invest.inflation,
  });

// Every allocation in 10% steps over the 5 instruments (1 001 of them).
function allAllocations(): Record<string, number>[] {
  const ids = invest.instruments.map((i) => i.id);
  const out: Record<string, number>[] = [];
  const rec = (i: number, left: number, cur: Record<string, number>) => {
    if (i === ids.length - 1) return out.push({ ...cur, [ids[i]]: left });
    for (let v = 0; v <= left; v++) rec(i + 1, left - v, { ...cur, [ids[i]]: v });
  };
  rec(0, 10, {});
  return out;
}

describe("marketPath", () => {
  it("is deterministic and doesn't depend on call order", () => {
    expect(marketPath(invest)).toEqual(market);
    expect(JSON.stringify(marketPath(invest))).toBe(JSON.stringify(market));
  });

  it("has 120 months and every year ends exactly at its yearly return", () => {
    expect(market.months).toBe(120);
    for (const inst of invest.instruments) {
      const p = market.prices[inst.id];
      expect(p).toHaveLength(121);
      expect(p[0]).toBe(1);
      let v = 1;
      inst.market.yearly.forEach((r, y) => {
        v *= 1 + r;
        expect(p[(y + 1) * 12]).toBeCloseTo(v, 10);
      });
    }
  });

  it("pins the events: NovaTech −45% in month 4, the ETF −12% in month 7", () => {
    const s = market.prices.stock;
    const e = market.prices.etf;
    expect(s[4] / s[3] - 1).toBeCloseTo(-0.45, 10);
    expect(e[7] / e[6] - 1).toBeCloseTo(-0.12, 10);
    // The ETF's dip is the low point of year 1, then it partly recovers to −5%.
    expect(Math.min(...e.slice(0, 13))).toBe(e[7]);
    expect(e[12]).toBeGreaterThan(e[7]);
  });

  it("keeps cash flat and the deposit smooth", () => {
    expect(new Set(market.prices.cash)).toEqual(new Set([1]));
    const d = market.prices.deposit;
    for (let m = 1; m <= 120; m++) expect(d[m] / d[m - 1]).toBeCloseTo(Math.pow(1.055, 1 / 12), 10);
  });

  it("rejects broken content", () => {
    expect(() => marketPath({ ...invest, marketEvents: [{ instrument: "x", month: 1, change: 0, title: "" }] })).toThrow();
    expect(() => marketPath({ ...invest, marketEvents: [{ instrument: "etf", month: 121, change: 0, title: "" }] })).toThrow();
  });
});

describe("simulatePortfolio", () => {
  it("is pure and deterministic", () => {
    const allocation = { etf: 6000, bonds: 4000 };
    const input = { allocation, months: 12, market, inflation: 0.05 };
    const a = simulatePortfolio(input);
    expect(simulatePortfolio(input)).toEqual(a);
    expect(allocation).toEqual({ etf: 6000, bonds: 4000 });
  });

  it("starts at the allocated amount, which adds up to the start amount", () => {
    for (const a of allAllocations().slice(0, 50)) {
      const alloc = splitByShares(invest.startAmount, a);
      expect(Object.values(alloc).reduce((x, y) => x + y, 0)).toBe(invest.startAmount);
      const r = simulatePortfolio({ allocation: alloc, months: 12, market, inflation: invest.inflation });
      expect(r.total[0]).toBe(invest.startAmount);
      expect(r.contributed).toBe(invest.startAmount);
      expect(r.total).toHaveLength(13);
    }
  });

  it("cash loses real value after 12 and after 120 months", () => {
    const y1 = sim({ cash: 1 }, 12);
    const y10 = sim({ cash: 1 }, 120);
    expect(y1.nominal).toBe(10000);
    expect(y1.real).toBeLessThan(10000);
    expect(y10.real).toBe(realValue(10000, 120, 0.05));
    expect(y10.real).toBeLessThan(6200);
    expect(y10.realGain).toBeLessThan(0);
  });

  it("year 1: all NovaTech < all ETF < deposit", () => {
    const stock = sim({ stock: 1 }, 12).nominal;
    const etf = sim({ etf: 1 }, 12).nominal;
    const deposit = sim({ deposit: 1 }, 12).nominal;
    expect(stock).toBeLessThan(etf);
    expect(etf).toBeLessThan(deposit);
  });

  it("10 years: balanced mix > deposit > cash (real)", () => {
    const balanced = sim(invest.balancedMix, 120).real;
    const deposit = sim({ deposit: 1 }, 120).real;
    const cash = sim({ cash: 1 }, 120).real;
    expect(balanced).toBeGreaterThan(deposit);
    expect(deposit).toBeGreaterThan(cash);
  });

  it("monthly top-ups increase the result", () => {
    let prev = -1;
    for (const t of invest.monthlyTopUps) {
      const r = sim(invest.balancedMix, 120, t);
      expect(r.nominal).toBeGreaterThan(prev);
      expect(r.contributed).toBe(invest.startAmount + t * 120);
      prev = r.nominal;
    }
  });

  it("any allocation with ETF ≥ 50% for 10 years beats every 1-year allocation (nominal)", () => {
    const all = allAllocations();
    const best1y = Math.max(...all.map((a) => sim(a, 12).nominal));
    const worst10y = Math.min(...all.filter((a) => a.etf >= 5).map((a) => sim(a, 120).nominal));
    expect(worst10y).toBeGreaterThan(best1y);
  });

  it("reports gain and loss in PLN and %", () => {
    const r = sim({ stock: 1 }, 12);
    expect(r.gain).toBe(r.nominal - 10000);
    expect(r.gainPct).toBeCloseTo(-40, 0);
    expect(r.realGain).toBe(r.real - 10000);
  });

  it("rejects bad input", () => {
    expect(() => simulatePortfolio({ allocation: { etf: 10.5 }, months: 12, market, inflation: 0.05 })).toThrow();
    expect(() => simulatePortfolio({ allocation: { gold: 100 }, months: 12, market, inflation: 0.05 })).toThrow();
    expect(() => simulatePortfolio({ allocation: { etf: 100 }, months: 121, market, inflation: 0.05 })).toThrow();
  });
});

describe("splitByShares", () => {
  it("gives whole PLN that add up exactly", () => {
    expect(splitByShares(100, { a: 1, b: 1, c: 1 })).toEqual({ a: 34, b: 33, c: 33 });
    expect(splitByShares(10000, invest.balancedMix)).toEqual({ etf: 6000, bonds: 3000, deposit: 1000 });
    expect(splitByShares(300, { etf: 7000, stock: 3000 })).toEqual({ etf: 210, stock: 90 });
    expect(splitByShares(0, { a: 1 })).toEqual({ a: 0 });
  });
});

describe("compareAlternatives", () => {
  it("lists each instrument alone and the balanced mix, best by real value", () => {
    const r = compareAlternatives({ amount: 10000, monthlyTopUp: 100, months: 120, market, inflation: 0.05, balancedMix: invest.balancedMix });
    expect(r.list.map((a) => a.id)).toEqual(["cash", "deposit", "bonds", "etf", "stock", "balanced"]);
    expect(r.cash?.real).toBeLessThan(r.cash?.nominal ?? 0);
    expect(r.best.real).toBe(Math.max(...r.list.map((a) => a.real)));
  });
});
