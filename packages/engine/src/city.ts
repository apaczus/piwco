// City view: read-only helpers that turn a game state into building levels (0 = empty plot, 1–3 = built).
// Pure, never mutate, hold no amounts: thresholds and the industry's starting revenue come from outside
// (packages/content/src/city.json + industries.json). The simulation itself is not affected.
import type { CityThresholds } from "@piwco/content";
import { settleMonth } from "./settle";
import type { GameState } from "./state";

export const BUILDINGS = ["home", "firm", "vault", "shield", "future"] as const;
export type BuildingId = (typeof BUILDINGS)[number];
export type CityLevel = 0 | 1 | 2 | 3;

export type CityConfig = {
  thresholds: CityThresholds;
  // The industry's monthly revenue at the start of the game (the Company level is relative to it).
  startingRevenue: number;
};

// Investing chapter progress (kept by the app, not in GameState): what the Future tower is built from.
export type InvestProgress = { try1Done: boolean; lessonDone: boolean; try2Better: boolean };

// Future tower level: the chapter's steps reached in order (city.json future.steps). Unknown step names count as not reached.
export function futureLevel(invest: InvestProgress | undefined, config: CityConfig): CityLevel {
  if (!invest) return 0;
  let n = 0;
  for (const step of config.thresholds.future.steps) {
    if (!(invest as Record<string, boolean>)[step]) break;
    n++;
  }
  return clampLevel(n);
}

export type CityView = {
  levels: Record<BuildingId, CityLevel>;
  // Rain cloud over the building (arrears).
  clouds: { home: boolean; firm: boolean };
  // Cracks on the building: that side is paying off a loan (e.g. one taken to cover an event).
  damaged: { home: boolean; firm: boolean };
  // The player doesn't own a house: Home is drawn as a rented flat (same level).
  rentedHome: boolean;
};

const clampLevel = (n: number): CityLevel => Math.max(0, Math.min(3, Math.floor(n))) as CityLevel;

// How many of the ascending thresholds `value` reaches (0–3).
function levelFrom(value: number, thresholds: readonly number[]): CityLevel {
  return clampLevel(thresholds.filter((t) => value >= t).length);
}

function activePolicies(state: GameState): number {
  return (
    Object.values(state.business.policies).filter(Boolean).length +
    Object.values(state.personal.policies).filter(Boolean).length
  );
}

/**
 * Levels of the city for a given state. `monthsPassed` = completed months (session.completedMonth).
 * `invest` = the investing chapter's progress (builds the Future tower); missing = not started.
 */
export function cityLevels(state: GameState, monthsPassed: number, config: CityConfig, invest?: InvestProgress): CityView {
  const t = config.thresholds;
  const ratio = config.startingRevenue > 0 ? state.business.monthlyRevenue / config.startingRevenue : 1;
  const firm: CityLevel = ratio >= t.firm.revenueRatioLevel3 ? 3 : ratio >= t.firm.revenueRatioLevel2 ? 2 : 1;
  return {
    levels: {
      home: clampLevel(Math.min(t.home.maxLevel, 1 + Math.max(0, monthsPassed))),
      firm,
      vault: levelFrom(state.personal.emergencyFund, t.vault.fundLevels),
      shield: levelFrom(activePolicies(state), t.shield.policyLevels),
      future: futureLevel(invest, config),
    },
    clouds: { home: state.personal.arrears > 0, firm: state.business.arrears > 0 },
    damaged: { home: state.personal.debt.balance > 0, firm: state.business.debt.balance > 0 },
    rentedHome: !state.personal.ownsHouse,
  };
}

/** Net worth: cash on both accounts + emergency fund − arrears − loan balance (no house / car value). */
export function netWorth(state: GameState): number {
  return (
    state.business.cash +
    state.personal.cash +
    state.personal.emergencyFund -
    state.business.arrears -
    state.personal.arrears -
    state.personal.debt.balance
  );
}

/**
 * The city as it will look at the end of the current month if nothing else changes
 * (same settlement preview as the HUD). Only for a month that hasn't been settled yet:
 * settling an already settled state would count the month twice.
 */
export function forecastCity(
  state: GameState,
  monthsPassed: number,
  config: CityConfig,
  invest?: InvestProgress,
): { city: CityView; netWorth: number } {
  const settled = settleMonth(state).state;
  return { city: cityLevels(settled, monthsPassed, config, invest), netWorth: netWorth(settled) };
}

// What the next level needs (the app turns it into a sentence). null = already at the top.
export type NextLevel =
  | { kind: "months"; months: number }
  | { kind: "revenue"; revenue: number }
  | { kind: "fund"; amount: number }
  | { kind: "policies"; count: number }
  | { kind: "locked"; unlockMonth: number }
  // Future tower: the next chapter step (a name from city.json future.steps).
  | { kind: "invest"; step: string }
  | null;

export function nextLevel(building: BuildingId, level: CityLevel, config: CityConfig): NextLevel {
  const t = config.thresholds;
  switch (building) {
    case "home":
      return level >= Math.min(3, t.home.maxLevel) ? null : { kind: "months", months: 1 };
    case "firm": {
      if (level >= 3) return null;
      const ratio = level <= 1 ? t.firm.revenueRatioLevel2 : t.firm.revenueRatioLevel3;
      return { kind: "revenue", revenue: Math.ceil(config.startingRevenue * ratio) };
    }
    case "vault": {
      const amount = t.vault.fundLevels[level];
      return amount === undefined ? null : { kind: "fund", amount };
    }
    case "shield": {
      const count = t.shield.policyLevels[level];
      return count === undefined ? null : { kind: "policies", count };
    }
    case "future": {
      if (level === 0) return { kind: "locked", unlockMonth: t.future.unlockMonth };
      const step = t.future.steps[level];
      return step === undefined ? null : { kind: "invest", step };
    }
  }
}
