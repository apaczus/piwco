import { netWorth } from "@piwco/engine";
import { describe, expect, it } from "vitest";
import { canEnterGame, isBusinessMonth, PRIVATE_CARRIER_INDUSTRY, withoutFirm } from "./privatePlayer";
import { finishChapter, newPrivateSession, openLesson, finishLesson } from "./session";

describe("private persons", () => {
  it("enter the game when rated 3–5, beginners don't; entrepreneurs need a playable industry", () => {
    expect(canEnterGame("private", false, "intermediate")).toBe(true);
    expect(canEnterGame("private", false, "advanced")).toBe(true);
    expect(canEnterGame("private", false, "beginner")).toBe(false);
    expect(canEnterGame("business", true, "beginner")).toBe(true);
    expect(canEnterGame("business", false, "intermediate")).toBe(false);
    expect(canEnterGame(null, true, "intermediate")).toBe(false);
  });

  it("January–March are company months", () => {
    expect([1, 2, 3].every(isBusinessMonth)).toBe(true);
    expect([8, 9, 10].some(isBusinessMonth)).toBe(false);
  });

  it("card lists drop the Company and keep their length", () => {
    expect(withoutFirm(["home", "firm", "vault", "shield"])).toEqual(["home", "future", "vault", "shield"]);
    expect(withoutFirm(["future", "home", "firm", "vault"])).toEqual(["future", "home", "shield", "vault"]);
    expect(withoutFirm(["home", "vault"])).toEqual(["home", "vault"]);
  });

  it("start on 'The goal + your city' with no company money: net worth = personal money", () => {
    const s = newPrivateSession(PRIVATE_CARRIER_INDUSTRY, 7, { income: 5500, cushionMonths: 2, ownsHouse: false, ownsCar: false })!;
    expect(s.phase).toBe("yourCity");
    expect(s.game.business.cash).toBe(0);
    expect(s.snapshot).toBe(s.game);
    const p = s.game.personal;
    expect(netWorth(s.game)).toBe(p.cash + p.emergencyFund);
  });

  it("can finish the investing chapter and the credit lessons", () => {
    let s = newPrivateSession(PRIVATE_CARRIER_INDUSTRY, 7)!;
    s = finishChapter(s, 8);
    s = finishLesson(openLesson(s, 9, "howItWorks"));
    expect(s.chaptersDone).toEqual(expect.arrayContaining([8, 9]));
    expect(s.completedMonth).toBe(0);
  });
});
