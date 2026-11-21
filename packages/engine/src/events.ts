// Random events: drawn at the start of a month from the seed (decided), filtered by month and the player's
// profile. Pure; the event definitions (amounts, months, protection) come from content (events.json).
// Paying for an event and its effect on the month are a separate step.
import type { FinancingProduct, GameEventDef } from "@piwco/content";
import { nextFloat } from "./rng";
import type { ActiveEvent, BusinessPolicy, FinancingTerms, GameState, PersonalPolicy } from "./state";

/** Content loan products → the terms stored in the game state at start. */
export function financingTerms(products: readonly FinancingProduct[]): Record<string, FinancingTerms> {
  return Object.fromEntries(products.map((p) => [p.id, { side: p.side, months: p.months, monthlyRate: p.monthlyRate }]));
}

/** Simple-interest loan: total = principal × (1 + rate × months), equal installments (rounded up). */
export function loanCost(principal: number, terms: FinancingTerms): { total: number; installment: number } {
  const total = Math.round(principal * (1 + terms.monthlyRate * terms.months));
  return { total, installment: Math.ceil(total / terms.months) };
}

export type EventVariant = "full" | "prepared" | "skipped";

/** The event's size for this player: share of income D (personal) or of monthly revenue (business), clamped. */
export function eventAmount(def: GameEventDef, state: GameState): number {
  const base = def.amount.base === "income" ? state.personal.income : state.business.monthlyRevenue;
  // Rounded to 50 PLN, like the household amounts.
  const raw = Math.round((base * def.amount.share) / 50) * 50;
  return Math.min(def.amount.max, Math.max(def.amount.min, raw));
}

function hasPolicy(state: GameState, policy: string): boolean {
  if (policy in state.business.policies) return state.business.policies[policy as BusinessPolicy];
  if (policy in state.personal.policies) return state.personal.policies[policy as PersonalPolicy];
  throw new Error(`Unknown policy in event content: "${policy}"`);
}

/**
 * Which version of the event this player gets (team spec): "skipped" when it doesn't apply (no car / no own house),
 * "prepared" when a policy in the game or an onboarding answer already covers it, otherwise "full".
 */
export function eventVariant(def: GameEventDef, state: GameState): { variant: EventVariant; coveredBy: ActiveEvent["coveredBy"] } {
  if (def.requires === "car" && !state.personal.ownsCar) return { variant: "skipped", coveredBy: null };
  if (def.requires === "own_house" && !state.personal.ownsHouse) return { variant: "skipped", coveredBy: null };
  const p = def.protectedBy;
  if (p?.policy && hasPolicy(state, p.policy)) return { variant: "prepared", coveredBy: "policy" };
  if (p?.flag && state.flags.includes(p.flag)) return { variant: "prepared", coveredBy: "flag" };
  return { variant: "full", coveredBy: null };
}

/**
 * Draws this month's event (weighted among the events allowed this month that apply to the player) and stores it
 * in the state; the RNG state advances. Drawing again in the same month returns the same event.
 */
export function drawEvent(state: GameState, defs: readonly GameEventDef[]): { state: GameState; event: ActiveEvent | null } {
  if (state.event && state.event.month === state.month) return { state, event: state.event };
  const candidates = defs
    .filter((d) => d.months.includes(state.month) && d.weight > 0)
    .map((d) => ({ def: d, ...eventVariant(d, state) }))
    .filter((c) => c.variant !== "skipped");
  if (candidates.length === 0) return { state: { ...state, event: null }, event: null };

  const total = candidates.reduce((s, c) => s + c.def.weight, 0);
  const roll = nextFloat(state.rng);
  let pick = roll.value * total;
  const chosen = candidates.find((c) => (pick -= c.def.weight) < 0) ?? candidates[candidates.length - 1]!;

  const event: ActiveEvent = {
    id: chosen.def.id,
    month: state.month,
    side: chosen.def.side,
    effect: chosen.def.effect,
    amount: eventAmount(chosen.def, state),
    variant: chosen.variant === "prepared" ? "prepared" : "full",
    coveredBy: chosen.coveredBy,
    // Only a full cost event has to be paid; a prepared one is covered, a late payment just delays revenue.
    remaining: chosen.variant === "full" && chosen.def.effect === "cost" ? eventAmount(chosen.def, state) : 0,
    paid: [],
    loans: [],
  };
  return { state: { ...state, rng: roll.state, event }, event };
}
