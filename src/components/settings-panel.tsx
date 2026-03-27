"use client";

import type { KeyboardThemeName } from "@/components/ui/keyboard";
import { useSettings } from "@/contexts/settings-context";
import { Sun, Moon, Volume2, VolumeX } from "lucide-react";

const THEMES: { name: KeyboardThemeName; label: string }[] = [
  { name: "classic", label: "Classic" },
  { name: "mint", label: "Mint" },
  { name: "royal", label: "Royal" },
  { name: "dolch", label: "Dolch" },
  { name: "sand", label: "Sand" },
  { name: "scarlet", label: "Scarlet" },
];

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
      className={`p-1.5 transition-colors ${
        active ? "text-white dark:text-white" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400"
      }`}
    >
      {children}
    </button>
  );
}

export function SettingsPanel() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="shrink-0 w-full bg-zinc-100/80 dark:bg-zinc-900/80 px-6 py-3 transition-colors duration-200">
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
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium"
                    : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
                aria-label={`Theme: ${t.name}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Row 2: Icon buttons */}
        <div className="flex items-center gap-1">
          {/* Light/Dark mode */}
          <IconButton
            active={settings.colorMode === "light"}
            onClick={() => updateSettings({ colorMode: "light" })}
            label="Light mode"
          >
            <Sun size={16} />
          </IconButton>
          <IconButton
            active={settings.colorMode === "dark"}
            onClick={() => updateSettings({ colorMode: "dark" })}
            label="Dark mode"
          >
            <Moon size={16} />
          </IconButton>

          <div className="mx-1.5 h-3.5 w-px bg-zinc-300 dark:bg-zinc-700/50" />

          {/* Sound toggle */}
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
        </div>
      </div>
    </div>
  );
}
