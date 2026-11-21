// Pure helpers (no React): where a player of a given finance knowledge level starts, and which months they skip.
// levels.json `skipFor` decides it (data, not code). Intermediate / advanced start with the first playable chapter
// they don't skip (August, investing); with nothing playable past the basics they get January as a "warm-up".
import type { KnowledgeLevel, Level } from "@piwco/content";

export const DEFAULT_LEVEL: KnowledgeLevel = "intermediate";

export function skipsMonth(level: Pick<Level, "skipFor">, knowledge: KnowledgeLevel = DEFAULT_LEVEL): boolean {
  return level.skipFor?.includes(knowledge) ?? false;
}

// First playable month this level doesn't skip; none -> January with fallback: true.
export function startMonthFor(
  knowledge: KnowledgeLevel = DEFAULT_LEVEL,
  levels: readonly Pick<Level, "month" | "playable" | "skipFor">[],
): { month: number; fallback: boolean } {
  const first = [...levels].sort((a, b) => a.month - b.month).find((l) => l.playable && !skipsMonth(l, knowledge));
  return first ? { month: first.month, fallback: false } : { month: 1, fallback: true };
}
