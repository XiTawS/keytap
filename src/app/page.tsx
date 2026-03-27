"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  type KeyboardThemeName,
  type KeyboardInteractionEvent,
} from "@/components/ui/keyboard";
import { TypingArea } from "@/components/typing-area";
import { useTypingTest } from "@/hooks/use-typing-test";
import type { Language } from "@/lib/words";

const THEMES: KeyboardThemeName[] = [
  "classic",
  "mint",
  "royal",
  "dolch",
  "sand",
  "scarlet",
];

// Map expected characters to their KeyboardEvent.code equivalents
function charToKeyCode(char: string): string | null {
  if (char === " ") return "Space";
  if (char >= "a" && char <= "z") return `Key${char.toUpperCase()}`;
  if (char >= "A" && char <= "Z") return `Key${char}`;
  if (char >= "0" && char <= "9") return `Digit${char}`;
  const punctMap: Record<string, string> = {
    "-": "Minus",
    "=": "Equal",
    "[": "BracketLeft",
    "]": "BracketRight",
    "\\": "Backslash",
    ";": "Semicolon",
    "'": "Quote",
    ",": "Comma",
    ".": "Period",
    "/": "Slash",
    "`": "Backquote",
  };
  return punctMap[char] ?? null;
}

export default function Home() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [theme, setTheme] = useState<KeyboardThemeName>("classic");
  const [language, setLanguage] = useState<Language>("en");
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set());
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const typing = useTypingTest({ language, wordCount: 50 });

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Compute highlighted key (next expected key)
  const highlightKey = useMemo(() => {
    if (typing.isFinished) return undefined;
    const word = typing.words[typing.currentWordIndex];
    if (!word) return undefined;
    if (typing.currentCharIndex >= word.length) return "Space";
    const nextChar = word[typing.currentCharIndex];
    return charToKeyCode(nextChar) ?? undefined;
  }, [
    typing.words,
    typing.currentWordIndex,
    typing.currentCharIndex,
    typing.isFinished,
  ]);

  const handleTypingKeyDown = useCallback(
    (key: string): "correct" | "incorrect" | "control" => {
      const result = typing.handleKeyDown(key);

      if (result === "incorrect") {
        // Flash the key red briefly
        let code: string | null = null;
        if (key.length === 1) code = charToKeyCode(key);
        if (code) {
          setErrorKeys(new Set([code]));
          if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = setTimeout(() => {
            setErrorKeys(new Set());
          }, 300);
        }
      }

      return result;
    },
    [typing.handleKeyDown]
  );

  const handleKeyEvent = useCallback(
    (event: KeyboardInteractionEvent) => {
      // Physical keyboard events are handled by the hidden input in TypingArea
      // This callback is only for visual feedback from pointer/touch
      if (event.phase === "down" && event.source === "pointer") {
        // Map key code back to key character for the typing engine
        const code = event.code;
        let key: string | undefined;
        if (code === "Space") key = " ";
        else if (code === "Backspace") key = "Backspace";
        else if (code.startsWith("Key")) key = code.slice(3).toLowerCase();
        else if (code.startsWith("Digit")) key = code.slice(5);

        if (key) {
          handleTypingKeyDown(key);
        }
      }
    },
    [handleTypingKeyDown]
  );

  const handleReset = useCallback(() => {
    typing.reset();
    setErrorKeys(new Set());
  }, [typing.reset]);

  const handleLanguageToggle = useCallback(() => {
    setLanguage((prev) => (prev === "en" ? "fr" : "en"));
  }, []);

  // Reset when language changes
  useEffect(() => {
    typing.reset();
  }, [language]);

  if (isDesktop === null) return null;

  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <span className="text-6xl mb-6">⌨️</span>
        <h1 className="text-2xl font-bold mb-2">KeyTest is desktop only</h1>
        <p className="text-zinc-400">Please switch to a desktop computer.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen">
      {/* Top bar: theme selector + language toggle */}
      <div className="fixed top-4 right-4 flex gap-2 z-10">
        <button
          onClick={handleLanguageToggle}
          className="px-3 py-1.5 rounded-md text-xs font-bold uppercase bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          {language}
        </button>
        <div className="w-px bg-zinc-700" />
        {THEMES.map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
              theme === t
                ? "bg-zinc-100 text-zinc-900"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Typing area - centered */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-8">
        <h1 className="text-3xl font-bold tracking-tight mb-8">KeyTest</h1>
        <TypingArea
          words={typing.words}
          currentWordIndex={typing.currentWordIndex}
          currentCharIndex={typing.currentCharIndex}
          charStates={typing.charStates}
          wordStates={typing.wordStates}
          stats={typing.stats}
          isFinished={typing.isFinished}
          onKeyDown={handleTypingKeyDown}
          onReset={handleReset}
        />
      </div>

      {/* Keyboard */}
      <div className="pb-8">
        <Keyboard
          theme={theme}
          onKeyEvent={handleKeyEvent}
          errorKeys={errorKeys}
          highlightKey={highlightKey}
        />
      </div>
    </div>
  );
}
