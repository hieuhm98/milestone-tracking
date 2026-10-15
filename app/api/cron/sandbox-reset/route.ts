import { NextResponse } from "next/server";
import { deleteStaleSandboxes, sandboxDay } from "@/lib/sandbox/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Midnight in Vietnam (17:00 UTC, vercel.json): delete every API sandbox from
 * an earlier day. Learners would see the default data anyway — a stale row is
 * read as the seed — so this only keeps the table from growing.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // A few seconds early or late must still clear "yesterday", so allow a minute of slack.
  const day = sandboxDay(new Date(Date.now() + 60 * 1000));

  try {
    const removed = await deleteStaleSandboxes(day);

    return NextResponse.json({ ok: true, day, removed });
  } catch (err) {
    console.error("[sandbox-reset]", err);

    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
