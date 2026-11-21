// Pure receipt logic (no UI): the month-end settlement as lines, from the month report + this month's log.
import type { LogEntry, MonthReport } from "@piwco/engine";
import { categoryLabel, formatPln } from "./format";

export type ReceiptLine = {
  id: string;
  sign: "+" | "−" | "→" | "=";
  label: string;
  amount: number;
  // ✓ / ✗ on bills; absent on money coming in and totals.
  status?: "ok" | "bad";
  note?: string;
};

export type Receipt = {
  company: ReceiptLine[];
  home: ReceiptLine[];
  // Same rule as the month 1 goal: no new arrears anywhere.
  allPaid: boolean;
};

export function drawsThisMonth(log: readonly LogEntry[], month: number): number {
  return log.reduce((s, e) => (e.month === month && e.action.type === "owner_draw" ? s + e.action.amount : s), 0);
}

export function buildReceipt(report: MonthReport, log: readonly LogEntry[]): Receipt {
  const b = report.business;
  const p = report.personal;
  const draw = drawsThisMonth(log, report.month);

  // Cash before the month: the settlement only adds revenue and pays out, so it can be worked back.
  const companyStart = b.endCash + b.costsPaid + b.oldArrearsPaid - b.revenue + draw;
  const billsPaid = p.bills.reduce((s, x) => s + x.paid, 0);
  const homeStart = p.oldArrearsPaid + p.installmentPaid + billsPaid + p.savedToFund + p.endCash;

  const company: ReceiptLine[] = [
    { id: "c_start", sign: "+", label: "On the account", amount: companyStart },
    { id: "c_revenue", sign: "+", label: "Revenue", amount: b.revenue },
  ];
  if (draw > 0) company.push({ id: "c_draw", sign: "−", label: "Paid to you", amount: draw });
  if (b.oldArrearsPaid > 0) company.push({ id: "c_arrears", sign: "−", label: "Old arrears", amount: b.oldArrearsPaid });
  const costsUnpaid = b.costs - b.costsPaid;
  company.push({
    id: "c_costs",
    sign: "−",
    label: "Costs",
    amount: b.costs,
    status: costsUnpaid > 0 ? "bad" : "ok",
    note: costsUnpaid > 0 ? `${formatPln(costsUnpaid)} unpaid` : undefined,
  });
  company.push({ id: "c_left", sign: "=", label: "Left in the company", amount: b.endCash });

  const home: ReceiptLine[] = [{ id: "h_start", sign: "+", label: "On your account", amount: homeStart }];
  if (p.oldArrearsPaid > 0) home.push({ id: "h_arrears", sign: "−", label: "Old arrears", amount: p.oldArrearsPaid });
  if (p.installmentDue > 0) {
    const unpaid = p.installmentDue - p.installmentPaid;
    home.push({
      id: "h_loan",
      sign: "−",
      label: "Loan installment",
      amount: p.installmentDue,
      status: unpaid > 0 ? "bad" : "ok",
      note: unpaid > 0 ? `${formatPln(unpaid)} unpaid` : undefined,
    });
  }
  for (const bill of p.bills) {
    if (bill.budgeted === 0 && bill.belowMinimum === 0) continue;
    const bad = bill.unpaid > 0 || bill.belowMinimum > 0;
    home.push({
      id: `h_${bill.category}`,
      sign: "−",
      label: categoryLabel(bill.category),
      amount: bill.budgeted,
      status: bad ? "bad" : "ok",
      note:
        bill.unpaid > 0
          ? `${formatPln(bill.unpaid)} unpaid`
          : bill.belowMinimum > 0
            ? `${formatPln(bill.belowMinimum)} below minimum`
            : undefined,
    });
  }
  if (p.savingsBudgeted > 0) home.push({ id: "h_savings", sign: "→", label: "Saved to your cushion", amount: p.savedToFund });
  home.push({ id: "h_left", sign: "=", label: "Left at home", amount: p.endCash });

  return { company, home, allPaid: b.arrearsAdded === 0 && p.arrearsAdded === 0 };
}
