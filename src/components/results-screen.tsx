"use client";

import { useEffect, useRef } from "react";
import type { TestResults, WpmSnapshot } from "@/hooks/use-typing-test";

interface ResultsScreenProps {
  results: TestResults;
  onRestart: () => void;
  onNextTest: () => void;
}

function getWpmColor(wpm: number): string {
  if (wpm >= 80) return "text-green-400";
  if (wpm >= 50) return "text-yellow-400";
  return "text-red-400";
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

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = "rgba(113, 113, 122, 0.2)";
    ctx.lineWidth = 1;
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (chartH / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Y labels
      const val = Math.round(maxWpm - (maxWpm / ySteps) * i);
      ctx.fillStyle = "rgba(161, 161, 170, 0.7)";
      ctx.font = "11px monospace";
      ctx.textAlign = "right";
      ctx.fillText(String(val), padding.left - 8, y + 4);
    }

    // X labels
    const xSteps = Math.min(history.length - 1, 6);
    ctx.textAlign = "center";
    for (let i = 0; i <= xSteps; i++) {
      const t = Math.round((maxTime / xSteps) * i);
      const x = padding.left + (chartW / xSteps) * i;
      ctx.fillStyle = "rgba(161, 161, 170, 0.7)";
      ctx.fillText(`${t}s`, x, h - 8);
    }

    // Average line
    const avgY = padding.top + chartH - (avgWpm / maxWpm) * chartH;
    ctx.strokeStyle = "rgba(250, 204, 21, 0.4)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, avgY);
    ctx.lineTo(w - padding.right, avgY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Avg label
    ctx.fillStyle = "rgba(250, 204, 21, 0.7)";
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`avg ${avgWpm}`, w - padding.right + 2, avgY - 4);

    // WPM curve
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    history.forEach((snap, i) => {
      const x = padding.left + (snap.time / maxTime) * chartW;
      const y = padding.top + chartH - (snap.wpm / maxWpm) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Gradient fill under curve
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, "rgba(34, 211, 238, 0.15)");
    gradient.addColorStop(1, "rgba(34, 211, 238, 0)");
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
      <div className="w-full h-40 flex items-center justify-center text-zinc-500 text-sm">
        Not enough data for chart
      </div>
    );
  }

  return <canvas ref={canvasRef} className="w-full h-40" />;
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
    <div className="w-full max-w-2xl mx-auto animate-in fade-in duration-300">
      {/* Big WPM */}
      <div className="text-center mb-8">
        <div className={`text-7xl font-bold font-mono ${getWpmColor(results.wpm)}`}>
          {results.wpm}
        </div>
        <div className="text-zinc-500 text-sm mt-1">words per minute</div>
      </div>

      {/* WPM Chart */}
      <div className="mb-8 bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
        <WpmChart history={results.wpmHistory} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="raw wpm"
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
          label="characters"
          value={
            <span className="font-mono text-sm">
              <span className="text-green-400">{results.correctChars}</span>
              <span className="text-zinc-600"> / </span>
              <span className="text-red-400">{results.incorrectChars}</span>
              <span className="text-zinc-600"> / </span>
              <span className="text-yellow-400">{results.extraChars}</span>
              <span className="text-zinc-600"> / </span>
              <span className="text-zinc-400">{results.missedChars}</span>
            </span>
          }
          sublabel="correct / incorrect / extra / missed"
        />
        <StatCard
          label="words"
          value={
            <span className="font-mono">
              <span className="text-green-400">{results.correctWords}</span>
              <span className="text-zinc-600"> / </span>
              <span className="text-zinc-300">{results.totalWords}</span>
            </span>
          }
          sublabel="correct / total"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onNextTest}
          className="px-6 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors text-sm font-medium"
        >
          Next test
        </button>
        <button
          onClick={onRestart}
          className="px-6 py-2.5 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white transition-colors text-sm font-medium"
        >
          Restart
        </button>
      </div>
      <div className="text-center mt-3 text-zinc-600 text-xs">
        Tab + Enter to restart
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  sublabel,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
  sublabel?: string;
}) {
  return (
    <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
      <div className="text-zinc-500 text-xs mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${color ?? ""}`}>{value}</div>
      {sublabel && <div className="text-zinc-600 text-[10px] mt-1">{sublabel}</div>}
    </div>
  );
}
