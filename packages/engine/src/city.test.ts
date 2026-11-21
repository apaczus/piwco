import { cityThresholds, type CityThresholds } from "@piwco/content";
import { describe, expect, it } from "vitest";
import { applyAction } from "./actions";
import { cityLevels, forecastCity, futureLevel, netWorth, nextLevel, type CityConfig } from "./city";
import { createInitialState } from "./initialState";
import type { Action, GameState } from "./state";
import { deepFreeze, makeSetup } from "./testFixtures";

// Fixture: business cash 20 000, revenue 45 000, costs 39 000; personal cash 3 000,
// budget 5 000 (more than the personal cash), fund 0, no debt, owns a house, no policies.
// Thresholds here are fixed for the tests (independent of city.json edits).
const THRESHOLDS: CityThresholds = {
  home: { maxLevel: 3 },
  firm: { revenueRatioLevel2: 1.0, revenueRatioLevel3: 1.2 },
  vault: { fundLevels: [1, 1500, 4500] },
  shield: { policyLevels: [1, 2, 4] },
  future: { unlockMonth: 8, steps: ["try1Done", "lessonDone", "try2Better"] },
};
const CONFIG: CityConfig = { thresholds: THRESHOLDS, startingRevenue: 45_000 };

function start(): GameState {
  return createInitialState(makeSetup());
}

function act(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce((s, a) => {
    const r = applyAction(s, a);
    if (!r.ok) throw new Error(r.error);
    return r.state;
  }, state);
}

function withState(state: GameState, change: (s: GameState) => void): GameState {
  const copy = structuredClone(state);
  change(copy);
  return copy;
}

describe("cityLevels", () => {
  it("starts with Home 1, Company 2, everything else empty", () => {
    const view = cityLevels(start(), 0, CONFIG);
    expect(view.levels).toEqual({ home: 1, firm: 2, vault: 0, shield: 0, future: 0 });
    expect(view.clouds).toEqual({ home: false, firm: false });
    expect(view.damaged).toEqual({ home: false, firm: false });
    expect(view.rentedHome).toBe(false);
  });

  it("Home grows with completed months and stops at the max level", () => {
    const s = start();
    expect(cityLevels(s, 1, CONFIG).levels.home).toBe(2);
    expect(cityLevels(s, 2, CONFIG).levels.home).toBe(3);
    expect(cityLevels(s, 9, CONFIG).levels.home).toBe(3);
    const lowMax = { ...CONFIG, thresholds: { ...THRESHOLDS, home: { maxLevel: 2 } } };
    expect(cityLevels(s, 5, lowMax).levels.home).toBe(2);
  });

  it("Company follows revenue relative to the starting revenue", () => {
    const at = (revenue: number) =>
      cityLevels(withState(start(), (s) => (s.business.monthlyRevenue = revenue)), 0, CONFIG).levels.firm;
    expect(at(44_999)).toBe(1);
    expect(at(45_000)).toBe(2);
    expect(at(53_999)).toBe(2);
    expect(at(54_000)).toBe(3);
  });

  it("Cushion vault follows the emergency fund thresholds", () => {
    const at = (fund: number) =>
      cityLevels(withState(start(), (s) => (s.personal.emergencyFund = fund)), 0, CONFIG).levels.vault;
    expect([at(0), at(1), at(1_499), at(1_500), at(4_499), at(4_500), at(100_000)]).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });

  it("Protection counts business + personal policies", () => {
    const at = (biz: number, personal: number) =>
      cityLevels(
        withState(start(), (s) => {
          (["liability", "property", "equipment"] as const).slice(0, biz).forEach((k) => (s.business.policies[k] = true));
          (["health", "life", "income_loss"] as const).slice(0, personal).forEach((k) => (s.personal.policies[k] = true));
        }),
        0,
        CONFIG,
      ).levels.shield;
    expect([at(0, 0), at(1, 0), at(1, 1), at(2, 1), at(2, 2), at(3, 3)]).toEqual([0, 1, 2, 2, 3, 3]);
  });

  it("Future tower: empty without the investing chapter, whatever the money", () => {
    const rich = withState(start(), (s) => (s.personal.emergencyFund = 1_000_000));
    expect(cityLevels(rich, 11, CONFIG).levels.future).toBe(0);
  });

  it("Future tower grows with the chapter's steps, in order", () => {
    const at = (try1Done: boolean, lessonDone: boolean, try2Better: boolean) =>
      cityLevels(start(), 0, CONFIG, { try1Done, lessonDone, try2Better }).levels.future;
    expect([at(false, false, false), at(true, false, false), at(true, true, false), at(true, true, true)]).toEqual([0, 1, 2, 3]);
    // A step reached out of order doesn't count until the ones before it are done.
    expect(at(false, true, true)).toBe(0);
    expect(at(true, false, true)).toBe(1);
    expect(futureLevel(undefined, CONFIG)).toBe(0);
    // Other buildings don't move.
    const a = cityLevels(start(), 0, CONFIG).levels;
    const b = cityLevels(start(), 0, CONFIG, { try1Done: true, lessonDone: true, try2Better: true }).levels;
    expect({ ...b, future: 0 }).toEqual(a);
  });

  it("shows rain clouds for arrears and a rented flat without a house", () => {
    const s = withState(start(), (x) => {
      x.personal.arrears = 100;
      x.business.arrears = 1;
      x.personal.ownsHouse = false;
    });
    const view = cityLevels(s, 0, CONFIG);
    expect(view.clouds).toEqual({ home: true, firm: true });
    expect(view.rentedHome).toBe(true);
  });

  it("shows cracks on a building whose side is paying off a loan", () => {
    const s = withState(start(), (x) => {
      x.personal.debt = { balance: 1_240, monthlyInstallment: 414 };
      x.business.debt = { balance: 4_240, monthlyInstallment: 707 };
    });
    expect(cityLevels(s, 0, CONFIG).damaged).toEqual({ home: true, firm: true });
  });

  it("uses the thresholds passed in (city.json can be edited)", () => {
    const cheap = { ...CONFIG, thresholds: { ...THRESHOLDS, vault: { fundLevels: [1, 10, 20] } } };
    const s = withState(start(), (x) => (x.personal.emergencyFund = 20));
    expect(cityLevels(s, 0, cheap).levels.vault).toBe(3);
  });

  it("never mutates the state", () => {
    const s = deepFreeze(start());
    expect(() => cityLevels(s, 1, CONFIG)).not.toThrow();
    expect(() => forecastCity(s, 1, CONFIG)).not.toThrow();
  });
});

describe("forecastCity", () => {
  it("a plan that can't be paid brings the rain cloud over Home", () => {
    // Budget 5 000 > personal cash 3 000: bills would go unpaid at month end.
    expect(forecastCity(start(), 0, CONFIG).city.clouds.home).toBe(true);
  });

  it("paying yourself enough removes the cloud", () => {
    const s = act(start(), { type: "owner_draw", amount: 2_000 });
    expect(forecastCity(s, 0, CONFIG).city.clouds.home).toBe(false);
  });

  it("savings in the budget build the cushion vault before the month ends", () => {
    const s = act(
      start(),
      { type: "owner_draw", amount: 4_000 },
      {
        type: "set_household_budget",
        spending: { housing: 2_500, food: 1_500, car_transport: 600, insurance: 0, savings: 1_500, other: 400 },
      },
    );
    expect(cityLevels(s, 0, CONFIG).levels.vault).toBe(0);
    expect(forecastCity(s, 0, CONFIG).city.levels.vault).toBe(2);
  });

  it("forecast net worth is the net worth after settlement", () => {
    const s = act(start(), { type: "owner_draw", amount: 2_000 });
    // 20 000 + 45 000 − 39 000 − 2 000 = 24 000 company; 3 000 + 2 000 − 5 000 = 0 home.
    expect(forecastCity(s, 0, CONFIG).netWorth).toBe(24_000);
  });
});

describe("netWorth", () => {
  it("adds cash and the cushion, subtracts arrears and the loan", () => {
    const s = withState(start(), (x) => {
      x.personal.emergencyFund = 1_000;
      x.business.arrears = 500;
      x.personal.arrears = 200;
      x.personal.debt.balance = 3_000;
    });
    expect(netWorth(s)).toBe(20_000 + 3_000 + 1_000 - 500 - 200 - 3_000);
  });
});

describe("nextLevel", () => {
  it("says what each building needs next", () => {
    expect(nextLevel("vault", 0, CONFIG)).toEqual({ kind: "fund", amount: 1 });
    expect(nextLevel("vault", 2, CONFIG)).toEqual({ kind: "fund", amount: 4_500 });
    expect(nextLevel("vault", 3, CONFIG)).toBeNull();
    expect(nextLevel("shield", 1, CONFIG)).toEqual({ kind: "policies", count: 2 });
    expect(nextLevel("firm", 2, CONFIG)).toEqual({ kind: "revenue", revenue: 54_000 });
    expect(nextLevel("home", 1, CONFIG)).toEqual({ kind: "months", months: 1 });
    expect(nextLevel("home", 3, CONFIG)).toBeNull();
    expect(nextLevel("future", 0, CONFIG)).toEqual({ kind: "locked", unlockMonth: 8 });
    expect(nextLevel("future", 1, CONFIG)).toEqual({ kind: "invest", step: "lessonDone" });
    expect(nextLevel("future", 2, CONFIG)).toEqual({ kind: "invest", step: "try2Better" });
    expect(nextLevel("future", 3, CONFIG)).toBeNull();
  });
});

describe("city.json", () => {
  it("has ascending thresholds with 3 levels each", () => {
    for (const list of [cityThresholds.vault.fundLevels, cityThresholds.shield.policyLevels]) {
      expect(list).toHaveLength(3);
      expect([...list].sort((a, b) => a - b)).toEqual(list);
    }
    expect(cityThresholds.firm.revenueRatioLevel3).toBeGreaterThan(cityThresholds.firm.revenueRatioLevel2);
  });
});
