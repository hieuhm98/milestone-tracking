import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { seedData } from "./seed";
import type { SandboxData } from "./types";

// Where sandboxes live. On Vercel the filesystem is read-only, so with Supabase
// configured each sandbox is one row of public.api_sandboxes (owner, day,
// version, data). Without Supabase (local dev) a process-memory map stands in.
//
// The daily reset is lazy: a row stamped with an earlier day is simply treated
// as the default dataset, so nobody sees yesterday's data even if the cleanup
// cron never ran. The cron (/api/cron/sandbox-reset) just deletes old rows.

export const SANDBOX_TIME_ZONE = "Asia/Ho_Chi_Minh";

/** Today's date in Vietnam time, YYYY-MM-DD. */
export function sandboxDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SANDBOX_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** The instant the current sandbox day ends: the next midnight in Vietnam (UTC+7, no DST). */
export function sandboxResetsAt(now: Date): string {
  const [y, m, d] = sandboxDay(now).split("-").map(Number);

  return new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - 7 * 60 * 60 * 1000).toISOString();
}

export interface LoadedSandbox {
  data: SandboxData;
  /** Version of the stored row (0 = no row yet); a save must match it. */
  version: number;
  exists: boolean;
}

interface Row {
  day: string;
  version: number;
  data: SandboxData;
}

const TABLE = "api_sandboxes";

/** A Supabase failure, tagged when the cause is that supabase/schema.sql was never run. */
export class SandboxStorageError extends Error {
  constructor(
    action: string,
    readonly missingTable: boolean,
    detail: string
  ) {
    super(`sandbox ${action} failed: ${detail}`);
  }
}

// PGRST205: PostgREST has no such table in its schema cache; 42P01: Postgres undefined_table.
const storageError = (action: string, error: { code?: string; message: string }) =>
  new SandboxStorageError(action, error.code === "PGRST205" || error.code === "42P01" || error.message.includes(TABLE), `${error.code ?? ""} ${error.message}`.trim());
const memory: Map<string, Row> =
  ((globalThis as { __apiSandboxes?: Map<string, Row> }).__apiSandboxes ??= new Map());

/**
 * Bring a sandbox saved by an older version of the API up to date. Rows live
 * for a day, so this only matters on the day a table is added (cart_items,
 * 2026-10-24) — but a missing table would crash every request until midnight.
 */
function upgrade(data: SandboxData): SandboxData {
  const seq = { ...data.seq };

  seq.cart_items ??= 0;

  return { ...data, cart_items: data.cart_items ?? [], seq };
}

export async function loadSandbox(owner: string, day: string): Promise<LoadedSandbox> {
  const supabase = getSupabaseAdmin();
  let row: Row | null;

  if (supabase) {
    const { data, error } = await supabase.from(TABLE).select("day, version, data").eq("owner", owner).maybeSingle();

    if (error) throw storageError("load", error);

    row = data as Row | null;
  } else {
    row = memory.get(owner) ?? null;
  }

  if (!row) return { data: seedData(), version: 0, exists: false };

  // Yesterday's (or older) data never comes back: today starts from the seed.
  if (row.day !== day) return { data: seedData(), version: row.version, exists: true };

  return { data: upgrade(row.data), version: row.version, exists: true };
}

/**
 * Save if nobody else saved since we loaded (optimistic locking on `version`).
 * Returns false on a conflict; the caller reloads and replays the request.
 */
export async function saveSandbox(owner: string, day: string, loaded: LoadedSandbox, data: SandboxData): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const next: Row = { day, version: loaded.version + 1, data };

  if (!supabase) {
    const current = memory.get(owner);

    if ((current?.version ?? 0) !== loaded.version) return false;

    memory.set(owner, next);

    return true;
  }

  if (!loaded.exists) {
    const { error } = await supabase.from(TABLE).insert({ owner, ...next, updated_at: new Date().toISOString() });

    // 23505 = unique violation: another request created the row first.
    if (error?.code === "23505") return false;

    if (error) throw storageError("save", error);

    return true;
  }

  const { data: updated, error } = await supabase
    .from(TABLE)
    .update({ ...next, updated_at: new Date().toISOString() })
    .eq("owner", owner)
    .eq("version", loaded.version)
    .select("owner");

  if (error) throw storageError("save", error);

  return (updated?.length ?? 0) === 1;
}

/** Delete every sandbox from an earlier day. Returns how many went. */
export async function deleteStaleSandboxes(day: string): Promise<number> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    let removed = 0;

    for (const [owner, row] of Array.from(memory)) {
      if (row.day < day) {
        memory.delete(owner);
        removed += 1;
      }
    }

    return removed;
  }

  const { data, error } = await supabase.from(TABLE).delete().lt("day", day).select("owner");

  if (error) throw storageError("cleanup", error);

  return data?.length ?? 0;
}
