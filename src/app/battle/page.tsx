"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Monitor,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  Crown,
  Users,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BattleGame } from "@/components/battle-game";
import { useSettings } from "@/contexts/settings-context";
import {
  createBattle,
  joinBattle,
  generatePlayerId,
  subscribeToBattle,
  subscribeToPlayers,
  startBattle,
  type Battle,
  type BattlePlayer,
} from "@/lib/battle";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/words";

type BattlePhase = "lobby" | "waiting" | "countdown" | "playing" | "finished";

const INTERVAL_OPTIONS = [10, 15, 20, 30] as const;

export default function BattlePage() {
  const { settings } = useSettings();
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<BattlePhase>("lobby");
  const [battle, setBattle] = useState<Battle | null>(null);
  const [players, setPlayers] = useState<BattlePlayer[]>([]);
  const [playerId] = useState(() => generatePlayerId());
  const [isHost, setIsHost] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Battle options
  const [eliminationMode, setEliminationMode] = useState<
    "fixed" | "accelerating"
  >("fixed");
  const [eliminationInterval, setEliminationInterval] = useState(15);
  const [battleLanguage, setBattleLanguage] = useState<Language>(
    settings.language
  );

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Subscribe to battle status changes
  useEffect(() => {
    if (!battle) return;

    const channel = subscribeToBattle(battle.id, (updatedBattle) => {
      setBattle(updatedBattle);
      if (updatedBattle.status === "countdown") {
        setPhase("countdown");
      } else if (updatedBattle.status === "playing") {
        setPhase("playing");
      } else if (updatedBattle.status === "finished") {
        setPhase("finished");
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [battle?.id]);

  // Subscribe to player changes in waiting room
  useEffect(() => {
    if (!battle || (phase !== "waiting" && phase !== "countdown")) return;

    const channel = subscribeToPlayers(battle.id, () => {
      // Refetch all players on any change
      fetchPlayers();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [battle?.id, phase]);

  const fetchPlayers = useCallback(async () => {
    if (!battle) return;
    const { data } = await (await import("@/lib/supabase")).supabase
      .from("battle_players")
      .select()
      .eq("battle_id", battle.id)
      .order("updated_at", { ascending: true });
    if (data) setPlayers(data as BattlePlayer[]);
  }, [battle?.id]);

  const handleCreate = useCallback(async () => {
    if (!playerName.trim()) {
      setError("Enter your display name");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const newBattle = await createBattle(
        playerId,
        playerName.trim(),
        battleLanguage,
        eliminationMode,
        eliminationInterval
      );
      setBattle(newBattle);
      setIsHost(true);
      setPhase("waiting");
      // Fetch initial players (just host)
      const { data } = await (await import("@/lib/supabase")).supabase
        .from("battle_players")
        .select()
        .eq("battle_id", newBattle.id);
      if (data) setPlayers(data as BattlePlayer[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create battle");
    } finally {
      setLoading(false);
    }
  }, [
    playerId,
    playerName,
    battleLanguage,
    eliminationMode,
    eliminationInterval,
  ]);

  const handleJoin = useCallback(async () => {
    if (!joinCode.trim()) {
      setError("Enter a battle code");
      return;
    }
    if (!playerName.trim()) {
      setError("Enter your display name");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await joinBattle(
        joinCode.trim(),
        playerId,
        playerName.trim()
      );
      setBattle(result.battle);
      setPlayers(result.players);
      setIsHost(false);
      setPhase("waiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join battle");
    } finally {
      setLoading(false);
    }
  }, [joinCode, playerId, playerName]);

  const handleStart = useCallback(async () => {
    if (!battle) return;
    setLoading(true);
    try {
      await startBattle(battle.id, playerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setLoading(false);
    }
  }, [battle, playerId]);

  const handleCopyCode = useCallback(() => {
    if (battle?.code) {
      navigator.clipboard.writeText(battle.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [battle?.code]);

  const handleCopyLink = useCallback(() => {
    if (battle?.code) {
      navigator.clipboard.writeText(`${window.location.origin}/battle/${battle.code}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [battle?.code]);

  const handleNewBattle = useCallback(() => {
    setBattle(null);
    setPlayers([]);
    setPhase("lobby");
    setJoinCode("");
    setError("");
  }, []);

  if (isDesktop === null) return null;

  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center animate-page-in">
        <Monitor
          size={64}
          className="text-zinc-400 dark:text-zinc-500 mb-8"
        />
        <h1 className="text-2xl font-semibold tracking-tight mb-3 text-zinc-900 dark:text-zinc-100">
          Battle Royale is desktop only
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
      {phase !== "playing" && phase !== "countdown" && (
        <div className="battle-header w-full max-w-3xl mx-auto px-8 pt-6 pb-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Battle Royale
          </h1>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-8 min-h-0">
        {phase === "lobby" && (
          <div className="w-full max-w-sm mx-auto space-y-6 animate-page-in">
            {/* Display name */}
            <div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your display name"
                maxLength={16}
                className="w-full h-12 px-4 text-center text-base font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/40"
              />
            </div>

            {/* Battle options */}
            <div className="space-y-3">
              {/* Elimination mode */}
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => setEliminationMode("fixed")}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-semibold transition-all duration-150",
                    eliminationMode === "fixed"
                      ? "bg-[var(--theme-accent)] text-white"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 bg-zinc-100/60 dark:bg-zinc-900/60"
                  )}
                >
                  Fixed
                </button>
                <button
                  onClick={() => setEliminationMode("accelerating")}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-semibold transition-all duration-150",
                    eliminationMode === "accelerating"
                      ? "bg-[var(--theme-accent)] text-white"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 bg-zinc-100/60 dark:bg-zinc-900/60"
                  )}
                >
                  Accelerating
                </button>
              </div>

              {/* Elimination interval */}
              <div className="flex items-center justify-center gap-1">
                {INTERVAL_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setEliminationInterval(t)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-mono tabular-nums transition-all duration-150",
                      eliminationInterval === t
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
                  onClick={() => setBattleLanguage("en")}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-semibold uppercase transition-all duration-150",
                    battleLanguage === "en"
                      ? "bg-[var(--theme-accent)] text-white"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 bg-zinc-100/60 dark:bg-zinc-900/60"
                  )}
                >
                  EN
                </button>
                <button
                  onClick={() => setBattleLanguage("fr")}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-semibold uppercase transition-all duration-150",
                    battleLanguage === "fr"
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
                ) : (
                  <Crown size={18} className="mr-2" />
                )}
                Create Battle
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
                placeholder="Enter battle code"
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
                Join Battle
              </Button>
            </div>

            {error && (
              <p className="text-center text-sm text-red-500 font-mono">
                {error}
              </p>
            )}
          </div>
        )}

        {phase === "waiting" && battle && (
          <div className="w-full max-w-md mx-auto animate-page-in">
            {/* Room code */}
            <div className="text-center mb-8">
              <p className="text-sm text-zinc-500 font-mono mb-3">
                Share this code with your opponents
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="text-4xl font-bold font-mono tracking-[0.4em] text-zinc-900 dark:text-zinc-100">
                  {battle.code}
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
              <div className="mt-2 flex items-center justify-center gap-3 text-xs text-zinc-500 font-mono">
                <span>
                  {battle.elimination_mode === "accelerating"
                    ? "Accelerating"
                    : "Fixed"}{" "}
                  · {battle.elimination_interval}s
                </span>
                <span>·</span>
                <span>{battle.language.toUpperCase()}</span>
              </div>
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="mt-3 mx-auto"
                size="sm"
              >
                {linkCopied ? (
                  <Check size={14} className="mr-1.5 text-green-500" />
                ) : (
                  <Link2 size={14} className="mr-1.5" />
                )}
                {linkCopied ? "Link copied!" : "Copy invite link"}
              </Button>
            </div>

            {/* Player list */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Players
                </span>
                <span className="text-xs font-mono text-zinc-500 flex items-center gap-1.5">
                  <Users size={12} />
                  {players.length}/{battle.max_players}
                </span>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {players.map((p, i) => (
                  <div
                    key={p.player_id}
                    className={cn(
                      "px-4 py-2.5 flex items-center gap-3 text-sm",
                      p.player_id === playerId &&
                        "bg-[var(--theme-accent)]/5"
                    )}
                  >
                    <span className="text-zinc-400 font-mono text-xs w-5">
                      {i + 1}
                    </span>
                    <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                      {p.player_name}
                    </span>
                    {p.player_id === battle.host_id && (
                      <Crown
                        size={12}
                        className="text-[var(--theme-accent)]"
                      />
                    )}
                    {p.player_id === playerId && (
                      <span className="text-xs text-zinc-500 font-mono ml-auto">
                        you
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="text-center space-y-3">
              {isHost ? (
                <Button
                  onClick={handleStart}
                  disabled={loading || players.length < 2}
                  className="w-full h-12 text-base"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin mr-2" />
                  ) : null}
                  Start Battle{" "}
                  {players.length < 2 && (
                    <span className="text-xs opacity-60 ml-1">
                      (need 2+ players)
                    </span>
                  )}
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-zinc-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm font-mono">
                    Waiting for host to start...
                  </span>
                </div>
              )}
              <Button variant="ghost" onClick={handleNewBattle}>
                Leave
              </Button>
            </div>

            {error && (
              <p className="mt-4 text-center text-sm text-red-500 font-mono">
                {error}
              </p>
            )}
          </div>
        )}

        {(phase === "countdown" || phase === "playing" || phase === "finished") &&
          battle && (
            <BattleGame
              battle={battle}
              playerId={playerId}
              playerName={playerName}
              isHost={isHost}
              onNewBattle={handleNewBattle}
            />
          )}
      </div>
    </div>
  );
}
