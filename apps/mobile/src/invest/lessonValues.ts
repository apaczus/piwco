// Numbers for the investing lesson's {placeholders} (levels.json month 8): from the player's Try 1 and the engine,
// on the same market history. Keep in sync with the cards; an unknown placeholder throws (fillText).
import { invest } from "@piwco/content";
import { simulatePortfolio, splitByShares } from "@piwco/engine";
import { formatPln } from "../game/format";
import { balancedIn10Years, MARKET, runTry, START, type InvestTry } from "./investSession";

export function investLessonValues(try1: InvestTry): Record<string, string> {
  const share = Math.round(((try1.allocation.stock ?? 0) / START) * 100);
  const stockEnd = try1.result.byInstrument.stock?.[try1.months] ?? 0;
  const stockLoss = (try1.allocation.stock ?? 0) - stockEnd;
  const etf = runTry({ etf: START }, 120, 0).result.total;
  // 100 PLN a month from zero, split like the balanced mix.
  const small = simulatePortfolio({ allocation: {}, monthly: splitByShares(100, invest.balancedMix), months: 120, market: MARKET, inflation: invest.inflation });
  return {
    start: formatPln(START),
    yourResult: formatPln(try1.result.nominal),
    novatechShare: `${share}%`,
    yourNovatech:
      share > 0
        ? `In your first try NovaTech was ${share}% of your money and ${stockLoss >= 0 ? `lost ${formatPln(stockLoss)}` : `made ${formatPln(-stockLoss)}`}.`
        : "In your first try you skipped NovaTech: its shareholders lost 40% that year.",
    etf1y: formatPln(etf[12] ?? 0),
    etf10y: formatPln(etf[120] ?? 0),
    cashReal10y: formatPln(runTry({ cash: START }, 120, 0).result.real),
    balanced10y: formatPln(balancedIn10Years()),
    monthly10y: formatPln(small.nominal),
    monthlyPaid: formatPln(small.contributed),
  };
}
