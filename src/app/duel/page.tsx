"use client";

import { useCallback, useEffect, useState } from "react";
import { Monitor, ArrowLeft, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DuelGame } from "@/components/duel-game";
import { useSettings } from "@/contexts/settings-context";
import {
  createDuel,
  joinDuel,
  generatePlayerId,
  subscribeToDuel,
  type Duel,
} from "@/lib/duel";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/words";
import type { TimeLimit } from "@/hooks/use-typing-test";

type DuelPhase = "lobby" | "waiting" | "playing";

const TIME_OPTIONS: TimeLimit[] = [15, 30, 60, 120];

export default function DuelPage() {
  const { settings } = useSettings();
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<DuelPhase>("lobby");
  const [duel, setDuel] = useState<Duel | null>(null);
  const [playerId] = useState(() => generatePlayerId());
  const [isPlayer1, setIsPlayer1] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duelTimeLimit, setDuelTimeLimit] = useState<TimeLimit>(30);
  const [duelLanguage, setDuelLanguage] = useState<Language>(settings.language);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Subscribe to duel changes when waiting
  useEffect(() => {
    if (!duel || phase !== "waiting") return;

    const channel = subscribeToDuel(duel.id, (updatedDuel) => {
      if (updatedDuel.status === "playing" && updatedDuel.player2_id) {
        setDuel(updatedDuel);
        setPhase("playing");
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [duel, phase]);

  const handleCreate = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const newDuel = await createDuel(playerId, duelLanguage, duelTimeLimit);
      setDuel(newDuel);
      setIsPlayer1(true);
      setPhase("waiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create duel");
    } finally {
      setLoading(false);
    }
  }, [playerId, duelLanguage, duelTimeLimit]);

  const handleJoin = useCallback(async () => {
    if (!joinCode.trim()) {
      setError("Enter a duel code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const joined = await joinDuel(joinCode.trim(), playerId);
      setDuel(joined);
      setIsPlayer1(false);
      setPhase("playing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join duel");
    } finally {
      setLoading(false);
    }
  }, [joinCode, playerId]);

  const handleCopyCode = useCallback(() => {
    if (duel?.code) {
      navigator.clipboard.writeText(duel.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [duel?.code]);

  const handleNewDuel = useCallback(() => {
    setDuel(null);
    setPhase("lobby");
    setJoinCode("");
    setError("");
  }, []);

  const handleRematch = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const newDuel = await createDuel(
        playerId,
        duel?.language || settings.language,
        duel?.time_limit || 30
      );
      setDuel(newDuel);
      setIsPlayer1(true);
      setPhase("waiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create rematch");
    } finally {
      setLoading(false);
    }
  }, [playerId, duel, settings.language]);

  if (isDesktop === null) return null;

  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center animate-page-in">
        <Monitor size={64} className="text-zinc-400 dark:text-zinc-500 mb-8" />
        <h1 className="text-2xl font-semibold tracking-tight mb-3 text-zinc-900 dark:text-zinc-100">
          Duel Mode is desktop only
        </h1>
        <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
          This requires a physical keyboard. Please visit on a desktop computer.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-screen overflow-hidden animate-page-in">
      {/* Header */}
      <div className="duel-header w-full max-w-3xl mx-auto px-8 pt-6 pb-4 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Duel Mode
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-8 min-h-0">
        {phase === "lobby" && (
          <div className="w-full max-w-sm mx-auto space-y-8 animate-page-in">
            {/* Duel options */}
            <div className="space-y-4">
              {/* Time limit selector */}
              <div className="flex items-center justify-center gap-1">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setDuelTimeLimit(t)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-mono tabular-nums transition-all duration-150",
                      duelTimeLimit === t
                        ? "bg-[var(--theme-accent)] text-white"
                        : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 bg-zinc-100/60 dark:bg-zinc-900/60"
                    )}
                  >
                    {t}s
                  </button>
                ))}
              </div>

              {/* Language toggle */}
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => setDuelLanguage("en")}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-semibold uppercase transition-all duration-150",
                    duelLanguage === "en"
                      ? "bg-[var(--theme-accent)] text-white"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 bg-zinc-100/60 dark:bg-zinc-900/60"
                  )}
                >
                  EN
                </button>
                <button
                  onClick={() => setDuelLanguage("fr")}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-semibold uppercase transition-all duration-150",
                    duelLanguage === "fr"
                      ? "bg-[var(--theme-accent)] text-white"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 bg-zinc-100/60 dark:bg-zinc-900/60"
                  )}
                >
                  FR
                </button>
              </div>
            </div>

            {/* Create */}
            <div className="text-center">
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="w-full h-12 text-base"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin mr-2" />
                ) : null}
                Create Duel
              </Button>
              <p className="mt-2 text-xs text-zinc-500 font-mono">
                Create a room and share the code
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              <span className="text-xs text-zinc-500 font-mono">or</span>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>

            {/* Join */}
            <div className="space-y-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="Enter duel code"
                maxLength={6}
                className="w-full h-12 px-4 text-center text-lg font-mono tracking-[0.3em] uppercase rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/40"
              />
              <Button
                onClick={handleJoin}
                disabled={loading || !joinCode.trim()}
                variant="outline"
                className="w-full h-12 text-base"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin mr-2" />
                ) : null}
                Join Duel
              </Button>
            </div>

            {error && (
              <p className="text-center text-sm text-red-500 font-mono">
                {error}
              </p>
            )}
          </div>
        )}

        {phase === "waiting" && duel && (
          <div className="text-center space-y-6 animate-page-in">
            <div>
              <p className="text-sm text-zinc-500 font-mono mb-3">
                Share this code with your opponent
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="text-4xl font-bold font-mono tracking-[0.4em] text-zinc-900 dark:text-zinc-100">
                  {duel.code}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopyCode}
                >
                  {copied ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm font-mono">
                Waiting for opponent...
              </span>
            </div>

            <Button variant="ghost" onClick={handleNewDuel}>
              Cancel
            </Button>
          </div>
        )}

        {phase === "playing" && duel && (
          <DuelGame
            duel={duel}
            playerId={playerId}
            isPlayer1={isPlayer1}
            onNewDuel={handleNewDuel}
            onRematch={handleRematch}
          />
        )}
      </div>
    </div>
  );
}
