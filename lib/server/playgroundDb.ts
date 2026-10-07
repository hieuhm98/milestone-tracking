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

function getSnapshot(which: PlaygroundDb): Buffer {
  const cached = snapshots.get(which);

  if (cached) return cached;

  const { file, seed } = DB_FILES[which];
  const dbFile = path.join(process.cwd(), "data", file);

  if (!fs.existsSync(dbFile)) {
    throw new Error(`${file} not found. Run \`node ${seed}\` to build it.`);
  }

  const disk = new Database(dbFile, { readonly: true, fileMustExist: true });
  const snapshot = disk.serialize();
  disk.close();
  snapshots.set(which, snapshot);

  return snapshot;
}

export interface TableSchema {
  name: string;
  rowCount: number;
  columns: { name: string; type: string; pk: boolean; notnull: boolean }[];
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
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
      return {
        name: t.name,
        rowCount: c,
        columns: cols.map((col) => ({
          name: col.name,
          type: col.type || "",
          pk: col.pk > 0,
          notnull: col.notnull > 0,
        })),
      };
    });
  } finally {
    db.close();
  }
}

// Run one user-supplied SQL statement against a disposable in-memory copy.
export function runQuery(sql: string, which: PlaygroundDb = "words"): QueryResult {
  const empty: QueryResult = {
    columns: [],
    rows: [],
    rowCount: 0,
    truncated: false,
    changes: null,
    elapsedMs: 0,
    error: null,
  };

  const trimmed = (sql ?? "").trim();
  if (!trimmed) return { ...empty, error: "Empty query." };

  const db = new Database(getSnapshot(which)); // writable in-memory clone (discarded)
  const started = process.hrtime.bigint();
  try {
    const stmt = db.prepare(trimmed);
    const elapsed = () => Number(process.hrtime.bigint() - started) / 1e6;

    // `reader` is true for statements that return rows (SELECT / PRAGMA / ...).
    if (stmt.reader) {
      stmt.raw(true); // rows as arrays so duplicate/expression column names survive
      const columns = stmt.columns().map((c) => c.name);
      const all = stmt.all() as unknown[][];
      const truncated = all.length > MAX_ROWS;
      return {
        columns,
        rows: truncated ? all.slice(0, MAX_ROWS) : all,
        rowCount: all.length,
        truncated,
        changes: null,
        elapsedMs: elapsed(),
        error: null,
      };
    }

    const info = stmt.run();
    return {
      ...empty,
      changes: info.changes,
      elapsedMs: elapsed(),
    };
  } catch (e) {
    return {
      ...empty,
      elapsedMs: Number(process.hrtime.bigint() - started) / 1e6,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    db.close();
  }
}
