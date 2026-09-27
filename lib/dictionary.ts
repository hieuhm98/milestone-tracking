// Types and pure helpers for the English dictionary.
//
// The dictionary is built from what the project already holds, merged by word:
//
//   * `data/word-bank.db` — ~23k common English words with IPA, part of speech
//     and English + Vietnamese meanings (the same bank the SQL playground queries).
//   * every `knowledge-content/<slug>/vocab.json` — 12.5k vocabulary items, each
//     one a real sentence from a course article plus the meaning the course
//     teaches for that word. This is what the bank cannot give: usage in context,
//     and a link back to the lesson the word came from.

/** Part-of-speech codes shared by both sources. */
export const POS_CODES = ["n", "v", "adj", "adv", "prep", "conj", "pron", "int", "abbr", "phrase"] as const;

export type PosCode = (typeof POS_CODES)[number];

/** One appearance of a word in a course article. */
export interface DictionaryOccurrence {
  /** `${slug}#${itemId}`, the same key the vocabulary recall is stored under. */
  key: string;
  slug: string;
  group: string;
  topicTitle: string;
  topicTitleEn?: string;
  lessonId: string;
  lessonTitle?: string;
  lessonTitleEn?: string;
  /** The article sentence the word was quoted in. */
  sentence?: string;
  meaningVi?: string;
  meaningEn?: string;
  noteVi?: string;
  noteEn?: string;
}

/** A row in the result list. */
export interface DictionaryHit {
  word: string;
  pos?: string;
  ipa?: string;
  meaningVi?: string;
  meaningEn?: string;
  /** How many course sentences use this word. */
  courseCount: number;
  /** True when the word bank has an entry (as opposed to course-only words). */
  inBank: boolean;
}

export interface DictionaryEntry extends DictionaryHit {
  occurrences: DictionaryOccurrence[];
  /**
   * The sense and pronunciation the courses teach, shown under the common ones
   * and only when they differ — for a course-only word the common fields
   * already hold them.
   */
  courseMeaningVi?: string;
  courseMeaningEn?: string;
  courseIpa?: string;
}

export interface DictionarySearch {
  total: number;
  items: DictionaryHit[];
  /** False when `data/word-bank.db` could not be read — course words only. */
  bank: boolean;
}

export const DICT_PAGE_SIZE = 40;
/** A single entry never shows more than this many course sentences. */
export const MAX_OCCURRENCES = 12;

export function normalizeTerm(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Pull the quoted article sentence out of a vocabulary question. The question
 * quotes the sentence and then the word itself ("... , từ "device" ... "), so
 * the longest quoted run is the sentence.
 */
export function quotedSentence(question?: string): string | undefined {
  if (!question) return undefined;

  const quotes = question.match(/"([^"]+)"/g);

  if (!quotes) return undefined;

  const longest = quotes
    .map((q) => q.slice(1, -1))
    .reduce((best, candidate) => (candidate.length > best.length ? candidate : best), "");

  return longest.length > 12 ? longest : undefined;
}

/** Split a sentence around every occurrence of `word`, for highlighting. */
export function highlightParts(sentence: string, word: string): { text: string; match: boolean }[] {
  const needle = normalizeTerm(word);

  if (!needle) return [{ text: sentence, match: false }];

  const parts: { text: string; match: boolean }[] = [];
  const haystack = sentence.toLowerCase();
  let cursor = 0;

  for (;;) {
    const at = haystack.indexOf(needle, cursor);

    if (at === -1) break;

    if (at > cursor) parts.push({ text: sentence.slice(cursor, at), match: false });

    parts.push({ text: sentence.slice(at, at + needle.length), match: true });
    cursor = at + needle.length;
  }

  if (cursor < sentence.length) parts.push({ text: sentence.slice(cursor), match: false });

  return parts.length > 0 ? parts : [{ text: sentence, match: false }];
}

/**
 * Rank a candidate against the query: exact word first, then prefix, then any
 * other match. Alphabetical within a rank, which is what makes browsing by
 * letter read like a dictionary.
 */
export function matchRank(word: string, term: string): number {
  if (!term) return 2;

  if (word === term) return 0;

  if (word.startsWith(term)) return 1;

  return 2;
}
