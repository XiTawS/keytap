import type { KeyboardThemeName } from "@/components/ui/keyboard";
import type { Language } from "@/lib/words";

export interface Settings {
  theme: KeyboardThemeName;
  soundEnabled: boolean;
  volume: number; // 0-1
  language: Language;
  haptics: boolean;
}

const STORAGE_KEY = "keytest-settings";

const DEFAULT_SETTINGS: Settings = {
  theme: "classic",
  soundEnabled: true,
  volume: 0.5,
  language: "en",
  haptics: true,
};

export function loadSettings(): Settings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable
  }
}
