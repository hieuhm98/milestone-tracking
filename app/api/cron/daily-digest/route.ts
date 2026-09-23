import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { deliverDigest, type DigestRecipient } from "@/lib/server/digestDelivery";
import { isTelegramConfigured } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Telegram allows ~30 messages/second per bot; stay well under it. */
const SEND_GAP_MS = 50;

/**
 * Send the daily learning digest to every active learner who linked Telegram.
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET` (see
 * vercel.json); any other scheduler can do the same.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  if (!supabase || !isTelegramConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, lang, telegram_chat_id")
    .eq("status", "active")
    .not("telegram_chat_id", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts = { sent: 0, failed: 0, unlinked: 0 };

  for (const recipient of (data ?? []) as DigestRecipient[]) {
    counts[await deliverDigest(supabase, recipient)] += 1;
    await new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS));
  }

  return NextResponse.json({ recipients: data?.length ?? 0, ...counts });
}
