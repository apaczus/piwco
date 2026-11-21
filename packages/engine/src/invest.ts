/**
 * Investing chapter (month 8): a deterministic market history and portfolio simulation.
 *
 * Pure functions, no I/O, nothing here touches GameState (the month settlement is unchanged).
 * The market is generated from the yearly returns in invest.json with a fixed seed (mulberry32, no Math.random):
 * each year ends exactly at its yearly return, single months wiggle around it, and the pinned events
 * (e.g. "product recall") set one month's move exactly.
 */
import type { InvestContent } from "@piwco/content";
import { createRng, nextFloat, type RngState } from "./rng";

export type MarketPath = {
  months: number;
  // Price index per instrument: prices[id][0] = 1, prices[id][m] = value of 1 PLN invested at the start after m months.
  prices: Record<string, number[]>;
};

export type MarketInput = Pick<InvestContent, "instruments" | "marketSeed" | "marketEvents">;

// Small string hash so every instrument gets its own random stream from the one seed.
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function marketPath(content: MarketInput): MarketPath {
  const years = Math.min(...content.instruments.map((i) => i.market.yearly.length));
  if (!Number.isFinite(years) || years < 1) throw new Error("marketPath: no yearly returns");
  const months = years * 12;
  for (const e of content.marketEvents) {
    if (!content.instruments.some((i) => i.id === e.instrument)) throw new Error(`marketPath: unknown instrument ${e.instrument}`);
    if (!Number.isInteger(e.month) || e.month < 1 || e.month > months) throw new Error(`marketPath: event month ${e.month} out of range`);
    if (e.change <= -1) throw new Error("marketPath: an event can't take the price to 0");
  }
  const prices: Record<string, number[]> = {};
  for (const inst of content.instruments) {
    let rng: RngState = createRng((content.marketSeed ^ hashId(inst.id)) >>> 0);
    const path = [1];
    let yearStart = 1;
    for (let y = 0; y < years; y++) {
      const yearly = inst.market.yearly[y];
      if (yearly <= -1) throw new Error(`marketPath: ${inst.id} year ${y + 1} return must be above -100%`);
      const target = Math.log(1 + yearly);
      const logs: (number | null)[] = [];
      let fixed = 0;
      let free = 0;
      for (let k = 0; k < 12; k++) {
        const month = y * 12 + k + 1;
        const ev = content.marketEvents.find((e) => e.instrument === inst.id && e.month === month);
        // Draw for every month (also pinned ones), so adding an event doesn't shift the other months' noise.
        const r = nextFloat(rng);
        rng = r.state;
        if (ev) {
          logs.push(Math.log(1 + ev.change));
          fixed += Math.log(1 + ev.change);
        } else {
          const noise = (r.value * 2 - 1) * inst.market.volatility;
          logs.push(noise);
          fixed += noise;
          free++;
        }
      }
      // Spread what's missing to the yearly return evenly over the months without an event.
      const shift = free > 0 ? (target - fixed) / free : 0;
      let p = yearStart;
      for (let k = 0; k < 12; k++) {
        const pinned = content.marketEvents.some((e) => e.instrument === inst.id && e.month === y * 12 + k + 1);
        p *= Math.exp((logs[k] as number) + (pinned ? 0 : shift));
        path.push(p);
      }
      // Year end exactly at the yearly return (no float drift over 10 years).
      yearStart *= 1 + yearly;
      path[path.length - 1] = yearStart;
    }
    prices[inst.id] = path;
  }
  return { months, prices };
}

export type SimulateInput = {
  // PLN put into each instrument at the start (whole PLN ≥ 0).
  allocation: Record<string, number>;
  // PLN added to each instrument at the end of every month (whole PLN ≥ 0).
  monthly?: Record<string, number>;
  months: number;
  market: MarketPath;
  // Yearly inflation (0.05 = 5%).
  inflation: number;
};

export type SimulateResult = {
  months: number;
  // Portfolio value at the end of each month, whole PLN (index 0 = the start).
  total: number[];
  // The same in today's money (after inflation).
  realTotal: number[];
  byInstrument: Record<string, number[]>;
  // Everything paid in (start + monthly top-ups).
  contributed: number;
  nominal: number;
  real: number;
  gain: number;
  gainPct: number;
  realGain: number;
  realGainPct: number;
};

function checkAmounts(name: string, amounts: Record<string, number>, market: MarketPath) {
  for (const [id, v] of Object.entries(amounts)) {
    if (!market.prices[id]) throw new Error(`simulatePortfolio: unknown instrument ${id}`);
    if (!Number.isInteger(v) || v < 0) throw new Error(`simulatePortfolio: ${name}.${id} must be a whole PLN amount ≥ 0`);
  }
}

/** What `amount` PLN is worth in today's money after `months` of inflation. */
export function realValue(amount: number, months: number, inflation: number): number {
  return Math.round(amount / Math.pow(1 + inflation, months / 12));
}

export function simulatePortfolio(input: SimulateInput): SimulateResult {
  const { allocation, monthly = {}, months, market, inflation } = input;
  if (!Number.isInteger(months) || months < 1 || months > market.months) {
    throw new Error(`simulatePortfolio: months must be 1–${market.months}`);
  }
  checkAmounts("allocation", allocation, market);
  checkAmounts("monthly", monthly, market);
  const ids = Object.keys(market.prices).filter((id) => (allocation[id] ?? 0) > 0 || (monthly[id] ?? 0) > 0);
  const holdings: Record<string, number> = {};
  const byInstrument: Record<string, number[]> = {};
  for (const id of ids) {
    holdings[id] = allocation[id] ?? 0;
    byInstrument[id] = [holdings[id]];
  }
  const start = ids.reduce((a, id) => a + holdings[id], 0);
  const total = [start];
  const monthlySum = ids.reduce((a, id) => a + (monthly[id] ?? 0), 0);
  for (let m = 1; m <= months; m++) {
    let sum = 0;
    for (const id of ids) {
      const p = market.prices[id];
      holdings[id] = holdings[id] * (p[m] / p[m - 1]) + (monthly[id] ?? 0);
      byInstrument[id].push(Math.round(holdings[id]));
      sum += holdings[id];
    }
    total.push(Math.round(sum));
  }
  const contributed = start + monthlySum * months;
  const nominal = total[months];
  const real = realValue(nominal, months, inflation);
  const realTotal = total.map((v, m) => realValue(v, m, inflation));
  const pct = (v: number) => (contributed > 0 ? Math.round((v / contributed) * 1000) / 10 : 0);
  return {
    months,
    total,
    realTotal,
    byInstrument,
    contributed,
    nominal,
    real,
    gain: nominal - contributed,
    gainPct: pct(nominal - contributed),
    realGain: real - contributed,
    realGainPct: pct(real - contributed),
  };
}

/**
 * Splits a whole PLN amount by shares (largest remainder), so the parts are whole PLN and add up exactly.
 * Shares don't have to sum to 1 (they are normalised); zero shares get nothing.
 */
export function splitByShares(amount: number, shares: Record<string, number>): Record<string, number> {
  if (!Number.isInteger(amount) || amount < 0) throw new Error("splitByShares: amount must be a whole PLN amount ≥ 0");
  const entries = Object.entries(shares).filter(([, s]) => s > 0);
  const sum = entries.reduce((a, [, s]) => a + s, 0);
  const out: Record<string, number> = {};
  if (sum <= 0) return out;
  const raw = entries.map(([id, s]) => ({ id, exact: (amount * s) / sum }));
  let left = amount;
  for (const r of raw) {
    out[r.id] = Math.floor(r.exact);
    left -= out[r.id];
  }
  raw.sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)));
  for (let i = 0; i < left; i++) out[raw[i % raw.length].id] += 1;
  return out;
}

export type Alternative = {
  // An instrument id, or "balanced".
  id: string;
  nominal: number;
  real: number;
};

export type Alternatives = {
  // Each instrument alone, then the balanced mix (the summary screen's comparison list).
  list: Alternative[];
  // The cash-only line ("after inflation").
  cash: Alternative | null;
  // The best simple option in the list (by real value).
  best: Alternative;
};

/**
 * "What if" options for the summary screen, with the same money, top-up and horizon as the player:
 * each instrument alone and the balanced mix.
 */
export function compareAlternatives(opts: {
  amount: number;
  monthlyTopUp: number;
  months: number;
  market: MarketPath;
  inflation: number;
  balancedMix: Record<string, number>;
}): Alternatives {
  const { amount, monthlyTopUp, months, market, inflation, balancedMix } = opts;
  const run = (id: string, shares: Record<string, number>): Alternative => {
    const r = simulatePortfolio({
      allocation: splitByShares(amount, shares),
      monthly: splitByShares(monthlyTopUp, shares),
      months,
      market,
      inflation,
    });
    return { id, nominal: r.nominal, real: r.real };
  };
  const list = Object.keys(market.prices).map((id) => run(id, { [id]: 1 }));
  list.push(run("balanced", balancedMix));
  const best = list.reduce((a, b) => (b.real > a.real ? b : a));
  return { list, cash: list.find((a) => a.id === "cash") ?? null, best };
}
