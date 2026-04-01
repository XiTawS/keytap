"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TypingArea } from "@/components/typing-area";
import { OpponentTypingArea } from "@/components/opponent-typing-area";
import { DuelResults } from "@/components/duel-results";
import { DuelCountdown } from "@/components/duel-countdown";
import { LiveStats } from "@/components/live-stats";
import { useTypingTest } from "@/hooks/use-typing-test";
import { generateSeededWords } from "@/lib/words";
import {
  updateProgress,
  broadcastProgress,
  subscribeToBroadcast,
  subscribeToDuel,
  updateDuelStatus,
  type Duel,
  type DuelProgress,
} from "@/lib/duel";
import type { Language } from "@/lib/words";
import type { TimeLimit } from "@/hooks/use-typing-test";

interface DuelGameProps {
  duel: Duel;
  playerId: string;
  isPlayer1: boolean;
  onNewDuel: () => void;
  onRematch: () => void;
}

export function DuelGame({
  duel,
  playerId,
  isPlayer1,
  onNewDuel,
  onRematch,
}: DuelGameProps) {
  const [showCountdown, setShowCountdown] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [opponentProgress, setOpponentProgress] = useState<DuelProgress | null>(
    null
  );
  const [duelFinished, setDuelFinished] = useState(false);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const language = (duel.language || "en") as Language;
  const timeLimit = (duel.time_limit || 30) as TimeLimit;

  // Generate same words for both players
  const wordCount = Math.max(Math.ceil((200 * timeLimit) / 60), 300);
  const [words] = useState(() =>
    generateSeededWords(duel.word_seed, language, wordCount)
  );

  const typing = useTypingTest({
    language,
    mode: "time",
    timeLimit,
    initialWords: words,
  });

  // Subscribe to opponent progress via broadcast
  useEffect(() => {
    const channel = subscribeToBroadcast(duel.id, playerId, (progress) => {
      setOpponentProgress(progress as unknown as DuelProgress);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [duel.id, playerId]);

  // Subscribe to duel status changes
  useEffect(() => {
    const channel = subscribeToDuel(duel.id, (updatedDuel) => {
      if (updatedDuel.status === "finished") {
        setDuelFinished(true);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [duel.id]);

  // Broadcast progress every 100ms (lightweight, no DB writes)
  useEffect(() => {
    if (!gameStarted || duelFinished) return;

    progressIntervalRef.current = setInterval(() => {
      broadcastProgress(duel.id, playerId, {
        word_index: typing.currentWordIndex,
        char_index: typing.currentCharIndex,
        correct_chars: typing.stats.correctChars,
        incorrect_chars: typing.stats.incorrectChars,
        wpm: typing.stats.wpm,
        finished: typing.isFinished,
      });
    }, 100);

    return () => {
      if (progressIntervalRef.current)
        clearInterval(progressIntervalRef.current);
    };
  }, [
    gameStarted,
    duelFinished,
    duel.id,
    playerId,
    typing.currentWordIndex,
    typing.currentCharIndex,
    typing.stats.correctChars,
    typing.stats.incorrectChars,
    typing.stats.wpm,
    typing.isFinished,
  ]);

  // When player finishes, write final results to DB and broadcast
  useEffect(() => {
    if (typing.isFinished && gameStarted) {
      const finalProgress = {
        word_index: typing.currentWordIndex,
        char_index: typing.currentCharIndex,
        correct_chars: typing.stats.correctChars,
        incorrect_chars: typing.stats.incorrectChars,
        wpm: typing.stats.wpm,
        finished: true,
      };

      // Broadcast so opponent sees it immediately
      broadcastProgress(duel.id, playerId, finalProgress);
      // Write to DB for persistence
      updateProgress(duel.id, playerId, finalProgress);

      // If both finished, mark duel as finished
      if (opponentProgress?.finished) {
        updateDuelStatus(duel.id, "finished");
        setDuelFinished(true);
      }
    }
  }, [typing.isFinished, gameStarted]);

  // Also check when opponent finishes
  useEffect(() => {
    if (opponentProgress?.finished && typing.isFinished) {
      updateDuelStatus(duel.id, "finished");
      setDuelFinished(true);
    }
  }, [opponentProgress?.finished, typing.isFinished]);

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    setGameStarted(true);
  }, []);

  const handleKeyDown = useCallback(
    (key: string): "correct" | "incorrect" | "control" => {
      if (!gameStarted) return "control";
      return typing.handleKeyDown(key);
    },
    [gameStarted, typing.handleKeyDown]
  );

  // Show results when duel is done
  const bothFinished =
    typing.isFinished && (opponentProgress?.finished || duelFinished);

  if (bothFinished) {
    const myResults = typing.getResults();
    return (
      <DuelResults
        player1={{
          wpm: isPlayer1 ? myResults.wpm : (opponentProgress?.wpm ?? 0),
          accuracy:
            isPlayer1
              ? myResults.accuracy
              : opponentProgress
                ? Math.round(
                    (opponentProgress.correct_chars /
                      Math.max(
                        opponentProgress.correct_chars +
                          opponentProgress.incorrect_chars,
                        1
                      )) *
                      100
                  )
                : 0,
          correctChars: isPlayer1
            ? myResults.correctChars
            : (opponentProgress?.correct_chars ?? 0),
          incorrectChars: isPlayer1
            ? myResults.incorrectChars
            : (opponentProgress?.incorrect_chars ?? 0),
        }}
        player2={{
          wpm: isPlayer1 ? (opponentProgress?.wpm ?? 0) : myResults.wpm,
          accuracy: isPlayer1
            ? opponentProgress
              ? Math.round(
                  (opponentProgress.correct_chars /
                    Math.max(
                      opponentProgress.correct_chars +
                        opponentProgress.incorrect_chars,
                      1
                    )) *
                    100
                )
              : 0
            : myResults.accuracy,
          correctChars: isPlayer1
            ? (opponentProgress?.correct_chars ?? 0)
            : myResults.correctChars,
          incorrectChars: isPlayer1
            ? (opponentProgress?.incorrect_chars ?? 0)
            : myResults.incorrectChars,
        }}
        isPlayer1={isPlayer1}
        onRematch={onRematch}
        onNewDuel={onNewDuel}
      />
    );
  }

  return (
    <div className="duel-context w-full max-w-3xl mx-auto">
      {showCountdown && <DuelCountdown onComplete={handleCountdownComplete} />}

      {/* Timer */}
      <div className="mb-2 flex items-center justify-center">
        <LiveStats
          wpm={typing.stats.wpm}
          timeLeft={typing.timeLeft}
          elapsedSeconds={typing.stats.elapsedSeconds}
          mode="time"
          isActive={typing.isActive}
        />
      </div>

      {/* Your typing area */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-zinc-500">You</span>
          <span className="text-xs font-mono text-zinc-500">
            {typing.stats.wpm} WPM
          </span>
        </div>
        <TypingArea
          words={words}
          currentWordIndex={typing.currentWordIndex}
          currentCharIndex={typing.currentCharIndex}
          charStates={typing.charStates}
          wordStates={typing.wordStates}
          isFinished={typing.isFinished}
          mode="time"
          onKeyDown={handleKeyDown}
          onReset={() => {}}
          onStop={() => {}}
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />

      {/* Opponent typing area */}
      <OpponentTypingArea
        words={words}
        wordIndex={opponentProgress?.word_index ?? 0}
        charIndex={opponentProgress?.char_index ?? 0}
        wpm={opponentProgress?.wpm ?? 0}
        finished={opponentProgress?.finished ?? false}
      />

      {opponentLeft && (
        <div className="mt-4 text-center text-sm text-zinc-500 font-mono">
          Opponent disconnected
        </div>
      )}
    </div>
  );
}
