import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveResult, getHistory, type TestResult } from "./history";

function makeResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    wpm: 65,
    rawWpm: 72,
    accuracy: 94.5,
    correctChars: 189,
    incorrectChars: 11,
    extraChars: 0,
    missedChars: 3,
    totalTime: 30,
    mode: "time",
    timeLimit: 30,
    language: "en",
    date: "2026-03-27T12:00:00.000Z",
    correctWords: 38,
    totalWords: 40,
    ...overrides,
  };
}

describe("history", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty array when no history", () => {
    expect(getHistory()).toEqual([]);
  });

  it("saves and retrieves a result", () => {
    const result = makeResult();
    saveResult(result);
    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(result);
  });

  it("saves multiple results in order", () => {
    const r1 = makeResult({ wpm: 60 });
    const r2 = makeResult({ wpm: 70 });
    saveResult(r1);
    saveResult(r2);
    const history = getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].wpm).toBe(60);
    expect(history[1].wpm).toBe(70);
  });

  it("handles corrupted localStorage gracefully", () => {
    localStorage.setItem("keytest-history", "not-json");
    expect(getHistory()).toEqual([]);
  });
});
