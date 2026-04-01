"use client";

import { useCallback, useEffect, useState } from "react";
import { Monitor, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DuelGame } from "@/components/duel-game";
import { useSettings } from "@/contexts/settings-context";
import {
  joinDuel,
  generatePlayerId,
  subscribeToDuel,
  createDuel,
  type Duel,
} from "@/lib/duel";
import Link from "next/link";
import { useParams } from "next/navigation";

type JoinPhase = "joining" | "waiting" | "playing" | "error";

export default function DuelJoinPage() {
  const { code } = useParams<{ code: string }>();
  const { settings } = useSettings();
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<JoinPhase>("joining");
  const [duel, setDuel] = useState<Duel | null>(null);
  const [playerId] = useState(() => generatePlayerId());
  const [isPlayer1, setIsPlayer1] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-join on mount
  useEffect(() => {
    if (!code || isDesktop === null || !isDesktop) return;

    let cancelled = false;
    (async () => {
      try {
        const joined = await joinDuel(code, playerId);
        if (cancelled) return;
        setDuel(joined);
        setIsPlayer1(false);
        setPhase("playing");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to join duel");
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, playerId, isDesktop]);

  // Subscribe to duel changes when waiting (for rematch)
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

  const handleNewDuel = useCallback(() => {
    setDuel(null);
    setPhase("joining");
    setError("");
    // Re-trigger join
    (async () => {
      try {
        const joined = await joinDuel(code, playerId);
        setDuel(joined);
        setIsPlayer1(false);
        setPhase("playing");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to join duel");
        setPhase("error");
      }
    })();
  }, [code, playerId]);

  const handleRematch = useCallback(async () => {
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
      setPhase("error");
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
        <Link href="/duel">
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
        {phase === "joining" && (
          <div className="text-center space-y-4 animate-page-in">
            <Loader2 size={32} className="animate-spin mx-auto text-zinc-400" />
            <p className="text-sm font-mono text-zinc-500">
              Joining duel <span className="font-bold tracking-wider">{code.toUpperCase()}</span>...
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="text-center space-y-6 animate-page-in">
            <p className="text-sm font-mono text-red-500">{error}</p>
            <Link href="/duel">
              <Button variant="outline">Go to Duel Lobby</Button>
            </Link>
          </div>
        )}

        {phase === "waiting" && duel && (
          <div className="text-center space-y-6 animate-page-in">
            <div className="flex items-center justify-center gap-2 text-zinc-500">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm font-mono">Waiting for opponent...</span>
            </div>
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
