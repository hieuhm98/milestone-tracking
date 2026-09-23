import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, userFromRequest } from "@/lib/supabase/admin";
import { getBotUsername, isTelegramConfigured } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LINK_TTL_MS = 15 * 60 * 1000;

async function activeProfile(request: Request) {
  const supabase = getSupabaseAdmin();
  const user = await userFromRequest(request);

  if (!supabase || !user) return null;

  const { data } = await supabase.from("profiles").select("id, status").eq("id", user.id).maybeSingle();

  if (!data || data.status !== "active") return null;

  return { supabase, id: data.id as string };
}

/** Issue a one-time deep link: t.me/<bot>?start=<code>. The webhook redeems it. */
export async function POST(request: Request) {
  if (!isTelegramConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const ctx = await activeProfile(request);

  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const username = await getBotUsername();

  if (!username) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const code = randomBytes(18).toString("base64url");
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ telegram_link_code: code, telegram_link_expires: new Date(Date.now() + LINK_TTL_MS).toISOString() })
    .eq("id", ctx.id);

  if (error) return NextResponse.json({ error: "link_failed" }, { status: 500 });

  return NextResponse.json({ url: `https://t.me/${username}?start=${code}` });
}

/** Disconnect Telegram — stops the daily messages. */
export async function DELETE(request: Request) {
  const ctx = await activeProfile(request);

  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await ctx.supabase
    .from("profiles")
    .update({ telegram_chat_id: null, telegram_link_code: null, telegram_link_expires: null })
    .eq("id", ctx.id);

  return NextResponse.json({ ok: true });
}
