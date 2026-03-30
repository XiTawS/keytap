"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Monitor } from "lucide-react";
import {
  Keyboard,
  type KeyboardInteractionEvent,
} from "@/components/ui/keyboard";
import { TypingArea } from "@/components/typing-area";
import { ModeSelector } from "@/components/mode-selector";
import { LiveStats } from "@/components/live-stats";
import { ResultsScreen } from "@/components/results-screen";
import { SettingsPanel } from "@/components/settings-panel";
import { useTypingTest, type TestMode, type TimeLimit } from "@/hooks/use-typing-test";
import { saveResult } from "@/lib/history";
import { useSettings } from "@/contexts/settings-context";
import type { Language } from "@/lib/words";

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
  const { settings } = useSettings();
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [language, setLanguage] = useState(settings.language);
  const [mode, setMode] = useState<TestMode>("time");
  const [timeLimit, setTimeLimit] = useState<TimeLimit>(30);
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set());
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsSavedRef = useRef(false);

  const typing = useTypingTest({ language, mode, timeLimit });

  // Save results to history when test finishes
  useEffect(() => {
    if (typing.isFinished && !resultsSavedRef.current) {
      resultsSavedRef.current = true;
      const r = typing.getResults();
      saveResult({
        wpm: r.wpm,
        rawWpm: r.rawWpm,
        accuracy: r.accuracy,
        correctChars: r.correctChars,
        incorrectChars: r.incorrectChars,
        extraChars: r.extraChars,
        missedChars: r.missedChars,
        totalTime: r.totalTime,
        mode,
        timeLimit,
        language,
        date: new Date().toISOString(),
        correctWords: r.correctWords,
        totalWords: r.totalWords,
      });
    }
  }, [typing.isFinished]);

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
      if (event.phase === "down" && event.source === "pointer") {
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
    resultsSavedRef.current = false;
    typing.retry();
    setErrorKeys(new Set());
  }, [typing.retry]);

  const handleNextTest = useCallback(() => {
    resultsSavedRef.current = false;
    typing.reset();
    setErrorKeys(new Set());
  }, [typing.reset]);

  const handleModeChange = useCallback(
    (newMode: TestMode) => {
      setMode(newMode);
    },
    []
  );

  const handleTimeLimitChange = useCallback(
    (newLimit: TimeLimit) => {
      setTimeLimit(newLimit);
    },
    []
  );

  const handleLanguageChange = useCallback(
    (newLang: Language) => {
      setLanguage(newLang);
    },
    []
  );

  // Sync language from settings when changed in panel
  useEffect(() => {
    setLanguage(settings.language);
  }, [settings.language]);

  // Reset when mode, timeLimit, or language changes
  useEffect(() => {
    typing.reset();
  }, [mode, timeLimit, language]);

  if (isDesktop === null) return null;

  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center animate-page-in">
        <div className="mb-8">
          <Monitor size={64} className="text-zinc-400 dark:text-zinc-500" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-3 text-zinc-900 dark:text-zinc-100">
          KeyTap is desktop only
        </h1>
        <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
          This typing test requires a physical keyboard. Please visit on a desktop computer.
        </p>
        <div className="mt-8 h-px w-16 bg-zinc-200 dark:bg-zinc-800" />
        <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-600 font-mono">
          keytap.dev
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-screen overflow-hidden animate-page-in">
      {/* Logo + name top left */}
      <div className="w-full px-6 pt-4 pb-0 shrink-0">
        <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--theme-accent)]">
            <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
            <rect x="5" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
            <rect x="9" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
            <rect x="13" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
            <rect x="17" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
            <rect x="7" y="13" width="2" height="2" rx="0.5" fill="currentColor"/>
            <rect x="11" y="13" width="2" height="2" rx="0.5" fill="currentColor"/>
            <rect x="15" y="13" width="2" height="2" rx="0.5" fill="currentColor"/>
            <rect x="8" y="17" width="8" height="1.5" rx="0.75" fill="currentColor"/>
          </svg>
          <span className="text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-200">KeyTap</span>
        </div>
      </div>

      {/* Main content — flex-1 to fill remaining space */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-8 min-h-0">
        {/* Mode selector — compact, Monkeytype style (hidden on results) */}
        {!typing.isFinished && (
          <div className="mb-2 shrink-0">
            <ModeSelector
              mode={mode}
              timeLimit={timeLimit}
              language={language}
              onModeChange={handleModeChange}
              onTimeLimitChange={handleTimeLimitChange}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        )}

        {typing.isFinished ? (
          <ResultsScreen
            results={typing.getResults()}
            onRestart={handleReset}
            onNextTest={handleNextTest}
          />
        ) : (
          <>
            {/* Live stats */}
            <div className="mb-2 h-8 flex items-center shrink-0">
              <LiveStats
                wpm={typing.stats.wpm}
                timeLeft={typing.timeLeft}
                elapsedSeconds={typing.stats.elapsedSeconds}
                mode={mode}
                isActive={typing.isActive}
              />
            </div>

            {/* Typing area */}
            <TypingArea
              words={typing.words}
              currentWordIndex={typing.currentWordIndex}
              currentCharIndex={typing.currentCharIndex}
              charStates={typing.charStates}
              wordStates={typing.wordStates}
              isFinished={typing.isFinished}
              mode={mode}
              onKeyDown={handleTypingKeyDown}
              onReset={handleReset}
              onStop={typing.stopTest}
            />
          </>
        )}
      </div>

      {/* Keyboard — centered at bottom, pointer-events-none to never steal focus */}
      <div className="pb-6 pt-7 pointer-events-none shrink-0 keyboard-wrapper">
        <Keyboard
          theme={settings.theme}
          enableSound={settings.soundEnabled}
          enableHaptics={settings.haptics}
          volume={settings.volume}
          onKeyEvent={handleKeyEvent}
          errorKeys={errorKeys}
          highlightKey={highlightKey}
        />
      </div>

      {/* Settings bar — minimal bottom bar */}
      <SettingsPanel />
    </div>
  );
}
