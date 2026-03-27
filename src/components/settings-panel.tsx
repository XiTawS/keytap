"use client";

import type { KeyboardThemeName } from "@/components/ui/keyboard";
import { useSettings } from "@/contexts/settings-context";
import { Sun, Moon, Volume2, VolumeX, Keyboard, Monitor } from "lucide-react";

const THEMES: { name: KeyboardThemeName; label: string }[] = [
  { name: "classic", label: "Classic" },
  { name: "mint", label: "Mint" },
  { name: "royal", label: "Royal" },
  { name: "dolch", label: "Dolch" },
  { name: "sand", label: "Sand" },
  { name: "scarlet", label: "Scarlet" },
];

function IconGroup({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center bg-zinc-800 rounded-full p-1 gap-0.5">
      {children}
    </div>
  );
}

function IconButton({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`p-1.5 rounded-full transition-colors ${
        active ? "text-white" : "text-zinc-500 hover:text-zinc-400"
      }`}
    >
      {children}
    </button>
  );
}

export function SettingsPanel() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="shrink-0 w-full bg-zinc-900/80 px-6 py-3">
      <div className="flex flex-col items-center gap-3">
        {/* Row 1: Theme names */}
        <div className="flex items-center gap-1">
          {THEMES.map((t) => {
            const isSelected = settings.theme === t.name;
            return (
              <button
                key={t.name}
                onClick={() => updateSettings({ theme: t.name })}
                className={`px-3 py-1 rounded-full text-sm transition-all duration-150 ${
                  isSelected
                    ? "bg-white text-zinc-900 font-medium"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
                aria-label={`Theme: ${t.name}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Row 2: Icon toggle groups */}
        <div className="flex items-center gap-2">
          {/* Light/Dark mode (placeholder) */}
          <IconGroup>
            <IconButton active={true} label="Light mode">
              <Sun size={16} />
            </IconButton>
            <IconButton active={false} label="Dark mode">
              <Moon size={16} />
            </IconButton>
          </IconGroup>

          {/* Sound toggle */}
          <IconGroup>
            <IconButton
              active={settings.soundEnabled}
              onClick={() => updateSettings({ soundEnabled: true })}
              label="Sound on"
            >
              <Volume2 size={16} />
            </IconButton>
            <IconButton
              active={!settings.soundEnabled}
              onClick={() => updateSettings({ soundEnabled: false })}
              label="Sound off"
            >
              <VolumeX size={16} />
            </IconButton>
          </IconGroup>

          {/* Keyboard / Display (placeholder) */}
          <IconGroup>
            <IconButton active={true} label="Show keyboard">
              <Keyboard size={16} />
            </IconButton>
            <IconButton active={false} label="Display mode">
              <Monitor size={16} />
            </IconButton>
          </IconGroup>
        </div>
      </div>
    </div>
  );
}
