import type { RngState } from "./rng";

// All money values are whole PLN (integers).

export type Industry = "gastronomy" | "it_software" | "manufacturing";

export type HouseholdCategory =
  | "housing"
  | "food"
  | "car_transport"
  | "insurance"
  | "savings"
  | "other";

// All household categories. Bills are paid in this order when money runs short ("savings" is not a bill).
export const HOUSEHOLD_CATEGORIES: readonly HouseholdCategory[] = [
  "housing",
  "food",
  "car_transport",
  "insurance",
  "savings",
  "other",
];

export type BusinessPolicy = "liability" | "property" | "equipment";

export type PersonalPolicy = "health" | "life" | "income_loss";

export type BusinessState = {
  industry: Industry;
  cash: number;
  monthlyRevenue: number;
  // Budget category id (defined per industry in content) -> PLN per month.
  monthlyCosts: Record<string, number>;
  employees: number;
  policies: Record<BusinessPolicy, boolean>;
  arrears: number;
};

export type PersonalState = {
  // Monthly net income D from the onboarding (scales personal event amounts).
  income: number;
  cash: number;
  emergencyFund: number;
  // The player's household budget for the month (set with the "set_household_budget" action).
  monthlySpending: Record<HouseholdCategory, number>;
  // Budgeting less than this creates arrears (housing and food). Stored in the state so the server
  // can replay a game from the state + log alone.
  minimumSpending: Record<HouseholdCategory, number>;
  debt: {
    balance: number;
    monthlyInstallment: number;
  };
  ownsHouse: boolean;
  ownsCar: boolean;
  policies: Record<PersonalPolicy, boolean>;
  arrears: number;
};

export type Action =
  // Move money from the business account to the personal account.
  | { type: "owner_draw"; amount: number }
  // Move money from the personal account to the emergency fund.
  | { type: "transfer_to_emergency_fund"; amount: number }
  // Replace the household budget for this month (can be changed until the month is settled).
  | { type: "set_household_budget"; spending: Record<HouseholdCategory, number> };

export type LogEntry = {
  month: number;
  action: Action;
};

export type GameState = {
  month: number;
  rng: RngState;
  business: BusinessState;
  personal: PersonalState;
  // Every successful action, in order. The server replays this log.
  log: LogEntry[];
  // Onboarding profile flags (car_ac, home_insured, payday_loan, ...): which events hit and how.
  flags: string[];
  // The random event drawn at the start of the current month (null = none drawn / none applies).
  event: ActiveEvent | null;
};

export type ActiveEvent = {
  id: string;
  month: number;
  side: "personal" | "business";
  effect: "cost" | "late_payment";
  // PLN, already scaled to the player's income or the company's revenue.
  amount: number;
  // "full" = the player has to deal with it; "prepared" = a policy / earlier decision absorbs it.
  variant: "full" | "prepared";
  coveredBy: "policy" | "flag" | null;
};

export type ActionResult =
  | { ok: true; state: GameState }
  | { ok: false; error: string };
