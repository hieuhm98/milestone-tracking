"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProgress } from "@/context/progress";
import { recordSqlChallenge } from "@/lib/progress";
import type { PublicChallenge } from "@/lib/sqlChallenges";

// The challenge list (no answers) is fetched once per page load and shared by
// the list and solve pages.
let pending: Promise<PublicChallenge[]> | null = null;

function loadChallenges(): Promise<PublicChallenge[]> {
  pending ??= fetch("/api/sql-challenges")
    .then((r) => r.json())
    .then((d) => (d.challenges ?? []) as PublicChallenge[])
    .catch(() => {
      pending = null; // let the next mount retry

      return [];
    });

  return pending;
}

export function useChallenges(): { challenges: PublicChallenge[]; loading: boolean } {
  const [challenges, setChallenges] = useState<PublicChallenge[] | null>(null);

  useEffect(() => {
    let live = true;

    loadChallenges().then((list) => {
      if (live) setChallenges(list);
    });

    return () => {
      live = false;
    };
  }, []);

  return { challenges: challenges ?? [], loading: challenges === null };
}

// Solved state is part of the learner's progress (ProgressData.sqlChallenges),
// so it syncs to the account and rides along in progress export/import.
// Drafts are per-browser conveniences and stay in localStorage.
const DRAFT_PREFIX = "sql-challenges:draft:";

/** [challenge id → first solve date, record a graded submission]. */
export function useSolved(): [Record<string, string>, (id: string, accepted: boolean) => void] {
  const { progress, update } = useProgress();

  const solved = useMemo(() => {
    const out: Record<string, string> = {};

    for (const [id, entry] of Object.entries(progress.sqlChallenges)) {
      if (entry.solvedAt) out[id] = entry.solvedAt;
    }

    return out;
  }, [progress.sqlChallenges]);

  const record = useCallback(
    (id: string, accepted: boolean) => update((prev) => recordSqlChallenge(prev, id, accepted)),
    [update]
  );

  return [solved, record];
}

export function readDraft(id: string): string | null {
  try {
    return window.localStorage.getItem(DRAFT_PREFIX + id);
  } catch {
    return null;
  }
}

export function writeDraft(id: string, sql: string) {
  try {
    window.localStorage.setItem(DRAFT_PREFIX + id, sql);
  } catch {
    // Nothing to do: the draft just isn't remembered.
  }
}
