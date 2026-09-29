// Paths, anchors and the one reading order of the Grammar for Writing section.
//
// The section lives in the English half of the site; every link in the section
// is built from GRAMMAR_BASE so the base path is written down once.

import type { PartId, Syllabus, SyllabusPart, SyllabusUnit } from "@/lib/grammar/types";

export const GRAMMAR_BASE = "/english/grammar-for-writing";

export function unitHref(id: string): string {
  return `${GRAMMAR_BASE}/${id}`;
}

export function reviewHref(part: PartId | string): string {
  return `${GRAMMAR_BASE}/review/${String(part).toLowerCase()}`;
}

export function trapsHref(): string {
  return `${GRAMMAR_BASE}/traps`;
}

export function referenceHref(slug: string): string {
  return `${GRAMMAR_BASE}/reference/${slug}`;
}

/** The anchor of a trap card, used by every "See the trap" link. */
export function trapAnchor(id: string): string {
  return `trap-${id}`;
}

/** Every unit of the section, in reading order across the four Parts. */
export function flattenUnits(syllabus: Syllabus): SyllabusUnit[] {
  return syllabus.parts.flatMap((part) => part.units);
}

export interface Neighbours {
  prev: SyllabusUnit | null;
  next: SyllabusUnit | null;
}

export function unitNeighbours(units: SyllabusUnit[], id: string): Neighbours {
  const index = units.findIndex((unit) => unit.id === id);

  if (index === -1) return { prev: null, next: null };

  return {
    prev: index > 0 ? units[index - 1] : null,
    next: index < units.length - 1 ? units[index + 1] : null,
  };
}

export function partOf(syllabus: Syllabus, unitId: string): SyllabusPart | null {
  return syllabus.parts.find((part) => part.units.some((unit) => unit.id === unitId)) ?? null;
}

/** "Part A · Verbs and time" — the same wording in the bar and the cards. */
export function partLabel(part: SyllabusPart): string {
  return `Part ${part.id} · ${part.title}`;
}
