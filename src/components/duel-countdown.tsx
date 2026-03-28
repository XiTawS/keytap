"use client";

import { useEffect, useState } from "react";

interface DuelCountdownProps {
  onComplete: () => void;
}

export function DuelCountdown({ onComplete }: DuelCountdownProps) {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }
    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-overlay-in">
      <div className="text-center">
        <div
          key={count}
          className="text-[8rem] font-bold leading-none tabular-nums animate-results-in"
          style={{ color: "var(--theme-accent)" }}
        >
          {count === 0 ? "GO" : count}
        </div>
        <p className="mt-4 text-zinc-400 text-sm font-mono">get ready...</p>
      </div>
    </div>
  );
}
