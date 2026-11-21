// City data for the app: names, colours, the engine config (thresholds + starting revenue) and hint sentences.
import { cityThresholds, industries } from "@piwco/content";
import { nextLevel, type BuildingId, type CityConfig, type CityLevel, type GameState } from "@piwco/engine";
import { formatPln } from "../game/format";
import { accountColors, colors } from "../theme";

export const BUILDING_INFO: Record<BuildingId, { name: string; color: string }> = {
  home: { name: "Home", color: accountColors.main.color },
  firm: { name: "Company", color: colors.petrol700 },
  vault: { name: "Cushion vault", color: accountColors.cushion.color },
  shield: { name: "Protection", color: accountColors.protection.color },
  future: { name: "Future tower", color: accountColors.future.color },
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function cityConfigFor(state: GameState): CityConfig {
  const industry = industries.find((i) => i.id === state.business.industry);
  return { thresholds: cityThresholds, startingRevenue: industry?.monthlyRevenue ?? state.business.monthlyRevenue };
}

// Tooltip text for a tapped building, e.g. "Level 2 of 3 · Next level at 4 500 PLN in your cushion".
export function buildingHint(id: BuildingId, level: CityLevel, config: CityConfig): string {
  const next = nextLevel(id, level, config);
  if (id === "future") {
    if (level === 0) return `Play the investing chapter (${MONTHS[(next?.kind === "locked" ? next.unlockMonth : 8) - 1]}) to build it.`;
    if (!next) return `Level ${level} of 3 · Fully built!`;
    return `Level ${level} of 3 · ${next.kind === "invest" && next.step === "lessonDone" ? "Finish the investing lesson to grow it" : "Beat your first try to build the top"}`;
  }
  if (level === 0) {
    if (id === "vault") return "Save to your cushion to build it.";
    if (id === "shield") return "Buy your first insurance policy to build it.";
  }
  const head = `Level ${level} of 3`;
  if (!next) return `${head} · Fully built!`;
  switch (next.kind) {
    case "months":
      return `${head} · Grows with every month you complete`;
    case "revenue":
      return `${head} · Next level at ${formatPln(next.revenue)} monthly revenue`;
    case "fund":
      return `${head} · Next level at ${formatPln(next.amount)} in your cushion`;
    case "policies":
      return `${head} · Next level with ${next.count} insurance ${next.count === 1 ? "policy" : "policies"}`;
    case "locked":
    case "invest":
      return head;
  }
}
