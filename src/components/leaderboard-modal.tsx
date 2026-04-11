"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchLeaderboard()
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs font-mono font-semibold text-zinc-400 tracking-widest uppercase">
            Leaderboard
          </h2>
          <button
            onClick={onClose}
            className="text-[10px] font-mono text-zinc-700 hover:text-zinc-500 transition-colors"
          >
            esc
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-9 bg-zinc-900 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-zinc-600 text-xs font-mono text-center py-10">
            No scores yet. Be the first!
          </p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {entries.map((entry, i) => {
              const isCurrentUser = user?.id === entry.user_id;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                    isCurrentUser
                      ? "bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20"
                      : "hover:bg-zinc-900/60"
                  }`}
                >
                  <span className="w-4 text-right text-zinc-600 shrink-0">
                    {i + 1}
                  </span>
                  {entry.avatar_url ? (
                    <Image
                      src={entry.avatar_url}
                      alt={entry.display_name}
                      width={20}
                      height={20}
                      className="rounded-full shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-zinc-800 shrink-0" />
                  )}
                  <span
                    className={`flex-1 truncate ${
                      isCurrentUser
                        ? "text-[var(--theme-accent)]"
                        : "text-zinc-400"
                    }`}
                  >
                    {entry.display_name}
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      isCurrentUser
                        ? "text-[var(--theme-accent)]"
                        : "text-zinc-200"
                    }`}
                  >
                    {entry.best_wpm}
                    <span className="text-zinc-600 font-normal ml-1 text-[10px]">
                      wpm
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer hint */}
        {!user && (
          <p className="mt-4 text-[10px] font-mono text-zinc-700 text-center">
            Sign in to submit your score
          </p>
        )}
      </div>
    </div>
  );
}
