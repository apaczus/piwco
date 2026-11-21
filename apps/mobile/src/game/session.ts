// Pure game-session logic (no UI): start a game, apply actions, end the month, replay from the snapshot.
import { financing, household, industries } from "@piwco/content";
import {
  applyAction,
  buildInitialSetup,
  checkMonthGoal,
  financingTerms,
  createInitialState,
  settleMonth,
  type Action,
  type GameState,
  type HouseholdAnswers,
  type GoalResult,
  type MonthReport,
} from "@piwco/engine";

// "welcome" = the celebratory "Welcome to the game" screen with the first mission (start of a new game).
export type Phase = "welcome" | "intro" | "play" | "draw" | "budget" | "receipt" | "result" | "lesson" | "city" | "roadmap";

export type Session = {
  game: GameState;
  // State at the start of the month: "Replay the month" goes back here (same seed, same RNG state).
  snapshot: GameState;
  phase: Phase;
  result: { report: MonthReport; goal: GoalResult } | null;
  completedMonth: number;
  // The month just before "End month" (game + completed months): the back button on the receipt undoes the
  // settlement and returns here with every decision kept. null while the month is being played.
  beforeEnd: { game: GameState; completedMonth: number } | null;
  // Every completed month (for "Review" and "Replay month" on the year map), oldest first.
  history: MonthRecord[];
  // Month being reviewed (receipt → result → lesson → city of that pass, nothing changes); null = playing.
  reviewing: number | null;
};

export type MonthRecord = {
  month: number;
  // State at the start of the month ("Replay month" rewinds here).
  start: GameState;
  // State after the settlement, the report and the goal check of the pass.
  settled: GameState;
  report: MonthReport;
  goal: GoalResult;
};

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32) >>> 0;
}

// null when the industry is unknown or not playable.
// `answers` = the onboarding's household answers (income, cushion, home, car); without them the baseline is used.
// `flags` = profile flags (e.g. car_ac, home_insured), stored in the game state for the random events.
export function newSession(industryId: string, seed: number, answers?: HouseholdAnswers, flags: string[] = []): Session | null {
  const industry = industries.find((i) => i.id === industryId);
  if (!industry) return null;
  const game = createInitialState({ ...buildInitialSetup(industry, household, seed, answers), flags, financing: financingTerms(financing) });
  return {
    game,
    snapshot: game,
    phase: "welcome",
    result: null,
    completedMonth: 0,
    beforeEnd: null,
    history: [],
    reviewing: null,
  };
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
    // The settlement receipt comes first, then the result screen.
    phase: "receipt",
    result: { report, goal },
    completedMonth: goal.passed ? s.game.month : s.completedMonth,
    beforeEnd: { game: s.game, completedMonth: s.completedMonth },
    history: goal.passed
      ? [...s.history.filter((h) => h.month !== s.game.month), { month: s.game.month, start: s.snapshot, settled: state, report, goal }]
      : s.history,
  };
}

// Back from the receipt: cancel the settlement, back to the month with all decisions kept.
export function undoEndMonth(s: Session): Session {
  if (!s.beforeEnd) return { ...s, phase: "play" };
  const month = s.beforeEnd.game.month;
  return {
    ...s,
    game: s.beforeEnd.game,
    completedMonth: s.beforeEnd.completedMonth,
    phase: "play",
    result: null,
    beforeEnd: null,
    history: s.history.filter((h) => h.month !== month),
  };
}

// "Review" on the year map: show a completed month's receipt, result, lesson and city again. Changes nothing.
export function startReview(s: Session, month: number): Session {
  if (!s.history.some((h) => h.month === month)) return s;
  return { ...s, reviewing: month, phase: "receipt" };
}

export function endReview(s: Session): Session {
  return { ...s, reviewing: null, phase: "roadmap" };
}

// "Replay month": time goes back to the start of that month (same seed); later months are dropped.
export function rewindTo(s: Session, month: number): Session {
  const rec = s.history.find((h) => h.month === month);
  if (!rec) return s;
  return {
    ...s,
    game: rec.start,
    snapshot: rec.start,
    phase: "play",
    result: null,
    completedMonth: month - 1,
    beforeEnd: null,
    history: s.history.filter((h) => h.month < month),
    reviewing: null,
  };
}

export function replay(s: Session): Session {
  return { ...s, game: s.snapshot, phase: "play", result: null, beforeEnd: null };
}
