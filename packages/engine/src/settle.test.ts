import { describe, expect, it } from "vitest";
import { applyAction } from "./actions";
import { createInitialState } from "./initialState";
import { settleMonth, type MonthReport } from "./settle";
import type { Action, GameState, HouseholdCategory } from "./state";
import { deepFreeze, makeSetup } from "./testFixtures";

// Fixture: business cash 20 000, revenue 45 000, costs 39 000.
// Personal cash 3 000, fund 0, budget 5 000 (housing 2 500, food 1 500, car 600, other 400),
// minimums housing 2 500 / food 1 000, no debt.
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

function budget(overrides: Partial<Record<HouseholdCategory, number>>): Action {
  return {
    type: "set_household_budget",
    spending: { housing: 2_500, food: 1_500, car_transport: 600, insurance: 0, savings: 0, other: 400, ...overrides },
  };
}

const bill = (r: MonthReport, c: HouseholdCategory) => r.personal.bills.find((b) => b.category === c)!;

describe("settleMonth", () => {
  it("everything balances: costs and bills paid, no arrears", () => {
    const { state, report } = settleMonth(act(start(), { type: "owner_draw", amount: 5_000 }));
    expect(state.business.cash).toBe(15_000 + 45_000 - 39_000);
    expect(state.business.arrears).toBe(0);
    expect(state.personal.cash).toBe(8_000 - 5_000);
    expect(state.personal.arrears).toBe(0);
    expect(report.business).toMatchObject({ revenue: 45_000, costs: 39_000, costsPaid: 39_000, arrearsAdded: 0 });
    expect(report.personal.arrearsAdded).toBe(0);
  });

  it("business short on costs: pays what it can, the rest becomes arrears, cash stays at 0", () => {
    const setup = makeSetup();
    setup.business.cash = 0;
    setup.business.monthlyRevenue = 30_000;
    const { state, report } = settleMonth(createInitialState(setup));
    expect(state.business.cash).toBe(0);
    expect(state.business.arrears).toBe(9_000);
    expect(report.business).toMatchObject({ costsPaid: 30_000, arrearsAdded: 9_000 });
  });

  it("personal account short: bills paid in order (housing first), unpaid bills become arrears", () => {
    const { state, report } = settleMonth(start());
    expect(state.personal.cash).toBe(0);
    expect(bill(report, "housing")).toMatchObject({ paid: 2_500, unpaid: 0 });
    expect(bill(report, "food")).toMatchObject({ paid: 500, unpaid: 1_000 });
    expect(bill(report, "car_transport")).toMatchObject({ paid: 0, unpaid: 600 });
    expect(bill(report, "other")).toMatchObject({ paid: 0, unpaid: 400 });
    expect(state.personal.arrears).toBe(2_000);
  });

  it("budget below the minimum (housing, food) creates arrears even with enough money", () => {
    const s = act(start(), { type: "owner_draw", amount: 5_000 }, budget({ housing: 2_000, food: 800 }));
    const { state, report } = settleMonth(s);
    expect(bill(report, "housing")).toMatchObject({ paid: 2_000, belowMinimum: 500 });
    expect(bill(report, "food")).toMatchObject({ paid: 800, belowMinimum: 200 });
    expect(state.personal.arrears).toBe(700);
    expect(state.personal.cash).toBe(8_000 - 3_800);
  });

  it("old arrears are paid first, before this month's costs and bills", () => {
    const base = start();
    const s: GameState = {
      ...base,
      business: { ...base.business, arrears: 5_000 },
      personal: { ...base.personal, arrears: 1_000 },
    };
    const { state, report } = settleMonth(s);
    expect(report.business.oldArrearsPaid).toBe(5_000);
    expect(state.business.cash).toBe(20_000 + 45_000 - 5_000 - 39_000);
    expect(state.business.arrears).toBe(0);
    expect(report.personal.oldArrearsPaid).toBe(1_000);
    // 3 000 - 1 000 old arrears = 2 000 left, housing (2 500) is the first bill.
    expect(bill(report, "housing")).toMatchObject({ paid: 2_000, unpaid: 500 });
  });

  it("savings go to the emergency fund only from what is left, without creating arrears", () => {
    const full = settleMonth(act(start(), { type: "owner_draw", amount: 7_000 }, budget({ savings: 1_000 })));
    expect(full.state.personal.emergencyFund).toBe(1_000);
    expect(full.state.personal.cash).toBe(10_000 - 5_000 - 1_000);

    const partial = settleMonth(act(start(), { type: "owner_draw", amount: 6_000 }, budget({ savings: 5_000 })));
    expect(partial.report.personal.savedToFund).toBe(4_000);
    expect(partial.state.personal.cash).toBe(0);
    expect(partial.state.personal.arrears).toBe(0);
  });

  it("pays the loan installment first and lowers the loan balance", () => {
    const base = start();
    const withLoan: GameState = { ...base, personal: { ...base.personal, debt: { balance: 10_000, monthlyInstallment: 1_500 } } };
    const { state, report } = settleMonth(act(withLoan, { type: "owner_draw", amount: 6_500 }));
    expect(report.personal.installmentPaid).toBe(1_500);
    expect(state.personal.debt.balance).toBe(8_500);
    expect(state.personal.cash).toBe(9_500 - 1_500 - 5_000);
  });

  it("an unpaid installment becomes arrears; the last installment is capped at the balance", () => {
    const base = start();
    const short: GameState = {
      ...base,
      personal: { ...base.personal, cash: 1_000, debt: { balance: 10_000, monthlyInstallment: 1_500 } },
    };
    const r1 = settleMonth(short);
    expect(r1.report.personal.installmentPaid).toBe(1_000);
    expect(r1.state.personal.arrears).toBe(500 + 5_000);

    const almostPaid: GameState = { ...base, personal: { ...base.personal, debt: { balance: 1_000, monthlyInstallment: 1_500 } } };
    const r2 = settleMonth(almostPaid);
    expect(r2.report.personal.installmentDue).toBe(1_000);
    expect(r2.state.personal.debt).toEqual({ balance: 0, monthlyInstallment: 0 });
  });

  it("money adds up: before + revenue - everything paid = after", () => {
    const s = act(start(), { type: "owner_draw", amount: 4_000 }, budget({ savings: 700, housing: 2_200 }));
    const { state, report } = settleMonth(s);
    const total = (g: GameState) => g.business.cash + g.personal.cash + g.personal.emergencyFund;
    const personalPaid =
      report.personal.oldArrearsPaid +
      report.personal.installmentPaid +
      report.personal.bills.reduce((sum, b) => sum + b.paid, 0);
    const businessPaid = report.business.oldArrearsPaid + report.business.costsPaid;
    expect(total(state)).toBe(total(s) + report.business.revenue - businessPaid - personalPaid);
  });

  it("never mutates the input, keeps month and log, and is deterministic", () => {
    const s = deepFreeze(act(start(), { type: "owner_draw", amount: 5_000 }));
    const snapshot = structuredClone(s);
    const a = settleMonth(s);
    const b = settleMonth(s);
    expect(s).toEqual(snapshot);
    expect(a).toEqual(b);
    expect(a.state.month).toBe(s.month);
    expect(a.state.log).toEqual(s.log);
  });
});
