// Which mission steps are done. Pure: computed from the game state (no UI).
import type { Level } from "@piwco/content";
import { checkMonthGoal, settleMonth, type Action, type GameState } from "@piwco/engine";

export type MissionStep = { id: string; label: string; done: boolean };

export type MissionStatus = {
  title: string;
  reward: string;
  steps: MissionStep[];
  doneCount: number;
  allDone: boolean;
};

function didThisMonth(state: GameState, type: Action["type"]): boolean {
  return state.log.some((e) => e.month === state.month && e.action.type === type);
}

// The month's goal would pass if the month ended now (same settlement as "End month").
function wouldPass(state: GameState): boolean {
  try {
    return checkMonthGoal(state.month, settleMonth(state).report).passed;
  } catch {
    return false; // month without goal logic yet
  }
}

function isStepDone(id: string, state: GameState): boolean {
  switch (id) {
    case "pay_yourself":
      return didThisMonth(state, "owner_draw");
    case "plan_budget":
      return didThisMonth(state, "set_household_budget");
    case "all_paid":
      return wouldPass(state);
    default:
      return false;
  }
}

export function missionStatus(level: Level, state: GameState): MissionStatus | null {
  if (!level.mission) return null;
  const steps = level.mission.steps.map((s) => ({ ...s, done: isStepDone(s.id, state) }));
  const doneCount = steps.filter((s) => s.done).length;
  return {
    title: level.mission.title,
    reward: level.mission.reward,
    steps,
    doneCount,
    allDone: doneCount === steps.length,
  };
}
