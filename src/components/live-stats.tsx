"use client";

import type { TestMode } from "@/hooks/use-typing-test";

interface LiveStatsProps {
  wpm: number;
  timeLeft: number;
  elapsedSeconds: number;
  mode: TestMode;
  isActive: boolean;
}

export function LiveStats({
  wpm,
  timeLeft,
  elapsedSeconds,
  mode,
  isActive,
}: LiveStatsProps) {
  if (!isActive) return null;

  return (
    <div className="flex items-center gap-6 font-mono text-sm animate-in fade-in duration-300">
      <span className="text-zinc-500">
        <span
          className="text-3xl font-bold transition-all duration-200"
          style={{ color: "var(--theme-accent)" }}
        >
          {wpm}
        </span>
      </span>
      <span className="text-lg tabular-nums text-zinc-600">
        {mode === "time" ? `${timeLeft}s` : `${elapsedSeconds}s`}
      </span>
    </div>
  );
}
