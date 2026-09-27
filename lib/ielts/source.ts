import "server-only";
import fs from "fs";
import path from "path";
import type { CueCard, Intro, Part1Topic, Toc } from "@/lib/ielts/types";

/**
 * Reads the converted PDF in `data/ielts-speaking/` (written by
 * `scripts/ielts/extract.py`). The section's pages are statically generated,
 * so these run at build time; nothing here touches the request path.
 */
const DIR = path.join(process.cwd(), "data", "ielts-speaking");

function read<T>(...parts: string[]): T {
  return JSON.parse(fs.readFileSync(path.join(DIR, ...parts), "utf-8")) as T;
}

export function readToc(): Toc {
  return read<Toc>("toc.json");
}

export function readIntro(): Intro {
  return read<Intro>("intro.json");
}

export function readPart1Slugs(): string[] {
  return readToc().part1.map((section) => section.slug);
}

export function readPart1Topic(slug: string): Part1Topic | null {
  // Slugs come from the contents file, but a hand-typed URL must not be able
  // to walk out of the data directory.
  if (!/^[a-z0-9-]+$/.test(slug)) return null;

  try {
    return read<Part1Topic>("part1", `${slug}.json`);
  } catch {
    return null;
  }
}

export function readCardSlugs(): string[] {
  return readToc().part23.map((section) => section.slug);
}

export function readCard(slug: string): CueCard | null {
  const match = /^card-(\d+)$/.exec(slug);

  if (!match) return null;

  try {
    return read<CueCard>("part23", `card-${match[1]}.json`);
  } catch {
    return null;
  }
}
