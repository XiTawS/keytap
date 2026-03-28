"use client";

import { cn } from "@/lib/utils";
import type { BattlePlayer } from "@/lib/battle";
import type { EliminationState } from "@/lib/elimination";

interface BattleLeaderboardProps {
  players: BattlePlayer[];
  playerId: string;
  eliminationState: EliminationState | null;
  eliminationMode: string;
}

export function BattleLeaderboard({
  players,
  playerId,
  eliminationState,
  eliminationMode,
}: BattleLeaderboardProps) {
  // Sort: active players by WPM desc, then eliminated players by elimination_round desc
  const sorted = [...players].sort((a, b) => {
    if (a.is_eliminated && !b.is_eliminated) return 1;
    if (!a.is_eliminated && b.is_eliminated) return -1;
    if (a.is_eliminated && b.is_eliminated) {
      return (b.elimination_round ?? 0) - (a.elimination_round ?? 0);
    }
    return b.wpm - a.wpm;
  });

  const activePlayers = players.filter((p) => !p.is_eliminated);

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden h-fit">
      {/* Elimination timer */}
      {eliminationState && eliminationState.isRunning && (
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-red-500/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              Next elimination
            </span>
            <span
              className={cn(
                "text-lg font-bold font-mono tabular-nums",
                eliminationState.timeUntilNext <= 5
                  ? "text-red-500 animate-pulse"
                  : "text-zinc-900 dark:text-zinc-100"
              )}
            >
              {eliminationState.timeUntilNext}s
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-red-500 transition-all duration-1000 ease-linear"
              style={{
                width: `${
                  (eliminationState.timeUntilNext /
                    eliminationState.currentInterval) *
                  100
                }%`,
              }}
            />
          </div>
          {eliminationMode === "accelerating" && (
            <p className="text-[10px] text-zinc-500 font-mono mt-1">
              Interval: {eliminationState.currentInterval}s (speeding up)
            </p>
          )}
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Leaderboard
        </span>
        <span className="text-xs font-mono text-zinc-500">
          {activePlayers.length} alive
        </span>
      </div>

      {/* Player rows */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50 max-h-[400px] overflow-y-auto">
        {sorted.map((player, i) => {
          const isMe = player.player_id === playerId;
          const rank = player.is_eliminated
            ? null
            : sorted.filter((p) => !p.is_eliminated).indexOf(player) + 1;

          return (
            <div
              key={player.player_id}
              className={cn(
                "px-3 py-2 flex items-center gap-2 text-sm transition-all duration-300",
                isMe && !player.is_eliminated && "bg-[var(--theme-accent)]/5",
                player.is_eliminated && "opacity-40"
              )}
            >
              {/* Rank */}
              <span className="w-5 text-center font-mono text-xs text-zinc-400">
                {player.is_eliminated ? (
                  <span title="Eliminated">&#x1f480;</span>
                ) : (
                  `#${rank}`
                )}
              </span>

              {/* Name */}
              <span
                className={cn(
                  "flex-1 truncate font-medium",
                  player.is_eliminated
                    ? "line-through text-zinc-500"
                    : "text-zinc-900 dark:text-zinc-100"
                )}
              >
                {player.player_name}
                {isMe && (
                  <span className="text-[10px] text-zinc-500 ml-1">
                    (you)
                  </span>
                )}
              </span>

              {/* WPM */}
              <span
                className={cn(
                  "font-mono tabular-nums text-xs font-bold",
                  player.is_winner
                    ? "text-[var(--theme-accent)]"
                    : player.is_eliminated
                      ? "text-zinc-500"
                      : "text-zinc-700 dark:text-zinc-300"
                )}
              >
                {player.wpm}
              </span>

              {/* Status */}
              {player.is_winner && (
                <span title="Winner">&#x1f451;</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
