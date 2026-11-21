// The onboarding profile handed to the game. Kept in app memory (no storage yet, decided).
// "Skip to game" has no profile: the game then uses the content's baseline (test profile A).
import type { HouseholdAnswers } from "@piwco/engine";
import type { OnboardingProfile } from "../onboarding/flow";

let current: OnboardingProfile | null = null;

export function setPlayerProfile(profile: OnboardingProfile | null) {
  current = profile;
}

export function getPlayerProfile(): OnboardingProfile | null {
  return current;
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

// Onboarding answers → the household's starting point (income, cushion, home, car; decided).
export function householdAnswers(profile: OnboardingProfile | null): HouseholdAnswers | undefined {
  if (!profile) return undefined;
  const a = profile.answers;
  const income = Number(one(a.income));
  const cushion = Number(one(a.cushion));
  return {
    income: Number.isFinite(income) && income > 0 ? income : 5500,
    cushionMonths: Number.isFinite(cushion) && cushion > 0 ? cushion : 0,
    ownsHouse: one(a.home) !== "rent",
    ownsCar: one(a.car) !== "none",
  };
}
