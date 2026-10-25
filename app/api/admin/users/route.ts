import { NextResponse } from "next/server";
import { isMissingColumn, requireAdmin, SCHEMA_HINT } from "@/lib/server/accountAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_COLUMNS = "id, full_name, phone, role, status, created_at, approved_at";

/** Every account, newest first. Admins only; the page filters by status. */
export async function GET(request: Request) {
  const caller = await requireAdmin(request);

  if (caller instanceof NextResponse) return caller;

  const { supabase } = caller;
  const primary = await supabase
    .from("profiles")
    .select(`${BASE_COLUMNS}, must_change_password`)
    .order("created_at", { ascending: false });

  // Still listable before the new schema SQL has been run; the page says so.
  const schemaOutdated = isMissingColumn(primary.error);
  const result = schemaOutdated
    ? await supabase.from("profiles").select(BASE_COLUMNS).order("created_at", { ascending: false })
    : primary;

  if (result.error) {
    console.error("[admin/users] list failed", result.error);

    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  const rows = (result.data ?? []) as unknown as Record<string, unknown>[];
  const users = rows.map((row) => ({ must_change_password: false, ...row }));

  return NextResponse.json(
    { users, me: caller.user.id, ...(schemaOutdated ? { warning: SCHEMA_HINT } : {}) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
