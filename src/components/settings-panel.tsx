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
    // Delay to avoid the opening click triggering close
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative h-full w-80 bg-zinc-900 border-l border-zinc-800 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-300">Settings</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors text-lg leading-none"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-8">
          {/* Keyboard Theme */}
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">
              Keyboard Theme
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {THEME_SWATCHES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => updateSettings({ theme: t.name })}
                  className={`group flex flex-col items-center gap-1.5 rounded-lg p-2 transition-colors ${
                    settings.theme === t.name
                      ? "bg-zinc-800 ring-1 ring-zinc-600"
                      : "hover:bg-zinc-800/50"
                  }`}
                >
                  {/* Color swatch */}
                  <div className="flex gap-0.5">
                    <div
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: t.accent }}
                    />
                    <div
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: t.dark }}
                    />
                    <div
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: t.light }}
                    />
                  </div>
                  <span className="text-[10px] capitalize text-zinc-400 group-hover:text-zinc-300">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Sound */}
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">
              Sound
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Key sounds</span>
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
                    <span className="text-sm text-zinc-400">Volume</span>
                    <span className="text-xs text-zinc-500 tabular-nums">
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

          {/* Haptics */}
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">
              Haptics
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-300">Vibration feedback</span>
              <Switch
                checked={settings.haptics}
                onCheckedChange={(checked) =>
                  updateSettings({ haptics: checked })
                }
              />
            </div>
          </section>

          {/* Language */}
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">
              Default Language
            </h3>
            <div className="flex gap-2">
              {(["en", "fr"] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => updateSettings({ language: lang })}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium uppercase transition-colors ${
                    settings.language === lang
                      ? "bg-zinc-100 text-zinc-900"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  }`}
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
