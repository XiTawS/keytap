"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PlayerResult {
  wpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
}

interface DuelResultsProps {
  player1: PlayerResult;
  player2: PlayerResult;
  isPlayer1: boolean;
  onRematch: () => void;
  onNewDuel: () => void;
}

export function DuelResults({
  player1,
  player2,
  isPlayer1,
  onRematch,
  onNewDuel,
}: DuelResultsProps) {
  const you = isPlayer1 ? player1 : player2;
  const opponent = isPlayer1 ? player2 : player1;
  const youWon = you.wpm > opponent.wpm;
  const tie = you.wpm === opponent.wpm;

  return (
    <div className="w-full max-w-2xl mx-auto animate-results-in">
      {/* Winner banner */}
      <div className="text-center mb-8">
        <div
          className="text-4xl font-bold mb-1"
          style={youWon ? { color: "var(--theme-accent)" } : undefined}
        >
          {tie ? "It's a Tie!" : youWon ? "You Win!" : "You Lose"}
        </div>
        {!tie && (
          <p className="text-sm text-zinc-500 font-mono">
            {youWon ? "+" : ""}
            {you.wpm - opponent.wpm} WPM difference
          </p>
        )}
      </div>

      {/* Side by side comparison */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* You */}
        <div
          className={cn(
            "rounded-xl border p-6 text-center",
            youWon
              ? "border-[var(--theme-accent)]/40 bg-[var(--theme-accent)]/5"
              : "border-zinc-200 dark:border-zinc-800"
          )}
        >
          <div className="text-xs font-mono text-zinc-500 mb-3 uppercase tracking-wider">
            You {youWon && "👑"}
          </div>
          <div
            className="text-5xl font-bold tabular-nums mb-1"
            style={youWon ? { color: "var(--theme-accent)" } : undefined}
          >
            {you.wpm}
          </div>
          <div className="text-xs text-zinc-500 font-mono mb-4">WPM</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Accuracy</span>
              <span className="font-mono">
                {you.correctChars + you.incorrectChars > 0
                  ? Math.round(
                      (you.correctChars /
                        (you.correctChars + you.incorrectChars)) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Correct</span>
              <span className="font-mono">{you.correctChars}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Errors</span>
              <span className="font-mono">{you.incorrectChars}</span>
            </div>
          </div>
        </div>

        {/* Opponent */}
        <div
          className={cn(
            "rounded-xl border p-6 text-center",
            !youWon && !tie
              ? "border-[var(--theme-accent)]/40 bg-[var(--theme-accent)]/5"
              : "border-zinc-200 dark:border-zinc-800"
          )}
        >
          <div className="text-xs font-mono text-zinc-500 mb-3 uppercase tracking-wider">
            Opponent {!youWon && !tie && "👑"}
          </div>
          <div
            className="text-5xl font-bold tabular-nums mb-1"
            style={
              !youWon && !tie ? { color: "var(--theme-accent)" } : undefined
            }
          >
            {opponent.wpm}
          </div>
          <div className="text-xs text-zinc-500 font-mono mb-4">WPM</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Accuracy</span>
              <span className="font-mono">
                {opponent.correctChars + opponent.incorrectChars > 0
                  ? Math.round(
                      (opponent.correctChars /
                        (opponent.correctChars + opponent.incorrectChars)) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Correct</span>
              <span className="font-mono">{opponent.correctChars}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Errors</span>
              <span className="font-mono">{opponent.incorrectChars}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Button onClick={onRematch} variant="default">
          Rematch
        </Button>
        <Button onClick={onNewDuel} variant="outline">
          New Duel
        </Button>
      </div>
    </div>
  );
}
