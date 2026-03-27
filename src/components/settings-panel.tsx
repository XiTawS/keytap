"use client";

import type { KeyboardThemeName } from "@/components/ui/keyboard";
import { useSettings } from "@/contexts/settings-context";

const THEME_SWATCHES: { name: KeyboardThemeName; accent: string }[] = [
  { name: "classic", accent: "#F57644" },
  { name: "mint", accent: "#86C8AC" },
  { name: "royal", accent: "#E4D440" },
  { name: "dolch", accent: "#D73E42" },
  { name: "sand", accent: "#C94E41" },
  { name: "scarlet", accent: "#D5868A" },
];

export function SettingsPanel() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="shrink-0 w-full bg-zinc-900/60 border-t border-zinc-800/40 px-6 py-2">
      <div className="flex items-center justify-center gap-6 text-xs">
        {/* Theme dots */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-600 mr-1">theme</span>
          {THEME_SWATCHES.map((t) => (
            <button
              key={t.name}
              onClick={() => updateSettings({ theme: t.name })}
              className="w-4 h-4 rounded-full transition-all duration-150 hover:scale-125"
              style={{
                backgroundColor: t.accent,
                boxShadow:
                  settings.theme === t.name
                    ? `0 0 0 2px #09090b, 0 0 0 3.5px ${t.accent}`
                    : "none",
              }}
              aria-label={`Theme: ${t.name}`}
              title={t.name}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="h-3.5 w-px bg-zinc-800" />

        {/* Sound toggle */}
        <button
          onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
          className={`flex items-center gap-1.5 transition-colors ${
            settings.soundEnabled ? "text-zinc-300" : "text-zinc-600"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {settings.soundEnabled ? (
              <>
                <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </>
            ) : (
              <>
                <path d="M11 5 6 9H2v6h4l5 4V5Z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </>
            )}
          </svg>
          <span>{settings.soundEnabled ? "on" : "off"}</span>
        </button>

        {/* Volume (only when sound enabled) */}
        {settings.soundEnabled && (
          <>
            <div className="h-3.5 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-zinc-600">vol</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={settings.volume * 100}
                onChange={(e) => updateSettings({ volume: Number(e.target.value) / 100 })}
                className="w-16 h-1 accent-[var(--theme-accent)] cursor-pointer"
              />
              <span className="text-zinc-600 tabular-nums w-7 text-right font-mono">
                {Math.round(settings.volume * 100)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
