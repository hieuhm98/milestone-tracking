// Shared shapes for the daily puzzles.

export type GameId = "wordle" | "sort" | "sequence";

export const GAME_IDS: GameId[] = ["wordle", "sort", "sequence"];

export function isGameId(value: string): value is GameId {
  return (GAME_IDS as string[]).includes(value);
}

export interface Bilingual {
  vi: string;
  en: string;
}

export interface TopicRef extends Bilingual {
  slug: string;
}

/** What the builders read: one course, already boiled down by the server loader. */
export interface TopicMaterial {
  slug: string;
  title: string;
  titleEn: string;
  /** The English article with markdown intact — bold marks the key terms. */
  articleEn: string;
  /** Both articles' `## ` headings, index-aligned (empty when the counts differ). */
  headings: Bilingual[];
  orderDrills: { items: { text: string; textEn: string }[]; prompt: string; promptEn: string; explanation: string; explanationEn: string }[];
  matchDrills: { pairs: { left: string; leftEn: string; right: string; rightEn: string }[]; prompt: string; promptEn: string; explanation: string; explanationEn: string }[];
}

export interface WordlePuzzle {
  game: "wordle";
  /** Upper-case, letters only. */
  word: string;
  tries: number;
  /** The article sentence with the word blanked out. */
  clue: string;
  /** The same sentence, whole, shown once the game ends. */
  sentence: string;
  topic: TopicRef;
}

export interface SortGroup {
  topic: TopicRef;
  terms: string[];
}

export interface SortPuzzle {
  game: "sort";
  /** Four groups of four. The client shuffles the 16 tiles. */
  groups: SortGroup[];
  mistakes: number;
}

export interface SequenceCommon {
  game: "sequence";
  topic: TopicRef;
  prompt: Bilingual;
  explanation: Bilingual;
  /** Deterministic shuffle seed for the display order. */
  seed: string;
}

export interface OrderPuzzle extends SequenceCommon {
  kind: "order";
  /** In the CORRECT order. */
  items: Bilingual[];
  attempts: number;
}

export interface MatchPuzzle extends SequenceCommon {
  kind: "match";
  pairs: { left: Bilingual; right: Bilingual }[];
  mistakes: number;
}

export type SequencePuzzle = OrderPuzzle | MatchPuzzle;

export type Puzzle = WordlePuzzle | SortPuzzle | SequencePuzzle;

export interface DailyPuzzle {
  day: string;
  group: string;
  puzzle: Puzzle;
}
