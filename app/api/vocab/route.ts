import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEFAULT_GROUP, getGroup } from "@/lib/groups";
import { encodeWords, MAX_DECK, type WireTopic } from "@/lib/englishPractice";

const CONTENT_DIR = path.join(process.cwd(), "knowledge-content");

interface RawItem {
  id: string;
  lessonId: string;
  word: string;
  pos?: string;
  [field: string]: unknown;
}

interface RawLesson {
  id: string;
  title: string;
  titleEn?: string;
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

function vocabItems(slug: string): RawItem[] {
  const file = path.join(CONTENT_DIR, slug, "vocab.json");

  return fs.existsSync(file) ? readJson<{ items?: RawItem[] }>(file).items ?? [] : [];
}

/** Every topic with vocabulary, in curriculum order, words only. */
function buildIndex(): WireTopic[] {
  const topics: WireTopic[] = [];

  for (const dir of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;

    const items = vocabItems(dir.name);
    const lessonsFile = path.join(CONTENT_DIR, dir.name, "lessons.json");

    if (items.length === 0 || !fs.existsSync(lessonsFile)) continue;

    const meta = readJson<{ group?: string; order?: number; title: string; titleEn?: string }>(
      path.join(CONTENT_DIR, dir.name, "meta.json")
    );
    const { lessons = [] } = readJson<{ lessons?: RawLesson[] }>(lessonsFile);

    topics.push({
      slug: dir.name,
      group: meta.group ?? DEFAULT_GROUP,
      title: meta.title,
      titleEn: meta.titleEn,
      order: meta.order,
      lessons: lessons
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          titleEn: lesson.titleEn,
          words: encodeWords(items.filter((item) => item.lessonId === lesson.id)),
        }))
        .filter((lesson) => lesson.words.length > 0),
    });
  }

  return topics.sort((a, b) => {
    const ga = getGroup(a.group)?.order ?? 99;
    const gb = getGroup(b.group)?.order ?? 99;

    if (ga !== gb) return ga - gb;

    return (a.order ?? 999) - (b.order ?? 999) || a.slug.localeCompare(b.slug);
  });
}

// Content is read-only at runtime, so production builds the index once. Dev
// rebuilds on every request so newly written vocab.json files show up.
let cachedIndex: WireTopic[] | null = null;

/**
 * GET — the word index for the English Practice picker: courses → topics →
 * lessons → `[id, word, pos?]` tuples (decode with `decodeIndex`). Full questions
 * are several KB each and there are thousands, so they are never sent here.
 */
export async function GET() {
  try {
    const production = process.env.NODE_ENV === "production";
    const index = production ? (cachedIndex ??= buildIndex()) : buildIndex();

    return NextResponse.json(
      { topics: index },
      // Content only changes on deploy; let the browser reuse the index between visits.
      production ? { headers: { "Cache-Control": "public, max-age=600" } } : undefined
    );
  } catch {
    return NextResponse.json({ topics: [] });
  }
}

/**
 * POST `{ keys: ["slug#v1", …] }` — the full vocabulary questions for a drawn
 * deck, in the order asked. Unknown keys are skipped; at most MAX_DECK are served.
 */
export async function POST(req: Request) {
  let keys: unknown;

  try {
    ({ keys } = await req.json());
  } catch {
    return NextResponse.json({ error: "Expected JSON { keys: string[] }" }, { status: 400 });
  }

  if (!Array.isArray(keys) || keys.some((k) => typeof k !== "string")) {
    return NextResponse.json({ error: "Expected JSON { keys: string[] }" }, { status: 400 });
  }

  const wanted = (keys as string[]).slice(0, MAX_DECK);
  const bySlug = new Map<string, Map<string, RawItem>>();
  const items: (RawItem & { slug: string })[] = [];

  for (const key of wanted) {
    const hash = key.indexOf("#");
    const slug = key.slice(0, hash);
    const id = key.slice(hash + 1);

    // Slugs map to folder names; refuse anything that could walk out of the content dir.
    if (hash <= 0 || !/^[a-z0-9-]+$/i.test(slug)) continue;

    if (!bySlug.has(slug)) {
      bySlug.set(slug, new Map(vocabItems(slug).map((item) => [item.id, item])));
    }

    const item = bySlug.get(slug)!.get(id);

    if (item) items.push({ ...item, slug });
  }

  return NextResponse.json({ items });
}
