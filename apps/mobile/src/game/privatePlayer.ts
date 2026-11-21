// Private persons who rated themselves 3–5 (user, 2026-11-22): no company, so they get the investing chapter and
// the credit lessons; January–March (company simulation) are "For entrepreneurs". The game still needs a game
// state, so it runs on a hidden carrier company with no cash (net worth = personal money only); the city leaves
// the Company building out. GameFlow provides the flag to every screen.
import type { BuildingId } from "@piwco/engine";
import { createContext, useContext } from "react";

// Industry of the hidden carrier company (never shown).
export const PRIVATE_CARRIER_INDUSTRY = "gastronomy";

// Months that are a company simulation (January–March): locked for private persons.
export const BUSINESS_MONTHS = [1, 2, 3];
export const isBusinessMonth = (month: number) => BUSINESS_MONTHS.includes(month);

export const PrivatePlayerContext = createContext(false);
export const usePrivatePlayer = () => useContext(PrivatePlayerContext);

// Who may enter the game from the survey: entrepreneurs with a playable industry, private persons rated 3–5.
export function canEnterGame(type: "private" | "business" | null, industryPlayable: boolean, knowledge: string): boolean {
  if (type === "business") return industryPlayable;
  if (type === "private") return knowledge !== "beginner";
  return false;
}

// Buildings without the Company (private persons). Card lists keep their length: "firm" becomes the next
// building that isn't on the list yet.
export function withoutFirm(ids: BuildingId[]): BuildingId[] {
  if (!ids.includes("firm")) return ids;
  const spare = (["future", "shield", "vault", "home"] as BuildingId[]).find((id) => !ids.includes(id));
  return ids.flatMap((id) => (id === "firm" ? (spare ? [spare] : []) : [id]));
}
