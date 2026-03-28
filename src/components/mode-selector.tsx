"use client";

import Link from "next/link";
import { Swords } from "lucide-react";
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
    <div className="flex items-center gap-0.5 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 px-2 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors duration-200">
      {/* Mode toggles */}
      <PillButton
        active={mode === "time"}
        onClick={() => onModeChange("time")}
      >
        time
      </PillButton>
      <PillButton
        active={mode === "infinite"}
        onClick={() => onModeChange("infinite")}
      >
        infinite
      </PillButton>

      {/* Divider */}
      {mode === "time" && <Divider />}

      {/* Time options (only in time mode) */}
      {mode === "time" &&
        TIME_OPTIONS.map((t) => (
          <PillButton
            key={t}
            active={timeLimit === t}
            onClick={() => onTimeLimitChange(t)}
          >
            {t}
          </PillButton>
        ))}

      {/* Divider */}
      <Divider />

      {/* Language toggle */}
      <PillButton
        active={false}
        onClick={() => onLanguageChange(language === "en" ? "fr" : "en")}
        className="uppercase font-semibold"
      >
        {language}
      </PillButton>

      {/* Divider */}
      <Divider />

      {/* Duel mode link */}
      <Link
        href="/duel"
        className={cn(
          "rounded-lg px-3 py-1 transition-all duration-150 flex items-center gap-1.5",
          "text-zinc-400 dark:text-zinc-500 hover:text-[var(--theme-accent)]"
        )}
      >
        <Swords size={13} />
        duel
      </Link>
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1 tabular-nums transition-all duration-150",
        active
          ? "text-[var(--theme-accent)]"
          : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300",
        className
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-3.5 w-px bg-zinc-300/50 dark:bg-zinc-700/50" />;
}
