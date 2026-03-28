"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateWords, type Language } from "@/lib/words";

export type CharState = "pending" | "correct" | "incorrect";
export type WordState = "pending" | "active" | "correct" | "incorrect";
export type TestMode = "time" | "infinite";
export type TimeLimit = 15 | 30 | 60 | 120;

export interface WpmSnapshot {
  time: number;
  wpm: number;
}

export interface TypingStats {
  correctChars: number;
  incorrectChars: number;
  totalKeystrokes: number;
  wpm: number;
  elapsedSeconds: number;
}

export interface UseTypingTestOptions {
  language: Language;
  mode: TestMode;
  timeLimit: TimeLimit;
  initialWords?: string[];
}

function wordCountForMode(mode: TestMode, timeLimit: TimeLimit): number {
  if (mode === "infinite") return 200;
  // Estimate ~80 WPM max * avg 5 chars/word, generate plenty
  const estimatedWords = Math.ceil((80 * timeLimit) / 60);
  return Math.max(estimatedWords, 50);
}

export interface TestResults {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  missedChars: number;
  totalTime: number;
  correctWords: number;
  totalWords: number;
  wpmHistory: WpmSnapshot[];
}

export interface UseTypingTestReturn {
  words: string[];
  currentWordIndex: number;
  currentCharIndex: number;
  typed: string;
  charStates: CharState[][];
  wordStates: WordState[];
  stats: TypingStats;
  mode: TestMode;
  timeLimit: TimeLimit;
  timeLeft: number;
  isActive: boolean;
  isFinished: boolean;
  wpmHistory: WpmSnapshot[];
  getResults: () => TestResults;
  handleKeyDown: (key: string) => "correct" | "incorrect" | "control";
  reset: () => void;
  stopTest: () => void;
}

export function useTypingTest({
  language,
  mode,
  timeLimit,
  initialWords: providedWords,
}: UseTypingTestOptions): UseTypingTestReturn {
  const wordCount = wordCountForMode(mode, timeLimit);

  const [initialWords] = useState<string[]>(() =>
    providedWords ?? generateWords(language, wordCount)
  );
  const [words, setWords] = useState<string[]>(initialWords);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [extraChars, setExtraChars] = useState(0);
  const [charStates, setCharStates] = useState<CharState[][]>(() =>
    initialWords.map((w) =>
      Array(w.length).fill("pending") as CharState[]
    )
  );
  const [wordStates, setWordStates] = useState<WordState[]>(() => {
    const states = Array(wordCount).fill("pending") as WordState[];
    states[0] = "active";
    return states;
  });
  const [stats, setStats] = useState<TypingStats>({
    correctChars: 0,
    incorrectChars: 0,
    totalKeystrokes: 0,
    wpm: 0,
    elapsedSeconds: 0,
  });
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(mode === "time" ? timeLimit : 0);
  const [wpmHistory, setWpmHistory] = useState<WpmSnapshot[]>([]);

  const startTimeRef = useRef<number | null>(null);
  const correctCharsRef = useRef(0);
  const incorrectCharsRef = useRef(0);
  const totalKeystrokesRef = useRef(0);
  const extraCharsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wpmSnapshotRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (wpmSnapshotRef.current) clearInterval(wpmSnapshotRef.current);
    };
  }, []);

  // WPM timer — starts when isActive becomes true
  useEffect(() => {
    if (isActive && !isFinished) {
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current!) / 1000;
        const minutes = elapsed / 60;
        const wpm = minutes > 0 ? Math.round(correctCharsRef.current / 5 / minutes) : 0;
        setStats((prev) => ({
          ...prev,
          wpm,
          elapsedSeconds: Math.floor(elapsed),
        }));
      }, 200);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isActive, isFinished]);

  // Countdown timer for time mode
  useEffect(() => {
    if (isActive && !isFinished && mode === "time") {
      countdownRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up
            setIsFinished(true);
            setIsActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            // Final WPM calc
            const elapsed = (Date.now() - startTimeRef.current!) / 1000;
            const minutes = elapsed / 60;
            const wpm = minutes > 0 ? Math.round(correctCharsRef.current / 5 / minutes) : 0;
            setStats((s) => ({ ...s, wpm, elapsedSeconds: Math.floor(elapsed) }));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [isActive, isFinished, mode]);

  // WPM snapshot every second for chart
  useEffect(() => {
    if (isActive && !isFinished) {
      wpmSnapshotRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current!) / 1000;
        const minutes = elapsed / 60;
        const wpm = minutes > 0 ? Math.round(correctCharsRef.current / 5 / minutes) : 0;
        setWpmHistory((prev) => [...prev, { time: Math.floor(elapsed), wpm }]);
      }, 1000);
      return () => {
        if (wpmSnapshotRef.current) clearInterval(wpmSnapshotRef.current);
      };
    }
  }, [isActive, isFinished]);

  const getResults = useCallback((): TestResults => {
    const elapsed = startTimeRef.current
      ? (Date.now() - startTimeRef.current) / 1000
      : 0;
    const minutes = elapsed / 60;
    const wpm = minutes > 0 ? Math.round(correctCharsRef.current / 5 / minutes) : 0;
    const rawWpm = minutes > 0 ? Math.round(totalKeystrokesRef.current / 5 / minutes) : 0;
    const accuracy =
      totalKeystrokesRef.current > 0
        ? Math.round((correctCharsRef.current / totalKeystrokesRef.current) * 1000) / 10
        : 0;

    // Count correct/total words from wordStates
    let correctWords = 0;
    let totalWords = 0;
    for (const ws of wordStates) {
      if (ws === "correct" || ws === "incorrect") {
        totalWords++;
        if (ws === "correct") correctWords++;
      }
    }

    // Count missed chars (chars in correct+incorrect words that weren't typed)
    let missedChars = 0;
    for (let i = 0; i < totalWords; i++) {
      const wordLen = words[i]?.length ?? 0;
      const typedLen = charStates[i]?.filter((c) => c !== "pending").length ?? 0;
      if (typedLen < wordLen) missedChars += wordLen - typedLen;
    }

    return {
      wpm,
      rawWpm,
      accuracy,
      correctChars: correctCharsRef.current,
      incorrectChars: incorrectCharsRef.current,
      extraChars: extraCharsRef.current,
      missedChars,
      totalTime: Math.floor(elapsed),
      correctWords,
      totalWords,
      wpmHistory,
    };
  }, [wordStates, words, charStates, wpmHistory]);

  const stopTest = useCallback(() => {
    if (!isActive) return;
    setIsFinished(true);
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (wpmSnapshotRef.current) clearInterval(wpmSnapshotRef.current);
    // Final WPM
    if (startTimeRef.current) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const minutes = elapsed / 60;
      const wpm = minutes > 0 ? Math.round(correctCharsRef.current / 5 / minutes) : 0;
      setStats((s) => ({ ...s, wpm, elapsedSeconds: Math.floor(elapsed) }));
    }
  }, [isActive]);

  const reset = useCallback(() => {
    const newWords = providedWords ?? generateWords(language, wordCount);
    setWords(newWords);
    setCurrentWordIndex(0);
    setCurrentCharIndex(0);
    setTyped("");
    setExtraChars(0);
    setCharStates(
      newWords.map((w) => Array(w.length).fill("pending") as CharState[])
    );
    const states = Array(wordCount).fill("pending") as WordState[];
    states[0] = "active";
    setWordStates(states);
    setStats({
      correctChars: 0,
      incorrectChars: 0,
      totalKeystrokes: 0,
      wpm: 0,
      elapsedSeconds: 0,
    });
    setIsFinished(false);
    setIsActive(false);
    setTimeLeft(mode === "time" ? timeLimit : 0);
    setWpmHistory([]);
    startTimeRef.current = null;
    correctCharsRef.current = 0;
    incorrectCharsRef.current = 0;
    totalKeystrokesRef.current = 0;
    extraCharsRef.current = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (wpmSnapshotRef.current) clearInterval(wpmSnapshotRef.current);
  }, [language, wordCount, mode, timeLimit]);

  const handleKeyDown = useCallback(
    (key: string): "correct" | "incorrect" | "control" => {
      if (isFinished) return "control";

      // Start timer on first keystroke
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        setIsActive(true);
      }

      totalKeystrokesRef.current++;

      if (key === "Backspace") {
        if (currentCharIndex > 0) {
          const word = words[currentWordIndex];
          if (currentCharIndex > word.length) {
            // Deleting an extra char beyond word length
            setExtraChars((e) => Math.max(0, e - 1));
          } else {
            const newCharStates = charStates.map((row) => [...row]);
            newCharStates[currentWordIndex][currentCharIndex - 1] = "pending";
            setCharStates(newCharStates);
          }
          setCurrentCharIndex(currentCharIndex - 1);
          setTyped(typed.slice(0, -1));
        }
        return "control";
      }

      if (key === " ") {
        if (typed.length === 0) return "control";

        // Mark current word
        const word = words[currentWordIndex];
        const isCorrect = typed === word;
        const newWordStates = [...wordStates];
        newWordStates[currentWordIndex] = isCorrect ? "correct" : "incorrect";

        const nextIndex = currentWordIndex + 1;

        // In time mode, generate more words dynamically when running low
        if (mode === "time" && nextIndex >= words.length - 10) {
          const moreWords = generateWords(language, 50);
          setWords((prev) => [...prev, ...moreWords]);
          setCharStates((prev) => [
            ...prev,
            ...moreWords.map((w) => Array(w.length).fill("pending") as CharState[]),
          ]);
          setWordStates((prev) => [
            ...prev,
            ...Array(moreWords.length).fill("pending") as WordState[],
          ]);
        }

        if (nextIndex >= words.length) {
          setWordStates(newWordStates);
          setIsFinished(true);
          setIsActive(false);
          if (timerRef.current) clearInterval(timerRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
          return "control";
        }

        newWordStates[nextIndex] = "active";
        setWordStates(newWordStates);
        setCurrentWordIndex(nextIndex);
        setCurrentCharIndex(0);
        setTyped("");
        setExtraChars(0);
        return "control";
      }

      // Single character typed
      if (key.length !== 1) return "control";

      const word = words[currentWordIndex];

      if (currentCharIndex >= word.length) {
        // Extra char beyond word length — count as incorrect, allow typing to continue
        incorrectCharsRef.current++;
        extraCharsRef.current++;
        setExtraChars((e) => e + 1);
        setStats((prev) => ({
          ...prev,
          incorrectChars: incorrectCharsRef.current,
          totalKeystrokes: totalKeystrokesRef.current,
        }));
        setCurrentCharIndex(currentCharIndex + 1);
        setTyped(typed + key);
        return "incorrect";
      }

      const isCorrect = key === word[currentCharIndex];
      const newCharStates = charStates.map((row) => [...row]);
      newCharStates[currentWordIndex][currentCharIndex] = isCorrect
        ? "correct"
        : "incorrect";
      setCharStates(newCharStates);

      if (isCorrect) {
        correctCharsRef.current++;
      } else {
        incorrectCharsRef.current++;
      }

      setStats((prev) => ({
        ...prev,
        correctChars: correctCharsRef.current,
        incorrectChars: incorrectCharsRef.current,
        totalKeystrokes: totalKeystrokesRef.current,
      }));

      setCurrentCharIndex(currentCharIndex + 1);
      setTyped(typed + key);

      return isCorrect ? "correct" : "incorrect";
    },
    [
      isFinished,
      currentWordIndex,
      currentCharIndex,
      typed,
      words,
      charStates,
      wordStates,
      language,
    ]
  );

  return {
    words,
    currentWordIndex,
    currentCharIndex,
    typed,
    charStates,
    wordStates,
    stats,
    mode,
    timeLimit,
    timeLeft,
    isActive,
    isFinished,
    wpmHistory,
    getResults,
    handleKeyDown,
    reset,
    stopTest,
  };
}
