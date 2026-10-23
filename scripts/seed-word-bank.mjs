// Seed script for the SQL-practice word bank.
//
// Reads the English/Vietnamese flashcards from the sibling `flash-card-english`
// repo and builds a small, JOIN-friendly SQLite database at `data/word-bank.db`.
// That DB file is committed to git (see `data/` — it is NOT git-ignored) so the
// SQL-practice page has real data to query on any clone, no seeding required.
//
// Re-run with:  node scripts/seed-word-bank.mjs
// (Needs the flashcards source at ../flash-card-english/flashcards.json.)

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SOURCE =
  process.env.FLASHCARDS_JSON ||
  path.join(ROOT, "..", "flash-card-english", "flashcards.json");

const OUT_DIR = path.join(ROOT, "data");
const OUT_FILE = path.join(OUT_DIR, "word-bank.db");

// --- Part-of-speech lookup -------------------------------------------------
// Codes we recognise at the start of the English gloss (e.g. "v. make less").
const POS = [
  { code: "v", name_en: "verb", name_vi: "động từ" },
  { code: "n", name_en: "noun", name_vi: "danh từ" },
  { code: "adj", name_en: "adjective", name_vi: "tính từ" },
  { code: "adv", name_en: "adverb", name_vi: "trạng từ" },
  { code: "prep", name_en: "preposition", name_vi: "giới từ" },
  { code: "conj", name_en: "conjunction", name_vi: "liên từ" },
  { code: "pron", name_en: "pronoun", name_vi: "đại từ" },
  { code: "int", name_en: "interjection", name_vi: "thán từ" },
  { code: "abbr", name_en: "abbreviation", name_vi: "từ viết tắt" },
];
const POS_CODES = POS.map((p) => p.code);
// Longest codes first so "adj"/"adv"/"abbr" match before "a"-like fallbacks.
const POS_RE = new RegExp(`^\\s*(${[...POS_CODES].sort((a, b) => b.length - a.length).join("|")})\\b\\.?`, "i");

// Split a flashcard `back` string into { pos, meaning_en, meaning_vi }.
// Format observed: "<english gloss> | <vietnamese gloss>", english often
// prefixed by a part-of-speech token like "v." / "n." / "adj.".
function parseBack(back) {
  const raw = String(back ?? "").trim();
  const pipe = raw.indexOf("|");
  let en = pipe >= 0 ? raw.slice(0, pipe) : raw;
  let vi = pipe >= 0 ? raw.slice(pipe + 1) : "";

  en = en.trim();
  vi = vi.trim();

  let pos = null;
  const m = en.match(POS_RE);
  if (m) {
    pos = m[1].toLowerCase();
    en = en.slice(m[0].length).replace(/^[.\s~]+/, "").trim();
  }

  return { pos, meaning_en: en, meaning_vi: vi };
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`✗ Flashcards source not found: ${SOURCE}`);
    console.error("  Set FLASHCARDS_JSON=/path/to/flashcards.json or place the");
    console.error("  flash-card-english repo alongside this project.");
    process.exit(1);
  }

  const cards = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
  if (!Array.isArray(cards)) {
    console.error("✗ Expected flashcards.json to be an array.");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  // Start clean so re-seeding is deterministic (avoids leftover WAL files too).
  for (const f of [OUT_FILE, `${OUT_FILE}-wal`, `${OUT_FILE}-shm`]) {
    if (fs.existsSync(f)) fs.rmSync(f);
  }

  const db = new Database(OUT_FILE);
  // Plain rollback journal (no WAL) → a single, self-contained, commit-friendly file.
  db.pragma("journal_mode = DELETE");

  db.exec(`
    CREATE TABLE parts_of_speech (
      id      INTEGER PRIMARY KEY,
      code    TEXT NOT NULL UNIQUE,
      name_en TEXT NOT NULL,
      name_vi TEXT NOT NULL
    );

    CREATE TABLE words (
      id             INTEGER PRIMARY KEY,
      word           TEXT NOT NULL,
      pronunciation  TEXT,
      pos_code       TEXT REFERENCES parts_of_speech(code),
      meaning_en     TEXT,
      meaning_vi     TEXT,
      first_letter   TEXT,
      length         INTEGER
    );

    CREATE TABLE word_reviews (
      id         INTEGER PRIMARY KEY,
      word_id    INTEGER NOT NULL REFERENCES words(id),
      reviewed_on TEXT NOT NULL,
      remembered INTEGER NOT NULL   -- 1 = recalled correctly, 0 = missed
    );

    CREATE INDEX idx_words_pos ON words(pos_code);
    -- Lookups by spelling (and the "-ness" self-join SQL challenge, which takes
    -- ~25 s without it: 23k × 23k comparisons).
    CREATE INDEX idx_words_word ON words(word);
    CREATE INDEX idx_words_letter ON words(first_letter);
    CREATE INDEX idx_reviews_word ON word_reviews(word_id);
  `);

  const insertPos = db.prepare(
    "INSERT INTO parts_of_speech (id, code, name_en, name_vi) VALUES (?, ?, ?, ?)"
  );
  POS.forEach((p, i) => insertPos.run(i + 1, p.code, p.name_en, p.name_vi));

  const insertWord = db.prepare(`
    INSERT INTO words (id, word, pronunciation, pos_code, meaning_en, meaning_vi, first_letter, length)
    VALUES (@id, @word, @pronunciation, @pos_code, @meaning_en, @meaning_vi, @first_letter, @length)
  `);
  const insertReview = db.prepare(
    "INSERT INTO word_reviews (word_id, reviewed_on, remembered) VALUES (?, ?, ?)"
  );

  // Deterministic pseudo-random so re-seeding yields the same mock review data
  // (no Math.random — keeps the committed DB byte-stable across runs).
  let seedState = 1234567;
  const rand = () => {
    seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
    return seedState / 0x7fffffff;
  };

  const BASE_DATE = new Date("2026-06-01T00:00:00Z").getTime();
  const DAY = 86400000;

  const seedAll = db.transaction((rows) => {
    let id = 0;
    let reviewCount = 0;
    for (const card of rows) {
      const word = String(card.front ?? "").trim();
      if (!word) continue;
      id += 1;
      const { pos, meaning_en, meaning_vi } = parseBack(card.back);
      insertWord.run({
        id,
        word,
        pronunciation: card.pronunciation ? String(card.pronunciation).trim() : null,
        pos_code: pos,
        meaning_en: meaning_en || null,
        meaning_vi: meaning_vi || null,
        first_letter: word[0]?.toUpperCase() ?? null,
        length: word.length,
      });

      // Mock study history: a handful of review rows per word for JOIN/aggregate practice.
      const reviews = Math.floor(rand() * 4); // 0..3
      for (let r = 0; r < reviews; r++) {
        const day = Math.floor(rand() * 30);
        const date = new Date(BASE_DATE + day * DAY).toISOString().slice(0, 10);
        insertReview.run(id, date, rand() > 0.35 ? 1 : 0);
        reviewCount += 1;
      }
    }
    return { words: id, reviews: reviewCount };
  });

  const { words, reviews } = seedAll(cards);
  db.exec("VACUUM;"); // compact the file before committing
  db.close();

  const bytes = fs.statSync(OUT_FILE).size;
  console.log(`✓ Wrote ${OUT_FILE}`);
  console.log(`  words: ${words}  ·  word_reviews: ${reviews}  ·  parts_of_speech: ${POS.length}`);
  console.log(`  size: ${(bytes / 1024).toFixed(0)} KB`);
}

main();
