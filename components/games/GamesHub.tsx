"use client";

import Link from "next/link";
import { Check, Flame } from "lucide-react";
import { useLang } from "@/context/lang";
import { GROUPS, GROUP_ACCENT } from "@/lib/groups";
import { puzzleDay } from "@/lib/games/day";
import { GAME_IDS, type GameId } from "@/lib/games/types";
import { entryKey, isFinished, streakOf, useGameEntries, type GameEntries } from "@/lib/games/store";
import GroupIcon from "@/components/GroupIcon";
import { cn } from "@/lib/utils";
import { GAMES, gameMeta } from "./meta";

/** One row of three game links for a course, ticked when today's puzzle is done. */
export function GameLinks({
  group,
  entries,
  day,
  compact = false,
}: {
  group: string;
  entries: GameEntries;
  day: string;
  compact?: boolean;
}) {
  const { pick } = useLang();

  return (
    <div className={cn("grid gap-2", compact ? "sm:grid-cols-3" : "sm:grid-cols-3")}>
      {GAME_IDS.map((id: GameId) => {
        const meta = gameMeta(id);
        const entry = entries[entryKey(day, group, id)];
        const done = isFinished(entry);

        return (
          <Link
            key={id}
            href={`/learn/games/${group}/${id}`}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
              done
                ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
                : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            )}
          >
            <meta.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0 truncate">{pick(meta.name.vi, meta.name.en)}</span>
            {done ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-label={pick("Đã chơi hôm nay", "Done today")} />
            ) : entry?.status === "playing" ? (
              <span className="text-xs text-amber-600 dark:text-amber-400">{pick("Đang chơi", "In progress")}</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

/** Compact strip for the course page. */
export function DailyPuzzlesStrip({ group }: { group: string }) {
  const { pick } = useLang();
  const { entries, ready } = useGameEntries();
  const day = puzzleDay();

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{pick("Câu đố hôm nay", "Today's puzzles")}</h2>
          <p className="text-xs text-zinc-500">
            {pick("Chơi vui để nhớ lâu hơn — mỗi ngày một câu đố mới cho khoá này.", "Play to remember longer — a fresh puzzle for this course every day.")}
          </p>
        </div>
        {ready && streakOf(entries) > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-3 py-1 text-sm font-semibold">
            <Flame className="h-4 w-4" aria-hidden="true" />
            {streakOf(entries)}
          </span>
        )}
      </div>
      <GameLinks group={group} entries={entries} day={day} compact />
    </section>
  );
}

export default function GamesHub() {
  const { pick } = useLang();
  const { entries, ready } = useGameEntries();
  const day = puzzleDay();
  const streak = ready ? streakOf(entries) : 0;
  const doneToday = ready
    ? GROUPS.reduce((n, g) => n + GAME_IDS.filter((id) => isFinished(entries[entryKey(day, g.id, id)])).length, 0)
    : 0;

  return (
    <div className="max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{pick("Câu đố hằng ngày", "Daily puzzles")}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {pick(
            "Mỗi khoá có ba câu đố mới mỗi ngày, làm từ chính bài học của khoá. Chơi vài phút để ôn lại và nhớ lâu hơn.",
            "Every course gets three new puzzles a day, made from its own lessons. A few minutes of play to review and remember longer."
          )}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <Flame
          className={cn("h-8 w-8", streak > 0 ? "text-orange-500" : "text-zinc-300 dark:text-zinc-700")}
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold">
            {streak > 0
              ? pick(`${streak} ngày liên tiếp`, `${streak}-day streak`)
              : pick("Chưa có chuỗi ngày", "No streak yet")}
          </p>
          <p className="text-xs text-zinc-500">
            {pick(
              "Hoàn thành ít nhất một câu đố mỗi ngày để giữ chuỗi. Hôm nay đã xong ",
              "Finish at least one puzzle a day to keep it. Done today: "
            )}
            {doneToday}
          </p>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-3">
        {GAMES.map((g) => (
          <li key={g.id} className="flex items-start gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
            <g.icon className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">{pick(g.name.vi, g.name.en)}</p>
              <p className="text-xs text-zinc-500">{pick(g.blurb.vi, g.blurb.en)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-4">
        {GROUPS.map((group) => {
          const accent = GROUP_ACCENT[group.accent];

          return (
            <section
              key={group.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <GroupIcon group={group.id} className={cn("text-xl", accent.text)} />
                <h2 className="font-semibold">{pick(group.label, group.labelEn)}</h2>
              </div>
              <GameLinks group={group.id} entries={entries} day={day} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
