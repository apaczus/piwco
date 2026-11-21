// Level goals. Decided: each level has its own goal logic in code (not a generic condition list).
import type { MonthReport } from "./settle";
import type { HouseholdCategory } from "./state";

// One concrete thing that went wrong this month (the app turns these into "what went wrong" lines).
export type GoalReason =
  | { kind: "costs_unpaid"; amount: number }
  | { kind: "installment_unpaid"; amount: number }
  | { kind: "bill_unpaid"; category: HouseholdCategory; amount: number }
  | { kind: "below_minimum"; category: HouseholdCategory; amount: number };

export type GoalResult = {
  passed: boolean;
  reasons: GoalReason[];
};

// Everything that created new arrears this month, in the order it happened.
function newArrearsReasons(report: MonthReport): GoalReason[] {
  const reasons: GoalReason[] = [];
  if (report.business.arrearsAdded > 0) {
    reasons.push({ kind: "costs_unpaid", amount: report.business.arrearsAdded });
  }
  const installmentUnpaid = report.personal.installmentDue - report.personal.installmentPaid;
  if (installmentUnpaid > 0) reasons.push({ kind: "installment_unpaid", amount: installmentUnpaid });
  for (const bill of report.personal.bills) {
    if (bill.belowMinimum > 0) {
      reasons.push({ kind: "below_minimum", category: bill.category, amount: bill.belowMinimum });
    }
    if (bill.unpaid > 0) reasons.push({ kind: "bill_unpaid", category: bill.category, amount: bill.unpaid });
  }
  return reasons;
}

/**
 * Month 1 (January, budget and cash flow): get through the month without a negative balance.
 * Balances can't go below 0 in the engine, so this means: no new arrears, in the company or at home.
 */
function month1Goal(report: MonthReport): GoalResult {
  const reasons = newArrearsReasons(report);
  return { passed: reasons.length === 0, reasons };
}

export function checkMonthGoal(month: number, report: MonthReport): GoalResult {
  switch (month) {
    case 1:
      return month1Goal(report);
    default:
      throw new Error(`No goal logic for month ${month} yet`);
  }
}
