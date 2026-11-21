// Pure game-session logic (no UI): start a game, apply actions, end the month, replay from the snapshot.
import { household, industries } from "@piwco/content";
import {
  applyAction,
  buildInitialSetup,
  checkMonthGoal,
  createInitialState,
  settleMonth,
  type Action,
  type GameState,
  type GoalResult,
  type MonthReport,
} from "@piwco/engine";

// "welcome" = the celebratory "Welcome to the game" screen with the first mission (start of a new game).
export type Phase = "welcome" | "intro" | "play" | "draw" | "budget" | "result" | "roadmap";

export type Session = {
  game: GameState;
  // State at the start of the month: "Replay the month" goes back here (same seed, same RNG state).
  snapshot: GameState;
  phase: Phase;
  result: { report: MonthReport; goal: GoalResult } | null;
  completedMonth: number;
};

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32) >>> 0;
}

// null when the industry is unknown or not playable.
export function newSession(industryId: string, seed: number): Session | null {
  const industry = industries.find((i) => i.id === industryId);
  if (!industry) return null;
  const game = createInitialState(buildInitialSetup(industry, household, seed));
  return { game, snapshot: game, phase: "welcome", result: null, completedMonth: 0 };
}

export function act(s: Session, action: Action): { session: Session; error: string | null } {
  const r = applyAction(s.game, action);
  if (!r.ok) return { session: s, error: r.error };
  return { session: { ...s, game: r.state, phase: "play" }, error: null };
}

export function endMonth(s: Session): Session {
  const { state, report } = settleMonth(s.game);
  const goal = checkMonthGoal(s.game.month, report);
  return {
    ...s,
    // On success the settled state is kept; on failure the month is replayed from the snapshot.
    game: goal.passed ? state : s.game,
    phase: "result",
    result: { report, goal },
    completedMonth: goal.passed ? s.game.month : s.completedMonth,
  };
}

export function replay(s: Session): Session {
  return { ...s, game: s.snapshot, phase: "play", result: null };
}
