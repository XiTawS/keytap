"use client";

import { useEffect, useRef } from "react";
import type { KeyboardThemeName } from "@/components/ui/keyboard";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useSettings } from "@/contexts/settings-context";
import type { Language } from "@/lib/words";

const THEME_SWATCHES: { name: KeyboardThemeName; accent: string; dark: string; light: string }[] = [
  { name: "classic", accent: "#F57644", dark: "#737373", light: "#F5F5F5" },
  { name: "mint", accent: "#86C8AC", dark: "#447B82", light: "#EEEEEE" },
  { name: "royal", accent: "#E4D440", dark: "#3A3B35", light: "#324974" },
  { name: "dolch", accent: "#D73E42", dark: "#3E3B4C", light: "#4F5E78" },
  { name: "sand", accent: "#C94E41", dark: "#893D36", light: "#EFEFEF" },
  { name: "scarlet", accent: "#E1E1E1", dark: "#D5868A", light: "#E4D7D7" },
];

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const id = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop — blur + dim */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-overlay-in" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative h-full w-80 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800/50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
          <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 rounded-md hover:bg-zinc-800/50"
            aria-label="Close settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-8">
          {/* Keyboard Theme */}
          <section>
            <SectionLabel>Keyboard Theme</SectionLabel>
            <div className="grid grid-cols-3 gap-2.5">
              {THEME_SWATCHES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => updateSettings({ theme: t.name })}
                  className={`group flex flex-col items-center gap-2 rounded-xl p-3 transition-all duration-200 ${
                    settings.theme === t.name
                      ? "bg-zinc-800 ring-2 ring-[var(--theme-accent)]/50"
                      : "bg-zinc-800/30 hover:bg-zinc-800/60"
                  }`}
                >
                  {/* Color swatch — premium rounded pills */}
                  <div className="flex gap-1">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: t.accent }}
                    />
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: t.dark }}
                    />
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: t.light }}
                    />
                  </div>
                  <span className="text-[10px] capitalize text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <Separator />

          {/* Sound */}
          <section>
            <SectionLabel>Sound</SectionLabel>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Key sounds</span>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) =>
                    updateSettings({ soundEnabled: checked })
                  }
                />
              </div>
              {settings.soundEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">Volume</span>
                    <span className="text-xs text-zinc-600 tabular-nums font-mono">
                      {Math.round(settings.volume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.volume * 100]}
                    onValueChange={(val) => {
                      const v = Array.isArray(val) ? val[0] : val;
                      updateSettings({ volume: v / 100 });
                    }}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Haptics */}
          <section>
            <SectionLabel>Haptics</SectionLabel>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Vibration feedback</span>
              <Switch
                checked={settings.haptics}
                onCheckedChange={(checked) =>
                  updateSettings({ haptics: checked })
                }
              />
            </div>
          </section>

          <Separator />

          {/* Language */}
          <section>
            <SectionLabel>Default Language</SectionLabel>
            <div className="flex gap-2">
              {(["en", "fr"] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => updateSettings({ language: lang })}
                  className={`px-5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                    settings.language === lang
                      ? "text-zinc-900"
                      : "bg-zinc-800/40 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  }`}
                  style={
                    settings.language === lang
                      ? { backgroundColor: "var(--theme-accent)" }
                      : undefined
                  }
                >
                  {lang}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 mb-3">
      {children}
    </h3>
  );
}

function Separator() {
  return <div className="h-px bg-zinc-800/50" />;
}
