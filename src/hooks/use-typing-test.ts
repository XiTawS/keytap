"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
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
  if (mode === "infinite") return 300;
  // Estimate ~150 WPM for fast typists, generate plenty
  const estimatedWords = Math.ceil((150 * timeLimit) / 60);
  return Math.max(estimatedWords, 200);
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

// ── Reducer for hot-path typing state ──
// All keystroke-related state lives here so one dispatch = one re-render.

interface TypingState {
  words: string[];
  currentWordIndex: number;
  currentCharIndex: number;
  typed: string;
  extraChars: number;
  charStates: CharState[][];
  wordStates: WordState[];
  stats: TypingStats;
  isActive: boolean;
  isFinished: boolean;
}

type TypingAction =
  | { type: "CHAR_TYPED"; charStates: CharState[][]; charIndex: number; typed: string; stats: TypingStats }
  | { type: "EXTRA_CHAR"; charIndex: number; typed: string; extraChars: number; stats: TypingStats }
  | { type: "BACKSPACE"; charStates: CharState[][]; charIndex: number; typed: string; extraChars: number }
  | { type: "SPACE"; wordStates: WordState[]; nextWordIndex: number }
  | { type: "SPACE_WITH_MORE_WORDS"; wordStates: WordState[]; nextWordIndex: number; words: string[]; charStates: CharState[][] }
  | { type: "FINISH"; wordStates?: WordState[] }
  | { type: "START" }
  | { type: "TIMER_UPDATE"; stats: Partial<TypingStats> }
  | { type: "TIME_UP"; stats: Partial<TypingStats> }
  | { type: "STOP"; stats: Partial<TypingStats> }
  | { type: "RESET"; words: string[]; wordCount: number };

function typingReducer(state: TypingState, action: TypingAction): TypingState {
  switch (action.type) {
    case "CHAR_TYPED":
      return {
        ...state,
        charStates: action.charStates,
        currentCharIndex: action.charIndex,
        typed: action.typed,
        stats: action.stats,
      };
    case "EXTRA_CHAR":
      return {
        ...state,
        currentCharIndex: action.charIndex,
        typed: action.typed,
        extraChars: action.extraChars,
        stats: action.stats,
      };
    case "BACKSPACE":
      return {
        ...state,
        charStates: action.charStates,
        currentCharIndex: action.charIndex,
        typed: action.typed,
        extraChars: action.extraChars,
      };
    case "SPACE":
      return {
        ...state,
        wordStates: action.wordStates,
        currentWordIndex: action.nextWordIndex,
        currentCharIndex: 0,
        typed: "",
        extraChars: 0,
      };
    case "SPACE_WITH_MORE_WORDS":
      return {
        ...state,
        words: action.words,
        charStates: action.charStates,
        wordStates: action.wordStates,
        currentWordIndex: action.nextWordIndex,
        currentCharIndex: 0,
        typed: "",
        extraChars: 0,
      };
    case "FINISH":
      return {
        ...state,
        isFinished: true,
        isActive: false,
        ...(action.wordStates ? { wordStates: action.wordStates } : {}),
      };
    case "START":
      return { ...state, isActive: true };
    case "TIMER_UPDATE":
      return { ...state, stats: { ...state.stats, ...action.stats } };
    case "TIME_UP":
      return {
        ...state,
        isFinished: true,
        isActive: false,
        stats: { ...state.stats, ...action.stats },
      };
    case "STOP":
      return {
        ...state,
        isFinished: true,
        isActive: false,
        stats: { ...state.stats, ...action.stats },
      };
    case "RESET": {
      const states = Array(action.wordCount).fill("pending") as WordState[];
      states[0] = "active";
      return {
        words: action.words,
        currentWordIndex: 0,
        currentCharIndex: 0,
        typed: "",
        extraChars: 0,
        charStates: action.words.map((w) => Array(w.length).fill("pending") as CharState[]),
        wordStates: states,
        stats: { correctChars: 0, incorrectChars: 0, totalKeystrokes: 0, wpm: 0, elapsedSeconds: 0 },
        isActive: false,
        isFinished: false,
      };
    }
    default:
      return state;
  }
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

  const [state, dispatch] = useReducer(typingReducer, initialWords, (words) => {
    const states = Array(wordCount).fill("pending") as WordState[];
    states[0] = "active";
    return {
      words,
      currentWordIndex: 0,
      currentCharIndex: 0,
      typed: "",
      extraChars: 0,
      charStates: words.map((w) => Array(w.length).fill("pending") as CharState[]),
      wordStates: states,
      stats: { correctChars: 0, incorrectChars: 0, totalKeystrokes: 0, wpm: 0, elapsedSeconds: 0 },
      isActive: false,
      isFinished: false,
    };
  });

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
    if (state.isActive && !state.isFinished) {
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current!) / 1000;
        const minutes = elapsed / 60;
        const wpm = minutes > 0 ? Math.round(correctCharsRef.current / 5 / minutes) : 0;
        dispatch({ type: "TIMER_UPDATE", stats: { wpm, elapsedSeconds: Math.floor(elapsed) } });
      }, 200);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [state.isActive, state.isFinished]);

  // Countdown timer for time mode
  useEffect(() => {
    if (state.isActive && !state.isFinished && mode === "time") {
      countdownRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            const elapsed = (Date.now() - startTimeRef.current!) / 1000;
            const minutes = elapsed / 60;
            const wpm = minutes > 0 ? Math.round(correctCharsRef.current / 5 / minutes) : 0;
            dispatch({ type: "TIME_UP", stats: { wpm, elapsedSeconds: Math.floor(elapsed) } });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [state.isActive, state.isFinished, mode]);

  // WPM snapshot every second for chart
  useEffect(() => {
    if (state.isActive && !state.isFinished) {
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
  }, [state.isActive, state.isFinished]);

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

    let correctWords = 0;
    let totalWords = 0;
    for (const ws of state.wordStates) {
      if (ws === "correct" || ws === "incorrect") {
        totalWords++;
        if (ws === "correct") correctWords++;
      }
    }

    let missedChars = 0;
    for (let i = 0; i < totalWords; i++) {
      const wordLen = state.words[i]?.length ?? 0;
      const typedLen = state.charStates[i]?.filter((c) => c !== "pending").length ?? 0;
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
  }, [state.wordStates, state.words, state.charStates, wpmHistory]);

  const stopTest = useCallback(() => {
    if (!state.isActive) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (wpmSnapshotRef.current) clearInterval(wpmSnapshotRef.current);
    if (startTimeRef.current) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const minutes = elapsed / 60;
      const wpm = minutes > 0 ? Math.round(correctCharsRef.current / 5 / minutes) : 0;
      dispatch({ type: "STOP", stats: { wpm, elapsedSeconds: Math.floor(elapsed) } });
    } else {
      dispatch({ type: "STOP", stats: {} });
    }
  }, [state.isActive]);

  const reset = useCallback(() => {
    const newWords = providedWords ?? generateWords(language, wordCount);
    dispatch({ type: "RESET", words: newWords, wordCount });
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
      if (state.isFinished) return "control";

      // Start timer on first keystroke
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        dispatch({ type: "START" });
      }

      totalKeystrokesRef.current++;

      if (key === "Backspace") {
        if (state.currentCharIndex > 0) {
          const word = state.words[state.currentWordIndex];
          if (state.currentCharIndex > word.length) {
            // Deleting an extra char beyond word length
            extraCharsRef.current = Math.max(0, extraCharsRef.current - 1);
            dispatch({
              type: "BACKSPACE",
              charStates: state.charStates,
              charIndex: state.currentCharIndex - 1,
              typed: state.typed.slice(0, -1),
              extraChars: extraCharsRef.current,
            });
          } else {
            const newCharStates = state.charStates.map((row) => [...row]);
            newCharStates[state.currentWordIndex][state.currentCharIndex - 1] = "pending";
            dispatch({
              type: "BACKSPACE",
              charStates: newCharStates,
              charIndex: state.currentCharIndex - 1,
              typed: state.typed.slice(0, -1),
              extraChars: state.extraChars,
            });
          }
        }
        return "control";
      }

      if (key === " ") {
        if (state.typed.length === 0) return "control";

        const word = state.words[state.currentWordIndex];
        const isCorrect = state.typed === word;
        const newWordStates = [...state.wordStates];
        newWordStates[state.currentWordIndex] = isCorrect ? "correct" : "incorrect";

        const nextIndex = state.currentWordIndex + 1;

        // Generate more words dynamically when running low (any mode)
        if (nextIndex >= state.words.length - 20) {
          const moreWords = generateWords(language, 50);
          const newWords = [...state.words, ...moreWords];
          const newCharStates = [
            ...state.charStates,
            ...moreWords.map((w) => Array(w.length).fill("pending") as CharState[]),
          ];
          const expandedWordStates = [
            ...newWordStates,
            ...Array(moreWords.length).fill("pending") as WordState[],
          ];
          expandedWordStates[nextIndex] = "active";
          dispatch({
            type: "SPACE_WITH_MORE_WORDS",
            words: newWords,
            charStates: newCharStates,
            wordStates: expandedWordStates,
            nextWordIndex: nextIndex,
          });
          return "control";
        }

        if (nextIndex >= state.words.length) {
          dispatch({ type: "FINISH", wordStates: newWordStates });
          if (timerRef.current) clearInterval(timerRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
          return "control";
        }

        newWordStates[nextIndex] = "active";
        dispatch({ type: "SPACE", wordStates: newWordStates, nextWordIndex: nextIndex });
        return "control";
      }

      // Single character typed
      if (key.length !== 1) return "control";

      const word = state.words[state.currentWordIndex];

      if (state.currentCharIndex >= word.length) {
        // Extra char beyond word length
        incorrectCharsRef.current++;
        extraCharsRef.current++;
        dispatch({
          type: "EXTRA_CHAR",
          charIndex: state.currentCharIndex + 1,
          typed: state.typed + key,
          extraChars: extraCharsRef.current,
          stats: {
            ...state.stats,
            incorrectChars: incorrectCharsRef.current,
            totalKeystrokes: totalKeystrokesRef.current,
          },
        });
        return "incorrect";
      }

      const isCorrect = key === word[state.currentCharIndex];
      const newCharStates = state.charStates.map((row) => [...row]);
      newCharStates[state.currentWordIndex][state.currentCharIndex] = isCorrect
        ? "correct"
        : "incorrect";

      if (isCorrect) {
        correctCharsRef.current++;
      } else {
        incorrectCharsRef.current++;
      }

      dispatch({
        type: "CHAR_TYPED",
        charStates: newCharStates,
        charIndex: state.currentCharIndex + 1,
        typed: state.typed + key,
        stats: {
          ...state.stats,
          correctChars: correctCharsRef.current,
          incorrectChars: incorrectCharsRef.current,
          totalKeystrokes: totalKeystrokesRef.current,
        },
      });

      return isCorrect ? "correct" : "incorrect";
    },
    [state, language, mode]
  );

  return {
    words: state.words,
    currentWordIndex: state.currentWordIndex,
    currentCharIndex: state.currentCharIndex,
    typed: state.typed,
    charStates: state.charStates,
    wordStates: state.wordStates,
    stats: state.stats,
    mode,
    timeLimit,
    timeLeft,
    isActive: state.isActive,
    isFinished: state.isFinished,
    wpmHistory,
    getResults,
    handleKeyDown,
    reset,
    stopTest,
  };
}
