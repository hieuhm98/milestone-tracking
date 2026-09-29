"use client";

// How this section records what the learner did.
//
// Scores go through the existing progress system untouched: one `recordQuiz`
// topic per unit (or per Part review), keyed under a `grammar:` prefix so the
// slug can never collide with an IT topic. Every gradable item in the unit —
// pretest, context task, self checks, editing practice — writes 1 (right) or
// 0 (wrong) into that topic's `answers` map, so `topicStats` gives the home
// page "answered / total" for free and `bestPct` is the score of a finished
// unit.
//
// The trap ids a learner got wrong have no home in ProgressData, so they stay
// in localStorage under their own key, in the same style as the reader
// settings.

import { useCallback, useEffect, useState } from "react";
import { useProgress } from "@/context/progress";
import { recordQuiz, topicStats, type ProgressData, type TopicStats } from "@/lib/progress";

export function unitKey(unitId: string): string {
  return `grammar:${unitId}`;
}

export function reviewKey(part: string): string {
  return `grammar:review-${String(part).toLowerCase()}`;
}

export function unitStats(progress: ProgressData, unitId: string, total: number): TopicStats {
  return topicStats(progress, unitKey(unitId), total);
}

export interface Score {
  /** Item id → 1 when it was answered correctly, 0 when it was not. */
  answers: Record<string, number>;
  answered: number;
  correct: number;
  total: number;
  /** Record one item. Re-answering the same item overwrites it. */
  mark: (itemId: string, correct: boolean) => void;
  /** Forget these items — what a block's "Start again" button does. */
  clear: (itemIds: string[]) => void;
}

/**
 * One quiz topic shared by every exercise block of a page. `attempted` is only
 * set once every item has an answer, so a half-finished unit shows as "in
 * progress" rather than banking a low `bestPct`.
 */
export function useScore(key: string, total: number): Score {
  const { progress, update } = useProgress();
  const answers = progress.topics[key]?.answers ?? {};

  const write = useCallback(
    (change: (prev: Record<string, number>) => Record<string, number>) => {
      update((prev) => {
        const next = change(prev.topics[key]?.answers ?? {});
        const values = Object.values(next);
        const correct = values.filter((value) => value === 1).length;

        return recordQuiz(prev, key, {
          answers: next,
          correct,
          total,
          attempted: total > 0 && values.length >= total,
        });
      });
    },
    [key, total, update]
  );

  const mark = useCallback(
    (itemId: string, correct: boolean) => write((prev) => ({ ...prev, [itemId]: correct ? 1 : 0 })),
    [write]
  );

  const clear = useCallback(
    (itemIds: string[]) =>
      write((prev) => {
        const next = { ...prev };

        for (const id of itemIds) delete next[id];

        return next;
      }),
    [write]
  );

  const values = Object.values(answers);

  return {
    answers,
    answered: values.length,
    correct: values.filter((value) => value === 1).length,
    total,
    mark,
    clear,
  };
}

const WRONG_TRAPS_KEY = "grammar:traps-wrong";
const WRONG_TRAPS_EVENT = "grammar:traps-wrong-change";

function readWrongTraps(): string[] {
  try {
    const raw = window.localStorage.getItem(WRONG_TRAPS_KEY);

    if (!raw) return [];

    const saved = JSON.parse(raw) as unknown;

    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/**
 * The traps behind the items the learner got wrong — the "weak points" list on
 * the home page and the "only the ones I got wrong" filter on the traps page.
 */
export function useWrongTraps(): { ids: string[]; ready: boolean; addWrong: (trapId?: string) => void } {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(readWrongTraps());
    setReady(true);

    const sync = () => setIds(readWrongTraps());

    window.addEventListener("storage", sync);
    window.addEventListener(WRONG_TRAPS_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(WRONG_TRAPS_EVENT, sync);
    };
  }, []);

  const addWrong = useCallback((trapId?: string) => {
    if (!trapId) return;

    const next = readWrongTraps();

    if (next.includes(trapId)) return;

    next.push(trapId);

    try {
      window.localStorage.setItem(WRONG_TRAPS_KEY, JSON.stringify(next));
    } catch {
      // Private mode or blocked storage: the list holds for this visit only.
    }

    setIds(next);
    window.dispatchEvent(new Event(WRONG_TRAPS_EVENT));
  }, []);

  return { ids, ready, addWrong };
}
