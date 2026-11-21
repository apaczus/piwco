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

    default: {
      // Actions can come from untrusted JSON (server replay), so unknown types are rejected.
      const unknown: never = action;
      return { ok: false, error: `Unknown action: ${JSON.stringify(unknown)}` };
    }
  }
}
