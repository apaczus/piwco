import type { HouseholdProfile, IndustryProfile } from "@piwco/content";
import type { InitialSetup } from "./initialState";
import { HOUSEHOLD_CATEGORIES, type HouseholdCategory, type Industry } from "./state";

const INDUSTRIES: readonly Industry[] = ["gastronomy", "it_software", "manufacturing"];

function isIndustry(id: string): id is Industry {
  return (INDUSTRIES as readonly string[]).includes(id);
}

/**
 * Turns content data (industry starting package + household baseline) into the
 * engine's InitialSetup. Onboarding answers are not applied yet.
 * Throws on broken content, because that is a data bug, not a player mistake.
 */
export function buildInitialSetup(
  industry: IndustryProfile,
  household: HouseholdProfile,
  seed: number,
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
      cash: household.startingCash,
      emergencyFund: household.emergencyFund,
      monthlySpending,
      minimumSpending,
      debt: { ...household.debt },
      ownsHouse: household.ownsHouse,
      ownsCar: household.ownsCar,
      policies: { health: false, life: false, income_loss: false },
    },
  };
}
