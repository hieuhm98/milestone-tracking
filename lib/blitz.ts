// Blitz — the timed rapid-fire run.
//
// The track already had two ways to meet a question and both are untimed: read
// a topic and answer its quiz, or sit a 40-question exam. Neither gives a
// session a *shape* — nothing says "spend four minutes and you will have won
// or lost something" — so a study session ends whenever attention runs out,
// which is the definition of getting bored.
//
// A run is therefore: a fixed clock, a mixed deck, a score that compounds while
// you are right and collapses when you are not, and a personal best to beat.
// Pure and framework-free with an injectable `rand`, like `lib/exam.ts`, so the
// draw and the scoring can be tested without a browser.

import { type Question } from "@/components/knowledge/QuizBlock";
import { type Drill, type DrillType } from "@/lib/drills";

export const BLITZ_DURATIONS = [60, 120, 180] as const;
export type BlitzDuration = (typeof BLITZ_DURATIONS)[number];
export const DEFAULT_DURATION: BlitzDuration = 60;

/** How many items to draw. Generous — a run should never run out of deck. */
export const DECK_SIZE = 70;

/** Streak length that buys each multiplier step, and the ceiling. */
export const COMBO_STEP = 3;
export const COMBO_CAP = 5;

/** Answer inside this many milliseconds for the speed bonus. */
export const FAST_MS = 4000;
export const SPEED_BONUS = 0.5;

/**
 * Base points by format, roughly proportional to the work each one costs.
 * A four-option guess is worth a fraction of typing a service name from
 * nothing, and the score should say so — otherwise the cheapest format is
 * always the best play and the harder ones never get used.
 */
export const BASE_POINTS: Record<BlitzItemFormat, number> = {
  mcq: 10,
  multi: 20,
  recall: 25,
  order: 30,
  match: 30,
};

export type BlitzItemFormat = "mcq" | DrillType;

/** One thing the runner can put on screen. */
export type BlitzItem =
  | { key: string; slug: string; format: "mcq"; question: Question }
  | { key: string; slug: string; format: DrillType; drill: Drill };

/** `${slug}#${questionId}` — the key the recall store is indexed by. */
export function itemKey(slug: string, id: string): string {
  return `${slug}#${id}`;
}

export function formatOf(item: BlitzItem): BlitzItemFormat {
  return item.format;
}

/** The multiplier a streak of `streak` correct answers is currently worth. */
export function comboMultiplier(streak: number): number {
  return Math.min(COMBO_CAP, 1 + Math.floor(streak / COMBO_STEP));
}

/**
 * Points for one correct answer.
 *
 * `streak` is the number of correct answers *before* this one, so the first
 * correct answer of a run scores at ×1 and the multiplier is earned, not given.
 */
export function scoreAnswer(format: BlitzItemFormat, streak: number, elapsedMs: number): number {
  const base = BASE_POINTS[format] ?? BASE_POINTS.mcq;
  const multiplied = base * comboMultiplier(streak);
  const bonus = elapsedMs <= FAST_MS ? multiplied * SPEED_BONUS : 0;

  return Math.round(multiplied + bonus);
}

// ------------------------------------------------------------------- the draw

export type Rand = () => number;

function shuffle<T>(items: T[], rand: Rand): T[] {
  const out = [...items];

  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));

    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
}

/** A topic's contribution to the pool. */
export interface BlitzTopic {
  slug: string;
  title: string;
  titleEn: string;
  questions: Question[];
  drills: Drill[];
}

export interface DeckOptions {
  /** Which formats to include. An empty set means "all of them". */
  formats?: Set<BlitzItemFormat>;
  size?: number;
}

/**
 * Build a run's deck.
 *
 * Drills are the scarce resource — a topic has ~17 questions but only a handful
 * of drills — so a deck drawn uniformly from everything would be almost all
 * multiple choice and the new formats would barely appear. The draw therefore
 * fills up to half the deck from the drill pool first, then tops up with
 * questions, and interleaves the two so the format keeps changing. Changing
 * format is the point: a run that is twenty identical questions in a row is the
 * thing this is meant to replace.
 */
export function buildDeck(topics: BlitzTopic[], rand: Rand, options: DeckOptions = {}): BlitzItem[] {
  const size = options.size ?? DECK_SIZE;
  const wanted = options.formats && options.formats.size > 0 ? options.formats : null;
  const allows = (f: BlitzItemFormat) => !wanted || wanted.has(f);

  const mcqPool: BlitzItem[] = [];
  const drillPool: BlitzItem[] = [];

  for (const topic of topics) {
    if (allows("mcq")) {
      for (const question of topic.questions) {
        mcqPool.push({
          key: itemKey(topic.slug, question.id),
          slug: topic.slug,
          format: "mcq",
          question,
        });
      }
    }

    for (const drill of topic.drills) {
      if (!allows(drill.type)) continue;

      drillPool.push({
        key: itemKey(topic.slug, drill.id),
        slug: topic.slug,
        format: drill.type,
        drill,
      });
    }
  }

  const shuffledDrills = shuffle(drillPool, rand);
  const shuffledMcqs = shuffle(mcqPool, rand);

  // Half the deck from drills where possible — but if multiple choice is turned
  // off (or the track has few questions), take as many drills as it takes to
  // fill the deck. Capping at half regardless would hand a learner who switched
  // multiple choice off a deck half the length they asked for.
  const drillCount = Math.min(
    shuffledDrills.length,
    Math.max(Math.ceil(size / 2), size - shuffledMcqs.length)
  );
  const drills = shuffledDrills.slice(0, drillCount);
  const mcqs = shuffledMcqs.slice(0, Math.max(0, size - drills.length));

  return interleave(mcqs, drills);
}

/**
 * Weave two decks together so neither runs in a long block. The shorter list is
 * spread evenly through the longer one rather than merged head to head, which
 * would put every drill in the first third of the run.
 */
export function interleave(long: BlitzItem[], short: BlitzItem[]): BlitzItem[] {
  if (short.length === 0) return long;

  if (long.length === 0) return short;

  const out: BlitzItem[] = [];
  const gap = long.length / short.length;
  let nextShort = 0;

  long.forEach((item, i) => {
    while (nextShort < short.length && nextShort * gap <= i) {
      out.push(short[nextShort]);
      nextShort += 1;
    }

    out.push(item);
  });

  return out.concat(short.slice(nextShort));
}

/**
 * Move the items this learner is weakest on toward the front.
 *
 * The deck is already drawn and shuffled; this only decides the order it is
 * met in, so a run is not an even sample of the track — it leans on what has
 * been missed or not seen in a while. Unseen items sort first: never having
 * answered something is a stronger reason to ask it than having answered it
 * badly once.
 */
export interface RecallLike {
  seen: number;
  correct: number;
  lastAt: string;
}

export function weakestFirst(deck: BlitzItem[], recall: Record<string, RecallLike>): BlitzItem[] {
  const scored = deck.map((item, index) => {
    const stat = recall[item.key];

    if (!stat || stat.seen === 0) return { item, index, rank: -1, lastAt: "" };

    return { item, index, rank: stat.correct / stat.seen, lastAt: stat.lastAt };
  });

  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;

    if (a.lastAt !== b.lastAt) return a.lastAt.localeCompare(b.lastAt);

    return a.index - b.index;
  });

  return scored.map((s) => s.item);
}

// ----------------------------------------------------------------- the result

export interface BlitzAnswer {
  key: string;
  slug: string;
  format: BlitzItemFormat;
  correct: boolean;
  points: number;
  /** How many parts of a multi-part drill landed, for the results screen. */
  partial: { correct: number; total: number };
}

export interface BlitzSummary {
  score: number;
  answered: number;
  correct: number;
  accuracy: number;
  bestCombo: number;
  /** Weakest topics first — where the run says to go back to. */
  byTopic: { slug: string; correct: number; total: number; pct: number }[];
}

export function summarize(answers: BlitzAnswer[], bestCombo: number): BlitzSummary {
  const correct = answers.filter((a) => a.correct).length;
  const byTopic = new Map<string, { correct: number; total: number }>();

  for (const answer of answers) {
    const bucket = byTopic.get(answer.slug) ?? { correct: 0, total: 0 };

    bucket.total += 1;
    bucket.correct += answer.correct ? 1 : 0;
    byTopic.set(answer.slug, bucket);
  }

  const topics = Array.from(byTopic.entries())
    .map(([slug, b]) => ({ slug, ...b, pct: Math.round((b.correct / b.total) * 100) }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total);

  return {
    score: answers.reduce((sum, a) => sum + a.points, 0),
    answered: answers.length,
    correct,
    accuracy: answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0,
    bestCombo,
    byTopic: topics,
  };
}
