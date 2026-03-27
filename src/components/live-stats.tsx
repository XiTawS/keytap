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
      <span className="text-zinc-400">
        <span className="text-2xl font-bold text-zinc-100">{wpm}</span> wpm
      </span>
      <span className="text-xl tabular-nums text-zinc-500">
        {mode === "time" ? `${timeLeft}s` : `${elapsedSeconds}s`}
      </span>
    </div>
  );
}
