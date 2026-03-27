"use client";

import { useEffect, useState } from "react";
import { Keyboard, type KeyboardThemeName, type KeyboardInteractionEvent } from "@/components/ui/keyboard";

const THEMES: KeyboardThemeName[] = ["classic", "mint", "royal", "dolch", "sand", "scarlet"];

export default function Home() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [theme, setTheme] = useState<KeyboardThemeName>("classic");
  const [lastKey, setLastKey] = useState<string>("");

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleKeyEvent = (event: KeyboardInteractionEvent) => {
    if (event.phase === "down") {
      setLastKey(event.code);
    }
  };

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
      {/* Theme selector */}
      <div className="fixed top-4 right-4 flex gap-2 z-10">
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

      {/* Typing area placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">KeyTest</h1>
        <p className="text-zinc-500">Typing area coming soon</p>
        {lastKey && (
          <p className="text-sm text-zinc-600">
            Last key: <span className="text-zinc-300 font-mono">{lastKey}</span>
          </p>
        )}
      </div>

      {/* Keyboard */}
      <div className="pb-8">
        <Keyboard theme={theme} onKeyEvent={handleKeyEvent} />
      </div>
    </div>
  );
}
