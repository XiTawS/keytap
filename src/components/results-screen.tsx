"use client";

import { useEffect, useRef } from "react";
import type { TestResults, WpmSnapshot } from "@/hooks/use-typing-test";

interface ResultsScreenProps {
  results: TestResults;
  onRestart: () => void;
  onNextTest: () => void;
}

function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 95) return "text-green-400";
  if (accuracy >= 85) return "text-yellow-400";
  return "text-red-400";
}

function WpmChart({ history }: { history: WpmSnapshot[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 45 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const maxTime = Math.max(...history.map((s) => s.time));
    const maxWpm = Math.max(...history.map((s) => s.wpm), 10);
    const avgWpm = Math.round(history.reduce((sum, s) => sum + s.wpm, 0) / history.length);

    // Get accent color from CSS variable
    const accentColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--theme-accent")
      .trim() || "#F57644";

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(113, 113, 122, 0.15)";
    ctx.lineWidth = 1;
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (chartH / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      const val = Math.round(maxWpm - (maxWpm / ySteps) * i);
      ctx.fillStyle = "rgba(161, 161, 170, 0.5)";
      ctx.font = "11px var(--font-geist-mono), monospace";
      ctx.textAlign = "right";
      ctx.fillText(String(val), padding.left - 8, y + 4);
    }

    // X labels
    const xSteps = Math.min(history.length - 1, 6);
    ctx.textAlign = "center";
    for (let i = 0; i <= xSteps; i++) {
      const t = Math.round((maxTime / xSteps) * i);
      const x = padding.left + (chartW / xSteps) * i;
      ctx.fillStyle = "rgba(161, 161, 170, 0.5)";
      ctx.fillText(`${t}s`, x, h - 8);
    }

    // Average line
    const avgY = padding.top + chartH - (avgWpm / maxWpm) * chartH;
    ctx.strokeStyle = "rgba(161, 161, 170, 0.25)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, avgY);
    ctx.lineTo(w - padding.right, avgY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Avg label
    ctx.fillStyle = "rgba(161, 161, 170, 0.5)";
    ctx.font = "10px var(--font-geist-mono), monospace";
    ctx.textAlign = "left";
    ctx.fillText(`avg ${avgWpm}`, w - padding.right + 2, avgY - 4);

    // WPM curve — using accent color
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    history.forEach((snap, i) => {
      const x = padding.left + (snap.time / maxTime) * chartW;
      const y = padding.top + chartH - (snap.wpm / maxWpm) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Gradient fill under curve — using accent color
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, accentColor + "25");
    gradient.addColorStop(1, accentColor + "00");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    history.forEach((snap, i) => {
      const x = padding.left + (snap.time / maxTime) * chartW;
      const y = padding.top + chartH - (snap.wpm / maxWpm) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    ctx.fill();
  }, [history]);

  if (history.length < 2) {
    return (
      <div className="w-full h-40 flex items-center justify-center text-zinc-400 dark:text-zinc-600 text-sm font-mono">
        Not enough data for chart
      </div>
    );
  }

  return <canvas ref={canvasRef} className="results-chart w-full h-40" />;
}

export function ResultsScreen({ results, onRestart, onNextTest }: ResultsScreenProps) {
  // Listen for Tab+Enter to restart
  useEffect(() => {
    let tabPressed = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        tabPressed = true;
        e.preventDefault();
      } else if (e.key === "Enter" && tabPressed) {
        e.preventDefault();
        onRestart();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Tab") tabPressed = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [onRestart]);

  return (
    <div className="w-full max-w-5xl mx-auto animate-results-in">
      {/* Big WPM — accent colored */}
      <div className="text-center mb-4">
        <div
          className="results-wpm text-6xl font-bold font-mono tracking-tight"
          style={{ color: "var(--theme-accent)" }}
        >
          {results.wpm}
        </div>
        <div className="text-zinc-400 dark:text-zinc-600 text-xs mt-1 font-mono tracking-widest uppercase">
          words per minute
        </div>
      </div>

      {/* Chart + Stats side by side */}
      <div className="flex gap-4 mb-4">
        {/* WPM Chart */}
        <div className="flex-1 bg-zinc-100/40 dark:bg-zinc-900/40 rounded-xl p-3 border border-zinc-200/50 dark:border-zinc-800/50 transition-colors duration-200">
          <WpmChart history={results.wpmHistory} />
        </div>

        {/* Stats grid */}
        <div className="results-stats-grid grid grid-cols-2 gap-2 w-72 shrink-0">
          <StatCard
            label="raw"
            value={String(results.rawWpm)}
            color="text-zinc-300"
          />
          <StatCard
            label="accuracy"
            value={`${results.accuracy}%`}
            color={getAccuracyColor(results.accuracy)}
          />
          <StatCard
            label="time"
            value={`${results.totalTime}s`}
            color="text-zinc-300"
          />
          <StatCard
            label="words"
            value={
              <span className="font-mono">
                <span className="text-green-400">{results.correctWords}</span>
                <span className="text-zinc-400 dark:text-zinc-700"> / </span>
                <span className="text-zinc-600 dark:text-zinc-400">{results.totalWords}</span>
              </span>
            }
            sublabel="correct / total"
          />
          <StatCard
            label="characters"
            value={
              <span className="font-mono text-xs">
                <span className="text-green-400">{results.correctChars}</span>
                <span className="text-zinc-400 dark:text-zinc-700">/</span>
                <span className="text-red-400">{results.incorrectChars}</span>
                <span className="text-zinc-400 dark:text-zinc-700">/</span>
                <span className="text-yellow-400">{results.extraChars}</span>
                <span className="text-zinc-400 dark:text-zinc-700">/</span>
                <span className="text-zinc-500">{results.missedChars}</span>
              </span>
            }
            sublabel="ok / err / extra / miss"
            wide
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onRestart}
          className="px-6 py-1.5 rounded-lg bg-zinc-200/60 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all duration-200 text-sm font-medium border border-zinc-200/50 dark:border-zinc-800/50"
        >
          Restart
        </button>
        <span className="text-zinc-400 dark:text-zinc-700 text-xs font-mono ml-2">tab + enter</span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  sublabel,
  wide,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
  sublabel?: string;
  wide?: boolean;
}) {
  return (
    <div className={`bg-zinc-100/40 dark:bg-zinc-900/40 rounded-xl p-3 border border-zinc-200/50 dark:border-zinc-800/50 transition-colors duration-200 ${wide ? "col-span-2" : ""}`}>
      <div className="text-zinc-400 dark:text-zinc-600 text-[10px] mb-1 font-mono tracking-wider uppercase">
        {label}
      </div>
      <div className={`text-lg font-bold font-mono ${color ?? ""}`}>{value}</div>
      {sublabel && (
        <div className="text-zinc-400 dark:text-zinc-700 text-[9px] mt-1 font-mono">{sublabel}</div>
      )}
    </div>
  );
}
