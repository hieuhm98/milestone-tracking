import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Supabase's free plan pauses a project after 7 days without activity. A
 * tiny real query every day (vercel.json) keeps it awake even when nobody
 * visits and no one has linked Telegram, so the digest cron may not touch it.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true });

  if (error) {
    console.error("[keep-alive] query failed", error);

    return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, profiles: count ?? 0, at: new Date().toISOString() });
}
