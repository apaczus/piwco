import householdData from "./household.json";
import industriesData from "./industries.json";
import cityData from "./city.json";
import eventsData from "./events.json";
import financingData from "./financing.json";
import levelsData from "./levels.json";
import onboardingData from "./onboarding.json";
import tutorialData from "./tutorial.json";
import investData from "./invest.json";

// ---- Onboarding ("Finance Quest" analysis) ----

// The 4 accounts, from the top down to the foundation.
export type AccountId = "main" | "cushion" | "future" | "protection";

export type AgeBandId = "18" | "26" | "36" | "51" | "65";

export type OnboardingOption = {
  label: string;
  value: string;
  // Small second line under the label (e.g. what IKZE is).
  note?: string;
};

// Finance knowledge level (onboarding question "knowledge"); levels.json skipFor decides which months it skips.
export type KnowledgeLevel = "beginner" | "intermediate" | "advanced";

export type OnboardingQuestion = {
  id: string;
  // Missing only on `atStart` questions (they don't belong to one of the 4 accounts).
  account?: AccountId;
  // Asked right after "who are you" / the industry, before the 4-account explainer; no "goes into the game" screen.
  atStart?: boolean;
  // Option selected when the screen opens; a "Next" button accepts it.
  default?: string;
  question: string;
  // "How we use it" line under the question.
  why: string;
  // Label on the result screen.
  shortLabel: string;
  options: OnboardingOption[];
  // Some age bands get different options.
  optionsByAge?: Partial<Record<AgeBandId, OnboardingOption[]>>;
  multi?: boolean;
  twoColumns?: boolean;
  // Asked only to entrepreneurs.
  businessOnly?: boolean;
  // Asked only to these age bands (all bands when missing).
  ages?: AgeBandId[];
};

export type OnboardingAccount = {
  id: AccountId;
  name: string;
  rule: string;
  explainTitle: string;
  explainText: string;
  focusStep: string;
  focusBig: string;
  focusUnit: string;
  // "In the game" text on the "X goes into the game" screen.
  inGame: string;
};

export type OnboardingContent = {
  brand: string;
  welcomeSlides: { title: string; text: string }[];
  welcomePills: string[];
  ageBands: { id: AgeBandId; label: string; hint: string }[];
  horizons: Record<AgeBandId, string>;
  industries: { id: string; label: string; hint: string; playable: boolean }[];
  accounts: OnboardingAccount[];
  seniorFutureInGame: string;
  questions: OnboardingQuestion[];
};

// The JSON is not validated at runtime; this cast gives the app the literal types (ids, age bands).
export const onboarding = onboardingData as OnboardingContent;

export type LessonCard = {
  title: string;
  points: string[];
};

// Lesson cards (SwipeLesson). Texts may contain {placeholders}, filled by the app: January's lesson from the month
// report ({revenue}, {costs}, {companyLeft}, {homeLeft}, apps/mobile/src/game/lesson.ts), the investing lesson from
// Try 1 and the market (apps/mobile/src/invest/lessonValues.ts). An unknown placeholder is an error.

// "Myth or fact?": swipe left = MYTH, right = FACT. `kind` is optional (January's cards have none).
export type MythFactCard = {
  kind?: "mythfact";
  statement: string;
  isFact: boolean;
  // Shown after the answer (right or wrong).
  explain: string;
};

// An explanation card: swipe either way or "Got it" = next, no score.
export type InfoLessonCard = {
  kind: "info";
  title: string;
  // 2–3 short sentences.
  text: string;
  // Optional mini visual: Return / Risk bars, one big number, a few label + text rows, or "melt": money losing
  // value year by year (animated: the amount rolls down from `from` to `to`, a purchasing-power bar shrinks, a
  // loss stamp lands; the card becomes a red "Watch out" card). from / to are PLN amounts (placeholders allowed).
  visual?:
    | { type: "bars"; returnLevel: number; riskLevel: number }
    | { type: "number"; value: string; label: string }
    | { type: "rows"; rows: { label: string; text: string }[] }
    | { type: "melt"; from: string; to: string; years: number; label: string };
  // Longer text behind a collapsed "Read more ▾" on the same card.
  readMore?: string;
};

// Two options on one card (left half = A, right half = B): swipe towards the chosen one or tap it.
export type ChoiceLessonCard = {
  kind: "choice";
  question: string;
  left: { title: string; text: string };
  right: { title: string; text: string };
  correct: "left" | "right";
  explain: string;
};

export type SwipeCard = MythFactCard | InfoLessonCard | ChoiceLessonCard;

export type SwipeLesson = {
  title: string;
  cards: SwipeCard[];
};

// The month's mission shown in the game: a title and steps the player ticks off.
// Step ids are checked in code (apps/mobile/src/game/mission.ts); the labels are editable text.
export type Mission = {
  title: string;
  steps: { id: string; label: string }[];
  reward: string;
};

// One level = one month of the learning program.
export type Level = {
  id: string;
  month: number;
  monthName: string;
  title: string;
  subtitle: string;
  // Only playable months can be opened; the rest are shown as locked.
  playable: boolean;
  topics: string[];
  // The level goal, as shown to the player. The real check lives in the engine.
  challenge: string;
  // Present for months that have a playable mission.
  mission?: Mission;
  // Old text-only lesson (months not yet converted to the interactive lesson).
  lessonCard?: LessonCard;
  // Interactive lesson shown after the month is completed: swipe "myth or fact?".
  lesson?: SwipeLesson;
  // Knowledge levels that skip this month (they already know it).
  skipFor?: KnowledgeLevel[];
};

// Cast: JSON strings ("intermediate") don't type-check as the KnowledgeLevel union.
export const levels = levelsData as Level[];

// All money values are whole PLN per month (integers).

export type CostCategory = {
  id: string;
  label: string;
  monthlyCost: number;
};

// Starting package of a playable industry (first draft, to be reviewed by the team).
export type IndustryProfile = {
  id: string;
  name: string;
  description: string;
  monthlyRevenue: number;
  startingCash: number;
  employees: number;
  // At most ~6 categories that matter for this industry (from the market analysis).
  costCategories: CostCategory[];
};

export const industries: IndustryProfile[] = industriesData;

export type HouseholdCategoryProfile = {
  id: string;
  label: string;
  monthlySpending: number;
  // Spending below this creates arrears (used by housing and food).
  minimum: number;
};

// Personal finances at the start, the same for everyone before onboarding answers apply.
export type HouseholdProfile = {
  // The numbers below are for this monthly net income (test profile A). The player's income from the onboarding
  // scales them (spending, minimums, starting cash), but only between incomeScaleMin and incomeScaleMax, so the
  // company's owner draw can still cover the household in month 1 in every industry.
  referenceIncome: number;
  incomeScaleMin: number;
  incomeScaleMax: number;
  // "Car & transport" for a player without a car (public transport), before scaling.
  noCarTransportSpending: number;
  startingCash: number;
  emergencyFund: number;
  ownsHouse: boolean;
  ownsCar: boolean;
  debt: {
    balance: number;
    monthlyInstallment: number;
  };
  categories: HouseholdCategoryProfile[];
};

export const household: HouseholdProfile = householdData;

// City view thresholds (CITY_THRESHOLDS). Edit the numbers in city.json; the logic is in @piwco/engine (city.ts).
export type CityThresholds = {
  // Home: 1 + completed months, up to maxLevel.
  home: { maxLevel: number };
  // Company: monthly revenue / the industry's starting revenue. Below level 2 ratio → 1.
  firm: { revenueRatioLevel2: number; revenueRatioLevel3: number };
  // Cushion vault: emergency fund (PLN) needed for levels 1, 2, 3.
  vault: { fundLevels: number[] };
  // Protection: active policies (business + personal) needed for levels 1, 2, 3.
  shield: { policyLevels: number[] };
  // Future tower: built by the investing chapter (month `unlockMonth`). Each step in order adds a level:
  // "try1Done" (Try 1 finished), "lessonDone" (the lesson finished), "try2Better" (Try 2 beat Try 1 in real terms).
  future: { unlockMonth: number; steps: string[] };
};

export const cityThresholds: CityThresholds = cityData;

// Random events (MVP pool, Claude's numbers for team review). Drawn by the engine at the start of a month.
export type GameEventDef = {
  id: string;
  side: "personal" | "business";
  title: string;
  // The push-notification sentence.
  notification: string;
  // Months in which it can be drawn.
  months: number[];
  // Relative chance among the month's candidates.
  weight: number;
  // "cost" = a one-off bill; "late_payment" = part of this month's revenue arrives next month.
  effect: "cost" | "late_payment";
  // Size: share of the player's monthly income D (personal) or of the company's monthly revenue (business),
  // clamped to [min, max] PLN.
  amount: { base: "income" | "revenue"; share: number; min: number; max: number };
  // Not drawn for a player without a car / own house.
  requires?: "car" | "own_house";
  // Already covered by a policy in the game state or by an onboarding flag ("Prepared" shortcut).
  protectedBy?: { policy?: string; flag?: string };
  // Lesson shown at the end of the month (after the result, before the month's lesson). Claude's texts, for team
  // review. Placeholders are filled in apps/mobile/src/game/eventLesson.ts: {amount}, {revenue}, {costs},
  // {companyLeft}, {homeLeft}, {cushionLeft}, {borrowed}, {loanTotal}, {installment}, {months}, {interest}.
  lesson?: EventLesson;
};

export type EventLesson = {
  // City building that the plan item repairs (scaffolding while its debt is being paid off).
  building: "home" | "firm";
  // Short name of the idea, shown on the cards (e.g. "Business cushion").
  concept: string;
  // Card 1 "What happened".
  happened: string;
  // Card 2 "What is X".
  whatIs: { title: string; text: string };
  // Card 3 "The math": without debt / with a loan taken for the event / covered by a policy ("Prepared": only
  // this card is shown, no quiz, no plan). Missing variants fall back to `math`.
  math: string;
  mathBorrowed?: string;
  mathPrepared?: string;
  // 2–3 "myth or fact?" cards.
  quiz: MythFactCard[];
  // "Add to my plan": one real-world step.
  plan: { title: string; detail: string };
};

// The JSON is not validated at runtime; this cast gives the literal types (side, effect, base).
export const gameEvents = eventsData as GameEventDef[];

// Ways to cover an event when the money isn't there ("plot twist"; Claude's numbers for team review).
// Simple interest: total = amount × (1 + monthlyRate × months), paid in equal monthly installments from next month.
export type FinancingProduct = {
  id: string;
  side: "personal" | "business";
  label: string;
  months: number;
  monthlyRate: number;
};

export const financing = financingData as FinancingProduct[];

// Guided tour of the game screen (a presentation over the real app, shown when entering the game and from "?").
// `id` = the highlighted element (matched in apps/mobile/src/game/coach.tsx; "alarm" and "gain" have no element,
// they are plain cards). `page` = the pager page that is scrolled to first. Texts are editable.
export type TutorialTip = { id: string; page: "year" | "learn" | "city"; title: string; text: string };
// "How Piwco works": shown before the first mission to players who skip the basics (problem-based learning).
export type HowItWorks = {
  eyebrow: string;
  title: string;
  sub: string;
  steps: { title: string; text: string }[];
  yearTitle: string;
  known: string;
  start: string;
  knownNote: string;
  cta: string;
  tapHint: string;
  // Tapping a month that can't be played yet ("{month}" = its name).
  notReadyTitle: string;
  notReadyText: string;
};
export type Tutorial = { tips: TutorialTip[]; howItWorks: HowItWorks };

export const tutorial = tutorialData as Tutorial;

// Investing chapter (month 8 "Stocks and bonds"). Claude's numbers, for team review. The engine turns the yearly
// returns into a deterministic 120-month history (packages/engine/src/invest.ts): each year ends exactly at its
// yearly return; marketEvents pin one month's move (month 1–120).
export type InvestInstrument = {
  id: string;
  name: string;
  oneLiner: string;
  // 0–5, shown as dots on the screen.
  returnLevel: number;
  riskLevel: number;
  // Colour key, mapped to theme.ts in the app ("muted" = colors.muted, otherwise an accountColors id).
  color: string;
  whatCanGoWrong: string;
  // Yearly return per year (10 years, e.g. -0.05 = -5%) and how much single months wiggle around it.
  market: { yearly: number[]; volatility: number };
};

export type InvestMarketEvent = { instrument: string; month: number; change: number; title: string };

export type InvestContent = {
  startAmount: number;
  inflation: number;
  instruments: InvestInstrument[];
  marketSeed: number;
  marketEvents: InvestMarketEvent[];
  // Share of each instrument in "a balanced mix" (sums to 1).
  balancedMix: Record<string, number>;
  horizons: number[];
  monthlyTopUps: number[];
};

export const invest: InvestContent = investData;
