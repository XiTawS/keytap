import { wordsEn } from "@/data/words-en";
import { wordsFr } from "@/data/words-fr";

export type Language = "en" | "fr";

const dictionaries: Record<Language, string[]> = {
  en: wordsEn,
  fr: wordsFr,
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Mulberry32 seeded PRNG — deterministic for same seed
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

export function generateSeededWords(
  seed: string,
  language: Language,
  count: number
): string[] {
  const dict = dictionaries[language];
  const rng = mulberry32(hashString(seed));
  const words: string[] = [];
  while (words.length < count) {
    // Fisher-Yates shuffle with seeded RNG
    const shuffled = [...dict];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    words.push(...shuffled);
  }
  return words.slice(0, count);
}

export function generateWords(language: Language, count: number): string[] {
  const dict = dictionaries[language];
  const words: string[] = [];
  while (words.length < count) {
    const shuffled = shuffleArray(dict);
    words.push(...shuffled);
  }
  return words.slice(0, count);
}
