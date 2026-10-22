import "server-only";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { DEFAULT_GROUP } from "@/lib/groups";
import { DICTIONARY_DIR } from "@/lib/server/wordSenses";
import {
  MAX_OCCURRENCES,
  normalizeTerm,
  quotedSentence,
  type DictionaryEntry,
  type DictionaryHit,
  type DictionaryOccurrence,
  type Level,
} from "@/lib/dictionary";

const CONTENT_DIR = path.join(process.cwd(), "knowledge-content");
const DB_FILE = path.join(process.cwd(), "data", "word-bank.db");

interface RawVocabItem {
  id: string;
  lessonId: string;
  word: string;
  pos?: string;
  ipa?: string;
  question?: string;
  questionEn?: string;
  options?: string[];
  optionsEn?: string[];
  answer?: number;
  explanation?: string;
  explanationEn?: string;
}

export interface IndexedWord extends DictionaryHit {
  occurrences: DictionaryOccurrence[];
  /** Subtitle-frequency rank (1 = most used); search results sort by it. */
  rank?: number;
  /** A phrasal verb or idiom entry ("give up"), kept out of plain A–Z browsing. */
  phrase?: boolean;
  /**
   * The two sources are kept apart until `finalizeEntries` decides what the
   * entry leads with — the common (word-bank) sense — so the course sense can
   * still be shown beside it.
   */
  bankMeaningVi?: string;
  bankMeaningEn?: string;
  bankIpa?: string;
  bankPos?: string;
  courseMeaningVi?: string;
  courseMeaningEn?: string;
  courseIpa?: string;
  coursePos?: string;
}

export interface DictionaryIndex {
  /** Every word, keyed by its lower-case form. */
  byWord: Map<string, IndexedWord>;
  /** Lower-case words, sorted, so browsing and paging are stable. */
  sorted: string[];
  /** False when the word bank could not be read (course words still work). */
  bank: boolean;
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

function blank(word: string): IndexedWord {
  return { word, courseCount: 0, inBank: false, occurrences: [] };
}

/** Fold every topic's vocab.json into the index: meanings, sentences, links. */
function addCourseVocabulary(byWord: Map<string, IndexedWord>): void {
  if (!fs.existsSync(CONTENT_DIR)) return;

  for (const dir of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;

    const slug = dir.name;
    const vocabFile = path.join(CONTENT_DIR, slug, "vocab.json");

    if (!fs.existsSync(vocabFile)) continue;

    let items: RawVocabItem[] = [];
    let meta: { group?: string; title?: string; titleEn?: string } = {};
    let lessons: { id: string; title?: string; titleEn?: string }[] = [];

    try {
      items = readJson<{ items?: RawVocabItem[] }>(vocabFile).items ?? [];
      meta = readJson(path.join(CONTENT_DIR, slug, "meta.json"));
      lessons = readJson<{ lessons?: typeof lessons }>(path.join(CONTENT_DIR, slug, "lessons.json")).lessons ?? [];
    } catch {
      continue; // A malformed topic must not take the whole dictionary down.
    }

    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));

    for (const item of items) {
      const word = (item.word ?? "").trim();
      const key = normalizeTerm(word);

      if (!key) continue;

      const entry = byWord.get(key) ?? blank(word);
      const lesson = lessonById.get(item.lessonId);
      const answer = typeof item.answer === "number" ? item.answer : -1;

      entry.occurrences.push({
        key: `${slug}#${item.id}`,
        slug,
        group: meta.group ?? DEFAULT_GROUP,
        topicTitle: meta.title ?? slug,
        topicTitleEn: meta.titleEn,
        lessonId: item.lessonId,
        lessonTitle: lesson?.title,
        lessonTitleEn: lesson?.titleEn,
        sentence: quotedSentence(item.questionEn) ?? quotedSentence(item.question),
        meaningVi: item.options?.[answer],
        meaningEn: item.optionsEn?.[answer],
        noteVi: item.explanation,
        noteEn: item.explanationEn,
      });

      entry.courseCount += 1;
      entry.coursePos = entry.coursePos ?? item.pos;
      entry.courseIpa = entry.courseIpa ?? item.ipa;
      byWord.set(key, entry);
    }
  }

}

/**
 * Decide what each entry leads with, once both sources are in.
 */
function finalizeEntries(byWord: Map<string, IndexedWord>): void {
  // The common word-bank sense and pronunciation lead — that is what a
  // dictionary is asked for. The course sense (the one the learner met in an
  // article) is carried alongside and shown under it; for a word the bank never
  // had, the course sense becomes the entry's own.
  for (const entry of Array.from(byWord.values())) {
    entry.courseMeaningVi = entry.occurrences.find((o) => o.meaningVi)?.meaningVi;
    entry.courseMeaningEn = entry.occurrences.find((o) => o.meaningEn)?.meaningEn;
    entry.meaningVi = entry.bankMeaningVi ?? entry.courseMeaningVi;
    entry.meaningEn = entry.bankMeaningEn ?? entry.courseMeaningEn;
    entry.ipa = entry.bankIpa ?? entry.courseIpa;
    entry.pos = entry.bankPos ?? entry.coursePos;
  }
}

interface DictionaryRow {
  word: string;
  display: string;
  kind: "word" | "phrase";
  pos_code: string | null;
  ipa: string | null;
  meaning_vi: string | null;
  meaning_en: string | null;
  freq_rank: number | null;
  level: Level;
}

/**
 * Load every entry's summary from the per-letter dictionary files
 * (~99k rows). Missing or unreadable is survivable: false sends the caller to
 * the word bank instead.
 */
function addDictionary(byWord: Map<string, IndexedWord>): boolean {
  if (!fs.existsSync(DICTIONARY_DIR)) return false;

  const files = fs.readdirSync(DICTIONARY_DIR).filter((name) => name.endsWith(".db"));

  if (files.length === 0) return false;

  for (const name of files) {
    let db: Database.Database | null = null;

    try {
      db = new Database(path.join(DICTIONARY_DIR, name), { readonly: true, fileMustExist: true });

      const rows = db
        .prepare("SELECT word, display, kind, pos_code, ipa, meaning_vi, meaning_en, freq_rank, level FROM words")
        .all() as DictionaryRow[];

      for (const row of rows) {
        // Course-only words carry senses but no summary; vocab.json supplies theirs.
        if (!row.meaning_vi && !row.meaning_en) continue;

        const entry = byWord.get(row.word) ?? blank(row.display);

        entry.inBank = true;
        entry.level = row.level;
        entry.rank = row.freq_rank ?? undefined;
        entry.phrase = row.kind === "phrase";
        entry.bankIpa = row.ipa ?? undefined;
        entry.bankPos = row.pos_code ?? undefined;
        entry.bankMeaningEn = row.meaning_en ?? undefined;
        entry.bankMeaningVi = row.meaning_vi ?? undefined;
        byWord.set(row.word, entry);
      }
    } catch {
      return false;
    } finally {
      db?.close();
    }
  }

  return true;
}

/** Fallback when data/dictionary/ is missing: the SQL playground's word bank. */
function addWordBank(byWord: Map<string, IndexedWord>): boolean {
  if (!fs.existsSync(DB_FILE)) return false;

  let db: Database.Database | null = null;

  try {
    db = new Database(DB_FILE, { readonly: true, fileMustExist: true });

    const rows = db
      .prepare("SELECT word, pronunciation, pos_code, meaning_en, meaning_vi FROM words")
      .all() as { word: string; pronunciation: string | null; pos_code: string | null; meaning_en: string | null; meaning_vi: string | null }[];

    for (const row of rows) {
      const word = (row.word ?? "").trim();
      const key = normalizeTerm(word);

      if (!key) continue;

      const entry = byWord.get(key) ?? blank(word);

      entry.inBank = true;
      entry.bankIpa = row.pronunciation ?? undefined;
      entry.bankPos = row.pos_code ?? undefined;
      entry.bankMeaningEn = row.meaning_en ?? undefined;
      entry.bankMeaningVi = row.meaning_vi ?? undefined;
      byWord.set(key, entry);
    }

    return true;
  } catch {
    return false;
  } finally {
    db?.close();
  }
}

function buildIndex(): DictionaryIndex {
  const byWord = new Map<string, IndexedWord>();
  const bank = addDictionary(byWord) || addWordBank(byWord);

  addCourseVocabulary(byWord);
  finalizeEntries(byWord);

  return { byWord, sorted: Array.from(byWord.keys()).sort(), bank };
}

// Content and the dictionary only change on deploy, so production builds the
// index once (~99k entries) and reuses it. Dev rebuilds so edited vocab.json
// files show up without a restart.
let cached: DictionaryIndex | null = null;

export function getDictionaryIndex(): DictionaryIndex {
  if (process.env.NODE_ENV !== "production") return buildIndex();

  return (cached ??= buildIndex());
}

/** One word with everything known about it, sentences included. */
export function lookupEntry(index: DictionaryIndex, word: string): DictionaryEntry | null {
  const found = index.byWord.get(normalizeTerm(word));

  if (!found) return null;

  const { word: display, pos, ipa, meaningVi, meaningEn, courseCount, inBank, level } = found;
  /** Repeating what the entry already leads with would just be noise. */
  const distinct = (value?: string, leading?: string) => (value && value !== leading ? value : undefined);

  return {
    word: display,
    pos,
    ipa,
    meaningVi,
    meaningEn,
    courseCount,
    inBank,
    level,
    courseMeaningVi: distinct(found.courseMeaningVi, meaningVi),
    courseMeaningEn: distinct(found.courseMeaningEn, meaningEn),
    courseIpa: distinct(found.courseIpa, ipa),
    occurrences: found.occurrences.slice(0, MAX_OCCURRENCES),
  };
}
