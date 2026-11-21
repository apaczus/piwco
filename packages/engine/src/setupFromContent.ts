import type { HouseholdProfile, IndustryProfile } from "@piwco/content";
import type { InitialSetup } from "./initialState";
import { HOUSEHOLD_CATEGORIES, type HouseholdCategory, type Industry } from "./state";

const INDUSTRIES: readonly Industry[] = ["gastronomy", "it_software", "manufacturing"];

function isIndustry(id: string): id is Industry {
  return (INDUSTRIES as readonly string[]).includes(id);
}

/**
 * Turns content data (industry starting package + household baseline) into the
 * engine's InitialSetup (see buildInitialSetup below; optional onboarding answers scale the household).
 * Throws on broken content, because that is a data bug, not a player mistake.
 */
// Onboarding answers that change the household's starting point (decided: income, cushion, home, car).
export type HouseholdAnswers = {
  // Monthly net income D in PLN (onboarding "income" values: 3000 / 5500 / 9500 / 14000).
  income: number;
  // Emergency fund in months of household spending (onboarding "cushion": 0 / 0.5 / 2 / 4.5 / 7).
  cushionMonths: number;
  ownsHouse: boolean;
  ownsCar: boolean;
};

const round50 = (n: number) => Math.round(n / 50) * 50;

/** Household multiplier for an income: income / referenceIncome, clamped to the content's bounds. */
export function incomeScale(household: HouseholdProfile, income: number): number {
  const raw = household.referenceIncome > 0 ? income / household.referenceIncome : 1;
  return Math.min(household.incomeScaleMax, Math.max(household.incomeScaleMin, raw));
}

export function buildInitialSetup(
  industry: IndustryProfile,
  household: HouseholdProfile,
  seed: number,
  answers?: HouseholdAnswers,
): InitialSetup {
  if (!isIndustry(industry.id)) {
    throw new Error(`Unknown industry in content: "${industry.id}"`);
  }

  const monthlyCosts: Record<string, number> = {};
  for (const category of industry.costCategories) {
    monthlyCosts[category.id] = category.monthlyCost;
  }

  const monthlySpending = {} as Record<HouseholdCategory, number>;
  const minimumSpending = {} as Record<HouseholdCategory, number>;
  for (const id of HOUSEHOLD_CATEGORIES) {
    const category = household.categories.find((c) => c.id === id);
    if (!category) {
      throw new Error(`Household category missing in content: "${id}"`);
    }
    monthlySpending[id] = category.monthlySpending;
    minimumSpending[id] = category.minimum;
  }

  // Without answers (e.g. "Skip to game") the content's baseline is used as it is.
  const scale = answers ? incomeScale(household, answers.income) : 1;
  const ownsCar = answers ? answers.ownsCar : household.ownsCar;
  if (!ownsCar) monthlySpending.car_transport = household.noCarTransportSpending;
  if (answers) {
    for (const id of HOUSEHOLD_CATEGORIES) {
      monthlySpending[id] = round50(monthlySpending[id] * scale);
      minimumSpending[id] = round50(minimumSpending[id] * scale);
    }
  }
  const monthlyBills = HOUSEHOLD_CATEGORIES.filter((c) => c !== "savings").reduce((sum, c) => sum + monthlySpending[c], 0);

  return {
    seed,
    business: {
      industry: industry.id,
      cash: industry.startingCash,
      monthlyRevenue: industry.monthlyRevenue,
      monthlyCosts,
      employees: industry.employees,
      policies: { liability: false, property: false, equipment: false },
    },
    personal: {
      cash: answers ? round50(household.startingCash * scale) : household.startingCash,
      emergencyFund: answers ? round50(Math.max(0, answers.cushionMonths) * monthlyBills) : household.emergencyFund,
      monthlySpending,
      minimumSpending,
      debt: { ...household.debt },
      ownsHouse: answers ? answers.ownsHouse : household.ownsHouse,
      ownsCar,
      policies: { health: false, life: false, income_loss: false },
    },
  };
}
