import { household, industries, type IndustryProfile } from "@piwco/content";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./initialState";
import { buildInitialSetup } from "./setupFromContent";

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
