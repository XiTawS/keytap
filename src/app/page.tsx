"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    typing.reset();
    setErrorKeys(new Set());
  }, [typing.reset]);

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
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <span className="text-6xl mb-6">⌨️</span>
        <h1 className="text-2xl font-bold mb-2">KeyTest is desktop only</h1>
        <p className="text-zinc-400">Please switch to a desktop computer.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen">
      {/* Top bar: gear icon */}
      <div className="fixed top-4 right-4 z-10">
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
          aria-label="Open settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>

      {/* Settings panel */}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Typing area - centered */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-8">
        <h1 className="text-3xl font-bold tracking-tight mb-6">KeyTest</h1>

        {/* Mode selector */}
        <div className="mb-6">
          <ModeSelector
            mode={mode}
            timeLimit={timeLimit}
            language={language}
            onModeChange={handleModeChange}
            onTimeLimitChange={handleTimeLimitChange}
            onLanguageChange={handleLanguageChange}
          />
        </div>

        {typing.isFinished ? (
          <ResultsScreen
            results={typing.getResults()}
            onRestart={handleReset}
            onNextTest={handleNextTest}
          />
        ) : (
          <>
            {/* Live stats */}
            <div className="mb-4 h-10 flex items-center">
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

      {/* Keyboard */}
      <div className="pb-8">
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
    </div>
  );
}
