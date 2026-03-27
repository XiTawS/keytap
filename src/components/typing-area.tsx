"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { CharState, WordState, TypingStats } from "@/hooks/use-typing-test";

interface TypingAreaProps {
  words: string[];
  currentWordIndex: number;
  currentCharIndex: number;
  charStates: CharState[][];
  wordStates: WordState[];
  stats: TypingStats;
  isFinished: boolean;
  onKeyDown: (key: string) => "correct" | "incorrect" | "control";
  onReset: () => void;
}

export function TypingArea({
  words,
  currentWordIndex,
  currentCharIndex,
  charStates,
  wordStates,
  stats,
  isFinished,
  onKeyDown,
  onReset,
}: TypingAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLDivElement>(null);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll to keep active word visible
  useEffect(() => {
    if (activeWordRef.current && wordsContainerRef.current) {
      const container = wordsContainerRef.current;
      const activeWord = activeWordRef.current;
      const containerRect = container.getBoundingClientRect();
      const wordRect = activeWord.getBoundingClientRect();

      // If the active word is below the visible area or nearing end of visible lines
      const relativeTop = wordRect.top - containerRect.top;
      const lineHeight = wordRect.height + 8; // approximate line height with gap

      if (relativeTop > lineHeight * 1.5) {
        container.scrollTo({
          top: container.scrollTop + relativeTop - lineHeight * 0.5,
          behavior: "smooth",
        });
      }
    }
  }, [currentWordIndex]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.preventDefault();

      if (e.repeat) return;

      if (e.key === "Tab") {
        onReset();
        return;
      }

      let key: string;
      if (e.key === "Backspace" || e.key === " ") {
        key = e.key;
      } else if (e.key.length === 1) {
        key = e.key;
      } else {
        return;
      }

      onKeyDown(key);
    },
    [onKeyDown, onReset]
  );

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto" onClick={focusInput}>
      {/* Stats bar */}
      <div className="flex items-center justify-between mb-6 text-sm font-mono">
        <div className="flex gap-6">
          <span className="text-zinc-400">
            <span className="text-2xl font-bold text-zinc-100">{stats.wpm}</span>{" "}
            wpm
          </span>
          {stats.elapsedSeconds > 0 && (
            <span className="text-zinc-500">
              {stats.elapsedSeconds}s
            </span>
          )}
        </div>
        <div className="flex gap-4 text-zinc-500">
          <span>
            <span className="text-green-400">{stats.correctChars}</span>
            {" / "}
            <span className="text-red-400">{stats.incorrectChars}</span>
          </span>
          <span className="text-zinc-600">tab to reset</span>
        </div>
      </div>

      {/* Words display */}
      <div
        ref={wordsContainerRef}
        className="relative h-[7.5rem] overflow-hidden font-mono text-2xl leading-relaxed cursor-text"
        onClick={focusInput}
      >
        <div className="flex flex-wrap gap-x-2.5 gap-y-2">
          {words.map((word, wi) => (
            <div
              key={`${wi}-${word}`}
              ref={wi === currentWordIndex ? activeWordRef : undefined}
              className={cn(
                "relative",
                wordStates[wi] === "incorrect" &&
                  wi < currentWordIndex &&
                  "underline decoration-red-500/50 underline-offset-4"
              )}
            >
              {word.split("").map((char, ci) => (
                <span
                  key={ci}
                  className={cn(
                    "relative",
                    // Character colors
                    charStates[wi]?.[ci] === "correct" && "text-zinc-100",
                    charStates[wi]?.[ci] === "incorrect" && "text-red-500",
                    charStates[wi]?.[ci] === "pending" && "text-zinc-600",
                    // Blinking cursor before current char
                    wi === currentWordIndex &&
                      ci === currentCharIndex &&
                      "before:absolute before:left-[-1px] before:top-[2px] before:h-[1.2em] before:w-[2px] before:bg-zinc-300 before:animate-pulse"
                  )}
                >
                  {char}
                </span>
              ))}
              {/* Cursor at end of word if typed past */}
              {wi === currentWordIndex &&
                currentCharIndex === word.length && (
                  <span className="relative">
                    <span className="absolute left-0 top-[2px] h-[1.2em] w-[2px] bg-zinc-300 animate-pulse" />
                  </span>
                )}
            </div>
          ))}
        </div>
      </div>

      {/* Hidden input */}
      <input
        ref={inputRef}
        className="absolute opacity-0 pointer-events-none"
        onKeyDown={handleInputKeyDown}
        autoFocus
        tabIndex={0}
        aria-label="Type here"
      />

      {/* Finished overlay */}
      {isFinished && (
        <div className="mt-8 text-center">
          <p className="text-3xl font-bold text-zinc-100">{stats.wpm} WPM</p>
          <p className="text-zinc-400 mt-2">
            {stats.correctChars} correct / {stats.incorrectChars} incorrect
          </p>
          <button
            onClick={onReset}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md text-sm text-zinc-300 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
