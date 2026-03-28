"use client";

import Link from "next/link";
import { Swords, Crown } from "lucide-react";
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
    <div className="flex items-center justify-center gap-0">
      {/* Solo options: mode, time, language */}
      <div className="flex items-center text-xs font-medium">
        {/* Mode toggles */}
        <Option active={mode === "time"} onClick={() => onModeChange("time")}>
          time
        </Option>
        <Option
          active={mode === "infinite"}
          onClick={() => onModeChange("infinite")}
        >
          infinite
        </Option>

        {/* Divider + Time options (only in time mode) */}
        {mode === "time" && (
          <>
            <Divider />
            {TIME_OPTIONS.map((t) => (
              <Option
                key={t}
                active={timeLimit === t}
                onClick={() => onTimeLimitChange(t)}
              >
                {t}
              </Option>
            ))}
          </>
        )}

        {/* Divider + Language */}
        <Divider />
        <Option
          active={false}
          onClick={() => onLanguageChange(language === "en" ? "fr" : "en")}
        >
          <span className="uppercase font-semibold">{language}</span>
        </Option>
      </div>

      {/* Multiplayer icons — subtle, far right */}
      <div className="flex items-center gap-1 ml-4">
        <Link
          href="/duel"
          title="1v1 Duel"
          className="text-zinc-400 dark:text-zinc-500 hover:text-[var(--theme-accent)] transition-colors duration-150 p-1"
        >
          <Swords size={15} />
        </Link>
        <Link
          href="/battle"
          title="Battle Royale"
          className="text-zinc-400 dark:text-zinc-500 hover:text-[var(--theme-accent)] transition-colors duration-150 p-1"
        >
          <Crown size={15} />
        </Link>
      </div>
    </div>
  );
}

function Option({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 tabular-nums transition-colors duration-150",
        active
          ? "text-[var(--theme-accent)]"
          : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="mx-1.5 h-3 w-px bg-zinc-300/40 dark:bg-zinc-700/40" />
  );
}
