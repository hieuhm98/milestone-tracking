import "server-only";
import { playgroundFile } from "@/lib/server/playgroundDb";
import { runSqlJob, type SqlStep } from "@/lib/server/sqlWorker";
import type { SqlChallenge } from "@/lib/server/sqlChallenges";
import type { ResultTable, SubmitResult } from "@/lib/sqlChallenges";

// Grades a SQL challenge submission. See the header of lib/server/sqlChallenges.ts
// for the rules; this file is the mechanics.

/** Stop reading a result after this many rows: no answer is that big, and a
 *  stray cross join could otherwise build millions of rows in memory. */
const MAX_ROWS = 50_000;
/** Rows of each result sent back to the page. */
const PREVIEW_ROWS = 50;

interface Execution {
  reader: boolean;
  table: ResultTable;
}

/**
 * The SQL as the `requires` patterns see it: comments and string literals
 * removed (so `-- OVER` or `'LEFT JOIN'` can't satisfy a requirement),
 * upper-cased, whitespace collapsed.
 */
export function normalizeSql(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\( ?/, "");
}

/**
 * Run a challenge's statement — and, for a "modify" challenge whose statement
 * changed something, its check query — on one fresh copy, in the SQL worker
 * pool (so a runaway query is stopped instead of blocking the server).
 */
async function runChallengeSql(challenge: SqlChallenge, sql: string): Promise<Execution> {
  const steps: SqlStep[] = [{ sql, maxRows: MAX_ROWS, keepRows: MAX_ROWS }];

  if (challenge.kind === "modify" && challenge.check) {
    steps.push({ sql: challenge.check, maxRows: MAX_ROWS, keepRows: MAX_ROWS, onlyAfterChange: true });
  }

  const job = await runSqlJob(playgroundFile(challenge.db), steps);

  if (!job.ok) throw new Error(job.error);

  const [first, check] = job.steps;
  const shown = check ?? first;

  return {
    reader: first.reader,
    table: { columns: shown.columns, rows: shown.rows, rowCount: shown.reader ? shown.rowCount : first.changes },
  };
}

// The reference result never changes while the server runs.
const expectedCache = new Map<string, Promise<ResultTable>>();

function expectedFor(challenge: SqlChallenge): Promise<ResultTable> {
  let expected = expectedCache.get(challenge.id);

  if (!expected) {
    expected = runChallengeSql(challenge, challenge.solution).then((r) => r.table);
    expected.catch(() => expectedCache.delete(challenge.id)); // retry next time
    expectedCache.set(challenge.id, expected);
  }

  return expected;
}

/** Values compare loosely where it doesn't matter: 3 equals 3.0, floats to 6 places. */
function normalizeCell(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);

  if (typeof value === "number") return Math.round(value * 1e6) / 1e6;

  if (value instanceof Uint8Array) return Buffer.from(value).toString("hex");

  return value;
}

const rowKey = (row: unknown[]) => JSON.stringify(row.map(normalizeCell));

const preview = (table: ResultTable): ResultTable => ({
  columns: table.columns,
  rows: table.rows.slice(0, PREVIEW_ROWS),
  rowCount: table.rowCount,
});

export async function grade(challenge: SqlChallenge, sql: string): Promise<SubmitResult> {
  const started = process.hrtime.bigint();
  const elapsed = () => Number(process.hrtime.bigint() - started) / 1e6;

  if (!sql.trim()) return { verdict: "error", error: "Empty query.", elapsedMs: 0 };

  const expected = await expectedFor(challenge);
  let mine: Execution;

  try {
    mine = await runChallengeSql(challenge, sql);
  } catch (e) {
    return { verdict: "error", error: e instanceof Error ? e.message : String(e), elapsedMs: elapsed() };
  }

  const wantsRows = challenge.kind === "query";

  if (mine.reader !== wantsRows) {
    return { verdict: "wrong_kind", elapsedMs: elapsed(), expected: preview(expected) };
  }

  const yours = mine.table;
  const fail = (verdict: SubmitResult["verdict"], extra: Partial<SubmitResult> = {}): SubmitResult => ({
    verdict,
    yours: preview(yours),
    expected: preview(expected),
    elapsedMs: elapsed(),
    ...extra,
  });

  if (yours.columns.length !== expected.columns.length) return fail("columns");

  if (yours.rowCount !== expected.rowCount) return fail("row_count");

  const mineKeys = yours.rows.map(rowKey);
  const expectedKeys = expected.rows.map(rowKey);

  if (challenge.ordered) {
    const firstDiff = mineKeys.findIndex((key, i) => key !== expectedKeys[i]);

    if (firstDiff !== -1) {
      const sameRows = [...mineKeys].sort().join("\n") === [...expectedKeys].sort().join("\n");

      return sameRows ? fail("order") : fail("values", { firstDiffRow: firstDiff + 1 });
    }
  } else if ([...mineKeys].sort().join("\n") !== [...expectedKeys].sort().join("\n")) {
    return fail("values");
  }

  const normalized = normalizeSql(sql);
  const missing = challenge.requires.filter((r) => !r.pattern.test(normalized)).map((r) => r.label);

  if (missing.length > 0) return fail("concept", { missing });

  return { verdict: "accepted", yours: preview(yours), elapsedMs: elapsed() };
}
