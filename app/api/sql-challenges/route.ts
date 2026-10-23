import { NextResponse } from "next/server";
import { CHALLENGES, getChallenge, toPublic } from "@/lib/server/sqlChallenges";
import { grade } from "@/lib/server/sqlGrader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET  /api/sql-challenges                     → every challenge, without answers
// GET  /api/sql-challenges?id=…&solution=1     → one challenge's reference solution
// POST /api/sql-challenges {id, sql}           → grade a submission
//
// Submissions run on a throwaway in-memory copy of the challenge's database, in
// the SQL worker pool with a time limit (lib/server/sqlWorker.ts), so nothing a
// learner types can change stored data or hang the server.

export function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) return NextResponse.json({ challenges: CHALLENGES.map(toPublic) });

  const challenge = getChallenge(id);

  if (!challenge) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (url.searchParams.get("solution") === "1") {
    return NextResponse.json({ solution: { sql: challenge.solution, explanation: challenge.explanation } });
  }

  return NextResponse.json({ challenge: toPublic(challenge) });
}

export async function POST(request: Request) {
  let body: { id?: unknown; sql?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.id !== "string" || typeof body.sql !== "string") {
    return NextResponse.json({ error: "Expected {id, sql} strings" }, { status: 400 });
  }

  const challenge = getChallenge(body.id);

  if (!challenge) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    return NextResponse.json(await grade(challenge, body.sql));
  } catch (e) {
    // Only the reference solution failing lands here — a bug, not the learner's fault.
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
