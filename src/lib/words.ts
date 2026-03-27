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

export function generateWords(language: Language, count: number): string[] {
  const dict = dictionaries[language];
  const words: string[] = [];
  while (words.length < count) {
    const shuffled = shuffleArray(dict);
    words.push(...shuffled);
  }
  return words.slice(0, count);
}
