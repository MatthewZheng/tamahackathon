import { describe, it, expect } from "vitest";
import { detectCrisis, detectConcern } from "./crisisDetectionService";

const CRISIS_CASES = [
  "i want to kill myself",
  "i've been cutting myself",
  "i have a plan to end it",
  "i made a plan, i want to die",
  "i don't want to wake up",
  "thinking about hurting myself",
  "i'm not safe tonight",
  "no reason to go on",
  "i wish i was dead",
  "i want to die",
  "suicidal again",
  "going to hurt myself",
];

const CONCERN_CASES = ["i hurt myself", "i cut myself"];

const NEUTRAL_CASES = [
  "i have a plan for dinner",
  "i have a plan for the demo",
  "i hurt myself at the gym yesterday",
  "i cut myself shaving",
  "this deadline is killing me",
  "my feet are killing me",
  "i'm dying to see them",
  "that movie was to die for",
  "we killed it on stage",
];

describe("detectCrisis — MUST TRIGGER", () => {
  for (const t of CRISIS_CASES) {
    it(JSON.stringify(t), () => {
      expect(detectCrisis(t)).toBe(true);
    });
  }
});

describe("detectConcern — MUST TRIGGER (and not crisis)", () => {
  for (const t of CONCERN_CASES) {
    it(JSON.stringify(t), () => {
      expect(detectCrisis(t)).toBe(false);
      expect(detectConcern(t)).toBe(true);
    });
  }
});

describe("neither — MUST TRIGGER NOTHING", () => {
  for (const t of NEUTRAL_CASES) {
    it(JSON.stringify(t), () => {
      expect(detectCrisis(t)).toBe(false);
      expect(detectConcern(t)).toBe(false);
    });
  }
});
