// Pure receipt logic (no UI): the month-end settlement as lines, from the month report + this month's log.
import type { LogEntry, MonthReport } from "@piwco/engine";
import { gameEvents } from "@piwco/content";
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
  const ev = report.event;
  const eventFrom = (source: string) => (ev ? ev.paidBefore.filter((x) => x.source === source).reduce((s, x) => s + x.amount, 0) : 0);
  const bizEventAtEnd = ev?.side === "business" ? ev.leftoverPaid : 0;
  const persEventAtEnd = ev?.side === "personal" ? ev.leftoverPaid : 0;
  const companyStart =
    b.endCash + b.costsPaid + b.oldArrearsPaid + b.installmentPaid + bizEventAtEnd - b.revenue + draw + eventFrom("company");
  const billsPaid = p.bills.reduce((s, x) => s + x.paid, 0);
  const homeStart = p.oldArrearsPaid + p.installmentPaid + billsPaid + persEventAtEnd + p.savedToFund + p.endCash + eventFrom("personal");

  const eventTitle = ev ? (gameEvents.find((e) => e.id === ev.id)?.title ?? "Surprise cost") : "";
  // The event's own line: what left the accounts for it (during the month + at the settlement), how it was covered.
  const eventLine = (prefix: string): ReceiptLine | null => {
    if (!ev || ev.effect !== "cost") return null;
    if (ev.variant === "prepared") return { id: `${prefix}_event`, sign: "−", label: eventTitle, amount: 0, status: "ok", note: "covered by your protection" };
    const fromAccounts = ev.paidBefore.reduce((s, x) => s + x.amount, 0) + ev.leftoverPaid;
    const borrowed = ev.loans.reduce((s, l) => s + l.principal, 0);
    const notes = [
      ...ev.paidBefore.filter((x) => x.source === "cushion").map((x) => `${formatPln(x.amount)} from the cushion`),
      borrowed > 0 ? `${formatPln(borrowed)} borrowed` : "",
      ev.unpaid > 0 ? `${formatPln(ev.unpaid)} unpaid` : "",
    ].filter(Boolean);
    return {
      id: `${prefix}_event`,
      sign: "−",
      label: eventTitle,
      amount: fromAccounts - ev.paidBefore.filter((x) => x.source === "cushion").reduce((s, x) => s + x.amount, 0),
      status: ev.unpaid > 0 ? "bad" : "ok",
      note: notes.join(" · ") || undefined,
    };
  };

  const company: ReceiptLine[] = [
    { id: "c_start", sign: "+", label: "On the account", amount: companyStart },
    {
      id: "c_revenue",
      sign: "+",
      label: "Revenue",
      amount: b.revenue - b.receivablesCollected,
      note: b.lateRevenue > 0 ? `${formatPln(b.lateRevenue)} arrives next month` : undefined,
    },
  ];
  if (b.receivablesCollected > 0) company.push({ id: "c_late_in", sign: "+", label: "Late payment from last month", amount: b.receivablesCollected });
  if (draw > 0) company.push({ id: "c_draw", sign: "−", label: "Paid to you", amount: draw });
  if (b.oldArrearsPaid > 0) company.push({ id: "c_arrears", sign: "−", label: "Old arrears", amount: b.oldArrearsPaid });
  if (b.installmentDue > 0) {
    const unpaid = b.installmentDue - b.installmentPaid;
    company.push({
      id: "c_loan",
      sign: "−",
      label: "Company loan installment",
      amount: b.installmentDue,
      status: unpaid > 0 ? "bad" : "ok",
      note: unpaid > 0 ? `${formatPln(unpaid)} unpaid` : undefined,
    });
  }
  const costsUnpaid = b.costs - b.costsPaid;
  company.push({
    id: "c_costs",
    sign: "−",
    label: "Costs",
    amount: b.costs,
    status: costsUnpaid > 0 ? "bad" : "ok",
    note: costsUnpaid > 0 ? `${formatPln(costsUnpaid)} unpaid` : undefined,
  });
  if (ev?.side === "business") {
    const line = eventLine("c");
    if (line) company.push(line);
  }
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
  if (ev?.side === "personal") {
    const line = eventLine("h");
    if (line) home.push(line);
  }
  if (p.savingsBudgeted > 0) home.push({ id: "h_savings", sign: "→", label: "Saved to your cushion", amount: p.savedToFund });
  home.push({ id: "h_left", sign: "=", label: "Left at home", amount: p.endCash });

  return { company, home, allPaid: b.arrearsAdded === 0 && p.arrearsAdded === 0 };
}
