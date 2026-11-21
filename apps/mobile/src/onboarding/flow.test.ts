import type { AgeBandId } from "@piwco/content";
import { describe, expect, it } from "vitest";
import { buildProfile, currentItem, flowFor, initialOnboardingState, knowledgeOf, progressOf, questionsFor, type OnboardingState } from "./flow";

function state(type: "business" | "private", age: AgeBandId, answers: Record<string, string> = {}): OnboardingState {
  return { ...initialOnboardingState(), age, type, industry: type === "business" ? "gastronomy" : null, answers };
}

describe("buildProfile: knowledge", () => {
  for (const k of ["beginner", "intermediate", "advanced"] as const) {
    it(`answer "${k}" -> knowledge ${k} + flag knowledge_${k}`, () => {
      const p = buildProfile(state("business", "26", { knowledge: k }));
      expect(p.knowledge).toBe(k);
      expect(p.flags).toContain(`knowledge_${k}`);
      expect(p.flags.filter((f) => f.startsWith("knowledge_"))).toHaveLength(1);
    });
  }

  for (const [answer, k] of [["1", "beginner"], ["2", "beginner"], ["3", "intermediate"], ["4", "intermediate"], ["5", "intermediate"]] as const) {
    it(`scale answer ${answer} -> ${k}`, () => {
      expect(buildProfile(state("business", "26", { knowledge: answer })).knowledge).toBe(k);
    });
  }

  it("no answer -> intermediate", () => {
    const p = buildProfile(state("private", "36"));
    expect(p.knowledge).toBe("intermediate");
    expect(p.flags).toContain("knowledge_intermediate");
  });

  it('"Skip to game" (no profile) and unknown answers count as intermediate', () => {
    expect(knowledgeOf(undefined)).toBe("intermediate");
    expect(knowledgeOf("expert")).toBe("intermediate");
  });
});

describe("knowledge question in the flow", () => {
  const cases: [string, OnboardingState, string][] = [
    ["entrepreneur", state("business", "26"), "industry"],
    ["private person", state("private", "36"), "type"],
    ["65+ entrepreneur", state("business", "65"), "industry"],
  ];
  for (const [name, s, before] of cases) {
    it(`${name}: first question, right after "${before}", counter 1 / n`, () => {
      const flow = flowFor(s);
      const i = flow.findIndex((x) => x.kind === "question" && x.id === "knowledge");
      expect(flow[i - 1]?.kind).toBe(before);
      expect(flow[i + 1]?.kind).toBe("explain");
      expect(flow.filter((x) => x.kind === "question" && x.id === "knowledge")).toHaveLength(1);
      // Not followed by a "goes into the game" screen of its own.
      expect(flow.some((x) => x.kind === "done" && flow.indexOf(x) === i + 1)).toBe(false);
      const at = { ...s, step: i };
      expect(currentItem(at)).toEqual({ kind: "question", id: "knowledge" });
      const total = questionsFor(s).length;
      expect(progressOf(at).counter).toBe(`1 / ${total}`);
      // The counter keeps counting up: the next question is 2 / n.
      const nextQ = flow.findIndex((x, j) => j > i && x.kind === "question");
      expect(progressOf({ ...s, step: nextQ }).counter).toBe(`2 / ${total}`);
      // Pre-selected default.
      expect(questionsFor(s).find((q) => q.id === "knowledge")?.default).toBe("3");
    });
  }
});
