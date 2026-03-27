"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generateWords, type Language } from "@/lib/words";

export type CharState = "pending" | "correct" | "incorrect";
export type WordState = "pending" | "active" | "correct" | "incorrect";

export interface TypingStats {
  correctChars: number;
  incorrectChars: number;
  totalKeystrokes: number;
  wpm: number;
  elapsedSeconds: number;
}

export interface UseTypingTestOptions {
  language: Language;
  wordCount: number;
}

export interface UseTypingTestReturn {
  words: string[];
  currentWordIndex: number;
  currentCharIndex: number;
  typed: string;
  charStates: CharState[][];
  wordStates: WordState[];
  stats: TypingStats;
  isFinished: boolean;
  handleKeyDown: (key: string) => "correct" | "incorrect" | "control";
  reset: () => void;
}

export function useTypingTest({
  language,
  wordCount,
}: UseTypingTestOptions): UseTypingTestReturn {
  const [words, setWords] = useState<string[]>(() =>
    generateWords(language, wordCount)
  );
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [charStates, setCharStates] = useState<CharState[][]>(() =>
    generateWords(language, wordCount).map((w) =>
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
  const [isFinished, setIsFinished] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const correctCharsRef = useRef(0);
  const incorrectCharsRef = useRef(0);
  const totalKeystrokesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // WPM timer
  useEffect(() => {
    if (startTimeRef.current !== null && !isFinished) {
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
  }, [isFinished, startTimeRef.current !== null]);

  const reset = useCallback(() => {
    const newWords = generateWords(language, wordCount);
    setWords(newWords);
    setCurrentWordIndex(0);
    setCurrentCharIndex(0);
    setTyped("");
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
    startTimeRef.current = null;
    correctCharsRef.current = 0;
    incorrectCharsRef.current = 0;
    totalKeystrokesRef.current = 0;
    if (timerRef.current) clearInterval(timerRef.current);
  }, [language, wordCount]);

  const handleKeyDown = useCallback(
    (key: string): "correct" | "incorrect" | "control" => {
      if (isFinished) return "control";

      // Start timer on first keystroke
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        // Trigger timer effect
        setStats((prev) => ({ ...prev }));
      }

      totalKeystrokesRef.current++;

      if (key === "Backspace") {
        if (currentCharIndex > 0) {
          const newCharStates = charStates.map((row) => [...row]);
          newCharStates[currentWordIndex][currentCharIndex - 1] = "pending";
          setCharStates(newCharStates);
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
        if (nextIndex >= words.length) {
          setWordStates(newWordStates);
          setIsFinished(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return "control";
        }

        newWordStates[nextIndex] = "active";
        setWordStates(newWordStates);
        setCurrentWordIndex(nextIndex);
        setCurrentCharIndex(0);
        setTyped("");
        return "control";
      }

      // Single character typed
      if (key.length !== 1) return "control";

      const word = words[currentWordIndex];
      if (currentCharIndex >= word.length) return "incorrect";

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
    isFinished,
    handleKeyDown,
    reset,
  };
}
