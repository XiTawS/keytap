"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { CharState, WordState, TestMode } from "@/hooks/use-typing-test";

interface TypingAreaProps {
  words: string[];
  currentWordIndex: number;
  currentCharIndex: number;
  charStates: CharState[][];
  wordStates: WordState[];
  isFinished: boolean;
  mode: TestMode;
  onKeyDown: (key: string) => "correct" | "incorrect" | "control";
  onReset: () => void;
  onStop: () => void;
}

export function TypingArea({
  words,
  currentWordIndex,
  currentCharIndex,
  charStates,
  wordStates,
  isFinished,
  mode,
  onKeyDown,
  onReset,
  onStop,
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

  const tabPressedRef = useRef(false);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.preventDefault();

      if (e.repeat) return;

      // Tab+Enter restart (like Monkeytype)
      if (e.key === "Tab") {
        tabPressedRef.current = true;
        return;
      }

      if (e.key === "Enter" && tabPressedRef.current) {
        tabPressedRef.current = false;
        onReset();
        return;
      }

      // Reset tab flag on any other key
      tabPressedRef.current = false;

      // Esc stops test in infinite mode
      if (e.key === "Escape") {
        if (mode === "infinite") {
          onStop();
        }
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
    [onKeyDown, onReset, onStop, mode]
  );

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto" onClick={focusInput}>
      {/* Shortcut hint */}
      <div className="flex justify-end mb-3 text-xs text-zinc-600 font-mono">
        <span>tab + enter to restart</span>
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
          <button
            onClick={onReset}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md text-sm text-zinc-300 transition-colors"
          >
            Try again
          </button>
          <p className="mt-2 text-xs text-zinc-600">tab + enter</p>
        </div>
      )}
    </div>
  );
}
