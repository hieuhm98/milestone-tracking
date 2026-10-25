import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseAdmin, userFromRequest } from "@/lib/supabase/admin";

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export interface Caller {
  supabase: SupabaseClient;
  user: User;
  role: string;
}

/**
 * Resolve the Bearer token to an *active* account. Returns a ready error
 * response instead when there is no Supabase, no valid token, or the account
 * is not active — so a route can just `if (caller instanceof NextResponse)`.
 */
export async function requireActiveUser(request: Request): Promise<Caller | NextResponse> {
  const supabase = getSupabaseAdmin();

  if (!supabase) return fail("not_configured", 503);

  const user = await userFromRequest(request);

  if (!user) return fail("unauthorized", 401);

  const { data, error } = await supabase.from("profiles").select("status, role").eq("id", user.id).maybeSingle();

  if (error) {
    console.error("[account] profile lookup failed", error);

    return fail("lookup_failed", 500);
  }

  if (!data || data.status !== "active") return fail("forbidden", 403);

  return { supabase, user, role: String(data.role) };
}

/** Same as `requireActiveUser`, and the account must be an admin. */
export async function requireAdmin(request: Request): Promise<Caller | NextResponse> {
  const caller = await requireActiveUser(request);

  if (caller instanceof NextResponse) return caller;

  if (caller.role !== "admin") return fail("forbidden", 403);

  return caller;
}

/** Postgres "undefined column": the schema SQL with `must_change_password` has not been run yet. */
export function isMissingColumn(error: { code?: string } | null): boolean {
  return error?.code === "42703";
}

export const SCHEMA_HINT = "schema_outdated";
