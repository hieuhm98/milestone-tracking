import "server-only";

import fs from "fs";
import path from "path";
import { DEFAULT_GROUP } from "@/lib/groups";
import { headingsOf } from "@/lib/games/text";
import type { TopicMaterial } from "@/lib/games/types";

const CONTENT_DIR = path.join(process.cwd(), "knowledge-content");

function readText(file: string): string {
  try {
    return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
  } catch {
    return "";
  }
}

function readJson<T>(file: string, fallback: T): T {
  try {
    const text = readText(file);

    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

type Raw = Record<string, unknown>;

function parseOrder(raw: Raw): TopicMaterial["orderDrills"][number] | null {
  const items = Array.isArray(raw.items) ? (raw.items as Raw[]) : [];
  const clean = items.map((i) => ({ text: str(i?.text), textEn: str(i?.textEn) })).filter((i) => i.text && i.textEn);

  if (clean.length !== items.length || clean.length < 3) return null;

  return {
    items: clean,
    prompt: str(raw.prompt),
    promptEn: str(raw.promptEn),
    explanation: str(raw.explanation),
    explanationEn: str(raw.explanationEn),
  };
}

function parseMatch(raw: Raw): TopicMaterial["matchDrills"][number] | null {
  const pairs = Array.isArray(raw.pairs) ? (raw.pairs as Raw[]) : [];
  const clean = pairs
    .map((p) => ({ left: str(p?.left), leftEn: str(p?.leftEn), right: str(p?.right), rightEn: str(p?.rightEn) }))
    .filter((p) => p.left && p.leftEn && p.right && p.rightEn);

  if (clean.length !== pairs.length || clean.length < 3) return null;

  return {
    pairs: clean,
    prompt: str(raw.prompt),
    promptEn: str(raw.promptEn),
    explanation: str(raw.explanation),
    explanationEn: str(raw.explanationEn),
  };
}

const cache = new Map<string, TopicMaterial[]>();

/** One course's topics, boiled down to what the puzzle builders read. */
export function loadCourseMaterial(group: string): TopicMaterial[] {
  const hit = process.env.NODE_ENV === "production" ? cache.get(group) : undefined;

  if (hit) return hit;

  let dirs: fs.Dirent[] = [];

  try {
    dirs = fs.readdirSync(CONTENT_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {
    return [];
  }

  const topics: (TopicMaterial & { order: number })[] = [];

  for (const dir of dirs) {
    const at = (name: string) => path.join(CONTENT_DIR, dir.name, name);
    const meta = readJson<Raw | null>(at("meta.json"), null);

    if (!meta || (typeof meta.group === "string" ? meta.group : DEFAULT_GROUP) !== group) continue;

    const articleEn = readText(at("article.en.md"));

    if (!articleEn) continue;

    const vi = headingsOf(readText(at("article.md")));
    const en = headingsOf(articleEn);
    const drills = readJson<{ drills?: Raw[] }>(at("drills.json"), {}).drills ?? [];

    topics.push({
      slug: dir.name,
      order: typeof meta.order === "number" ? meta.order : 999,
      title: str(meta.title) || dir.name,
      titleEn: str(meta.titleEn) || str(meta.title) || dir.name,
      articleEn,
      // Both articles must have the same number of sections or the pairs would drift.
      headings: vi.length === en.length ? en.map((h, i) => ({ vi: vi[i], en: h })) : [],
      orderDrills: drills.filter((d) => d?.type === "order").map(parseOrder).filter((d) => d !== null),
      matchDrills: drills.filter((d) => d?.type === "match").map(parseMatch).filter((d) => d !== null),
    });
  }

  topics.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
  cache.set(group, topics);

  return topics;
}
