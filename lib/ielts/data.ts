// Data access for the "IELTS Speaking — Band 6 vs Band 9" section.
//
// Every route reads the section through these six functions and nothing else,
// so where the content comes from is a detail. They read the converted PDF in
// data/ielts-speaking/ (see scripts/ielts/extract.py).

import "server-only";

import { readCard, readCardSlugs, readIntro, readPart1Slugs, readPart1Topic, readToc } from "./source";
import type { CueCard, Intro, Part1Topic, Toc } from "./types";

/** The contents tree plus the section totals shown on the home page. */
export async function getToc(): Promise<Toc> {
  return readToc();
}

/** Home-page copy: how to use, the four criteria, the two "five moves" lists. */
export async function getIntro(): Promise<Intro> {
  return readIntro();
}

/** One Part 1 topic, or null when the slug is unknown. */
export async function getPart1Topic(slug: string): Promise<Part1Topic | null> {
  return readPart1Topic(slug);
}

/** Every Part 1 slug, in reading order — drives generateStaticParams. */
export async function getPart1Slugs(): Promise<string[]> {
  return readPart1Slugs();
}

/** One cue card by its number, or null when there is no such card. */
export async function getCard(n: number): Promise<CueCard | null> {
  return readCard(`card-${n}`);
}

/** Every cue-card slug ("card-1", …), in reading order. */
export async function getCardSlugs(): Promise<string[]> {
  return readCardSlugs();
}
