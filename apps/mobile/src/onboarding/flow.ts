// Pure onboarding logic (no UI), ported from the artifact's flow() / questions() / profile().
import {
  onboarding,
  type AccountId,
  type AgeBandId,
  type KnowledgeLevel,
  type OnboardingQuestion,
} from "@piwco/content";

export type PlayerType = "private" | "business";

// questionId -> chosen value (single choice) or values (multi-select).
export type Answers = Record<string, string | string[]>;

export type OnboardingState = {
  welcomeSlide: number;
  age: AgeBandId | null;
  type: PlayerType | null;
  industry: string | null;
  answers: Answers;
  // Index into flowFor(state).
  step: number;
};

export type FlowItem =
  | { kind: "welcome" }
  | { kind: "age" }
  | { kind: "type" }
  | { kind: "industry" }
  | { kind: "explain" }
  | { kind: "firm" }
  | { kind: "question"; id: string }
  | { kind: "done"; account: AccountId }
  | { kind: "result" };

// Top of the stairs down to the foundation.
export const ACCOUNT_ORDER: AccountId[] = ["main", "cushion", "future", "protection"];
// Order in which blocks land when the stairs are built from the ground up.
export const FOUNDATION_FIRST: AccountId[] = ["protection", "future", "cushion", "main"];

export function initialOnboardingState(): OnboardingState {
  return { welcomeSlide: 0, age: null, type: null, industry: null, answers: {}, step: 0 };
}

export function accountById(id: AccountId) {
  const account = onboarding.accounts.find((a) => a.id === id);
  if (!account) throw new Error(`Unknown account: ${id}`);
  return account;
}

// Questions for this player: business-only ones for entrepreneurs, age filters, age-specific options.
export function questionsFor(s: OnboardingState): OnboardingQuestion[] {
  return onboarding.questions
    .filter((q) => !q.businessOnly || s.type === "business")
    .filter((q) => !q.ages || (s.age !== null && q.ages.includes(s.age)))
    .map((q) => ({ ...q, options: (s.age !== null && q.optionsByAge?.[s.age]) || q.options }));
}

export function flowFor(s: OnboardingState): FlowItem[] {
  const flow: FlowItem[] = [{ kind: "welcome" }, { kind: "age" }, { kind: "type" }];
  if (s.type === "business") flow.push({ kind: "industry" });
  const qs = questionsFor(s);
  // "About you" questions (e.g. finance knowledge) come before the 4-account explainer.
  for (const q of qs.filter((x) => x.atStart)) flow.push({ kind: "question", id: q.id });
  flow.push({ kind: "explain" });
  if (s.type === "business") flow.push({ kind: "firm" });
  let last: AccountId | null = null;
  for (const q of qs) {
    if (q.atStart || !q.account) continue;
    if (last && last !== q.account) flow.push({ kind: "done", account: last });
    flow.push({ kind: "question", id: q.id });
    last = q.account;
  }
  if (last) flow.push({ kind: "done", account: last });
  flow.push({ kind: "result" });
  return flow;
}

export function currentItem(s: OnboardingState): FlowItem {
  const flow = flowFor(s);
  return flow[Math.min(s.step, flow.length - 1)] ?? { kind: "welcome" };
}

// Progress bar fraction (0..1) and the "n / total" counter (only on question screens).
export function progressOf(s: OnboardingState): { fraction: number; counter: string } {
  const flow = flowFor(s);
  const step = Math.min(s.step, flow.length - 1);
  const fraction = flow.length > 1 ? step / (flow.length - 1) : 0;
  const item = flow[step];
  // Same order as the flow: "About you" questions first.
  const qs = questionsFor(s);
  const ids = [...qs.filter((q) => q.atStart), ...qs.filter((q) => !q.atStart)].map((q) => q.id);
  const qi = item?.kind === "question" ? ids.indexOf(item.id) : -1;
  return { fraction, counter: qi >= 0 ? `${qi + 1} / ${ids.length}` : "" };
}

// Answer text for the result screen.
export function answerLabel(q: OnboardingQuestion, answers: Answers): string {
  const v = answers[q.id];
  if (q.multi) {
    const picked = Array.isArray(v) ? v : [];
    const labels = q.options.filter((o) => picked.includes(o.value)).map((o) => o.label);
    return labels.length ? labels.join(", ") : "none";
  }
  return q.options.find((o) => o.value === v)?.label ?? "–";
}

export type OnboardingProfile = {
  // Finance knowledge (default "intermediate": the path leads to credit and investing).
  knowledge: KnowledgeLevel;
  ageBand: AgeBandId | null;
  playerType: PlayerType | null;
  industry: string | null;
  answers: Answers;
  flags: string[];
};

// Same shape as the artifact's profile(): what the game engine will receive.
export function buildProfile(s: OnboardingState): OnboardingProfile {
  const a = s.answers;
  const loans = a.loans;
  const flags = Array.isArray(loans) ? [...loans] : [];
  if (a.car === "oc") flags.push("car_oc_only");
  else if (a.car === "ac") flags.push("car_ac");
  if (a.home === "own_no") flags.push("home_uninsured");
  else if (a.home === "own_ins") flags.push("home_insured");
  if (a.life === "yes") flags.push("life_insurance");
  if (a.health === "yes") flags.push("health_insurance");
  if (a.separate === "no") flags.push("mixed_accounts");
  if (a.taxReserve === "no") flags.push("no_tax_reserve");
  const knowledge = knowledgeOf(a.knowledge);
  flags.push(`knowledge_${knowledge}`);
  return { knowledge, ageBand: s.age, playerType: s.type, industry: s.industry, answers: a, flags };
}

export const DEFAULT_KNOWLEDGE: KnowledgeLevel = "intermediate";
const KNOWLEDGE_LEVELS: readonly string[] = ["beginner", "intermediate", "advanced"];

// Self-rating 1–5 (decided 2026-11-21): 1–2 = beginner (starts in January), 3–5 = intermediate (skips the basics,
// starts with investing). Level names are still accepted; missing or unknown -> the default ("intermediate").
export function knowledgeOf(answer: string | string[] | undefined): KnowledgeLevel {
  if (answer === "1" || answer === "2") return "beginner";
  if (answer === "3" || answer === "4" || answer === "5") return "intermediate";
  return typeof answer === "string" && KNOWLEDGE_LEVELS.includes(answer) ? (answer as KnowledgeLevel) : DEFAULT_KNOWLEDGE;
}

// Result-screen line for the knowledge answer, e.g. "You rated yourself 3 of 5: we'll skip the basics".
export function knowledgeLine(answer: string | string[] | undefined): string {
  const k = knowledgeOf(answer);
  const head = typeof answer === "string" && /^[1-5]$/.test(answer) ? `You rated yourself ${answer} of 5` : `Level: ${k.charAt(0).toUpperCase() + k.slice(1)}`;
  return `${head}: ${k === "beginner" ? "we'll start from the basics" : "we'll skip the basics and start with investing"}`;
}
