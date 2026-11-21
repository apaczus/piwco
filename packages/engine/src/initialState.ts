import { createRng } from "./rng";
import type { BusinessState, FinancingTerms, GameState, PersonalState } from "./state";

// Everything needed to start a game. The numbers come from outside the engine
// (industry content + onboarding answers); the engine has no amounts of its own.
export type InitialSetup = {
  seed: number;
  // Onboarding profile flags (optional; none = baseline player).
  flags?: string[];
  // Loan products for covering events (optional; none = no borrowing).
  financing?: Record<string, FinancingTerms>;
  business: Omit<BusinessState, "arrears" | "debt" | "receivables">;
  personal: Omit<PersonalState, "arrears">;
};

export function createInitialState(setup: InitialSetup): GameState {
  const { business, personal } = setup;
  // Copy every nested object so the state never shares references with the input.
  return {
    month: 1,
    rng: createRng(setup.seed),
    business: {
      ...business,
      monthlyCosts: { ...business.monthlyCosts },
      policies: { ...business.policies },
      arrears: 0,
      debt: { balance: 0, monthlyInstallment: 0 },
      receivables: 0,
    },
    personal: {
      ...personal,
      monthlySpending: { ...personal.monthlySpending },
      minimumSpending: { ...personal.minimumSpending },
      debt: { ...personal.debt },
      policies: { ...personal.policies },
      arrears: 0,
    },
    log: [],
    flags: [...(setup.flags ?? [])],
    event: null,
    financing: Object.fromEntries(Object.entries(setup.financing ?? {}).map(([k, v]) => [k, { ...v }])),
  };
}
