"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface OpponentTypingAreaProps {
  words: string[];
  wordIndex: number;
  charIndex: number;
  wpm: number;
  finished: boolean;
}

export function OpponentTypingArea({
  words,
  wordIndex,
  charIndex,
  wpm,
  finished,
}: OpponentTypingAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLDivElement>(null);
  const prevLineTopRef = useRef<number | null>(null);

  // Auto-scroll to keep opponent cursor visible
  useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
      const wordOffsetTop = activeWordRef.current.offsetTop;
      if (
        prevLineTopRef.current !== null &&
        wordOffsetTop !== prevLineTopRef.current &&
        wordOffsetTop > 0
      ) {
        containerRef.current.scrollTo({
          top: wordOffsetTop,
          behavior: "smooth",
        });
      }
      prevLineTopRef.current = wordOffsetTop;
    }
  }, [wordIndex]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-zinc-500">Opponent</span>
        <span className="text-xs font-mono text-zinc-500">
          {wpm} WPM {finished && "— finished"}
        </span>
      </div>
      <div
        ref={containerRef}
        className="relative h-[7.5rem] overflow-hidden font-mono text-[1.35rem] leading-[2.2] rounded-lg px-1 opacity-70"
      >
        <div className="flex flex-wrap gap-x-2.5 gap-y-1">
          {words.map((word, wi) => (
            <div
              key={`${wi}-${word}`}
              ref={wi === wordIndex ? activeWordRef : undefined}
              className="relative tracking-wide"
            >
              {word.split("").map((char, ci) => {
                // Determine if this char has been "typed" by opponent
                const isTyped =
                  wi < wordIndex || (wi === wordIndex && ci < charIndex);
                const isCursor = wi === wordIndex && ci === charIndex;

                return (
                  <span
                    key={ci}
                    className={cn(
                      "relative transition-colors duration-75",
                      isTyped
                        ? "text-zinc-500 dark:text-zinc-400"
                        : "text-zinc-400 dark:text-zinc-600"
                    )}
                  >
                    {isCursor && (
                      <span className="absolute left-[-2px] top-[4px] h-[1.1em] w-[2px] rounded-full bg-orange-500 animate-cursor-blink" />
                    )}
                    {char}
                  </span>
                );
              })}
              {/* Cursor at end of word */}
              {wi === wordIndex && charIndex === word.length && (
                <span className="relative">
                  <span className="absolute left-0 top-[4px] h-[1.1em] w-[2px] rounded-full bg-orange-500 animate-cursor-blink" />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
