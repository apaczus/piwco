// Pure game-session logic (no UI): start a game, apply actions, end the month, replay from the snapshot.
import { financing, gameEvents, household, industries } from "@piwco/content";
import {
  applyAction,
  buildInitialSetup,
  checkMonthGoal,
  drawEvent,
  financingTerms,
  createInitialState,
  settleMonth,
  type Action,
  type GameState,
  type HouseholdAnswers,
  type GoalResult,
  type MonthReport,
} from "@piwco/engine";
import { newInvest, type InvestState } from "../invest/investSession";

// "welcome" = the celebratory "Welcome to the game" screen with the first mission (start of a new game).
// "eventLesson" = the month's event lesson (info cards, quiz, "Add to my plan"), after the result, before "lesson".
export type Phase =
  // Players who skip the basics: "You skip the first 3 months" → "The goal + your city" → "How Piwco works"
  // (Problem → Decide → Learn + the year) → "welcome".
  | "skipBasics"
  | "yourCity"
  | "howItWorks"
  | "welcome"
  | "intro"
  | "event"
  | "play"
  | "draw"
  | "budget"
  | "receipt"
  | "result"
  | "eventLesson"
  | "lesson"
  | "city"
  | "roadmap"
  // Between months: the pager (Year · Learn · City) for a completed month, nothing to play until the next one.
  | "hub"
  // The investing chapter (month 8): its own screens (apps/mobile/src/invest), not a simulated month.
  | "invest"
  // A lesson-only month (e.g. September / October: credit), opened from the year map.
  | "studyLesson";

// A real-world step the player added with "Add to my plan" (kept in memory; storage comes with the server).
export type PlanItem = {
  month: number;
  eventId: string;
  title: string;
  detail: string;
  // City building it repairs (scaffolding while that side still has loan debt).
  building: "home" | "firm";
};

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
  // "My plan", oldest first. Items belong to the month they were added in (a rewind drops later months' items).
  plan: PlanItem[];
  // The month's event has been revealed (it hits mid-month, after the player's first decision). Until then the
  // game screens see the month without it (no spoilers in the HUD forecast).
  eventShown: boolean;
  // Investing chapter progress (in memory only, not in GameState). null = not started.
  invest: InvestState | null;
  // Chapters finished outside the month simulation (8 = investing): ✓ on the year map.
  chaptersDone: number[];
  // Lesson-only month being studied (phase "studyLesson"), null otherwise.
  lessonMonth: number | null;
  // Where that lesson was opened from (the lesson ends / ‹ goes back there).
  lessonFrom: "roadmap" | "howItWorks";
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
  const fresh = createInitialState({ ...buildInitialSetup(industry, household, seed, answers), flags, financing: financingTerms(financing) });
  // The month's random event is drawn at its start (decided); the snapshot includes it, so a replay meets it again.
  const game = drawEvent(fresh, gameEvents).state;
  return {
    game,
    snapshot: game,
    phase: "welcome",
    result: null,
    completedMonth: 0,
    beforeEnd: null,
    history: [],
    reviewing: null,
    plan: [],
    eventShown: false,
    invest: null,
    chaptersDone: [],
    lessonMonth: null,
    lessonFrom: "roadmap",
  };
}

export function act(s: Session, action: Action, phase: Phase = "play"): { session: Session; error: string | null } {
  const r = applyAction(s.game, action);
  if (!r.ok) return { session: s, error: r.error };
  return { session: { ...s, game: r.state, phase }, error: null };
}

// The month always starts on the game screen; its event hits later (decided 2026-11-21: mid-month).
export function monthStartPhase(_game: GameState): Phase {
  return "play";
}

// This month has an event the player hasn't seen yet.
export function eventPending(s: Session): boolean {
  const ev = s.game.event;
  return !s.eventShown && !!ev && ev.month === s.game.month;
}

// After a decision (Pay yourself / budget saved) or on "End month": the pending event hits now (alarm screen);
// otherwise back to the game. The event screen ends back on the game screen.
export function afterDecision(s: Session): Session {
  return eventPending(s) ? { ...s, phase: "event", eventShown: true } : { ...s, phase: "play" };
}

// What the game screens show: the state without the event until it has been revealed.
export function visibleGame(s: Session): GameState {
  return eventPending(s) ? { ...s.game, event: null } : s.game;
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
    plan: s.plan.filter((p) => p.month !== month),
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
    phase: monthStartPhase(rec.start),
    result: null,
    completedMonth: month - 1,
    beforeEnd: null,
    history: s.history.filter((h) => h.month < month),
    reviewing: null,
    plan: s.plan.filter((p) => p.month < month),
    eventShown: false,
  };
}

export function replay(s: Session): Session {
  return { ...s, game: s.snapshot, phase: monthStartPhase(s.snapshot), result: null, beforeEnd: null, eventShown: false };
}

// "Add to my plan": the same event's item is added once per month (going back and adding again changes nothing).
export function addToPlan(s: Session, item: PlanItem): Session {
  const plan = s.plan.filter((p) => !(p.month === item.month && p.eventId === item.eventId));
  return { ...s, plan: [...plan, item] };
}

// Buildings with scaffolding: damaged (loan debt on that side) and a plan item that repairs them.
export function repairing(plan: PlanItem[], damaged: { home: boolean; firm: boolean }): { home: boolean; firm: boolean } {
  return {
    home: damaged.home && plan.some((p) => p.building === "home"),
    firm: damaged.firm && plan.some((p) => p.building === "firm"),
  };
}

// Open the investing chapter (from its start, or where the player left it).
export function openInvest(s: Session): Session {
  return { ...s, phase: "invest", invest: s.invest ?? newInvest() };
}

// The chapter's "Your city grew" is done: the month counts as done on the year map, back to the dashboard (hub).
export function finishChapter(s: Session, month: number): Session {
  return { ...s, phase: "hub", chaptersDone: s.chaptersDone.includes(month) ? s.chaptersDone : [...s.chaptersDone, month] };
}

// "LESSON ›" on the year map (or a month on "How Piwco works"): open a lesson-only month.
export function openLesson(s: Session, month: number, from: Session["lessonFrom"] = "roadmap"): Session {
  return { ...s, phase: "studyLesson", lessonMonth: month, lessonFrom: from };
}

// The lesson is done: ✓ on the year map (counts like a finished chapter), back where it was opened from.
export function finishLesson(s: Session): Session {
  const m = s.lessonMonth;
  const done = m === null || s.chaptersDone.includes(m) ? s.chaptersDone : [...s.chaptersDone, m];
  return { ...s, phase: s.lessonFrom, lessonMonth: null, chaptersDone: done };
}

// ‹ back from a lesson-only month: back where it was opened from, nothing changes.
export function closeLesson(s: Session): Session {
  return { ...s, phase: s.lessonFrom, lessonMonth: null };
}
