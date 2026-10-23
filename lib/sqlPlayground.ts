// Client-safe types for the SQL playground API (app/api/sql-playground) —
// mirrors lib/server/playgroundDb.ts, which can't be imported from the browser.

export type PlaygroundDb = "words" | "fintech";

export interface ColumnSchema {
  name: string;
  type: string;
  pk: boolean;
  notnull: boolean;
}

export interface ForeignKey {
  from: string;
  table: string;
  to: string;
}

export interface TableSchema {
  name: string;
  rowCount: number;
  columns: ColumnSchema[];
  foreignKeys: ForeignKey[];
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
  /** The query returned more rows than the server counts; rowCount is a floor. */
  capped?: boolean;
  changes: number | null;
  elapsedMs: number;
  error: string | null;
}
