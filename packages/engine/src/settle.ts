// Month-end settlement: pays everything that is due and reports what happened.
// Rules (decided): balances never go below 0, anything that can't be paid becomes arrears;
// business revenue arrives in full at settlement; old arrears are paid first.
import { HOUSEHOLD_CATEGORIES, type GameState, type HouseholdCategory } from "./state";

export type BillLine = {
  category: HouseholdCategory;
  budgeted: number;
  paid: number;
  // Budgeted but not paid because the personal account ran out.
  unpaid: number;
  // How far the budget is below the required minimum (housing / food).
  belowMinimum: number;
};

// This month's random event at the settlement (null = no event this month).
export type EventReport = {
  id: string;
  side: "personal" | "business";
  effect: "cost" | "late_payment";
  amount: number;
  variant: "full" | "prepared";
  // Paid during the month (cushion / personal / company) and with loans.
  paidBefore: { source: string; amount: number }[];
  loans: { product: string; principal: number; total: number; installment: number }[];
  // What was left at the settlement: paid from the side's cash, the rest became arrears.
  leftover: number;
  leftoverPaid: number;
  unpaid: number;
};

export type MonthReport = {
  month: number;
  event: EventReport | null;
  business: {
    // Revenue that actually came in this month (monthly revenue − paid late + last month's late payments).
    revenue: number;
    // Part of this month's revenue a client pays next month.
    lateRevenue: number;
    // Late payments from last month collected now.
    receivablesCollected: number;
    // Company loan installment.
    installmentDue: number;
    installmentPaid: number;
    costs: number;
    oldArrearsPaid: number;
    costsPaid: number;
    arrearsAdded: number;
    endCash: number;
    endArrears: number;
  };
  personal: {
    oldArrearsPaid: number;
    installmentDue: number;
    installmentPaid: number;
    // Bills in payment order (every category except "savings").
    bills: BillLine[];
    savingsBudgeted: number;
    savedToFund: number;
    arrearsAdded: number;
    endCash: number;
    endEmergencyFund: number;
    endArrears: number;
  };
};

export type SettleResult = {
  state: GameState;
  report: MonthReport;
};

// Pays up to `due` from `cash`; returns what was paid and what is left on the account.
function pay(cash: number, due: number): { paid: number; cash: number } {
  const paid = Math.min(cash, due);
  return { paid, cash: cash - paid };
}

const BILL_CATEGORIES = HOUSEHOLD_CATEGORIES.filter((c) => c !== "savings");

/**
 * Settles the current month. Pure: returns a new state and a report, never mutates the input.
 * It does not check the level goal and does not move to the next month (that is a separate step,
 * because a failed month is replayed).
 */
export function settleMonth(state: GameState): SettleResult {
  const b = state.business;
  const p = state.personal;

  const ev = state.event && state.event.month === state.month ? state.event : null;
  const lateRevenue = ev && ev.effect === "late_payment" && ev.variant === "full" ? Math.min(ev.amount, b.monthlyRevenue) : 0;
  const leftover = ev ? ev.remaining : 0;

  // ---- Business: revenue in (minus what's paid late, plus last month's late payments), old arrears,
  // loan installment, this month's costs, then what's left of a business event.
  const revenueIn = b.monthlyRevenue - lateRevenue + b.receivables;
  let bizCash = b.cash + revenueIn;
  const bizOld = pay(bizCash, b.arrears);
  bizCash = bizOld.cash;
  const bizInstallmentDue = Math.min(b.debt.monthlyInstallment, b.debt.balance);
  const bizInst = pay(bizCash, bizInstallmentDue);
  bizCash = bizInst.cash;
  const costs = Object.values(b.monthlyCosts).reduce((sum, c) => sum + c, 0);
  const bizCosts = pay(bizCash, costs);
  bizCash = bizCosts.cash;
  const bizEvent = pay(bizCash, ev?.side === "business" ? leftover : 0);
  bizCash = bizEvent.cash;
  const bizEventUnpaid = (ev?.side === "business" ? leftover : 0) - bizEvent.paid;
  const bizArrearsAdded = costs - bizCosts.paid + (bizInstallmentDue - bizInst.paid) + bizEventUnpaid;
  const bizEndArrears = b.arrears - bizOld.paid + bizArrearsAdded;

  // ---- Personal: old arrears, loan installment, bills in order, then savings from what is left.
  let cash = p.cash;
  const persOld = pay(cash, p.arrears);
  cash = persOld.cash;

  const installmentDue = Math.min(p.debt.monthlyInstallment, p.debt.balance);
  const inst = pay(cash, installmentDue);
  cash = inst.cash;
  let arrearsAdded = installmentDue - inst.paid;

  const bills: BillLine[] = [];
  for (const category of BILL_CATEGORIES) {
    const budgeted = p.monthlySpending[category];
    const bill = pay(cash, budgeted);
    cash = bill.cash;
    const unpaid = budgeted - bill.paid;
    const belowMinimum = Math.max(0, p.minimumSpending[category] - budgeted);
    arrearsAdded += unpaid + belowMinimum;
    bills.push({ category, budgeted, paid: bill.paid, unpaid, belowMinimum });
  }

  // What's left of a personal event: after the bills, before savings.
  const persEventDue = ev?.side === "personal" ? leftover : 0;
  const persEvent = pay(cash, persEventDue);
  cash = persEvent.cash;
  const persEventUnpaid = persEventDue - persEvent.paid;
  arrearsAdded += persEventUnpaid;

  // Savings only come from what is left; a shortfall here is not arrears.
  const savingsBudgeted = p.monthlySpending.savings;
  const saved = pay(cash, savingsBudgeted);
  cash = saved.cash;

  // Loans taken for the event this month start next month: added after this month's installments.
  const newLoans = ev ? ev.loans : [];
  const add = (side: "personal" | "business") =>
    newLoans.filter((l) => l.side === side).reduce((a, l) => ({ total: a.total + l.total, installment: a.installment + l.installment }), { total: 0, installment: 0 });
  const persNew = add("personal");
  const bizNew = add("business");
  const bizDebtLeft = b.debt.balance - bizInst.paid;
  const bizDebt = {
    balance: bizDebtLeft + bizNew.total,
    monthlyInstallment: (bizDebtLeft > 0 ? b.debt.monthlyInstallment : 0) + bizNew.installment,
  };
  const debtBalance = p.debt.balance - inst.paid;
  const persEndArrears = p.arrears - persOld.paid + arrearsAdded;
  const endEmergencyFund = p.emergencyFund + saved.paid;

  const next: GameState = {
    ...state,
    business: { ...b, cash: bizCash, arrears: bizEndArrears, debt: bizDebt, receivables: lateRevenue },
    personal: {
      ...p,
      cash,
      emergencyFund: endEmergencyFund,
      arrears: persEndArrears,
      // A paid-off loan has no installment any more; new loans start next month.
      debt: {
        balance: debtBalance + persNew.total,
        monthlyInstallment: (debtBalance > 0 ? p.debt.monthlyInstallment : 0) + persNew.installment,
      },
    },
    // The event is dealt with.
    event: ev ? { ...ev, remaining: 0 } : state.event,
  };

  return {
    state: next,
    report: {
      month: state.month,
      event: ev
        ? {
            id: ev.id,
            side: ev.side,
            effect: ev.effect,
            amount: ev.amount,
            variant: ev.variant,
            paidBefore: ev.paid.map((x) => ({ ...x })),
            loans: ev.loans.map(({ product, principal, total, installment }) => ({ product, principal, total, installment })),
            leftover,
            leftoverPaid: ev.side === "business" ? bizEvent.paid : persEvent.paid,
            unpaid: ev.side === "business" ? bizEventUnpaid : persEventUnpaid,
          }
        : null,
      business: {
        revenue: revenueIn,
        lateRevenue,
        receivablesCollected: b.receivables,
        installmentDue: bizInstallmentDue,
        installmentPaid: bizInst.paid,
        costs,
        oldArrearsPaid: bizOld.paid,
        costsPaid: bizCosts.paid,
        arrearsAdded: bizArrearsAdded,
        endCash: bizCash,
        endArrears: bizEndArrears,
      },
      personal: {
        oldArrearsPaid: persOld.paid,
        installmentDue,
        installmentPaid: inst.paid,
        bills,
        savingsBudgeted,
        savedToFund: saved.paid,
        arrearsAdded,
        endCash: cash,
        endEmergencyFund,
        endArrears: persEndArrears,
      },
    },
  };
}
