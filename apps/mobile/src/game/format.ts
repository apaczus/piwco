import { household } from "@piwco/content";
import type { HouseholdCategory } from "@piwco/engine";

// 15000 -> "15 000 PLN" (non-breaking spaces, so the amount never wraps).
export function formatPln(n: number): string {
  const sign = n < 0 ? "−" : "";
  const digits = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${digits} PLN`;
}

export function categoryLabel(c: HouseholdCategory): string {
  return household.categories.find((x) => x.id === c)?.label ?? c;
}

export function categoryMinimum(c: HouseholdCategory): number {
  return household.categories.find((x) => x.id === c)?.minimum ?? 0;
}
