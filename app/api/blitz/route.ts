import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEFAULT_GROUP, GROUPS } from "@/lib/groups";
import { parseDrill, type Drill } from "@/lib/drills";
import { buildDeck, DECK_SIZE, type BlitzItemFormat, type BlitzTopic } from "@/lib/blitz";
import { type Question } from "@/components/knowledge/QuizBlock";

const CONTENT_DIR = path.join(process.cwd(), "knowledge-content");

const ALL_FORMATS: BlitzItemFormat[] = ["mcq", "multi", "recall", "match", "order"];

interface LoadedTopic extends BlitzTopic {
  group: string;
  order: number;
}

function readJson<T>(file: string, fallback: T): T {
  try {
    return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf-8")) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Read every topic's question bank and drill set.
 *
 * A topic with no `drills.json` is not an error — the format rolls out track by
 * track, and a topic without one simply contributes multiple-choice questions.
 */
function loadTopics(): LoadedTopic[] {
  let dirs: fs.Dirent[] = [];

  try {
    dirs = fs.readdirSync(CONTENT_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return [];
  }

  const topics: LoadedTopic[] = [];

  for (const dir of dirs) {
    const at = (name: string) => path.join(CONTENT_DIR, dir.name, name);
    const meta = readJson<Record<string, unknown> | null>(at("meta.json"), null);

    if (!meta) continue;

    const questions = readJson<Question[]>(at("questions.json"), []);
    const rawDrills = readJson<{ drills?: unknown[] }>(at("drills.json"), {});
    const drills = (rawDrills.drills ?? [])
      .map(parseDrill)
      .filter((d): d is Drill => d !== null);

    topics.push({
      slug: dir.name,
      group: typeof meta.group === "string" ? meta.group : DEFAULT_GROUP,
      order: typeof meta.order === "number" ? meta.order : 999,
      title: String(meta.title ?? dir.name),
      titleEn: String(meta.titleEn ?? meta.title ?? dir.name),
      questions: Array.isArray(questions) ? questions : [],
      drills,
    });
  }

  return topics.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

/** Per-track pool sizes, for the setup screen's "what's in here" line. */
function poolStats(topics: LoadedTopic[]) {
  return GROUPS.map((group) => {
    const mine = topics.filter((t) => t.group === group.id);
    const byFormat: Record<string, number> = { mcq: 0, multi: 0, recall: 0, match: 0, order: 0 };

    for (const topic of mine) {
      byFormat.mcq += topic.questions.length;

      for (const drill of topic.drills) byFormat[drill.type] += 1;
    }

    return {
      group: group.id,
      topics: mine.length,
      questions: byFormat.mcq,
      drills: byFormat.multi + byFormat.recall + byFormat.match + byFormat.order,
      byFormat,
    };
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const group = url.searchParams.get("group");
  const topics = loadTopics();

  if (!group) {
    return NextResponse.json({ pools: poolStats(topics) });
  }

  const mine = topics.filter((t) => t.group === group);

  if (mine.length === 0) {
    return NextResponse.json({ error: "Unknown track" }, { status: 404 });
  }

  const requested = (url.searchParams.get("formats") ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter((f): f is BlitzItemFormat => (ALL_FORMATS as string[]).includes(f));

  const sizeParam = Number(url.searchParams.get("size"));
  const size = Number.isFinite(sizeParam) && sizeParam > 0 ? Math.min(200, Math.floor(sizeParam)) : DECK_SIZE;

  // The deck is drawn per request, so two runs of the same track are two
  // different papers — a blitz you can memorise stops being a blitz.
  const items = buildDeck(mine, Math.random, {
    formats: new Set(requested),
    size,
  });

  return NextResponse.json({
    group,
    items,
    topics: mine.map((t) => ({ slug: t.slug, title: t.title, titleEn: t.titleEn })),
  });
}
