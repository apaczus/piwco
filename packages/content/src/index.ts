import householdData from "./household.json";
import industriesData from "./industries.json";
import cityData from "./city.json";
import levelsData from "./levels.json";
import onboardingData from "./onboarding.json";

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

export type OnboardingQuestion = {
  id: string;
  account: AccountId;
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

// One "myth or fact?" card. Texts may contain placeholders filled with the player's month report:
// {revenue}, {costs}, {companyLeft}, {homeLeft} (see apps/mobile/src/game/lesson.ts).
export type MythFactCard = {
  statement: string;
  isFact: boolean;
  // Shown after the answer (right or wrong).
  explain: string;
};

export type SwipeLesson = {
  title: string;
  cards: MythFactCard[];
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
};

export const levels: Level[] = levelsData;

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
  // Future tower: empty until this month (investments).
  future: { unlockMonth: number };
};

export const cityThresholds: CityThresholds = cityData;
