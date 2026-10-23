import "server-only";
import { Worker } from "worker_threads";

// Runs learner SQL off the main thread, with a time limit.
//
// better-sqlite3 is synchronous and cannot interrupt a running statement, so a
// runaway query (a recursive CTE with no stop, a huge cross join) used to block
// the whole server until it finished — if it ever did. Here every job runs in a
// worker thread; a job that outlives TIMEOUT_MS gets its worker terminated
// (which kills the statement mid-flight) and a fresh worker takes its place.
//
// Each worker keeps an in-memory snapshot of each database file it has opened
// and runs every job on a throwaway copy of it, so nothing a job does persists.
//
// The worker is created from source (`eval: true`) rather than a file, so it
// survives Next's bundling unchanged; it `require`s better-sqlite3 from
// node_modules, which the routes' file tracing already ships.

export const TIMEOUT_MS = 5_000;
const POOL_SIZE = 2;

export interface SqlStep {
  sql: string;
  /** Stop counting rows after this many (rowCount becomes maxRows + 1). */
  maxRows: number;
  /** Rows to send back (the rest are only counted). */
  keepRows: number;
  /** Run only when the previous step changed data rather than returning rows. */
  onlyAfterChange?: boolean;
}

export interface StepResult {
  reader: boolean;
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  changes: number;
}

export type JobResult =
  | { ok: true; steps: StepResult[]; elapsedMs: number }
  | { ok: false; error: string; timedOut: boolean; elapsedMs: number };

const WORKER_SOURCE = `
const { parentPort } = require("worker_threads");
const Database = require("better-sqlite3");
const snapshots = new Map();

function snapshot(file) {
  let data = snapshots.get(file);

  if (!data) {
    const disk = new Database(file, { readonly: true, fileMustExist: true });
    data = disk.serialize();
    disk.close();
    snapshots.set(file, data);
  }

  return data;
}

parentPort.on("message", ({ id, file, steps }) => {
  const started = process.hrtime.bigint();
  const elapsed = () => Number(process.hrtime.bigint() - started) / 1e6;
  let db = null;

  try {
    db = new Database(snapshot(file));
    const out = [];

    for (const step of steps) {
      if (step.onlyAfterChange && (out.length === 0 || out[out.length - 1].reader)) break;

      const stmt = db.prepare(step.sql.trim());

      if (!stmt.reader) {
        const info = stmt.run();
        out.push({ reader: false, columns: [], rows: [], rowCount: 0, changes: info.changes });
        continue;
      }

      stmt.raw(true);
      const columns = stmt.columns().map((c) => c.name);
      const rows = [];
      let rowCount = 0;

      for (const row of stmt.iterate()) {
        rowCount += 1;

        if (rowCount > step.maxRows) break;

        if (rows.length < step.keepRows) rows.push(row);
      }

      out.push({ reader: true, columns, rows, rowCount, changes: 0 });
    }

    parentPort.postMessage({ id, ok: true, steps: out, elapsedMs: elapsed() });
  } catch (e) {
    parentPort.postMessage({ id, ok: false, error: e && e.message ? e.message : String(e), timedOut: false, elapsedMs: elapsed() });
  } finally {
    if (db) db.close();
  }
});
`;

interface Pending {
  resolve: (result: JobResult) => void;
  timer: ReturnType<typeof setTimeout>;
  started: number;
}

interface Slot {
  worker: Worker | null;
  pending: Map<number, Pending>;
}

const slots: Slot[] = Array.from({ length: POOL_SIZE }, () => ({ worker: null, pending: new Map() }));
const queue: { file: string; steps: SqlStep[]; resolve: (r: JobResult) => void }[] = [];
let nextId = 0;

function settleAll(pending: Map<number, Pending>, result: (p: Pending) => JobResult) {
  for (const p of Array.from(pending.values())) {
    clearTimeout(p.timer);
    p.resolve(result(p));
  }

  pending.clear();
}

function workerFor(slot: Slot): Worker {
  if (slot.worker) return slot.worker;

  const worker = new Worker(WORKER_SOURCE, { eval: true });
  // This worker's own jobs. A timed-out worker is replaced together with its map,
  // so its late exit event can't fail jobs that its replacement has taken on.
  const pending = new Map<number, Pending>();

  slot.pending = pending;

  worker.on("message", (msg: { id: number } & JobResult) => {
    const p = pending.get(msg.id);

    if (!p) return;

    clearTimeout(p.timer);
    pending.delete(msg.id);
    const { id: _id, ...result } = msg;
    p.resolve(result as JobResult);
    pump();
  });

  // A crash (e.g. out of memory) fails the jobs in flight; the next job gets a new worker.
  const fail = (error: string) => {
    if (slot.worker === worker) slot.worker = null;

    settleAll(pending, (p) => ({ ok: false, error, timedOut: false, elapsedMs: Date.now() - p.started }));
    pump();
  };

  worker.on("error", (e) => fail(e instanceof Error ? e.message : String(e)));
  worker.on("exit", (code) => {
    if (code !== 0) fail(`The query worker stopped (exit code ${code}).`);
  });
  worker.unref(); // never keep the process alive on its own

  slot.worker = worker;

  return worker;
}

function pump() {
  for (const slot of slots) {
    if (queue.length === 0) return;

    if (slot.pending.size > 0) continue;

    const job = queue.shift()!;
    const id = ++nextId;
    const worker = workerFor(slot);
    const started = Date.now();

    const pending = slot.pending;

    const timer = setTimeout(() => {
      const p = pending.get(id);

      if (!p) return;

      pending.delete(id);
      slot.worker = null;
      slot.pending = new Map();
      void worker.terminate(); // the only way to stop a statement in flight
      p.resolve({
        ok: false,
        error: `Stopped: the query ran longer than ${TIMEOUT_MS / 1000} seconds.`,
        timedOut: true,
        elapsedMs: Date.now() - started,
      });
      pump();
    }, TIMEOUT_MS);

    pending.set(id, { resolve: job.resolve, timer, started });
    worker.postMessage({ id, file: job.file, steps: job.steps });
  }
}

/** Run the steps, in order, on one fresh copy of the database at `file`. */
export function runSqlJob(file: string, steps: SqlStep[]): Promise<JobResult> {
  return new Promise((resolve) => {
    queue.push({ file, steps, resolve });
    pump();
  });
}
