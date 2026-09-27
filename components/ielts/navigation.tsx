// Paths, anchors and the single reading order of the section.
//
// Previous / Next has to run without a break from the first Part 1 question to
// the last Part 3 follow-up of the last card, so both pages derive their links
// from one flattened list built out of the contents tree.

import type { Toc, TocSection } from "@/lib/ielts/types";

export const IELTS_BASE = "/english/ielts-speaking";

export function part1Href(slug: string): string {
  return `${IELTS_BASE}/part-1/${slug}`;
}

export function cardHref(slug: string): string {
  return `${IELTS_BASE}/part-2-3/${slug}`;
}

/** "card-12" → 12. Returns NaN when the slug is not a card slug. */
export function cardNumber(slug: string): number {
  const match = /^card-(\d+)$/.exec(slug);

  return match ? Number(match[1]) : NaN;
}

/**
 * The in-page anchor for a question id: `p1-q18` → `q18`, `c1-part2` →
 * `part2`, `c1-p3-4` → `p3-4`.
 */
export function anchorFor(id: string): string {
  const part1 = /^p\d+-q(\d+)$/.exec(id);

  if (part1) return `q${part1[1]}`;

  const part3 = /-p3-(\d+)$/.exec(id);

  if (part3) return `p3-${part3[1]}`;

  return "part2";
}

export interface FlatEntry {
  id: string;
  /** Full href including the anchor. */
  href: string;
  /** "Topic 1 · 18", "Card 1 · Part 2" — shown as the Prev/Next hint. */
  label: string;
}

/** Every question of the section, in reading order: Part 1 first, then cards. */
export function flattenToc(toc: Toc): FlatEntry[] {
  const entries: FlatEntry[] = [];

  for (const section of toc.part1) {
    for (const question of section.questions) {
      entries.push({
        id: question.id,
        href: `${part1Href(section.slug)}#${anchorFor(question.id)}`,
        label: `${section.label} · ${question.label}`,
      });
    }
  }

  for (const section of toc.part23) {
    for (const question of section.questions) {
      entries.push({
        id: question.id,
        href: `${cardHref(section.slug)}#${anchorFor(question.id)}`,
        label: `${section.label} · ${question.label}`,
      });
    }
  }

  return entries;
}

export interface Neighbours<T> {
  prev: T | null;
  next: T | null;
}

/** The questions either side of `id` in the flattened reading order. */
export function questionNeighbours(entries: FlatEntry[], id: string): Neighbours<FlatEntry> {
  const index = entries.findIndex((entry) => entry.id === id);

  if (index === -1) return { prev: null, next: null };

  return {
    prev: index > 0 ? entries[index - 1] : null,
    next: index < entries.length - 1 ? entries[index + 1] : null,
  };
}

/** The sections either side of `slug` within one list (Part 1 or the cards). */
export function sectionNeighbours(sections: TocSection[], slug: string): Neighbours<TocSection> {
  const index = sections.findIndex((section) => section.slug === slug);

  if (index === -1) return { prev: null, next: null };

  return {
    prev: index > 0 ? sections[index - 1] : null,
    next: index < sections.length - 1 ? sections[index + 1] : null,
  };
}

/** Sections grouped under their `group` heading, in the order they appear. */
export function byGroup(sections: TocSection[]): { group: string; sections: TocSection[] }[] {
  const groups: { group: string; sections: TocSection[] }[] = [];

  for (const section of sections) {
    const last = groups[groups.length - 1];

    if (last && last.group === section.group) {
      last.sections.push(section);
    } else {
      groups.push({ group: section.group, sections: [section] });
    }
  }

  return groups;
}
