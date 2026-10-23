// Server-only SQLite engine backing the SQL-practice page.
//
// The playground offers two databases, both committed to git (NOT the
// git-ignored `.dev-data/` dev store):
//   * `words`   — `data/word-bank.db`, the English word bank.
//   * `fintech` — `data/fintech.db`, a fictional digital-lending + e-wallet
//                 company, built by `scripts/seed-fintech-db.mjs`.
// To let the user run ANY SQL — SELECT, INSERT, UPDATE, CREATE, ... — without
// ever mutating a committed file, we open it read-only, snapshot it into
// memory, and run the query against that throwaway in-memory copy. Every
// request starts from the pristine file, so results never persist and the
// committed DBs stay byte-stable for git.
//
// Never imported from client components — only from the `/api/sql-playground`
// route handler.

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { runSqlJob } from "@/lib/server/sqlWorker";

export const PLAYGROUND_DBS = ["words", "fintech"] as const;
export type PlaygroundDb = (typeof PLAYGROUND_DBS)[number];

const DB_FILES: Record<PlaygroundDb, { file: string; seed: string }> = {
  words: { file: "word-bank.db", seed: "scripts/seed-word-bank.mjs" },
  fintech: { file: "fintech.db", seed: "scripts/seed-fintech-db.mjs" },
};

export function isPlaygroundDb(value: unknown): value is PlaygroundDb {
  return typeof value === "string" && (PLAYGROUND_DBS as readonly string[]).includes(value);
}

// Cache each on-disk snapshot as a Buffer; a fresh in-memory DB is built from it
// per query so mutations are always discarded.
const snapshots = new Map<PlaygroundDb, Buffer>();

/** Absolute path of a playground database; throws a helpful error when it's missing. */
export function playgroundFile(which: PlaygroundDb): string {
  const { file, seed } = DB_FILES[which];
  const dbFile = path.join(process.cwd(), "data", file);

  if (!fs.existsSync(dbFile)) {
    throw new Error(`${file} not found. Run \`node ${seed}\` to build it.`);
  }

  return dbFile;
}

function getSnapshot(which: PlaygroundDb): Buffer {
  const cached = snapshots.get(which);

  if (cached) return cached;

  const dbFile = playgroundFile(which);

  const disk = new Database(dbFile, { readonly: true, fileMustExist: true });
  const snapshot = disk.serialize();
  disk.close();
  snapshots.set(which, snapshot);

  return snapshot;
}

export interface ForeignKey {
  /** Column in this table… */
  from: string;
  /** …that points at this table's column. */
  table: string;
  to: string;
}

export interface TableSchema {
  name: string;
  rowCount: number;
  columns: { name: string; type: string; pk: boolean; notnull: boolean }[];
  /** Drawn as the links of the schema diagram. */
  foreignKeys: ForeignKey[];
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
  /** More rows than COUNT_LIMIT: rowCount is a floor, shown as "100,000+". */
  capped: boolean;
  changes: number | null; // set for non-SELECT statements (INSERT/UPDATE/...)
  elapsedMs: number;
  error: string | null;
}

const MAX_ROWS = 1000;

// Describe every user table so the page can render "table structures on the side".
export function getSchema(which: PlaygroundDb = "words"): TableSchema[] {
  const db = new Database(getSnapshot(which), { readonly: true });
  try {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all() as { name: string }[];

    return tables.map((t) => {
      const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all() as {
        name: string;
        type: string;
        pk: number;
        notnull: number;
      }[];
      const { c } = db.prepare(`SELECT COUNT(*) AS c FROM "${t.name}"`).get() as {
        c: number;
      };
      const fks = db.prepare(`PRAGMA foreign_key_list("${t.name}")`).all() as {
        table: string;
        from: string;
        to: string | null;
      }[];
      // A REFERENCES without a column name points at the parent's primary key.
      const pkOf = (table: string) =>
        (db.prepare(`PRAGMA table_info("${table}")`).all() as { name: string; pk: number }[]).find((col) => col.pk > 0)
          ?.name ?? "rowid";

      return {
        name: t.name,
        rowCount: c,
        columns: cols.map((col) => ({
          name: col.name,
          type: col.type || "",
          pk: col.pk > 0,
          notnull: col.notnull > 0,
        })),
        foreignKeys: fks.map((fk) => ({ from: fk.from, table: fk.table, to: fk.to ?? pkOf(fk.table) })),
      };
    });
  } finally {
    db.close();
  }
}

// How many rows a playground query counts before giving up ("100,000+ rows").
const COUNT_LIMIT = 100_000;

/**
 * Run one user-supplied SQL statement against a disposable in-memory copy, in
 * the SQL worker pool (lib/server/sqlWorker.ts) so a runaway query is stopped
 * after a few seconds instead of blocking the server.
 */
export async function runQuery(sql: string, which: PlaygroundDb = "words"): Promise<QueryResult> {
  const empty: QueryResult = {
    columns: [],
    rows: [],
    rowCount: 0,
    truncated: false,
    capped: false,
    changes: null,
    elapsedMs: 0,
    error: null,
  };

  const trimmed = (sql ?? "").trim();

  if (!trimmed) return { ...empty, error: "Empty query." };

  const job = await runSqlJob(playgroundFile(which), [{ sql: trimmed, maxRows: COUNT_LIMIT, keepRows: MAX_ROWS }]);

  if (!job.ok) return { ...empty, elapsedMs: job.elapsedMs, error: job.error };

  const [step] = job.steps;

  if (!step.reader) return { ...empty, changes: step.changes, elapsedMs: job.elapsedMs };

  const capped = step.rowCount > COUNT_LIMIT;

  return {
    columns: step.columns,
    rows: step.rows,
    rowCount: capped ? COUNT_LIMIT : step.rowCount,
    truncated: step.rowCount > step.rows.length,
    capped,
    changes: null,
    elapsedMs: job.elapsedMs,
    error: null,
  };
}
