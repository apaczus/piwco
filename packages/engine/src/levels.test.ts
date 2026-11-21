import { describe, expect, it } from "vitest";
import { applyAction } from "./actions";
import { createInitialState } from "./initialState";
import { checkMonthGoal } from "./levels";
import { settleMonth } from "./settle";
import type { Action, GameState } from "./state";
import { makeSetup } from "./testFixtures";

// Fixture: business cash 20 000, revenue 45 000, costs 39 000; personal cash 3 000, budget 5 000.
function play(...actions: Action[]): GameState {
  return actions.reduce((s, a) => {
    const r = applyAction(s, a);
    if (!r.ok) throw new Error(r.error);
    return r.state;
  }, createInitialState(makeSetup()));
}

const goal = (s: GameState) => checkMonthGoal(1, settleMonth(s).report);

describe("month 1 goal: no new arrears", () => {
  it("passes when the owner pays themselves enough and the company can still pay its costs", () => {
    expect(goal(play({ type: "owner_draw", amount: 2_000 }))).toEqual({ passed: true, reasons: [] });
  });

  it("fails with unpaid bills when the owner doesn't pay themselves enough", () => {
    const result = goal(play());
    expect(result.passed).toBe(false);
    expect(result.reasons).toEqual([
      { kind: "bill_unpaid", category: "food", amount: 1_000 },
      { kind: "bill_unpaid", category: "car_transport", amount: 600 },
      { kind: "bill_unpaid", category: "other", amount: 400 },
    ]);
  });

  it("fails with unpaid company costs when the owner takes too much out", () => {
    // Revenue lowered to 30 000: after drawing all 20 000, the company has 30 000 for 39 000 of costs.
    const setup = makeSetup();
    setup.business.monthlyRevenue = 30_000;
    let s = createInitialState(setup);
    const r = applyAction(s, { type: "owner_draw", amount: 20_000 });
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    const result = checkMonthGoal(1, settleMonth(s).report);
    expect(result.passed).toBe(false);
    expect(result.reasons).toEqual([{ kind: "costs_unpaid", amount: 9_000 }]);
  });

  it("fails when the budget for housing or food is below the minimum, even with money left", () => {
    const result = goal(
      play(
        { type: "owner_draw", amount: 5_000 },
        {
          type: "set_household_budget",
          spending: { housing: 2_000, food: 1_500, car_transport: 600, insurance: 0, savings: 0, other: 400 },
        },
      ),
    );
    expect(result.passed).toBe(false);
    expect(result.reasons).toEqual([{ kind: "below_minimum", category: "housing", amount: 500 }]);
  });

  it("reports an unpaid loan installment", () => {
    const base = play();
    const withLoan: GameState = {
      ...base,
      personal: { ...base.personal, cash: 0, debt: { balance: 5_000, monthlyInstallment: 800 } },
    };
    const result = goal(withLoan);
    expect(result.reasons[0]).toEqual({ kind: "installment_unpaid", amount: 800 });
  });

  it("has no goal logic for months that are not built yet", () => {
    const report = settleMonth(play()).report;
    expect(() => checkMonthGoal(2, report)).toThrow("No goal logic for month 2 yet");
  });
});
