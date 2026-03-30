import type { TestMode, TimeLimit } from "@/hooks/use-typing-test";
import type { Language } from "@/lib/words";

export interface TestResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  missedChars: number;
  totalTime: number;
  mode: TestMode;
  timeLimit: TimeLimit;
  language: Language;
  date: string;
  correctWords: number;
  totalWords: number;
}

const STORAGE_KEY = "keytap-history";

export function getHistory(): TestResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TestResult[];
  } catch {
    return [];
  }
}

export function saveResult(result: TestResult): void {
  const history = getHistory();
  history.push(result);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
