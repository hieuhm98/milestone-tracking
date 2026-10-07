// Pure helpers for the Random Review page (/knowledge-review): which questions
// a session draws, and how well the learner knows each topic.
//
// A question's history comes from two places: per-question recall (lesson
// checks, exams, Blitz, and review sessions write `${slug}#${id}`), and the
// topic quiz on the article page, which stores the chosen option per question.

import { questionKey } from "./lessons";
import { rankForReview, type ProgressData } from "./progress";

/** `{ [slug]: [[questionId, answerIndex], ...] }` from GET /api/review. */
export type QuestionIndex = Record<string, [string, number][]>;

export type ReviewMode = "smart" | "random" | "mistakes" | "new";

export const REVIEW_MODES: ReviewMode[] = ["smart", "random", "mistakes", "new"];

/** Largest session the API will serve; "All" is capped to this. */
export const MAX_SESSION = 300;

interface Candidate {
  key: string;
  slug: string;
  id: string;
  answer: number;
}

export interface QuestionHistory {
  seen: boolean;
  wrong: boolean;
}

export function questionHistory(progress: ProgressData, c: Candidate): QuestionHistory {
  const recall = progress.recall[c.key];
  const quizChoice = progress.topics[c.slug]?.answers[c.id];
  const quizSeen = quizChoice !== undefined;
  const recallWrong = recall !== undefined && recall.correct < recall.seen;

  return {
    seen: (recall?.seen ?? 0) > 0 || quizSeen,
    wrong: recallWrong || (quizSeen && quizChoice !== c.answer),
  };
}

function candidates(index: QuestionIndex, slugs: Iterable<string> | ArrayLike<string>): Candidate[] {
  const out: Candidate[] = [];

  for (const slug of Array.from(slugs)) {
    for (const [id, answer] of index[slug] ?? []) out.push({ key: questionKey(slug, id), slug, id, answer });
  }

  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

/** How many questions each mode can offer for the current selection. */
export function modeCounts(index: QuestionIndex, slugs: Iterable<string> | ArrayLike<string>, progress: ProgressData): Record<ReviewMode, number> {
  const pool = candidates(index, slugs);
  let mistakes = 0;
  let unseen = 0;

  for (const c of pool) {
    const h = questionHistory(progress, c);

    if (h.wrong) mistakes++;

    if (!h.seen) unseen++;
  }

  return { smart: pool.length, random: pool.length, mistakes, new: unseen };
}

/**
 * Pick the question keys for a session. `count` 0 means "all" (capped at
 * MAX_SESSION). The returned order is the order the questions are asked in.
 */
export function pickSession(
  index: QuestionIndex,
  slugs: Iterable<string> | ArrayLike<string>,
  progress: ProgressData,
  mode: ReviewMode,
  count: number
): string[] {
  const pool = candidates(index, slugs);
  const limit = count === 0 ? MAX_SESSION : Math.min(count, MAX_SESSION);
  let ordered: Candidate[];

  if (mode === "smart") {
    // Unseen → weakest → stalest, then shuffled so a session doesn't read as
    // "all the new ones, then all the old ones".
    ordered = shuffle(rankForReview(progress, pool).slice(0, limit));
  } else if (mode === "mistakes") {
    ordered = shuffle(pool.filter((c) => questionHistory(progress, c).wrong));
  } else if (mode === "new") {
    ordered = shuffle(pool.filter((c) => !questionHistory(progress, c).seen));
  } else {
    ordered = shuffle(pool);
  }

  return ordered.slice(0, limit).map((c) => c.key);
}

export type Mastery = "none" | "weak" | "ok" | "strong";

export interface TopicMastery {
  /** Questions the learner has answered at least once. */
  seen: number;
  total: number;
  /** Share of seen questions whose latest history is right (0–100), null if none seen. */
  pct: number | null;
  level: Mastery;
}

export function topicMastery(index: QuestionIndex, slug: string, progress: ProgressData): TopicMastery {
  const pool = candidates(index, [slug]);
  let seen = 0;
  let right = 0;

  for (const c of pool) {
    const h = questionHistory(progress, c);

    if (!h.seen) continue;

    seen++;

    if (!h.wrong) right++;
  }

  const pct = seen > 0 ? Math.round((100 * right) / seen) : null;
  const level: Mastery = pct === null ? "none" : pct < 70 ? "weak" : pct < 90 ? "ok" : "strong";

  return { seen, total: pool.length, pct, level };
}
