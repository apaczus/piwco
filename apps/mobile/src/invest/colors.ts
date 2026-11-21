// Instrument colour keys from invest.json → theme colours ("muted" = colors.muted, otherwise an account colour).
import { accountColors, colors } from "../theme";

export function instrumentColor(key: string): string {
  if (key === "muted") return colors.muted;
  return accountColors[key as keyof typeof accountColors]?.color ?? colors.petrol700;
}
