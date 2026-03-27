"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { loadSettings, saveSettings, type Settings } from "@/lib/settings";
import type { KeyboardThemeName } from "@/components/ui/keyboard";

const THEME_ACCENT_COLORS: Record<KeyboardThemeName, string> = {
  classic: "#F57644",
  mint: "#86C8AC",
  royal: "#E4D440",
  dolch: "#D73E42",
  sand: "#C94E41",
  scarlet: "#D5868A",
};

interface SettingsContextType {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // Set theme accent CSS variable
  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty(
        "--theme-accent",
        THEME_ACCENT_COLORS[settings.theme]
      );
    }
  }, [settings?.theme]);

  // Toggle dark/light mode class on <html>
  useEffect(() => {
    if (settings) {
      const html = document.documentElement;
      if (settings.colorMode === "dark") {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    }
  }, [settings?.colorMode]);

  // Don't render until settings loaded from localStorage
  if (!settings) return null;

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
