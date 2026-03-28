"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TypingArea } from "@/components/typing-area";
import { BattleLeaderboard } from "@/components/battle-leaderboard";
import { EliminationOverlay } from "@/components/elimination-overlay";
import { BattleResults } from "@/components/battle-results";
import { DuelCountdown } from "@/components/duel-countdown";
import { useTypingTest } from "@/hooks/use-typing-test";
import { generateSeededWords } from "@/lib/words";
import {
  updatePlayerProgress,
  subscribeToPlayers,
  subscribeToBattle,
  type Battle,
  type BattlePlayer,
} from "@/lib/battle";
import { createEliminationEngine, type EliminationState } from "@/lib/elimination";
import type { Language } from "@/lib/words";

interface BattleGameProps {
  battle: Battle;
  playerId: string;
  playerName: string;
  isHost: boolean;
  onNewBattle: () => void;
}

export function BattleGame({
  battle,
  playerId,
  playerName,
  isHost,
  onNewBattle,
}: BattleGameProps) {
  const [showCountdown, setShowCountdown] = useState(
    battle.status === "countdown"
  );
  const [gameStarted, setGameStarted] = useState(battle.status === "playing");
  const [allPlayers, setAllPlayers] = useState<BattlePlayer[]>([]);
  const [isEliminated, setIsEliminated] = useState(false);
  const [eliminatedPosition, setEliminatedPosition] = useState(0);
  const [eliminationBanner, setEliminationBanner] = useState<string | null>(
    null
  );
  const [winner, setWinner] = useState<{
    playerId: string;
    name: string;
  } | null>(null);
  const [battleFinished, setBattleFinished] = useState(false);
  const [eliminationState, setEliminationState] =
    useState<EliminationState | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const eliminationEngineRef = useRef<{ start: () => void; stop: () => void } | null>(
    null
  );

  const language = (battle.language || "en") as Language;

  // Generate lots of words — battle has no time limit, ends by elimination
  const [words] = useState(() =>
    generateSeededWords(battle.word_seed, language, 500)
  );

  const typing = useTypingTest({
    language,
    mode: "infinite",
    timeLimit: 120, // Not used in infinite mode
    initialWords: words,
  });

  // Subscribe to player updates
  useEffect(() => {
    const channel = subscribeToPlayers(battle.id, (updatedPlayer) => {
      setAllPlayers((prev) => {
        const idx = prev.findIndex(
          (p) => p.player_id === updatedPlayer.player_id
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updatedPlayer;
          return next;
        }
        return [...prev, updatedPlayer];
      });

      // Check if I was eliminated
      if (
        updatedPlayer.player_id === playerId &&
        updatedPlayer.is_eliminated
      ) {
        setIsEliminated(true);
        // Count how many are still active (including me since I just got eliminated)
        setAllPlayers((prev) => {
          const activeCount = prev.filter(
            (p) => !p.is_eliminated || p.player_id === playerId
          ).length;
          setEliminatedPosition(activeCount);
          return prev;
        });
      }

      // Check if someone was eliminated (for banner)
      if (
        updatedPlayer.is_eliminated &&
        updatedPlayer.player_id !== playerId
      ) {
        setEliminationBanner(updatedPlayer.player_name);
        setTimeout(() => setEliminationBanner(null), 3000);
      }

      // Check for winner
      if (updatedPlayer.is_winner) {
        setWinner({
          playerId: updatedPlayer.player_id,
          name: updatedPlayer.player_name,
        });
        setBattleFinished(true);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [battle.id, playerId]);

  // Subscribe to battle status
  useEffect(() => {
    const channel = subscribeToBattle(battle.id, (updatedBattle) => {
      if (updatedBattle.status === "playing" && !gameStarted) {
        setShowCountdown(false);
        setGameStarted(true);
      }
      if (updatedBattle.status === "finished") {
        setBattleFinished(true);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [battle.id, gameStarted]);

  // Fetch initial players
  useEffect(() => {
    async function fetch() {
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase
        .from("battle_players")
        .select()
        .eq("battle_id", battle.id);
      if (data) setAllPlayers(data as BattlePlayer[]);
    }
    fetch();
  }, [battle.id]);

  // Host runs elimination engine
  useEffect(() => {
    if (!isHost || !gameStarted || battleFinished) return;

    const engine = createEliminationEngine(
      battle,
      (elimPlayerId, elimPlayerName, round) => {
        // Elimination happened — player updates come via realtime
        if (elimPlayerId === playerId) {
          setIsEliminated(true);
        } else {
          setEliminationBanner(elimPlayerName);
          setTimeout(() => setEliminationBanner(null), 3000);
        }
      },
      (winnerPlayerId, winnerName) => {
        setWinner({ playerId: winnerPlayerId, name: winnerName });
        setBattleFinished(true);
      },
      (state) => {
        setEliminationState(state);
      }
    );

    eliminationEngineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
    };
  }, [isHost, gameStarted, battleFinished, battle, playerId]);

  // Non-host: local elimination timer for UI display
  useEffect(() => {
    if (isHost || !gameStarted || battleFinished) return;

    let round = 0;
    let currentInterval = battle.elimination_interval;
    let timeUntilNext = currentInterval;

    const timer = setInterval(() => {
      timeUntilNext--;
      setEliminationState({
        round,
        currentInterval,
        timeUntilNext,
        isRunning: true,
      });

      if (timeUntilNext <= 0) {
        round++;
        if (battle.elimination_mode === "accelerating") {
          currentInterval = Math.max(5, currentInterval - 2);
        }
        timeUntilNext = currentInterval;
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isHost, gameStarted, battleFinished, battle.elimination_interval, battle.elimination_mode]);

  // Send progress updates every 200ms
  useEffect(() => {
    if (!gameStarted || isEliminated || battleFinished) return;

    progressIntervalRef.current = setInterval(() => {
      updatePlayerProgress(
        battle.id,
        playerId,
        typing.currentWordIndex,
        typing.currentCharIndex,
        typing.stats.correctChars,
        typing.stats.wpm
      );
    }, 200);

    return () => {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    };
  }, [
    gameStarted,
    isEliminated,
    battleFinished,
    battle.id,
    playerId,
    typing.currentWordIndex,
    typing.currentCharIndex,
    typing.stats.correctChars,
    typing.stats.wpm,
  ]);

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    setGameStarted(true);
  }, []);

  const handleKeyDown = useCallback(
    (key: string): "correct" | "incorrect" | "control" => {
      if (!gameStarted || isEliminated) return "control";
      return typing.handleKeyDown(key);
    },
    [gameStarted, isEliminated, typing.handleKeyDown]
  );

  // Find current player data
  const myPlayer = allPlayers.find((p) => p.player_id === playerId);
  const myWpm = typing.stats.wpm;
  const myAccuracy =
    typing.stats.correctChars + typing.stats.incorrectChars > 0
      ? Math.round(
          (typing.stats.correctChars /
            (typing.stats.correctChars + typing.stats.incorrectChars)) *
            100
        )
      : 100;

  // Show results
  if (battleFinished && winner) {
    return (
      <BattleResults
        players={allPlayers}
        winnerId={winner.playerId}
        playerId={playerId}
        myWpm={myWpm}
        myAccuracy={myAccuracy}
        onNewBattle={onNewBattle}
      />
    );
  }

  return (
    <div className="battle-context w-full h-full flex flex-col">
      {showCountdown && <DuelCountdown onComplete={handleCountdownComplete} />}

      {/* Elimination banner */}
      {eliminationBanner && (
        <div className="fixed top-0 left-0 right-0 z-40 flex justify-center py-3 animate-page-in">
          <div className="bg-red-500/90 text-white px-6 py-2 rounded-lg font-mono text-sm backdrop-blur-sm">
            <span className="mr-2">&#x1f480;</span>
            {eliminationBanner} eliminated!
          </div>
        </div>
      )}

      <div className="flex-1 flex gap-6 max-w-7xl mx-auto w-full px-6 min-h-0">
        {/* Typing area — left/center ~70% */}
        <div className="flex-[7] flex flex-col justify-center min-w-0">
          {/* Your WPM */}
          <div className="mb-2 flex items-center gap-4">
            <span
              className="text-3xl font-bold tabular-nums font-mono"
              style={{ color: "var(--theme-accent)" }}
            >
              {myWpm}
            </span>
            <span className="text-sm text-zinc-500 font-mono">WPM</span>
            {isEliminated && (
              <span className="text-sm text-red-500 font-mono ml-auto">
                Spectating
              </span>
            )}
          </div>

          <TypingArea
            words={words}
            currentWordIndex={typing.currentWordIndex}
            currentCharIndex={typing.currentCharIndex}
            charStates={typing.charStates}
            wordStates={typing.wordStates}
            isFinished={isEliminated}
            mode="infinite"
            onKeyDown={handleKeyDown}
            onReset={() => {}}
            onStop={() => {}}
          />

          {isEliminated && !battleFinished && (
            <div className="mt-4 text-center">
              <p className="text-zinc-500 font-mono text-sm">
                You were eliminated. Watching the battle...
              </p>
              <Button
                variant="ghost"
                onClick={onNewBattle}
                className="mt-2"
              >
                Leave
              </Button>
            </div>
          )}
        </div>

        {/* Leaderboard — right ~30% */}
        <div className="flex-[3] flex flex-col justify-center min-w-[220px] max-w-[320px]">
          <BattleLeaderboard
            players={allPlayers}
            playerId={playerId}
            eliminationState={eliminationState}
            eliminationMode={battle.elimination_mode}
          />
        </div>
      </div>

      {/* Elimination overlay for self */}
      {isEliminated && !battleFinished && eliminatedPosition > 0 && (
        <EliminationOverlay
          type="eliminated"
          position={eliminatedPosition}
          totalPlayers={allPlayers.length}
          wpm={myWpm}
          accuracy={myAccuracy}
          onWatch={() => {}}
          onLeave={onNewBattle}
        />
      )}

      {/* Victory overlay */}
      {battleFinished && winner?.playerId === playerId && (
        <EliminationOverlay
          type="victory"
          wpm={myWpm}
          accuracy={myAccuracy}
          onWatch={() => {}}
          onLeave={onNewBattle}
        />
      )}
    </div>
  );
}
