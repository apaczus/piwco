import { loanCost } from "./events";
import { HOUSEHOLD_CATEGORIES, type Action, type ActionResult, type GameState, type HouseholdCategory } from "./state";

// Returns an error message, or null when the budget is valid: exactly the 6 household categories,
// each a whole, non-negative number of PLN.
function validateBudget(spending: unknown): string | null {
  if (spending === null || typeof spending !== "object" || Array.isArray(spending)) {
    return "Budget must be an object with an amount per category.";
  }
  const keys = Object.keys(spending);
  const missing = HOUSEHOLD_CATEGORIES.filter((c) => !keys.includes(c));
  if (missing.length) return `Budget is missing categories: ${missing.join(", ")}.`;
  const extra = keys.filter((k) => !(HOUSEHOLD_CATEGORIES as readonly string[]).includes(k));
  if (extra.length) return `Budget has unknown categories: ${extra.join(", ")}.`;
  for (const c of HOUSEHOLD_CATEGORIES) {
    const v = (spending as Record<string, unknown>)[c];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
      return `Budget for "${c}" must be a whole, non-negative number of PLN.`;
    }
  }
  return null;
}

// Returns an error message, or null when the transfer is allowed.
function validateTransfer(amount: number, available: number, from: string): string | null {
  if (!Number.isInteger(amount) || amount <= 0) {
    return "Amount must be a positive whole number of PLN.";
  }
  if (amount > available) {
    return `Not enough money on the ${from} (available: ${available} PLN).`;
  }
  return null;
}

function withLog(state: GameState, action: Action): GameState {
  return {
    ...state,
    log: [...state.log, { month: state.month, action: { ...action } }],
  };
}

/**
 * state + action -> new state. Never mutates the input state.
 * Invalid actions return { ok: false } instead of throwing, so the app can show
 * a message and the server can reject a decision log that contains them.
 */
export function applyAction(state: GameState, action: Action): ActionResult {
  switch (action.type) {
    case "owner_draw": {
      const error = validateTransfer(action.amount, state.business.cash, "business account");
      if (error) return { ok: false, error };
      const next: GameState = {
        ...state,
        business: { ...state.business, cash: state.business.cash - action.amount },
        personal: { ...state.personal, cash: state.personal.cash + action.amount },
      };
      return { ok: true, state: withLog(next, action) };
    }

    case "transfer_to_emergency_fund": {
      const error = validateTransfer(action.amount, state.personal.cash, "personal account");
      if (error) return { ok: false, error };
      const next: GameState = {
        ...state,
        personal: {
          ...state.personal,
          cash: state.personal.cash - action.amount,
          emergencyFund: state.personal.emergencyFund + action.amount,
        },
      };
      return { ok: true, state: withLog(next, action) };
    }

    case "set_household_budget": {
      const error = validateBudget(action.spending);
      if (error) return { ok: false, error };
      const spending = { ...action.spending } as Record<HouseholdCategory, number>;
      const next: GameState = {
        ...state,
        personal: { ...state.personal, monthlySpending: spending },
      };
      return { ok: true, state: withLog(next, { type: "set_household_budget", spending: { ...spending } }) };
    }

    case "cover_event": {
      const ev = state.event;
      if (!ev || ev.month !== state.month || ev.remaining <= 0) return { ok: false, error: "There is nothing left to pay for this month's event." };
      const allowed = ev.side === "personal" ? ["cushion", "personal"] : ["company"];
      if (!allowed.includes(action.source)) {
        return { ok: false, error: `A ${ev.side} event can't be paid from the ${action.source} account.` };
      }
      const balance =
        action.source === "cushion" ? state.personal.emergencyFund : action.source === "personal" ? state.personal.cash : state.business.cash;
      const error = validateTransfer(action.amount, balance, `${action.source} account`);
      if (error) return { ok: false, error };
      if (action.amount > ev.remaining) return { ok: false, error: `Only ${ev.remaining} PLN is left to pay.` };
      const next: GameState = {
        ...state,
        personal: {
          ...state.personal,
          emergencyFund: state.personal.emergencyFund - (action.source === "cushion" ? action.amount : 0),
          cash: state.personal.cash - (action.source === "personal" ? action.amount : 0),
        },
        business: { ...state.business, cash: state.business.cash - (action.source === "company" ? action.amount : 0) },
        event: { ...ev, remaining: ev.remaining - action.amount, paid: [...ev.paid, { source: action.source, amount: action.amount }] },
      };
      return { ok: true, state: withLog(next, action) };
    }

    case "borrow_for_event": {
      const ev = state.event;
      if (!ev || ev.month !== state.month || ev.remaining <= 0) return { ok: false, error: "There is nothing left to pay for this month's event." };
      const terms = state.financing[action.product];
      if (!terms) return { ok: false, error: `Unknown loan product: "${action.product}".` };
      if (terms.side !== ev.side) return { ok: false, error: `This loan is for ${terms.side} costs, the event is ${ev.side}.` };
      const { total, installment } = loanCost(ev.remaining, terms);
      const loan = { product: action.product, side: terms.side, principal: ev.remaining, total, installment };
      const next: GameState = { ...state, event: { ...ev, remaining: 0, loans: [...ev.loans, loan] } };
      return { ok: true, state: withLog(next, action) };
    }

    default: {
      // Actions can come from untrusted JSON (server replay), so unknown types are rejected.
      const unknown: never = action;
      return { ok: false, error: `Unknown action: ${JSON.stringify(unknown)}` };
    }
  }
}
