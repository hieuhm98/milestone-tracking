import { NextResponse } from "next/server";
import { getSchema, isPlaygroundDb, runQuery, type PlaygroundDb } from "@/lib/server/playgroundDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET  /api/sql-playground?db=fintech       → table structures for the "schema" side panel
// POST /api/sql-playground {sql, db?}       → run one statement against an in-memory clone
//
// `db` is "words" (the English word bank, the default) or "fintech" (the
// digital-lending / e-wallet practice data). Safe to expose: queries run
// against a throwaway copy of a committed read-only file, so nothing the user
// types can mutate stored data.

function dbFrom(value: unknown): PlaygroundDb | null {
  if (value === undefined || value === null || value === "") return "words";

  return isPlaygroundDb(value) ? value : null;
}

export async function GET(request: Request) {
  const db = dbFrom(new URL(request.url).searchParams.get("db"));

  if (!db) return NextResponse.json({ tables: [], error: "Unknown database" }, { status: 400 });

  try {
    return NextResponse.json({ tables: getSchema(db) });
  } catch (e) {
    return NextResponse.json(
      { tables: [], error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: { sql?: string; db?: string };

  try {
    body = (await request.json()) as { sql?: string; db?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.sql !== "string") {
    return NextResponse.json({ error: "Missing `sql` string" }, { status: 400 });
  }

  const db = dbFrom(body.db);

  if (!db) return NextResponse.json({ error: "Unknown database" }, { status: 400 });

  return NextResponse.json(runQuery(body.sql, db));
}
