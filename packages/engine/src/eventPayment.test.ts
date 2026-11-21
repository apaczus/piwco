import { financing, gameEvents, household, industries } from "@piwco/content";
import { describe, expect, it } from "vitest";
import { applyAction } from "./actions";
import { financingTerms, loanCost } from "./events";
import { createInitialState } from "./initialState";
import { checkMonthGoal } from "./levels";
import { buildInitialSetup } from "./setupFromContent";
import { settleMonth } from "./settle";
import type { Action, ActiveEvent, GameState } from "./state";
import { deepFreeze, makeSetup } from "./testFixtures";

// Fixture: business cash 20 000, revenue 45 000, costs 39 000; personal cash 3 000, fund 0, budget 5 000.
const FIN = financingTerms(financing);

function start(event?: Partial<ActiveEvent>, change?: (s: GameState) => void): GameState {
  const s = createInitialState({ ...makeSetup(), financing: FIN });
  if (event) {
    s.event = { id: "test", month: 1, side: "personal", effect: "cost", amount: 2_000, variant: "full", coveredBy: null, remaining: 2_000, paid: [], loans: [], ...event };
  }
  change?.(s);
  return s;
}

function act(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce((s, a) => {
    const r = applyAction(s, a);
    if (!r.ok) throw new Error(r.error);
    return r.state;
  }, state);
}

const error = (state: GameState, action: Action) => {
  const r = applyAction(state, action);
  return r.ok ? null : r.error;
};

describe("loanCost", () => {
  it("adds simple interest and splits it into equal installments, rounded up", () => {
    expect(loanCost(3_000, { side: "personal", months: 3, monthlyRate: 0.08 })).toEqual({ total: 3_720, installment: 1_240 });
    expect(loanCost(1_000, { side: "personal", months: 6, monthlyRate: 0.012 })).toEqual({ total: 1_072, installment: 179 });
  });
});

describe("cover_event", () => {
  it("pays a personal event from the cushion and the personal account", () => {
    const s = act(start(undefined, (x) => (x.personal.emergencyFund = 1_500)), );
    const withEvent = start(undefined, (x) => {
      x.personal.emergencyFund = 1_500;
      x.event = { ...start({}).event! };
    });
    const after = act(withEvent, { type: "cover_event", source: "cushion", amount: 1_500 }, { type: "cover_event", source: "personal", amount: 500 });
    expect(after.personal.emergencyFund).toBe(0);
    expect(after.personal.cash).toBe(2_500);
    expect(after.event!.remaining).toBe(0);
    expect(after.event!.paid).toEqual([
      { source: "cushion", amount: 1_500 },
      { source: "personal", amount: 500 },
    ]);
    expect(after.log).toHaveLength(2);
    expect(s.event).toBeNull();
  });

  it("pays a business event only from the company account", () => {
    const s = start({ side: "business" });
    expect(error(s, { type: "cover_event", source: "personal", amount: 100 })).toMatch(/business event can't be paid from the personal/);
    expect(act(s, { type: "cover_event", source: "company", amount: 2_000 }).business.cash).toBe(18_000);
  });

  it("rejects paying more than is left, more than the account has, or with nothing to pay", () => {
    expect(error(start({}), { type: "cover_event", source: "personal", amount: 2_500 })).toMatch(/Only 2000 PLN is left/);
    expect(error(start({}), { type: "cover_event", source: "cushion", amount: 100 })).toMatch(/Not enough money/);
    expect(error(start(), { type: "cover_event", source: "personal", amount: 100 })).toMatch(/nothing left to pay/);
    expect(error(start({ remaining: 0, variant: "prepared" }), { type: "cover_event", source: "personal", amount: 100 })).toMatch(/nothing left/);
    expect(error(start({}), { type: "cover_event", source: "personal", amount: 0 })).toMatch(/positive whole number/);
  });

  it("never mutates the state", () => {
    const s = deepFreeze(start({}));
    expect(() => applyAction(s, { type: "cover_event", source: "personal", amount: 500 })).not.toThrow();
    expect(() => applyAction(s, { type: "borrow_for_event", product: "cash_loan" })).not.toThrow();
  });
});

describe("borrow_for_event", () => {
  it("covers what is left with a loan that starts next month", () => {
    const s = act(start({}), { type: "cover_event", source: "personal", amount: 1_000 }, { type: "borrow_for_event", product: "payday_loan" });
    expect(s.event!.remaining).toBe(0);
    expect(s.event!.loans).toEqual([{ product: "payday_loan", side: "personal", principal: 1_000, total: 1_240, installment: 414 }]);
    expect(s.personal.debt).toEqual({ balance: 0, monthlyInstallment: 0 });
    const { state, report } = settleMonth(s);
    // No installment this month; the loan is on the books for next month.
    expect(report.personal.installmentDue).toBe(0);
    expect(state.personal.debt).toEqual({ balance: 1_240, monthlyInstallment: 414 });
    expect(report.event!.loans[0]).toMatchObject({ product: "payday_loan", total: 1_240 });
  });

  it("puts a business loan on the company's debt, paid before the costs from next month", () => {
    const s = act(start({ side: "business", amount: 4_000, remaining: 4_000 }), { type: "borrow_for_event", product: "business_loan" });
    const m1 = settleMonth(s).state;
    expect(m1.business.debt).toEqual({ balance: 4_240, monthlyInstallment: 707 });
    const m2 = settleMonth({ ...m1, event: null });
    expect(m2.report.business.installmentDue).toBe(707);
    expect(m2.state.business.debt.balance).toBe(4_240 - 707);
  });

  it("rejects unknown products and products for the other side", () => {
    expect(error(start({}), { type: "borrow_for_event", product: "loan_shark" })).toMatch(/Unknown loan product/);
    expect(error(start({}), { type: "borrow_for_event", product: "business_loan" })).toMatch(/for business costs, the event is personal/);
  });
});

describe("settleMonth with an event", () => {
  it("pays what is left of a personal event after the bills; a shortfall becomes arrears", () => {
    // Personal cash 3 000, bills 5 000 → nothing left for the event.
    const { report, state } = settleMonth(start({}));
    expect(report.event).toMatchObject({ leftover: 2_000, leftoverPaid: 0, unpaid: 2_000 });
    expect(state.event!.remaining).toBe(0);
    const goal = checkMonthGoal(1, report);
    expect(goal.reasons).toContainEqual({ kind: "event_unpaid", side: "personal", amount: 2_000 });
  });

  it("an event covered during the month leaves nothing for the settlement", () => {
    const s = act(start({}, (x) => (x.personal.cash = 10_000)), { type: "cover_event", source: "personal", amount: 2_000 });
    const { report } = settleMonth(s);
    expect(report.event).toMatchObject({ leftover: 0, unpaid: 0 });
    expect(checkMonthGoal(1, report).passed).toBe(true);
  });

  it("a late payment moves part of the revenue to next month", () => {
    const s = start({ side: "business", effect: "late_payment", amount: 3_000, remaining: 0 });
    const m1 = settleMonth(s);
    expect(m1.report.business.revenue).toBe(42_000);
    expect(m1.report.business.lateRevenue).toBe(3_000);
    expect(m1.state.business.receivables).toBe(3_000);
    const m2 = settleMonth({ ...m1.state, event: null });
    expect(m2.report.business.receivablesCollected).toBe(3_000);
    expect(m2.report.business.revenue).toBe(48_000);
    expect(m2.state.business.receivables).toBe(0);
  });

  it("a prepared event costs nothing", () => {
    const { report } = settleMonth(start({ variant: "prepared", coveredBy: "flag", remaining: 0 }, (x) => (x.personal.cash = 10_000)));
    expect(report.event).toMatchObject({ variant: "prepared", leftover: 0, unpaid: 0 });
    expect(checkMonthGoal(1, report).passed).toBe(true);
  });

  it("an unpaid business event becomes company arrears", () => {
    const s = start({ side: "business", amount: 30_000, remaining: 30_000 });
    const { report } = settleMonth(s);
    // 20 000 + 45 000 − 39 000 = 26 000 for a 30 000 event.
    expect(report.event).toMatchObject({ leftoverPaid: 26_000, unpaid: 4_000 });
    expect(report.business.arrearsAdded).toBe(4_000);
    expect(checkMonthGoal(1, report).reasons).toContainEqual({ kind: "event_unpaid", side: "business", amount: 4_000 });
  });
});

describe("January with the real events", () => {
  it("every January event can be survived in every industry (company loan if needed)", () => {
    for (const industry of industries) {
      for (const def of gameEvents.filter((e) => e.months.includes(1))) {
        let s = createInitialState({ ...buildInitialSetup(industry, household, 3), financing: FIN });
        const amount = Math.min(def.amount.max, Math.max(def.amount.min, Math.round((s.business.monthlyRevenue * def.amount.share) / 50) * 50));
        s = { ...s, event: { id: def.id, month: 1, side: def.side, effect: def.effect, amount, variant: "full", coveredBy: null, remaining: def.effect === "cost" ? amount : 0, paid: [], loans: [] } };
        if (def.effect === "cost") s = act(s, { type: "borrow_for_event", product: "business_loan" });
        const bills = Object.entries(s.personal.monthlySpending).reduce((t, [k, v]) => (k === "savings" ? t : t + v), 0);
        s = act(s, { type: "owner_draw", amount: Math.min(s.business.cash, bills - s.personal.cash) });
        const goal = checkMonthGoal(1, settleMonth(s).report);
        expect({ industry: industry.id, event: def.id, passed: goal.passed }).toEqual({ industry: industry.id, event: def.id, passed: true });
      }
    }
  });
});
