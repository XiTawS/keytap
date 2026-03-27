"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [isFocused, setIsFocused] = useState(false);

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

      const relativeTop = wordRect.top - containerRect.top;
      const lineHeight = wordRect.height + 8;

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

      if (e.key === "Tab") {
        tabPressedRef.current = true;
        return;
      }

      if (e.key === "Enter" && tabPressedRef.current) {
        tabPressedRef.current = false;
        onReset();
        return;
      }

      tabPressedRef.current = false;

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

  const hasStarted = currentWordIndex > 0 || currentCharIndex > 0;

  return (
    <div className="w-full max-w-3xl mx-auto" onClick={focusInput}>
      {/* Words display */}
      <div
        ref={wordsContainerRef}
        className={cn(
          "relative h-[7.5rem] overflow-hidden font-mono text-[1.35rem] leading-[2.2] cursor-text rounded-lg px-1 transition-all duration-300",
          isFocused
            ? "opacity-100"
            : "opacity-50"
        )}
        onClick={focusInput}
      >
        {/* Unfocused overlay hint */}
        {!isFocused && !hasStarted && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="text-sm text-zinc-500 font-sans bg-zinc-950/80 px-4 py-2 rounded-md backdrop-blur-sm">
              Click here or start typing
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-x-2.5 gap-y-1">
          {words.map((word, wi) => (
            <div
              key={`${wi}-${word}`}
              ref={wi === currentWordIndex ? activeWordRef : undefined}
              className={cn(
                "relative tracking-wide",
                wordStates[wi] === "incorrect" &&
                  wi < currentWordIndex &&
                  "underline decoration-red-500/40 underline-offset-[6px] decoration-2"
              )}
            >
              {word.split("").map((char, ci) => (
                <span
                  key={ci}
                  className={cn(
                    "relative transition-colors duration-75",
                    // Character colors
                    charStates[wi]?.[ci] === "correct" && "text-zinc-200",
                    charStates[wi]?.[ci] === "incorrect" &&
                      "text-red-400 bg-red-500/10 rounded-sm",
                    charStates[wi]?.[ci] === "pending" && "text-zinc-600",
                    // Blinking cursor before current char
                    wi === currentWordIndex &&
                      ci === currentCharIndex &&
                      isFocused &&
                      "before:absolute before:left-[-2px] before:top-[4px] before:h-[1.1em] before:w-[2px] before:rounded-full before:animate-cursor-blink"
                  )}
                  style={
                    wi === currentWordIndex &&
                    ci === currentCharIndex &&
                    isFocused
                      ? { "--tw-before-bg": "var(--theme-accent)" } as React.CSSProperties
                      : undefined
                  }
                >
                  {wi === currentWordIndex &&
                    ci === currentCharIndex &&
                    isFocused && (
                      <span
                        className="absolute left-[-2px] top-[4px] h-[1.1em] w-[2px] rounded-full animate-cursor-blink"
                        style={{ backgroundColor: "var(--theme-accent)" }}
                      />
                    )}
                  {char}
                </span>
              ))}
              {/* Cursor at end of word if typed past */}
              {wi === currentWordIndex &&
                currentCharIndex === word.length &&
                isFocused && (
                  <span className="relative">
                    <span
                      className="absolute left-0 top-[4px] h-[1.1em] w-[2px] rounded-full animate-cursor-blink"
                      style={{ backgroundColor: "var(--theme-accent)" }}
                    />
                  </span>
                )}
            </div>
          ))}
        </div>
      </div>

      {/* Shortcut hints */}
      <div className="flex justify-center mt-4 text-xs text-zinc-600 font-mono gap-4">
        <span>tab + enter to restart</span>
        {mode === "infinite" && <span>esc to finish</span>}
      </div>

      {/* Hidden input */}
      <input
        ref={inputRef}
        className="absolute opacity-0 pointer-events-none"
        onKeyDown={handleInputKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
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
          <p className="mt-2 text-xs text-zinc-600 font-mono">tab + enter</p>
        </div>
      )}
    </div>
  );
}
