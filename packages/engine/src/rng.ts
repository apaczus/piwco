/**
 * Seeded pseudo-random number generator (mulberry32).
 *
 * The generator is pure: its whole state is one unsigned 32-bit integer that is
 * passed in and returned. That state can live in the game state and in the
 * month snapshot, so the phone and the server draw exactly the same numbers.
 */

export type RngState = number;

export type RngResult = {
  value: number;
  state: RngState;
};

/** Turns any seed number into a valid generator state (unsigned 32-bit integer). */
export function createRng(seed: number): RngState {
  return seed >>> 0;
}

/** Returns a float in [0, 1) and the next generator state. */
export function nextFloat(state: RngState): RngResult {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: nextState };
}

/** Returns an integer between min and max (both inclusive) and the next generator state. */
export function nextInt(state: RngState, min: number, max: number): RngResult {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError(`nextInt: invalid range [${min}, ${max}]`);
  }
  const { value, state: nextState } = nextFloat(state);
  return { value: min + Math.floor(value * (max - min + 1)), state: nextState };
}
