"use client";

import { cn } from "@/lib/utils";
import type { TestMode, TimeLimit } from "@/hooks/use-typing-test";
import type { Language } from "@/lib/words";

interface ModeSelectorProps {
  mode: TestMode;
  timeLimit: TimeLimit;
  language: Language;
  onModeChange: (mode: TestMode) => void;
  onTimeLimitChange: (timeLimit: TimeLimit) => void;
  onLanguageChange: (language: Language) => void;
}

const TIME_OPTIONS: TimeLimit[] = [15, 30, 60, 120];

export function ModeSelector({
  mode,
  timeLimit,
  language,
  onModeChange,
  onTimeLimitChange,
  onLanguageChange,
}: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-zinc-900/80 px-1.5 py-1 text-xs font-medium">
      {/* Mode toggles */}
      <button
        onClick={() => onModeChange("time")}
        className={cn(
          "rounded-md px-3 py-1.5 transition-colors",
          mode === "time"
            ? "bg-zinc-700 text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300"
        )}
      >
        time
      </button>
      <button
        onClick={() => onModeChange("infinite")}
        className={cn(
          "rounded-md px-3 py-1.5 transition-colors",
          mode === "infinite"
            ? "bg-zinc-700 text-zinc-100"
            : "text-zinc-500 hover:text-zinc-300"
        )}
      >
        infinite
      </button>

      {/* Divider */}
      {mode === "time" && <div className="mx-1 h-4 w-px bg-zinc-700" />}

      {/* Time options (only in time mode) */}
      {mode === "time" &&
        TIME_OPTIONS.map((t) => (
          <button
            key={t}
            onClick={() => onTimeLimitChange(t)}
            className={cn(
              "rounded-md px-2.5 py-1.5 tabular-nums transition-colors",
              timeLimit === t
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {t}
          </button>
        ))}

      {/* Divider */}
      <div className="mx-1 h-4 w-px bg-zinc-700" />

      {/* Language toggle */}
      <button
        onClick={() => onLanguageChange(language === "en" ? "fr" : "en")}
        className="rounded-md px-3 py-1.5 font-bold uppercase text-zinc-400 transition-colors hover:text-zinc-200"
      >
        {language}
      </button>
    </div>
  );
}
