// English vocabulary questions attached to mini-lessons.
//
// A topic's optional `vocab.json` holds one multiple-choice question per English
// word used in its article: "what does <word> mean in this sentence?". Each item
// names the lesson it belongs to, and the lesson player asks them in a separate
// step AFTER the IT check test.
//
// Deliberately a separate file from questions.json, like drills.json: the
// exam, the Daily Quick Test and the lesson check all draw from questions.json,
// and none of them should suddenly start testing English. The vocab step also
// never affects whether a lesson passes — a learner who knows the material but
// not yet the word must still be able to complete the lesson.

import { type Question } from "@/components/knowledge/QuizBlock";
import { questionKey } from "./lessons";
import { rankForReview, type ProgressData } from "./progress";

/** How many words one vocabulary round asks. A lesson can hold far more. */
export const VOCAB_PER_ROUND = 10;

export interface VocabItem extends Question {
  /** The mini-lesson whose sections the word comes from. */
  lessonId: string;
  word: string;
  /** n, v, adj, adv, prep, conj or phrase. */
  pos?: string;
  ipa?: string;
}

/** Every vocab item belonging to one lesson, in authored order. */
export function lessonVocab(items: VocabItem[], lessonId: string): VocabItem[] {
  return items.filter((item) => item.lessonId === lessonId);
}

/** How many of a lesson's words have never been answered. */
export function unseenVocabCount(items: VocabItem[], slug: string, progress: ProgressData): number {
  return items.filter((item) => !progress.recall[questionKey(slug, item.id)]).length;
}

/**
 * Draw one round: never-answered words first, then the weakest, then the
 * stalest — the same ordering the IT review uses, so repeating a lesson walks
 * through all of its words instead of re-asking the first ten.
 */
export function vocabRound(
  items: VocabItem[],
  slug: string,
  progress: ProgressData,
  count = VOCAB_PER_ROUND
): VocabItem[] {
  const pool = items.map((item) => ({ key: questionKey(slug, item.id), item }));

  return rankForReview(progress, pool)
    .slice(0, count)
    .map((entry) => entry.item);
}
