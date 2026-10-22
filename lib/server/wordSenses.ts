import "server-only";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { normalizeTerm, type SenseGroup, type WordSenses } from "@/lib/dictionary";

// Built by scripts/build_dictionary.py, one SQLite file per first letter
// (a.db … z.db, other.db). Kept apart from word-bank.db so the SQL playground,
// which copies the word bank per query, stays small. Only the server reads
// these; the browser gets one word's senses as JSON.
export const DICTIONARY_DIR = path.join(process.cwd(), "data", "dictionary");

const SQL = `SELECT s.id, s.lang, s.pos_code, s.phrase, s.meaning, e.text, e.translation
               FROM words w
               JOIN senses s ON s.word_id = w.id
               LEFT JOIN examples e ON e.sense_id = s.id
              WHERE w.word = ?
              ORDER BY s.position, e.position`;

interface Row {
  id: number;
  lang: "vi" | "en";
  pos_code: string | null;
  phrase: string | null;
  meaning: string;
  text: string | null;
  translation: string | null;
}

/** Mirrors shard_of() in scripts/build_dictionary.py — keep the two in step. */
function shardOf(key: string): string {
  const first = key.charAt(0);

  return first >= "a" && first <= "z" ? first : "other";
}

// Each shard is opened on first use and kept; null = missing or unreadable.
const statements = new Map<string, Database.Statement | null>();

function statementFor(shard: string): Database.Statement | null {
  if (statements.has(shard)) return statements.get(shard)!;

  let statement: Database.Statement | null = null;

  try {
    const file = path.join(DICTIONARY_DIR, `${shard}.db`);

    if (fs.existsSync(file)) {
      statement = new Database(file, { readonly: true, fileMustExist: true }).prepare(SQL);
    }
  } catch {
    statement = null;
  }

  statements.set(shard, statement);

  return statement;
}

export function lookupSenses(word: string): WordSenses | null {
  const key = normalizeTerm(word);
  const rows = statementFor(shardOf(key))?.all(key) as Row[] | undefined;

  if (!rows?.length) return null;

  const out: WordSenses = { vi: [], en: [] };
  let lastId = -1;

  for (const row of rows) {
    const groups: SenseGroup[] = out[row.lang];

    if (row.id !== lastId) {
      lastId = row.id;
      let group = groups[groups.length - 1];

      if (!group || group.pos !== (row.pos_code ?? undefined)) {
        group = { pos: row.pos_code ?? undefined, senses: [] };
        groups.push(group);
      }

      group.senses.push({ meaning: row.meaning, phrase: row.phrase ?? undefined, examples: [] });
    }

    if (row.text) {
      const group = groups[groups.length - 1];

      group.senses[group.senses.length - 1].examples.push({
        text: row.text,
        translation: row.translation ?? undefined,
      });
    }
  }

  return out;
}
