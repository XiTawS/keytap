"use client";

import { useCallback, useEffect, useState } from "react";
import { Monitor, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BattleGame } from "@/components/battle-game";
import { useSettings } from "@/contexts/settings-context";
import {
  joinBattle,
  generatePlayerId,
  subscribeToBattle,
  subscribeToPlayers,
  type Battle,
  type BattlePlayer,
} from "@/lib/battle";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type JoinPhase = "name" | "joining" | "waiting" | "countdown" | "playing" | "finished" | "error";

export default function BattleJoinPage() {
  const { code } = useParams<{ code: string }>();
  useSettings(); // ensure theme is applied
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<JoinPhase>("name");
  const [battle, setBattle] = useState<Battle | null>(null);
  const [players, setPlayers] = useState<BattlePlayer[]>([]);
  const [playerId] = useState(() => generatePlayerId());
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      if (updatedBattle.status === "countdown") setPhase("countdown");
      else if (updatedBattle.status === "playing") setPhase("playing");
      else if (updatedBattle.status === "finished") setPhase("finished");
    });

    return () => {
      channel.unsubscribe();
    };
  }, [battle?.id]);

  // Subscribe to player changes in waiting room
  useEffect(() => {
    if (!battle || (phase !== "waiting" && phase !== "countdown")) return;

    const channel = subscribeToPlayers(battle.id, () => {
      fetchPlayers();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [battle?.id, phase]);

  const fetchPlayers = useCallback(async () => {
    if (!battle) return;
    const { data } = await supabase
      .from("battle_players")
      .select()
      .eq("battle_id", battle.id)
      .order("updated_at", { ascending: true });
    if (data) setPlayers(data as BattlePlayer[]);
  }, [battle?.id]);

  const handleJoin = useCallback(async () => {
    if (!playerName.trim()) {
      setError("Enter your display name");
      return;
    }
    setError("");
    setLoading(true);
    setPhase("joining");
    try {
      const result = await joinBattle(code, playerId, playerName.trim());
      setBattle(result.battle);
      setPlayers(result.players);
      setPhase("waiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join battle");
      setPhase("error");
    } finally {
      setLoading(false);
    }
  }, [code, playerId, playerName]);

  const handleNewBattle = useCallback(() => {
    setBattle(null);
    setPlayers([]);
    setPhase("name");
    setError("");
  }, []);

  if (isDesktop === null) return null;

  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center animate-page-in">
        <Monitor size={64} className="text-zinc-400 dark:text-zinc-500 mb-8" />
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
          <Link href="/battle">
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
        {phase === "name" && (
          <div className="w-full max-w-sm mx-auto space-y-6 animate-page-in">
            <div className="text-center">
              <p className="text-sm text-zinc-500 font-mono mb-1">
                Joining battle <span className="font-bold tracking-wider">{code.toUpperCase()}</span>
              </p>
            </div>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="Your display name"
              maxLength={16}
              className="w-full h-12 px-4 text-center text-base font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)]/40"
              autoFocus
            />
            <Button
              onClick={handleJoin}
              disabled={loading || !playerName.trim()}
              className="w-full h-12 text-base"
            >
              Join Battle
            </Button>
            {error && (
              <p className="text-center text-sm text-red-500 font-mono">{error}</p>
            )}
          </div>
        )}

        {phase === "joining" && (
          <div className="text-center space-y-4 animate-page-in">
            <Loader2 size={32} className="animate-spin mx-auto text-zinc-400" />
            <p className="text-sm font-mono text-zinc-500">Joining battle...</p>
          </div>
        )}

        {phase === "error" && (
          <div className="text-center space-y-6 animate-page-in">
            <p className="text-sm font-mono text-red-500">{error}</p>
            <Link href="/battle">
              <Button variant="outline">Go to Battle Lobby</Button>
            </Link>
          </div>
        )}

        {phase === "waiting" && battle && (
          <div className="text-center space-y-6 animate-page-in">
            <div className="flex items-center justify-center gap-2 text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm font-mono">Waiting for host to start...</span>
            </div>
            <p className="text-xs text-zinc-500 font-mono">
              {players.length} player{players.length !== 1 ? "s" : ""} in room
            </p>
          </div>
        )}

        {(phase === "countdown" || phase === "playing" || phase === "finished") &&
          battle && (
            <BattleGame
              battle={battle}
              playerId={playerId}
              playerName={playerName}
              isHost={false}
              onNewBattle={handleNewBattle}
            />
          )}
      </div>
    </div>
  );
}
