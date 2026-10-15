import { NextResponse } from "next/server";
import { issueSandboxKey } from "@/lib/sandbox/auth";
import { getSupabaseAdmin, userFromRequest } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hand the caller their personal sandbox key.
 *
 * - Signed in (Bearer Supabase token, active profile): the key is derived from
 *   the account, so every device opens the same sandbox.
 * - Otherwise, only when the site is public (no Supabase, or
 *   NEXT_PUBLIC_REQUIRE_LOGIN=0): the key is derived from a random id the
 *   browser keeps, so the sandbox lives with that browser.
 */
export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  const requireLogin = Boolean(supabase) && process.env.NEXT_PUBLIC_REQUIRE_LOGIN !== "0";
  const user = await userFromRequest(request);

  if (user && supabase) {
    const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();

    if (profile?.status !== "active") return NextResponse.json({ error: "account_not_active" }, { status: 403 });

    return NextResponse.json({ key: issueSandboxKey(`user:${user.id}`), scope: "account" });
  }

  if (requireLogin) return NextResponse.json({ error: "login_required" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { browserId?: unknown } | null;
  const browserId = typeof body?.browserId === "string" ? body.browserId : "";

  if (!/^[A-Za-z0-9-]{16,64}$/.test(browserId)) {
    return NextResponse.json({ error: "browser_id_required" }, { status: 400 });
  }

  return NextResponse.json({ key: issueSandboxKey(`browser:${browserId}`), scope: "browser" });
}
