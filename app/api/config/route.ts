import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What the *server* has configured, so the UI can hide features it can't
 * deliver and a deploy can be checked from the browser. Names of missing
 * variables only — never a value.
 */
export function GET() {
  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  const accounts = missing.length === 0;

  return NextResponse.json({
    accounts,
    // Telegram is entirely optional: accounts work without it, only the daily
    // digest and its sidebar button disappear.
    telegram: accounts && Boolean(process.env.TELEGRAM_BOT_TOKEN),
    cron: Boolean(process.env.CRON_SECRET),
    missing,
  });
}
