"use client";

// Daily-puzzle results live in this browser (localStorage), not in the account's
// cloud progress: ProgressData has no field for them and a puzzle is a few seconds
// of play, not coursework. Streaks therefore follow the device.

import { useCallback, useEffect, useState } from "react";
import { previousDay, puzzleDay } from "./day";
import type { GameId } from "./types";

const KEY = "games:v1";
const EVENT = "games:change";

export type GameStatus = "playing" | "won" | "lost";

export interface GameEntry {
  status: GameStatus;
  /** Whatever the game needs to resume or re-show its board. */
  data: unknown;
  /** Emoji summary for the share button, set when the game ends. */
  share?: string;
  /** Wordle: tries used. Sort/match: mistakes. Order: attempts. */
  score?: number;
  updatedAt: number;
}

export type GameEntries = Record<string, GameEntry>;

export const entryKey = (day: string, group: string, game: GameId) => `${day}:${group}:${game}`;

function readAll(): GameEntries {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");

    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as GameEntries) : {};
  } catch {
    return {};
  }
}

/** Keep roughly the last 120 days so the key never grows without bound. */
function prune(entries: GameEntries): GameEntries {
  const keys = Object.keys(entries).sort();

  if (keys.length <= 400) return entries;

  return Object.fromEntries(keys.slice(keys.length - 400).map((k) => [k, entries[k]]));
}

export function saveEntry(key: string, entry: GameEntry): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(KEY, JSON.stringify(prune({ ...readAll(), [key]: entry })));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Private mode or a full quota: the game still works, it just will not resume.
  }
}

export function useGameEntries(): { entries: GameEntries; ready: boolean } {
  const [entries, setEntries] = useState<GameEntries>({});
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => setEntries(readAll()), []);

  useEffect(() => {
    refresh();
    setReady(true);
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return { entries, ready };
}

export const isFinished = (entry: GameEntry | undefined): boolean => entry?.status === "won" || entry?.status === "lost";

/** Days on which at least one puzzle was finished (won or lost — showing up counts). */
export function playedDays(entries: GameEntries): Set<string> {
  const days = new Set<string>();

  for (const [key, entry] of Object.entries(entries)) {
    if (isFinished(entry)) days.add(key.slice(0, 10));
  }

  return days;
}

/**
 * Consecutive days with a finished puzzle. Today not having been played yet does not
 * break the streak — it only breaks once a whole day has passed with nothing.
 */
export function streakOf(entries: GameEntries, today: string = puzzleDay()): number {
  const days = playedDays(entries);
  let day = days.has(today) ? today : previousDay(today);
  let streak = 0;

  while (days.has(day)) {
    streak++;
    day = previousDay(day);
  }

  return streak;
}
