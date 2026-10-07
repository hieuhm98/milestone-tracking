import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// GET  /api/review              → a light index of every quiz question:
//                                  { topics: { [slug]: [[id, answerIndex], ...] } }
// POST /api/review {keys}        → the full questions for those `${slug}#${id}` keys,
//                                  in the order asked, each with `topic_slug`.
//
// The review page used to fetch every selected topic in full (articles
// included) and draw from the lot — with 170+ topics that was hundreds of
// requests and several MB for a 10-question session. Now it picks the keys
// itself from the index (it needs the answer index to find past mistakes)
// and asks only for those.

const CONTENT_DIR = path.join(process.cwd(), "knowledge-content");
const MAX_KEYS = 300;

interface RawQuestion {
  id: string;
  answer: number;
  [field: string]: unknown;
}

function readQuestions(slug: string): RawQuestion[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, slug, "questions.json"), "utf-8"));

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function topicSlugs(): string[] {
  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

export async function GET() {
  const topics: Record<string, [string, number][]> = {};

  for (const slug of topicSlugs()) {
    const questions = readQuestions(slug);

    if (questions.length) topics[slug] = questions.map((q) => [q.id, q.answer]);
  }

  return NextResponse.json({ topics });
}

export async function POST(request: Request) {
  let body: { keys?: unknown };

  try {
    body = (await request.json()) as { keys?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.keys) || !body.keys.every((k) => typeof k === "string")) {
    return NextResponse.json({ error: "`keys` must be an array of strings" }, { status: 400 });
  }

  const keys = (body.keys as string[]).slice(0, MAX_KEYS);
  const known = new Set(topicSlugs());
  const bySlug = new Map<string, Map<string, RawQuestion>>();

  for (const key of keys) {
    const slug = key.slice(0, key.indexOf("#"));

    if (!known.has(slug) || bySlug.has(slug)) continue;

    bySlug.set(slug, new Map(readQuestions(slug).map((q) => [q.id, q])));
  }

  const questions = keys.flatMap((key) => {
    const hash = key.indexOf("#");
    const slug = key.slice(0, hash);
    const q = bySlug.get(slug)?.get(key.slice(hash + 1));

    return q ? [{ ...q, topic_slug: slug }] : [];
  });

  return NextResponse.json({ questions });
}
