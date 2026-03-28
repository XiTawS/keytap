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
        active ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
      }`}
    >
      {children}
    </button>
  );
}

export function SettingsPanel() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="settings-panel shrink-0 w-full px-6 py-3 pb-8">
      <div className="settings-inner flex flex-col items-center gap-2">
        {/* Row 1: Theme names */}
        <div className="flex items-center gap-1">
          {THEMES.map((t) => {
            const isSelected = settings.theme === t.name;
            return (
              <button
                key={t.name}
                onClick={() => updateSettings({ theme: t.name })}
                className={`theme-btn px-3 py-1 rounded-full text-sm transition-all duration-150 ${
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

        {/* Row 2: Icon buttons in pill containers */}
        <div className="flex items-center gap-3">
          {/* Light/Dark mode pill */}
          <div className="flex items-center bg-zinc-200 dark:bg-zinc-800 rounded-full p-1 gap-0.5">
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
          </div>

          {/* Sound toggle pill */}
          <div className="flex items-center bg-zinc-200 dark:bg-zinc-800 rounded-full p-1 gap-0.5">
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
    </div>
  );
}
