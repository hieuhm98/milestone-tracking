// Builds one course's puzzle for one day. Pure: the same (course, day, game) always
// gives the same puzzle, so every learner plays the same one and it can be tested.

import { pickOne, seededRandom, shuffled } from "./rng";
import { boldTerms, countMentions, isGenericWord, tileTerm, mentions, sentencesOf } from "./text";
import type {
  Bilingual,
  GameId,
  MatchPuzzle,
  OrderPuzzle,
  Puzzle,
  SequencePuzzle,
  SortPuzzle,
  TopicRef,
  TopicMaterial,
  WordlePuzzle,
} from "./types";

const topicName = (t: TopicMaterial): TopicRef => ({ vi: t.title, en: t.titleEn, slug: t.slug });

/** Longer words get more tries: five letters → 6, eight → 9, twelve → 13. */
export function triesFor(length: number): number {
  return Math.max(6, length + 1);
}

export interface BuildOptions {
  /** True for everyday English words, which make poor Wordle answers and poor tiles. */
  isCommon?: (word: string) => boolean;
}

export const SORT_MISTAKES = 4;
export const MATCH_MISTAKES = 4;
export const ORDER_ATTEMPTS = 5;

// ── Term Wordle ────────────────────────────────────────────────────────────

interface WordCandidate {
  word: string;
  topic: TopicMaterial;
  sentence: string;
}

function wholeWord(word: string): RegExp {
  return new RegExp(`(?<![A-Za-z])${word}(?![A-Za-z])`, "gi");
}

/** lower-case word → the sentences in which it appears exactly once. */
function sentenceIndex(sentences: string[]): Map<string, string[]> {
  const index = new Map<string, string[]>();

  for (const sentence of sentences) {
    const counts = new Map<string, number>();

    for (const w of sentence.match(/[A-Za-z]+/g) ?? []) {
      const key = w.toLowerCase();

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    counts.forEach((n, key) => {
      if (n === 1) index.set(key, [...(index.get(key) ?? []), sentence]);
    });
  }

  return index;
}

function wordCandidates(topics: TopicMaterial[], isCommon: (word: string) => boolean): WordCandidate[] {
  const out: WordCandidate[] = [];
  const seen = new Set<string>();

  for (const topic of topics) {
    const index = sentenceIndex(sentencesOf(topic.articleEn).filter((s) => s.length >= 40 && s.length <= 240));

    for (const term of boldTerms(topic.articleEn)) {
      for (const token of term.split(/[\s/–—-]+/)) {
        const word = token.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");

        if (!/^[A-Za-z]{5,12}$/.test(word)) continue;

        const key = word.toLowerCase();
        const sentence = index.get(key)?.[0];

        if (seen.has(key) || !sentence || isGenericWord(word) || isCommon(word)) continue;

        seen.add(key);
        out.push({ word: word.toUpperCase(), topic, sentence });
      }
    }
  }

  return out;
}

export function buildWordle(topics: TopicMaterial[], seed: string, opts: BuildOptions = {}): WordlePuzzle | null {
  const rand = seededRandom(`${seed}|wordle`);
  const pick = pickOne(wordCandidates(topics, opts.isCommon ?? (() => false)), rand);

  if (!pick) return null;

  const blank = "_".repeat(pick.word.length);

  return {
    game: "wordle",
    word: pick.word,
    tries: triesFor(pick.word.length),
    clue: pick.sentence.replace(wholeWord(pick.word), blank),
    sentence: pick.sentence,
    topic: topicName(pick.topic),
  };
}

// ── Topic Sort ─────────────────────────────────────────────────────────────

function tiles(article: string, isCommon?: (word: string) => boolean): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of boldTerms(article)) {
    const term = tileTerm(raw, isCommon);

    if (!term) continue;

    // "priority queue" and "priority queues" are one tile, not two.
    const key = term.toLowerCase().replace(/s$/, "");

    if (seen.has(key)) continue;

    seen.add(key);
    out.push(term);
  }

  return out;
}

/**
 * Four topics, four terms each. A term only qualifies for a topic when no *other*
 * topic in the puzzle mentions it — otherwise "latency" could honestly sit in two
 * groups and the puzzle would be unfair.
 */
export function buildSort(topics: TopicMaterial[], seed: string, opts: BuildOptions = {}): SortPuzzle | null {
  const rand = seededRandom(`${seed}|sort`);
  const termsOf = new Map(topics.map((t) => [t.slug, tiles(t.articleEn, opts.isCommon)]));
  const usable = topics.filter((t) => (termsOf.get(t.slug)?.length ?? 0) >= 4);

  if (usable.length < 4) return null;

  for (let attempt = 0; attempt < 60; attempt++) {
    const chosen = shuffled(usable, rand).slice(0, 4);
    const groups: { topic: TopicMaterial; terms: string[] }[] = [];

    for (const topic of chosen) {
      const others = chosen.filter((o) => o.slug !== topic.slug);
      const eligible = (termsOf.get(topic.slug) ?? []).filter(
        (term) => !others.some((o) => mentions(o.articleEn, term))
      );

      if (eligible.length < 4) break;

      // A real course term keeps coming back in its own article; a phrase the author
      // merely emphasised appears once. Prefer the former, fill up from the latter.
      const strong = eligible.filter((term) => countMentions(topic.articleEn, term) >= 2);
      const rest = eligible.filter((term) => !strong.includes(term));

      groups.push({ topic, terms: [...shuffled(strong, rand), ...shuffled(rest, rand)].slice(0, 4) });
    }

    if (groups.length === 4) {
      return {
        game: "sort",
        mistakes: SORT_MISTAKES,
        groups: groups.map((g) => ({ topic: topicName(g.topic), terms: g.terms })),
      };
    }
  }

  return null;
}

// ── Sequence / Match ───────────────────────────────────────────────────────

function orderFromDrill(topic: TopicMaterial, index: number, seed: string): OrderPuzzle {
  const d = topic.orderDrills[index];

  return {
    game: "sequence",
    kind: "order",
    topic: topicName(topic),
    prompt: { vi: d.prompt, en: d.promptEn },
    explanation: { vi: d.explanation, en: d.explanationEn },
    items: d.items.map((i) => ({ vi: i.text, en: i.textEn })),
    attempts: ORDER_ATTEMPTS,
    seed,
  };
}

function matchFromDrill(topic: TopicMaterial, index: number, seed: string): MatchPuzzle {
  const d = topic.matchDrills[index];

  return {
    game: "sequence",
    kind: "match",
    topic: topicName(topic),
    prompt: { vi: d.prompt, en: d.promptEn },
    explanation: { vi: d.explanation, en: d.explanationEn },
    pairs: d.pairs.map((p) => ({ left: { vi: p.left, en: p.leftEn }, right: { vi: p.right, en: p.rightEn } })),
    mistakes: MATCH_MISTAKES,
    seed,
  };
}

const DULL_HEADING = /summary|takeaway|conclusion|quiz|recap|review|tóm tắt|ôn tập|kết luận|tổng kết/i;

/** The sections of one article, in teaching order — at most six, always consecutive. */
function outlineOf(topic: TopicMaterial, rand: () => number): Bilingual[] {
  const sections = topic.headings.filter((h) => !DULL_HEADING.test(h.en) && !DULL_HEADING.test(h.vi));

  if (sections.length <= 6) return sections;

  const start = Math.floor(rand() * (sections.length - 5 + 1));

  return sections.slice(start, start + 5);
}

/** A course with no drills still gets a puzzle: its own article, sections in teaching order. */
function orderFromHeadings(topic: TopicMaterial, items: Bilingual[], seed: string): OrderPuzzle {
  return {
    game: "sequence",
    kind: "order",
    topic: topicName(topic),
    prompt: {
      vi: `Sắp xếp các phần của bài “${topic.title}” theo đúng thứ tự bài viết trình bày.`,
      en: `Put these sections of “${topic.titleEn}” in the order the article teaches them.`,
    },
    explanation: {
      vi: "Thứ tự này chính là mục lục của bài — mở bài viết để xem từng phần dẫn sang phần sau thế nào.",
      en: "That is the article's own outline — open it to see how each section leads into the next.",
    },
    items,
    attempts: ORDER_ATTEMPTS,
    seed,
  };
}

export function buildSequence(topics: TopicMaterial[], seed: string): SequencePuzzle | null {
  const rand = seededRandom(`${seed}|sequence`);
  const sequenceSeed = `${seed}|sequence-shuffle`;
  const choices: (() => SequencePuzzle)[] = [];

  for (const topic of topics) {
    topic.orderDrills.forEach((d, i) => {
      if (d.items.length >= 3 && d.items.length <= 6) choices.push(() => orderFromDrill(topic, i, sequenceSeed));
    });
    topic.matchDrills.forEach((d, i) => {
      if (d.pairs.length >= 3 && d.pairs.length <= 5) choices.push(() => matchFromDrill(topic, i, sequenceSeed));
    });
  }

  const drill = pickOne(choices, rand);

  if (drill) return drill();

  const withOutline = topics.filter((t) => t.headings.filter((h) => !DULL_HEADING.test(h.en)).length >= 4);
  const topic = pickOne(withOutline, rand);

  return topic ? orderFromHeadings(topic, outlineOf(topic, rand), sequenceSeed) : null;
}

// ── Entry point ────────────────────────────────────────────────────────────

export function buildPuzzle(game: GameId, topics: TopicMaterial[], day: string, group: string, opts: BuildOptions = {}): Puzzle | null {
  const seed = `${day}|${group}`;

  if (game === "wordle") return buildWordle(topics, seed, opts);

  if (game === "sort") return buildSort(topics, seed, opts);

  return buildSequence(topics, seed);
}
