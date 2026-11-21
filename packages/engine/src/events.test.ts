import { gameEvents, type GameEventDef } from "@piwco/content";
import { describe, expect, it } from "vitest";
import { drawEvent, eventAmount, eventVariant } from "./events";
import { createInitialState } from "./initialState";
import type { GameState } from "./state";
import { deepFreeze, makeSetup } from "./testFixtures";

// Fixture: income 5 500, revenue 45 000, owns house + car, no policies, no flags.
function start(change?: (s: GameState) => void, flags: string[] = []): GameState {
  const s = createInitialState({ ...makeSetup(), flags });
  change?.(s);
  return s;
}

const ev = (over: Partial<GameEventDef>): GameEventDef => ({
  id: "test",
  side: "personal",
  title: "Test",
  notification: "Test",
  months: [1],
  weight: 1,
  effect: "cost",
  amount: { base: "income", share: 0.5, min: 1_000, max: 4_000 },
  ...over,
});

describe("eventAmount", () => {
  it("scales with income (personal) or revenue (business), clamped to min / max", () => {
    expect(eventAmount(ev({}), start())).toBe(2_750);
    expect(eventAmount(ev({}), start((s) => (s.personal.income = 1_000)))).toBe(1_000);
    expect(eventAmount(ev({}), start((s) => (s.personal.income = 14_000)))).toBe(4_000);
    const biz = ev({ side: "business", amount: { base: "revenue", share: 0.06, min: 2_000, max: 12_000 } });
    expect(eventAmount(biz, start())).toBe(2_700);
  });
});

describe("eventVariant", () => {
  it("is skipped when it doesn't apply to the player", () => {
    expect(eventVariant(ev({ requires: "car" }), start((s) => (s.personal.ownsCar = false))).variant).toBe("skipped");
    expect(eventVariant(ev({ requires: "own_house" }), start((s) => (s.personal.ownsHouse = false))).variant).toBe("skipped");
    expect(eventVariant(ev({ requires: "car" }), start()).variant).toBe("full");
  });

  it("is prepared when a policy in the game or an onboarding flag covers it", () => {
    const def = ev({ protectedBy: { policy: "health", flag: "health_insurance" } });
    expect(eventVariant(def, start())).toEqual({ variant: "full", coveredBy: null });
    expect(eventVariant(def, start((s) => (s.personal.policies.health = true)))).toEqual({ variant: "prepared", coveredBy: "policy" });
    expect(eventVariant(def, start(undefined, ["health_insurance"]))).toEqual({ variant: "prepared", coveredBy: "flag" });
    const equipment = ev({ side: "business", protectedBy: { policy: "equipment" } });
    expect(eventVariant(equipment, start((s) => (s.business.policies.equipment = true))).variant).toBe("prepared");
  });

  it("rejects an unknown policy name in content", () => {
    expect(() => eventVariant(ev({ protectedBy: { policy: "pets" } }), start())).toThrow('Unknown policy in event content: "pets"');
  });
});

describe("drawEvent", () => {
  const pool = [ev({ id: "a", months: [1] }), ev({ id: "b", months: [1] }), ev({ id: "c", months: [2] })];

  it("draws one of the month's events, deterministic for a seed, and advances the RNG", () => {
    const s = start();
    const r1 = drawEvent(s, pool);
    const r2 = drawEvent(s, pool);
    expect(r1.event).toEqual(r2.event);
    expect(["a", "b"]).toContain(r1.event!.id);
    expect(r1.event!.month).toBe(1);
    expect(r1.state.rng).not.toBe(s.rng);
    expect(r1.state.event).toEqual(r1.event);
  });

  it("returns the same event when drawn twice in a month", () => {
    const once = drawEvent(start(), pool).state;
    const twice = drawEvent(once, pool);
    expect(twice.state).toBe(once);
  });

  it("follows the weights", () => {
    const weighted = [ev({ id: "rare", weight: 1 }), ev({ id: "common", weight: 9 })];
    let common = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const s = createInitialState({ ...makeSetup(), seed });
      if (drawEvent(s, weighted).event!.id === "common") common++;
    }
    expect(common).toBeGreaterThan(320);
    expect(common).toBeLessThan(390);
  });

  it("never picks a skipped event; no candidates = no event", () => {
    const carOnly = [ev({ id: "car", requires: "car" })];
    const noCar = start((s) => (s.personal.ownsCar = false));
    expect(drawEvent(noCar, carOnly).event).toBeNull();
    expect(drawEvent(noCar, [...carOnly, ev({ id: "other" })]).event!.id).toBe("other");
  });

  it("marks a covered event as prepared", () => {
    const covered = [ev({ id: "x", protectedBy: { flag: "car_ac" } })];
    expect(drawEvent(start(undefined, ["car_ac"]), covered).event).toMatchObject({ variant: "prepared", coveredBy: "flag" });
  });

  it("never mutates the state", () => {
    const s = deepFreeze(start());
    expect(() => drawEvent(s, pool)).not.toThrow();
  });
});

describe("events.json (MVP pool)", () => {
  it("has valid events for months 1–3 with sane amounts", () => {
    expect(gameEvents.length).toBeGreaterThanOrEqual(8);
    const ids = new Set<string>();
    for (const e of gameEvents) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
      expect(["personal", "business"]).toContain(e.side);
      expect(["cost", "late_payment"]).toContain(e.effect);
      expect(e.amount.min).toBeLessThanOrEqual(e.amount.max);
      expect(e.months.every((m) => m >= 1 && m <= 12)).toBe(true);
      expect(() => eventVariant(e, start())).not.toThrow();
    }
    for (const month of [1, 2, 3]) {
      expect(gameEvents.some((e) => e.months.includes(month))).toBe(true);
    }
  });

  it("every month 1–3 has an event for a renter without a car", () => {
    const s = start((x) => {
      x.personal.ownsCar = false;
      x.personal.ownsHouse = false;
    });
    for (const month of [1, 2, 3]) {
      expect(drawEvent({ ...s, month }, gameEvents).event).not.toBeNull();
    }
  });
});
