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

export type MonthReport = {
  month: number;
  business: {
    revenue: number;
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

  // ---- Business: revenue in, old arrears, then this month's costs.
  let bizCash = b.cash + b.monthlyRevenue;
  const bizOld = pay(bizCash, b.arrears);
  bizCash = bizOld.cash;
  const costs = Object.values(b.monthlyCosts).reduce((sum, c) => sum + c, 0);
  const bizCosts = pay(bizCash, costs);
  bizCash = bizCosts.cash;
  const bizArrearsAdded = costs - bizCosts.paid;
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

  // Savings only come from what is left; a shortfall here is not arrears.
  const savingsBudgeted = p.monthlySpending.savings;
  const saved = pay(cash, savingsBudgeted);
  cash = saved.cash;

  const debtBalance = p.debt.balance - inst.paid;
  const persEndArrears = p.arrears - persOld.paid + arrearsAdded;
  const endEmergencyFund = p.emergencyFund + saved.paid;

  const next: GameState = {
    ...state,
    business: { ...b, cash: bizCash, arrears: bizEndArrears },
    personal: {
      ...p,
      cash,
      emergencyFund: endEmergencyFund,
      arrears: persEndArrears,
      // A paid-off loan has no installment any more.
      debt: { balance: debtBalance, monthlyInstallment: debtBalance > 0 ? p.debt.monthlyInstallment : 0 },
    },
  };

  return {
    state: next,
    report: {
      month: state.month,
      business: {
        revenue: b.monthlyRevenue,
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
