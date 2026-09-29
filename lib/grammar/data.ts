import "server-only";
import fs from "fs";
import path from "path";
import type {
  PartId,
  PartReview,
  ReferencePage,
  Syllabus,
  Trap,
  Unit,
} from "@/lib/grammar/types";

/**
 * Reads the authored JSON in `data/grammar-for-writing/`. Every page of the
 * section is statically generated, so these run at build time and never on the
 * request path — the same arrangement as `lib/ielts/source.ts`.
 *
 * Units, reviews and reference pages are authored one at a time, so a file
 * that is not there yet is not an error: the reader returns `null` and the
 * route calls `notFound()`. `get*Ids()` / `get*Slugs()` list only the files
 * that exist, which keeps `generateStaticParams` honest.
 */
const DIR = path.join(process.cwd(), "data", "grammar-for-writing");

function read<T>(...parts: string[]): T | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, ...parts), "utf-8")) as T;
  } catch {
    return null;
  }
}

function exists(...parts: string[]): boolean {
  return fs.existsSync(path.join(DIR, ...parts));
}

const EMPTY_SYLLABUS: Syllabus = { parts: [], reference: [] };

export async function getSyllabus(): Promise<Syllabus> {
  return read<Syllabus>("syllabus.json") ?? EMPTY_SYLLABUS;
}

export async function getTraps(): Promise<Trap[]> {
  return read<Trap[]>("traps.json") ?? [];
}

/** Unit ids in syllabus order, limited to the files that are authored. */
export async function getUnitIds(): Promise<string[]> {
  const syllabus = await getSyllabus();
  const ids: string[] = [];

  for (const part of syllabus.parts) {
    for (const unit of part.units) {
      if (exists("units", `${unit.id}.json`)) ids.push(unit.id);
    }
  }

  return ids;
}

export async function getUnit(id: string): Promise<Unit | null> {
  // Ids come from the syllabus, but a hand-typed URL must not be able to walk
  // out of the data directory.
  if (!/^[a-z0-9-]+$/.test(id)) return null;

  return read<Unit>("units", `${id}.json`);
}

/** Part ids (upper case) that have a review file. */
export async function getReviewParts(): Promise<PartId[]> {
  const syllabus = await getSyllabus();
  const parts: PartId[] = [];

  for (const part of syllabus.parts) {
    if (reviewFile(part.id)) parts.push(part.id);
  }

  return parts;
}

/** `reviews/A.json` or `reviews/a.json`, whichever the author wrote. */
function reviewFile(part: string): string | null {
  const upper = part.toUpperCase();

  if (exists("reviews", `${upper}.json`)) return `${upper}.json`;

  const lower = part.toLowerCase();

  if (exists("reviews", `${lower}.json`)) return `${lower}.json`;

  return null;
}

export async function getReview(part: string): Promise<PartReview | null> {
  if (!/^[A-Da-d]$/.test(part)) return null;

  const file = reviewFile(part);

  if (!file) return null;

  return read<PartReview>("reviews", file);
}

/** Reference slugs in syllabus order, limited to the files that are authored. */
export async function getReferenceSlugs(): Promise<string[]> {
  const syllabus = await getSyllabus();

  return syllabus.reference
    .map((entry) => entry.slug)
    .filter((slug) => /^[a-z0-9-]+$/.test(slug) && exists("reference", `${slug}.json`));
}

export async function getReference(slug: string): Promise<ReferencePage | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;

  return read<ReferencePage>("reference", `${slug}.json`);
}
