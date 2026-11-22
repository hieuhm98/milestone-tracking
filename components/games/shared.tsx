"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, Heart } from "lucide-react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { GAME_IDS, type GameId, type TopicRef } from "@/lib/games/types";
import { entryKey, isFinished, type GameEntries } from "@/lib/games/store";
import { gameMeta } from "./meta";

/** What a game reports back when it ends. */
export interface Finish {
  status: "won" | "lost";
  score: number;
  /** Emoji summary for the share button. */
  share: string;
}

export interface GameProps<P, D> {
  puzzle: P;
  /** Saved state from an earlier visit today, if any. */
  initial: D | undefined;
  /** Called after every move with the new saved state; `finish` only once, at the end. */
  onChange: (data: D, finish?: Finish) => void;
}

/** Remaining mistakes as hearts. */
export function Lives({ left, total }: { left: number; total: number }) {
  const { pick } = useLang();

  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={pick(`Còn ${left} lượt sai`, `${left} mistakes left`)}
    >
      {Array.from({ length: total }, (_, i) => (
        <Heart
          key={i}
          aria-hidden="true"
          className={cn(
            "h-4 w-4",
            i < left ? "fill-rose-500 text-rose-500" : "text-zinc-300 dark:text-zinc-700"
          )}
        />
      ))}
    </div>
  );
}

/** Shown under a finished game: the outcome, share, the topic to revisit and the other games. */
export function ResultPanel({
  won,
  headline,
  detail,
  share,
  topic,
  group,
  day,
  game,
  entries,
}: {
  won: boolean;
  headline: string;
  detail?: string;
  share: string;
  topic?: TopicRef;
  group: string;
  day: string;
  game: GameId;
  entries: GameEntries;
}) {
  const { pick } = useLang();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(share);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the text is on screen anyway.
    }
  };

  const others = GAME_IDS.filter((id) => id !== game);

  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border p-4 sm:p-5 space-y-4",
        won
          ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
          : "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
      )}
    >
      <div>
        <p className="font-semibold">{headline}</p>
        {detail && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{detail}</p>}
      </div>

      <pre className="whitespace-pre-wrap rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 text-sm leading-snug font-sans">
        {share}
      </pre>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={copy} className="btn-secondary text-sm px-3 py-2 inline-flex items-center gap-2">
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? pick("Đã chép", "Copied") : pick("Chép kết quả", "Copy result")}
        </button>

        {topic && (
          <Link href={`/learn/${topic.slug}`} className="btn-secondary text-sm px-3 py-2">
            {pick("Ôn lại: ", "Review: ")}
            {pick(topic.vi, topic.en)}
          </Link>
        )}
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
        <p className="text-xs text-zinc-500 mb-2">
          {pick("Trò khác hôm nay của khoá này", "Today's other puzzles for this course")}
        </p>
        <div className="flex flex-wrap gap-2">
          {others.map((id) => {
            const meta = gameMeta(id);
            const done = isFinished(entries[entryKey(day, group, id)]);

            return (
              <Link
                key={id}
                href={`/learn/games/${group}/${id}`}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <meta.icon className="h-3.5 w-3.5" aria-hidden="true" />
                {pick(meta.name.vi, meta.name.en)}
                {done && <Check className="h-3.5 w-3.5 text-emerald-600" aria-label={pick("Đã chơi", "Done")} />}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
