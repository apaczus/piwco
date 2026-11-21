import { household, industries, type IndustryProfile } from "@piwco/content";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./initialState";
import { applyAction } from "./actions";
import { checkMonthGoal } from "./levels";
import { settleMonth } from "./settle";
import { buildInitialSetup, incomeScale, type HouseholdAnswers } from "./setupFromContent";

const isWholePln = (n: number) => Number.isInteger(n) && n >= 0;

describe("content data (industries + household)", () => {
  it("has exactly the 3 playable industries", () => {
    expect(industries.map((i) => i.id).sort()).toEqual(["gastronomy", "it_software", "manufacturing"]);
  });

  it.each(industries)("$name: at most 6 unique cost categories, whole PLN amounts", (industry) => {
    const ids = industry.costCategories.map((c) => c.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(6);
    expect(new Set(ids).size).toBe(ids.length);
    expect(isWholePln(industry.monthlyRevenue)).toBe(true);
    expect(isWholePln(industry.startingCash)).toBe(true);
    expect(isWholePln(industry.employees)).toBe(true);
    for (const c of industry.costCategories) expect(isWholePln(c.monthlyCost)).toBe(true);
  });

  it("household: whole PLN amounts, default spending meets every minimum", () => {
    expect(isWholePln(household.startingCash)).toBe(true);
    for (const c of household.categories) {
      expect(isWholePln(c.monthlySpending)).toBe(true);
      expect(isWholePln(c.minimum)).toBe(true);
      expect(c.monthlySpending).toBeGreaterThanOrEqual(c.minimum);
    }
  });
});

describe("buildInitialSetup", () => {
  it.each(industries)("$name: builds a valid starting state", (industry) => {
    const state = createInitialState(buildInitialSetup(industry, household, 7));
    expect(state.month).toBe(1);
    expect(state.business.industry).toBe(industry.id);
    expect(state.business.cash).toBe(industry.startingCash);
    expect(state.business.monthlyRevenue).toBe(industry.monthlyRevenue);
    expect(Object.keys(state.business.monthlyCosts)).toEqual(
      industry.costCategories.map((c) => c.id),
    );
    expect(state.personal.cash).toBe(household.startingCash);
    expect(Object.keys(state.personal.monthlySpending).sort()).toEqual(
      ["car_transport", "food", "housing", "insurance", "other", "savings"],
    );
    expect(Object.values(state.business.policies).every((p) => p === false)).toBe(true);
    expect(Object.values(state.personal.policies).every((p) => p === false)).toBe(true);
  });

  it("rejects an industry the engine does not know", () => {
    const fake: IndustryProfile = { ...industries[0]!, id: "space_mining" };
    expect(() => buildInitialSetup(fake, household, 1)).toThrow('Unknown industry in content: "space_mining"');
  });

  it("rejects a household without a required category", () => {
    const broken = { ...household, categories: household.categories.filter((c) => c.id !== "food") };
    expect(() => buildInitialSetup(industries[0]!, broken, 1)).toThrow(
      'Household category missing in content: "food"',
    );
  });
});

describe("onboarding answers (household scaled by income)", () => {
  const gastronomy = industries.find((i) => i.id === "gastronomy")!;
  const base: HouseholdAnswers = { income: 5500, cushionMonths: 0, ownsHouse: true, ownsCar: true };
  const setup = (a: Partial<HouseholdAnswers>) => buildInitialSetup(gastronomy, household, 1, { ...base, ...a });

  it("keeps the baseline at the reference income (test profile A)", () => {
    const s = setup({});
    expect(s.personal.cash).toBe(household.startingCash);
    expect(s.personal.monthlySpending.housing).toBe(2_500);
    expect(s.personal.minimumSpending.food).toBe(1_000);
  });

  it("scales spending, minimums and cash with income, within the bounds", () => {
    expect(incomeScale(household, 3_000)).toBe(0.6); // 0.545 → clamped to the minimum
    expect(incomeScale(household, 14_000)).toBe(1.3); // 2.5 → clamped to the maximum
    const low = setup({ income: 3_000 });
    const high = setup({ income: 14_000 });
    expect(low.personal.monthlySpending.housing).toBe(1_500);
    expect(high.personal.monthlySpending.housing).toBe(3_250);
    expect(high.personal.minimumSpending.housing).toBe(3_250);
    expect(high.personal.cash).toBe(1_950);
    for (const s of [low, high]) {
      for (const v of [...Object.values(s.personal.monthlySpending), ...Object.values(s.personal.minimumSpending), s.personal.cash]) {
        expect(v % 50).toBe(0);
      }
    }
  });

  it("turns the cushion answer into months of household bills", () => {
    // Bills at the reference income: 2 500 + 1 500 + 700 + 500 = 5 200.
    expect(setup({ cushionMonths: 0 }).personal.emergencyFund).toBe(0);
    expect(setup({ cushionMonths: 0.5 }).personal.emergencyFund).toBe(2_600);
    expect(setup({ cushionMonths: 2 }).personal.emergencyFund).toBe(10_400);
  });

  it("applies renting and having no car", () => {
    const s = setup({ ownsHouse: false, ownsCar: false });
    expect(s.personal.ownsHouse).toBe(false);
    expect(s.personal.ownsCar).toBe(false);
    expect(s.personal.monthlySpending.car_transport).toBe(household.noCarTransportSpending);
  });

  it("keeps the company package fixed", () => {
    expect(setup({ income: 14_000 }).business).toEqual(setup({ income: 3_000 }).business);
  });

  it("January can be passed in every industry at every income", () => {
    for (const industry of industries) {
      for (const income of [3_000, 5_500, 9_500, 14_000]) {
        for (const ownsCar of [true, false]) {
          const state = createInitialState(buildInitialSetup(industry, household, 1, { ...base, income, ownsCar }));
          const bills = Object.entries(state.personal.monthlySpending).reduce((s, [k, v]) => (k === "savings" ? s : s + v), 0);
          const draw = Math.min(state.business.cash, Math.max(1, bills - state.personal.cash));
          const r = applyAction(state, { type: "owner_draw", amount: draw });
          expect(r.ok).toBe(true);
          if (!r.ok) continue;
          const goal = checkMonthGoal(1, settleMonth(r.state).report);
          expect({ industry: industry.id, income, ownsCar, passed: goal.passed }).toEqual({ industry: industry.id, income, ownsCar, passed: true });
        }
      }
    }
  });
});
