// English Practice: pick vocabulary from any course, topic, lesson or single
// word, then run a round over it.
//
// The words are the same `vocab.json` items the lesson player asks, keyed the
// same way (`${slug}#${id}`), so practising here and practising after a lesson
// sharpen one shared recall history.

import { questionKey } from "./lessons";
import { rankForReview, type ProgressData } from "./progress";

/** The lightweight index entry for one word — no options or explanations. */
export interface WordRef {
  id: string;
  word: string;
  pos?: string;
}

export interface VocabIndexLesson {
  id: string;
  title: string;
  titleEn?: string;
  words: WordRef[];
}

export interface VocabIndexTopic {
  slug: string;
  group: string;
  title: string;
  titleEn?: string;
  order?: number;
  lessons: VocabIndexLesson[];
}

/**
 * The index as sent over the wire. Words are `[id, word, pos?]` tuples rather
 * than objects: with ~12k words, repeating `"id"`/`"word"`/`"pos"` keys roughly
 * doubled a response the route handler serves uncompressed.
 */
export type WireWord = [id: string, word: string, pos?: string];

export interface WireTopic extends Omit<VocabIndexTopic, "lessons"> {
  lessons: (Omit<VocabIndexLesson, "words"> & { words: WireWord[] })[];
}

export function encodeWords(words: WordRef[]): WireWord[] {
  return words.map((w) => (w.pos ? [w.id, w.word, w.pos] : [w.id, w.word]));
}

export function decodeIndex(topics: WireTopic[]): VocabIndexTopic[] {
  return topics.map((topic) => ({
    ...topic,
    lessons: topic.lessons.map((lesson) => ({
      ...lesson,
      words: lesson.words.map(([id, word, pos]) => (pos ? { id, word, pos } : { id, word })),
    })),
  }));
}

/** A word located in the curriculum; `key` is its recall key. */
export interface LocatedWord extends WordRef {
  key: string;
  slug: string;
  lessonId: string;
}

export type PracticeOrder = "weakest" | "random";
export type PracticeFilter = "all" | "unseen" | "mistakes";

export interface DeckOptions {
  /** How many words to draw; `Infinity` for everything that qualifies. */
  count: number;
  order: PracticeOrder;
  filter: PracticeFilter;
  /** Ask each spelling once even if several topics teach it. */
  unique: boolean;
}

export const PRACTICE_COUNTS = [10, 20, 30, 50] as const;

/** Most keys one practice request may ask the server to expand. */
export const MAX_DECK = 200;

export function wordKey(slug: string, id: string): string {
  return questionKey(slug, id);
}

export function flattenIndex(topics: VocabIndexTopic[]): LocatedWord[] {
  return topics.flatMap((topic) =>
    topic.lessons.flatMap((lesson) =>
      lesson.words.map((w) => ({ ...w, key: wordKey(topic.slug, w.id), slug: topic.slug, lessonId: lesson.id }))
    )
  );
}

/** A word the learner has answered wrongly at least once and not yet fully mastered. */
export function isMistake(progress: ProgressData, key: string): boolean {
  const stat = progress.recall[key];

  return Boolean(stat && stat.correct < stat.seen);
}

export function passesFilter(progress: ProgressData, key: string, filter: PracticeFilter): boolean {
  if (filter === "unseen") return !progress.recall[key];

  if (filter === "mistakes") return isMistake(progress, key);

  return true;
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = items.slice();

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
}

/**
 * Draw a practice deck from the selected words.
 *
 * Order is applied before de-duplication, so when a spelling appears in several
 * topics the copy kept is the one most worth asking (unseen or weakest).
 */
export function buildDeck(
  words: LocatedWord[],
  progress: ProgressData,
  options: DeckOptions,
  rand: () => number = Math.random
): LocatedWord[] {
  const eligible = words.filter((w) => passesFilter(progress, w.key, options.filter));
  const ordered = options.order === "weakest" ? rankForReview(progress, eligible) : shuffle(eligible, rand);
  const seen = new Set<string>();
  const deck: LocatedWord[] = [];

  for (const word of ordered) {
    if (deck.length >= Math.min(options.count, MAX_DECK)) break;

    const spelling = word.word.trim().toLowerCase();

    if (options.unique && seen.has(spelling)) continue;

    seen.add(spelling);
    deck.push(word);
  }

  return deck;
}

/** Distinct spellings among some words, for the "N unique words" summary. */
export function uniqueCount(words: LocatedWord[]): number {
  return new Set(words.map((w) => w.word.trim().toLowerCase())).size;
}
