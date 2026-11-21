import { describe, expect, it } from "vitest";
import { createRng, nextFloat, nextInt, type RngState } from "./rng";

// Draws `count` floats starting from a seed.
function floats(seed: number, count: number): number[] {
  let state: RngState = createRng(seed);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const r = nextFloat(state);
    out.push(r.value);
    state = r.state;
  }
  return out;
}

// Classic closure-based mulberry32, used only to check our pure version against it.
function referenceMulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("seeded RNG", () => {
  it("gives the same sequence for the same seed", () => {
    expect(floats(12345, 10)).toEqual(floats(12345, 10));
  });

  it("gives different sequences for different seeds", () => {
    expect(floats(1, 10)).not.toEqual(floats(2, 10));
  });

  it("matches the reference mulberry32 implementation", () => {
    for (const seed of [0, 1, 42, 123456789, 4294967295]) {
      const ref = referenceMulberry32(seed);
      const expected = Array.from({ length: 20 }, () => ref());
      expect(floats(seed, 20)).toEqual(expected);
    }
  });

  it("is pure: the same input state always gives the same result", () => {
    const state = createRng(777);
    expect(nextFloat(state)).toEqual(nextFloat(state));
    expect(nextInt(state, 1, 6)).toEqual(nextInt(state, 1, 6));
  });

  it("returns floats in [0, 1)", () => {
    for (const v of floats(2024, 10_000)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("returns integers in [min, max] and hits both ends", () => {
    let state = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 2_000; i++) {
      const r = nextInt(state, 1, 6);
      expect(Number.isInteger(r.value)).toBe(true);
      expect(r.value).toBeGreaterThanOrEqual(1);
      expect(r.value).toBeLessThanOrEqual(6);
      seen.add(r.value);
      state = r.state;
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("works with min === max", () => {
    expect(nextInt(createRng(5), 3, 3).value).toBe(3);
  });

  it("rejects invalid ranges", () => {
    expect(() => nextInt(createRng(5), 6, 1)).toThrow(RangeError);
    expect(() => nextInt(createRng(5), 1.5, 3)).toThrow(RangeError);
  });
});
