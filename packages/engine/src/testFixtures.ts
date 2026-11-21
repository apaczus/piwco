// Test-only helpers. The numbers below are TEMPORARY placeholders, not game balance.
import type { InitialSetup } from "./initialState";

export function makeSetup(): InitialSetup {
  return {
    seed: 42,
    business: {
      industry: "gastronomy",
      cash: 20_000,
      monthlyRevenue: 45_000,
      monthlyCosts: { salaries: 18_000, supplies: 12_000, rent: 6_000, energy: 3_000 },
      employees: 4,
      policies: { liability: false, property: false, equipment: false },
    },
    personal: {
      cash: 3_000,
      emergencyFund: 0,
      monthlySpending: {
        housing: 2_500,
        food: 1_500,
        car_transport: 600,
        insurance: 0,
        savings: 0,
        other: 400,
      },
      minimumSpending: {
        housing: 2_500,
        food: 1_000,
        car_transport: 0,
        insurance: 0,
        savings: 0,
        other: 0,
      },
      debt: { balance: 0, monthlyInstallment: 0 },
      ownsHouse: true,
      ownsCar: true,
      policies: { health: false, life: false, income_loss: false },
    },
  };
}

// Recursively freezes an object. Any later write throws (test files run in strict mode),
// which proves the engine never mutates its input.
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}
