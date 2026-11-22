import "server-only";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

// Asks the dictionary shards (see wordSenses.ts) whether a word is an everyday one.
// The daily puzzles use it to keep "rather" and "happened" out of a course's key-term
// puzzles while letting "idempotency" and "kubernetes" through.

const DIR = path.join(process.cwd(), "data", "dictionary");
const statements = new Map<string, Database.Statement | null>();
const answers = new Map<string, boolean>();

function statementFor(shard: string): Database.Statement | null {
  if (statements.has(shard)) return statements.get(shard)!;

  let statement: Database.Statement | null = null;

  try {
    const file = path.join(DIR, `${shard}.db`);

    if (fs.existsSync(file)) {
      statement = new Database(file, { readonly: true, fileMustExist: true }).prepare(
        "SELECT level FROM words WHERE word = ? AND kind = 'word'"
      );
    }
  } catch {
    statement = null;
  }

  statements.set(shard, statement);

  return statement;
}

function listedAsCommon(key: string): boolean {
  const first = key.charAt(0);
  const row = statementFor(first >= "a" && first <= "z" ? first : "other")?.get(key) as { level: string } | undefined;

  return row?.level === "common";
}

/** True when the dictionary ranks the word among the ~10,000 most common English words. */
export function isCommonWord(word: string): boolean {
  const key = word.toLowerCase();
  const known = answers.get(key);

  if (known !== undefined) return known;

  // Inflections ("assumes", "happened") are rarely listed themselves, so ask about the stem too.
  const stems = [
    key,
    key.replace(/(es|s|ed|d)$/, ""),
    key.replace(/ings?$/, ""),
    key.replace(/ing$/, "e"),
    key.replace(/ied$/, "y"),
  ];
  const common = stems.some((stem) => stem.length >= 3 && listedAsCommon(stem));

  answers.set(key, common);

  return common;
}
