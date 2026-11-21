import { describe, expect, it } from "vitest";
import { applyAction } from "./actions";
import { createInitialState } from "./initialState";
import type { Action, ActionResult, GameState } from "./state";
import { deepFreeze, makeSetup } from "./testFixtures";

// Fresh, frozen start state: business cash 20 000, personal cash 3 000, fund 0.
function start(): GameState {
  return deepFreeze(createInitialState(makeSetup()));
}

function expectOk(result: ActionResult): GameState {
  if (!result.ok) throw new Error(`Expected ok, got error: ${result.error}`);
  return result.state;
}

function totalMoney(s: GameState): number {
  return s.business.cash + s.personal.cash + s.personal.emergencyFund;
}

describe("owner_draw", () => {
  it("moves money from the business to the personal account", () => {
    const state = expectOk(applyAction(start(), { type: "owner_draw", amount: 5_000 }));
    expect(state.business.cash).toBe(15_000);
    expect(state.personal.cash).toBe(8_000);
  });

  it("allows drawing exactly everything on the business account", () => {
    const state = expectOk(applyAction(start(), { type: "owner_draw", amount: 20_000 }));
    expect(state.business.cash).toBe(0);
  });

  it("rejects drawing more than the business has", () => {
    const result = applyAction(start(), { type: "owner_draw", amount: 20_001 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Not enough money on the business account");
  });
});

describe("transfer_to_emergency_fund", () => {
  it("moves money from the personal account to the emergency fund", () => {
    const state = expectOk(
      applyAction(start(), { type: "transfer_to_emergency_fund", amount: 1_000 }),
    );
    expect(state.personal.cash).toBe(2_000);
    expect(state.personal.emergencyFund).toBe(1_000);
  });

  it("rejects transferring more than the personal account has", () => {
    const result = applyAction(start(), { type: "transfer_to_emergency_fund", amount: 3_001 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Not enough money on the personal account");
  });
});

describe("set_household_budget", () => {
  const valid = { housing: 2_500, food: 1_200, car_transport: 500, insurance: 100, savings: 300, other: 200 };

  it("replaces the household budget and logs it", () => {
    const state = expectOk(applyAction(start(), { type: "set_household_budget", spending: valid }));
    expect(state.personal.monthlySpending).toEqual(valid);
    expect(state.log).toEqual([{ month: 1, action: { type: "set_household_budget", spending: valid } }]);
  });

  it("does not let a later change to the passed object alter the state or the log", () => {
    const spending = { ...valid };
    const state = expectOk(applyAction(start(), { type: "set_household_budget", spending }));
    spending.food = 1;
    expect(state.personal.monthlySpending.food).toBe(1_200);
    const logged = state.log[0]?.action;
    expect(logged?.type === "set_household_budget" && logged.spending.food).toBe(1_200);
  });

  it.each([
    ["a negative amount", { ...valid, food: -1 }],
    ["a fractional amount", { ...valid, food: 10.5 }],
    ["a missing category", { housing: 2_500, food: 1_200, car_transport: 500, insurance: 100, savings: 300 }],
    ["an unknown category", { ...valid, yacht: 1_000 }],
    ["a non-number amount", { ...valid, food: "1200" }],
  ])("rejects %s", (_, spending) => {
    const result = applyAction(start(), { type: "set_household_budget", spending } as unknown as Action);
    expect(result.ok).toBe(false);
  });
});

describe("applyAction (all actions)", () => {
  it.each([0, -100, 10.5, Number.NaN])("rejects the amount %s", (amount) => {
    for (const type of ["owner_draw", "transfer_to_emergency_fund"] as const) {
      const result = applyAction(start(), { type, amount });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("Amount must be a positive whole number of PLN.");
    }
  });

  it("rejects unknown action types (e.g. from a tampered log)", () => {
    const result = applyAction(start(), { type: "print_money", amount: 1 } as unknown as Action);
    expect(result.ok).toBe(false);
  });

  it("logs every successful action with its month, in order", () => {
    let state = start();
    state = expectOk(applyAction(state, { type: "owner_draw", amount: 5_000 }));
    state = expectOk(applyAction(state, { type: "transfer_to_emergency_fund", amount: 1_500 }));
    expect(state.log).toEqual([
      { month: 1, action: { type: "owner_draw", amount: 5_000 } },
      { month: 1, action: { type: "transfer_to_emergency_fund", amount: 1_500 } },
    ]);
  });

  it("does not log failed actions", () => {
    const failed = applyAction(start(), { type: "owner_draw", amount: 1_000_000 });
    expect(failed.ok).toBe(false);
    const state = expectOk(applyAction(start(), { type: "owner_draw", amount: 100 }));
    expect(state.log).toHaveLength(1);
  });

  it("keeps the total amount of money the same (transfers only move it)", () => {
    const before = start();
    let state = before;
    state = expectOk(applyAction(state, { type: "owner_draw", amount: 7_000 }));
    state = expectOk(applyAction(state, { type: "transfer_to_emergency_fund", amount: 4_000 }));
    state = expectOk(applyAction(state, { type: "owner_draw", amount: 2_500 }));
    expect(totalMoney(state)).toBe(totalMoney(before));
  });

  it("never mutates the input state (frozen state would throw on any write)", () => {
    const before = start();
    const snapshot = structuredClone(before);
    expectOk(applyAction(before, { type: "owner_draw", amount: 5_000 }));
    expectOk(applyAction(before, { type: "transfer_to_emergency_fund", amount: 1_000 }));
    expect(before).toEqual(snapshot);
  });

  it("does not let a later change to the action object alter the log", () => {
    const action = { type: "owner_draw" as const, amount: 5_000 };
    const state = expectOk(applyAction(start(), action));
    action.amount = 1;
    expect(state.log[0]?.action).toEqual({ type: "owner_draw", amount: 5_000 });
  });
});
