// Shared (client-safe) types for the SQL challenges on /practice/sql/challenges.
// The challenges themselves, with their reference solutions, live server-side
// in lib/server/sqlChallenges.ts — the browser only ever sees this public part.

export type ChallengeDb = "words" | "fintech";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export interface Bilingual {
  vi: string;
  en: string;
}

/** What GET /api/sql-challenges sends: everything except the answer. */
export interface PublicChallenge {
  id: string;
  /** 1-based position in the easy → hard sequence. */
  number: number;
  difficulty: Difficulty;
  db: ChallengeDb;
  /** "query" returns rows; "modify" changes data or schema (INSERT, CREATE …). */
  kind: "query" | "modify";
  title: Bilingual;
  /** Markdown-light: paragraphs, "- " bullets and `code`. */
  prompt: Bilingual;
  hint: Bilingual;
  /** The SQL features this challenge practises — and requires. */
  concepts: string[];
  /** Whether row order is part of the answer. */
  ordered: boolean;
}

export interface ResultTable {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
}

export type Verdict =
  | "accepted"
  | "error" // the SQL did not run
  | "wrong_kind" // a SELECT where a change was asked for, or the other way round
  | "columns" // different number of columns
  | "row_count"
  | "values"
  | "order" // right rows, wrong order
  | "concept"; // right answer without the feature the challenge practises

export interface SubmitResult {
  verdict: Verdict;
  error?: string;
  /** Concepts the query did not use (verdict "concept"). */
  missing?: string[];
  /** First differing row, 1-based (verdict "values"). */
  firstDiffRow?: number;
  /** What the query produced — rows, or the check query's rows for a "modify" challenge. */
  yours?: ResultTable;
  expected?: ResultTable;
  elapsedMs: number;
}

export interface Solution {
  sql: string;
  explanation: Bilingual;
}
