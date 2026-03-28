"use client";

import { Button } from "@/components/ui/button";

interface EliminationOverlayProps {
  type: "eliminated" | "victory";
  position?: number;
  totalPlayers?: number;
  wpm: number;
  accuracy: number;
  onWatch: () => void;
  onLeave: () => void;
}

export function EliminationOverlay({
  type,
  position,
  totalPlayers,
  wpm,
  accuracy,
  onWatch,
  onLeave,
}: EliminationOverlayProps) {
  if (type === "victory") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-overlay-in">
        <div className="text-center animate-results-in">
          <div className="text-6xl mb-4">&#x1f3c6;</div>
          <h2
            className="text-4xl font-bold mb-2"
            style={{ color: "var(--theme-accent)" }}
          >
            Victory!
          </h2>
          <p className="text-zinc-400 font-mono text-sm mb-6">
            Last one standing
          </p>

          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <div
                className="text-3xl font-bold tabular-nums font-mono"
                style={{ color: "var(--theme-accent)" }}
              >
                {wpm}
              </div>
              <div className="text-xs text-zinc-500 font-mono">WPM</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold tabular-nums font-mono text-zinc-300">
                {accuracy}%
              </div>
              <div className="text-xs text-zinc-500 font-mono">Accuracy</div>
            </div>
          </div>

          <Button onClick={onLeave}>New Battle</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-overlay-in">
      <div className="text-center animate-results-in">
        <div className="text-5xl mb-4">&#x1f480;</div>
        <h2 className="text-3xl font-bold text-red-500 mb-2">Eliminated!</h2>
        <p className="text-zinc-400 font-mono text-sm mb-2">
          Final position: #{position}
          {totalPlayers && ` of ${totalPlayers}`}
        </p>

        <div className="flex items-center justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold tabular-nums font-mono text-zinc-300">
              {wpm}
            </div>
            <div className="text-xs text-zinc-500 font-mono">WPM</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold tabular-nums font-mono text-zinc-300">
              {accuracy}%
            </div>
            <div className="text-xs text-zinc-500 font-mono">Accuracy</div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              onWatch();
              // Close overlay by removing it from DOM — parent handles this
              const overlay = document.querySelector(
                ".fixed.inset-0.z-50"
              ) as HTMLElement;
              if (overlay) overlay.style.display = "none";
            }}
          >
            Watch
          </Button>
          <Button variant="ghost" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
}
