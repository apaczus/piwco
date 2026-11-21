import { levels } from "@piwco/content";
import { describe, expect, it } from "vitest";
import { skipsMonth, startMonthFor } from "./startMonth";

// Today's curriculum with June ("Debt financing") and August ("Stocks and bonds") made playable.
const later = levels.map((l) => (l.month === 6 || l.month === 8 ? { ...l, playable: true } : l));

describe("startMonthFor", () => {
  it("beginner starts in January", () => {
    expect(startMonthFor("beginner", levels)).toEqual({ month: 1, fallback: false });
  });

  it("intermediate and advanced start with the investing chapter (August)", () => {
    expect(startMonthFor("intermediate", levels)).toEqual({ month: 8, fallback: false });
    expect(startMonthFor("advanced", levels)).toEqual({ month: 8, fallback: false });
  });

  it("falls back to January when nothing past the basics is playable", () => {
    const basics = levels.map((l) => (l.month > 3 ? { ...l, playable: false } : l));
    expect(startMonthFor("intermediate", basics)).toEqual({ month: 1, fallback: true });
  });

  it("no argument behaves like intermediate", () => {
    expect(startMonthFor(undefined, levels)).toEqual(startMonthFor("intermediate", levels));
  });

  it("picks the first playable month the level doesn't skip once later chapters are playable", () => {
    expect(startMonthFor("intermediate", later)).toEqual({ month: 6, fallback: false });
    expect(startMonthFor("advanced", later)).toEqual({ month: 6, fallback: false });
    expect(startMonthFor("beginner", later)).toEqual({ month: 1, fallback: false });
  });
});

describe("skipFor in levels.json", () => {
  it("intermediate skips January–March, advanced also September (debt basics), beginner nothing", () => {
    const skipped = (k: "beginner" | "intermediate" | "advanced") => levels.filter((l) => skipsMonth(l, k)).map((l) => l.month);
    expect(skipped("beginner")).toEqual([]);
    expect(skipped("intermediate")).toEqual([1, 2, 3]);
    expect(skipped("advanced")).toEqual([1, 2, 3, 9]);
  });
});
