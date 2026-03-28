import {
  getActivePlayers,
  eliminatePlayer,
  setWinner,
  type Battle,
} from "./battle";

export interface EliminationState {
  round: number;
  currentInterval: number;
  timeUntilNext: number;
  isRunning: boolean;
}

export function createEliminationEngine(
  battle: Battle,
  onElimination: (playerId: string, playerName: string, round: number) => void,
  onWinner: (playerId: string, playerName: string) => void,
  onTick: (state: EliminationState) => void
) {
  let round = 0;
  let currentInterval = battle.elimination_interval;
  let timeUntilNext = currentInterval;
  let tickTimer: ReturnType<typeof setInterval> | null = null;
  let isRunning = false;

  function start() {
    if (isRunning) return;
    isRunning = true;
    timeUntilNext = currentInterval;

    tickTimer = setInterval(async () => {
      timeUntilNext--;

      onTick({
        round,
        currentInterval,
        timeUntilNext,
        isRunning,
      });

      if (timeUntilNext <= 0) {
        round++;
        await performElimination();

        // Update interval for accelerating mode
        if (battle.elimination_mode === "accelerating") {
          currentInterval = Math.max(5, currentInterval - 2);
        }

        timeUntilNext = currentInterval;
      }
    }, 1000);
  }

  async function performElimination() {
    const activePlayers = await getActivePlayers(battle.id);

    if (activePlayers.length <= 1) {
      // Game over
      if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        await setWinner(battle.id, winner.player_id);
        onWinner(winner.player_id, winner.player_name);
      }
      stop();
      return;
    }

    // Find player with lowest WPM
    let lowestPlayer = activePlayers[0];
    for (const p of activePlayers) {
      if (p.wpm < lowestPlayer.wpm) {
        lowestPlayer = p;
      }
    }

    await eliminatePlayer(battle.id, lowestPlayer.player_id, round);
    onElimination(lowestPlayer.player_id, lowestPlayer.player_name, round);

    // Check if only 1 left after elimination
    const remaining = activePlayers.filter(
      (p) => p.player_id !== lowestPlayer.player_id
    );
    if (remaining.length === 1) {
      const winner = remaining[0];
      await setWinner(battle.id, winner.player_id);
      onWinner(winner.player_id, winner.player_name);
      stop();
    }
  }

  function stop() {
    isRunning = false;
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  return { start, stop };
}
