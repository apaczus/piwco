// Investing chapter (month 8): pure chapter state (no UI). Kept in the game Session, in memory only (not in GameState).
// Stages: intro → split1 → run1 → result1 → lesson → horizon → split2 → topup → run2 → result2 → city ("Your city grew",
// drawn by the game: the Future tower's level up).
import { invest } from "@piwco/content";
import { compareAlternatives, marketPath, type CityLevel, type InvestProgress, simulatePortfolio, splitByShares, type Alternatives, type SimulateResult } from "@piwco/engine";
import { formatPln } from "../game/format";

export type InvestStage =
  | "intro"
  | "split1"
  | "run1"
  | "result1"
  | "lesson"
  | "horizon"
  | "split2"
  | "topup"
  | "run2"
  | "result2"
  | "city";

// The chapter has 11 screens in total ("INVESTING · Step n of 11").
export const INVEST_STEPS = 11;
const STEP_OF: Record<InvestStage, number> = {
  intro: 1,
  split1: 2,
  run1: 3,
  result1: 4,
  lesson: 5,
  horizon: 6,
  split2: 7,
  topup: 8,
  run2: 9,
  result2: 10,
  city: 11,
};
export const stepOf = (stage: InvestStage) => STEP_OF[stage];

export type InvestTry = {
  // PLN per instrument at the start (adds up to the start amount; "cash" = what was left unplaced).
  allocation: Record<string, number>;
  months: number;
  monthlyTopUp: number;
  result: SimulateResult;
};

export type InvestState = {
  stage: InvestStage;
  // Slider amounts (PLN) for the instruments other than cash; cash = the rest.
  draft: Record<string, number>;
  try1: InvestTry | null;
  // The swipe lesson was finished (Future tower level 2, step 5).
  lessonDone: boolean;
  // Try 2 choices: horizon in years, sliders (start from Try 1's), monthly top-up in PLN.
  horizon: number | null;
  draft2: Record<string, number> | null;
  topUp: number | null;
  try2: InvestTry | null;
  // Try 2 attempts so far (no limit; "Try again" starts a new one).
  attempts: number;
  // Future tower level the player has already seen grow (the chapter's "Your city grew" plays the difference).
  seenFuture: CityLevel;
};

// One market history for the whole chapter (deterministic, the same for every player).
export const MARKET = marketPath(invest);
export const START = invest.startAmount;
export const TRY1_MONTHS = 12;

export function newInvest(): InvestState {
  return { stage: "intro", draft: {}, try1: null, lessonDone: false, horizon: null, draft2: null, topUp: null, try2: null, attempts: 0, seenFuture: 0 };
}

// Placed on the sliders (everything except cash).
export function placed(draft: Record<string, number>): number {
  return Object.entries(draft).reduce((a, [id, v]) => (id === "cash" ? a : a + v), 0);
}

// The full allocation: the sliders + the rest on the account.
export function allocationOf(draft: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const inst of invest.instruments) {
    if (inst.id !== "cash") out[inst.id] = draft[inst.id] ?? 0;
  }
  out.cash = Math.max(0, START - placed(draft));
  return out;
}

// A slider moved: never more than the money still free.
export function setDraft(s: InvestState, id: string, value: number): InvestState {
  const others = placed(s.draft) - (s.draft[id] ?? 0);
  const v = Math.max(0, Math.min(value, START - others));
  return { ...s, draft: { ...s.draft, [id]: v } };
}

export function runTry(allocation: Record<string, number>, months: number, monthlyTopUp: number): InvestTry {
  const result = simulatePortfolio({
    allocation,
    // Top-ups are split like the allocation (decided).
    monthly: splitByShares(monthlyTopUp, allocation),
    months,
    market: MARKET,
    inflation: invest.inflation,
  });
  return { allocation, months, monthlyTopUp, result };
}

// "Invest for 1 year".
export function startTry1(s: InvestState): InvestState {
  return { ...s, stage: "run1", try1: runTry(allocationOf(s.draft), TRY1_MONTHS, 0) };
}

// Try 2: "Invest for N years".
export function startTry2(s: InvestState): InvestState {
  const years = s.horizon ?? 1;
  return { ...s, stage: "run2", try2: runTry(allocationOf(s.draft2 ?? s.draft), years * 12, s.topUp ?? 0), attempts: s.attempts + 1 };
}

// How much better Try 2 did than Try 1: the gain in today's money after what was paid in (top-ups don't count as
// a win by themselves). Positive = better.
export function try2Edge(s: InvestState): number {
  if (!s.try1 || !s.try2) return 0;
  return s.try2.result.realGain - s.try1.result.realGain;
}

// Try 2 beat Try 1 in real terms (Future tower level 3, decided).
export function try2Better(s: InvestState): boolean {
  return try2Edge(s) > 0;
}

// What the Future tower is built from (decided: try 1 done → Lv 1, lesson done → Lv 2, try 2 beats try 1 → Lv 3).
export function investProgress(s: InvestState | null): InvestProgress | undefined {
  if (!s) return undefined;
  return { try1Done: s.try1 !== null, lessonDone: s.lessonDone, try2Better: try2Better(s) };
}

// "Try again": back to the horizon, the last choices stay selected.
export function retryTry2(s: InvestState): InvestState {
  return { ...s, stage: "horizon", try2: null };
}

// ‹ back, one screen at a time. null = leave the chapter (handled by the game).
export function backStage(stage: InvestStage): InvestStage | null {
  switch (stage) {
    case "intro":
      return null;
    case "split1":
      return "intro";
    case "run1":
      return "split1";
    case "result1":
      return "split1";
    case "lesson":
      return "result1";
    case "horizon":
      return "lesson";
    case "split2":
      return "horizon";
    case "topup":
      return "split2";
    case "run2":
      return "topup";
    case "result2":
      return "topup";
    case "city":
      return "result2";
  }
}

// Tries by day, results and the lesson at night (decided).
export function investNight(stage: InvestStage): boolean {
  return stage === "result1" || stage === "lesson" || stage === "result2" || stage === "city";
}

export function instrumentName(id: string): string {
  return invest.instruments.find((i) => i.id === id)?.name ?? id;
}

// Market moments during a run that the player feels (only the instruments they hold) + inflation at the end.
export type RunEvent = { month: number; title: string; text: string; drop: boolean };

export function runEvents(t: InvestTry): RunEvent[] {
  const out: RunEvent[] = [];
  for (const e of invest.marketEvents) {
    if (e.month > t.months || !(t.allocation[e.instrument] > 0)) continue;
    const before = t.result.byInstrument[e.instrument]?.[e.month - 1] ?? 0;
    const after = t.result.byInstrument[e.instrument]?.[e.month] ?? 0;
    out.push({
      month: e.month,
      title: `${e.title} ${Math.round(e.change * 100)}%`.replace("-", "−"),
      text: `Your ${instrumentName(e.instrument).replace(/ \(.*\)$/, "")}: ${formatPln(before)} → ${formatPln(after)}.`,
      drop: e.change < 0,
    });
  }
  // Longer runs: the bad years of what the player holds (from year 2; year 1 has the pinned events above).
  for (const inst of invest.instruments) {
    if (!(t.allocation[inst.id] > 0)) continue;
    inst.market.yearly.forEach((r, y) => {
      const end = (y + 1) * 12;
      if (y === 0 || end > t.months || r > -0.12) return;
      const before = t.result.byInstrument[inst.id]?.[end - 12] ?? 0;
      const after = t.result.byInstrument[inst.id]?.[end] ?? 0;
      const name = instrumentName(inst.id).replace(/ \(.*\)$/, "");
      out.push({
        month: end,
        title: `Year ${y + 1}: ${name} ${Math.round(r * 100)}%`.replace("-", "−"),
        text: `Your ${name}: ${formatPln(before)} → ${formatPln(after)}. Hold on: the market has bad years too.`,
        drop: true,
      });
    });
  }
  const years = Math.round(t.months / 12);
  const pct = Math.round(invest.inflation * 100);
  out.push({
    month: t.months,
    title: years === 1 ? `Prices rose ${pct}% this year` : `Prices rose ${pct}% a year`,
    text: `What cost 100 PLN at the start now costs ${Math.round(100 * Math.pow(1 + invest.inflation, t.months / 12))} PLN.`,
    drop: true,
  });
  // Stable: on the same month the market news comes before the inflation note.
  return out.sort((a, b) => a.month - b.month);
}

// "What could have happened": each instrument alone + the balanced mix, for the same money and time.
export function alternatives(months: number, monthlyTopUp = 0): Alternatives {
  return compareAlternatives({ amount: START, monthlyTopUp, months, market: MARKET, inflation: invest.inflation, balancedMix: invest.balancedMix });
}

// The balanced mix kept for 10 years (the hook for the lesson).
export function balancedIn10Years(): number {
  return runTry(splitByShares(START, invest.balancedMix), 120, 0).result.nominal;
}

// 2–3 short conclusions from the player's own decision (from the data, never random).
export function insights(t: InvestTry): string[] {
  const share = (id: string) => Math.round(((t.allocation[id] ?? 0) / START) * 100);
  const out: string[] = [];
  const stock = share("stock");
  const gainOf = (id: string) => (t.result.byInstrument[id]?.[t.months] ?? 0) - (t.allocation[id] ?? 0);
  if (stock >= 50) {
    out.push(`You put ${stock}% into one company. When NovaTech fell, it took ${formatPln(-gainOf("stock"))} with it.`);
  } else if (stock > 0) {
    out.push(`NovaTech was ${stock}% of your money and lost ${formatPln(-gainOf("stock"))}. One company can drop fast.`);
  }
  const cash = share("cash");
  if (cash >= 30) {
    const lost = (t.allocation.cash ?? 0) - Math.round((t.allocation.cash ?? 0) / Math.pow(1 + invest.inflation, t.months / 12));
    out.push(`${formatPln(t.allocation.cash ?? 0)} sat on your account. Inflation quietly took ${formatPln(lost)} of what it can buy.`);
  }
  if (share("etf") > 0) {
    out.push("The S&P 500 ETF dipped 12% in July and climbed back by December. You didn't sell in the dip: good.");
  }
  const safe = share("deposit") + share("bonds");
  if (safe >= 50) {
    out.push(`Deposit and bonds kept you safe this year: +${formatPln(gainOf("deposit") + gainOf("bonds"))}. Over 10 years they only just beat inflation.`);
  }
  if (out.length < 2) out.push("One year is short: even good investments can have a bad year.");
  return out.slice(0, 3);
}
