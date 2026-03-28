"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { BattlePlayer } from "@/lib/battle";

interface BattleResultsProps {
  players: BattlePlayer[];
  winnerId: string;
  playerId: string;
  myWpm: number;
  myAccuracy: number;
  onNewBattle: () => void;
}

export function BattleResults({
  players,
  winnerId,
  playerId,
  myWpm,
  myAccuracy,
  onNewBattle,
}: BattleResultsProps) {
  // Build final standings: winner first, then eliminated in reverse order
  const winner = players.find((p) => p.player_id === winnerId);
  const eliminated = players
    .filter((p) => p.is_eliminated)
    .sort((a, b) => (b.elimination_round ?? 0) - (a.elimination_round ?? 0));

  const standings = [
    ...(winner ? [winner] : []),
    ...eliminated,
  ];

  return (
    <div className="w-full max-w-lg mx-auto animate-results-in">
      {/* Winner banner */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">&#x1f3c6;</div>
        <h2
          className="text-3xl font-bold mb-1"
          style={{ color: "var(--theme-accent)" }}
        >
          {winner?.player_name ?? "Unknown"} wins!
        </h2>
        <p className="text-sm text-zinc-500 font-mono">
          {winner?.wpm ?? 0} WPM
        </p>
      </div>

      {/* Standings table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-8">
        <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Final Standings
          </span>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {standings.map((player, i) => {
            const rank = i + 1;
            const isMe = player.player_id === playerId;
            const isWinner = player.player_id === winnerId;

            return (
              <div
                key={player.player_id}
                className={cn(
                  "px-4 py-3 flex items-center gap-3 text-sm",
                  isMe && "bg-[var(--theme-accent)]/5"
                )}
              >
                {/* Rank */}
                <span
                  className={cn(
                    "w-6 text-center font-mono font-bold",
                    isWinner
                      ? "text-[var(--theme-accent)]"
                      : "text-zinc-400"
                  )}
                >
                  {isWinner ? (
                    <span>&#x1f451;</span>
                  ) : (
                    `#${rank}`
                  )}
                </span>

                {/* Name */}
                <span
                  className={cn(
                    "flex-1 font-medium",
                    isWinner
                      ? "text-[var(--theme-accent)]"
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
                <span className="font-mono tabular-nums text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  {player.wpm}
                </span>

                {/* Eliminated round */}
                {player.is_eliminated && player.elimination_round && (
                  <span className="text-[10px] font-mono text-zinc-500">
                    R{player.elimination_round}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Button onClick={onNewBattle}>New Battle</Button>
      </div>
    </div>
  );
}
