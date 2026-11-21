import { describe, expect, it } from "vitest";
import { createInitialState } from "./initialState";
import { createRng } from "./rng";
import { makeSetup } from "./testFixtures";

describe("createInitialState", () => {
  it("starts in month 1 with an empty log and no arrears", () => {
    const state = createInitialState(makeSetup());
    expect(state.month).toBe(1);
    expect(state.log).toEqual([]);
    expect(state.business.arrears).toBe(0);
    expect(state.personal.arrears).toBe(0);
  });

  it("sets the RNG state from the seed", () => {
    const setup = makeSetup();
    expect(createInitialState(setup).rng).toBe(createRng(setup.seed));
  });

  it("copies the numbers from the setup", () => {
    const setup = makeSetup();
    const state = createInitialState(setup);
    expect(state.business.cash).toBe(setup.business.cash);
    expect(state.business.monthlyCosts).toEqual(setup.business.monthlyCosts);
    expect(state.personal.monthlySpending).toEqual(setup.personal.monthlySpending);
    expect(state.personal.ownsCar).toBe(true);
  });

  it("does not share objects with the setup", () => {
    const setup = makeSetup();
    const state = createInitialState(setup);
    setup.business.monthlyCosts.rent = 999_999;
    setup.personal.monthlySpending.food = 999_999;
    setup.personal.debt.balance = 999_999;
    setup.business.policies.liability = true;
    expect(state.business.monthlyCosts.rent).toBe(6_000);
    expect(state.personal.monthlySpending.food).toBe(1_500);
    expect(state.personal.debt.balance).toBe(0);
    expect(state.business.policies.liability).toBe(false);
  });

  it("is deterministic: the same setup gives the same state", () => {
    expect(createInitialState(makeSetup())).toEqual(createInitialState(makeSetup()));
  });
});
