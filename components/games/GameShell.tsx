"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { useLang } from "@/context/lang";
import { getGroup } from "@/lib/groups";
import { isGameId, type DailyPuzzle, type GameId } from "@/lib/games/types";
import {
  entryKey,
  isFinished,
  saveEntry,
  streakOf,
  useGameEntries,
  type GameEntry,
} from "@/lib/games/store";
import { PageError, PageLoading } from "@/components/learn/PageState";
import { gameMeta } from "./meta";
import { ResultPanel, type Finish } from "./shared";
import WordleGame, { type WordleData } from "./WordleGame";
import SortGame, { type SortData } from "./SortGame";
import SequenceGame, { type SequenceData } from "./SequenceGame";

type Load = { state: "loading" } | { state: "error"; missing: boolean } | { state: "ready"; daily: DailyPuzzle };

export default function GameShell({ group, game }: { group: string; game: string }) {
  const { pick } = useLang();
  const { entries, ready } = useGameEntries();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  const course = getGroup(group);
  const valid = course && isGameId(game);

  useEffect(() => {
    if (!valid) return;

    let cancelled = false;

    setLoad({ state: "loading" });
    fetch(`/api/games?group=${encodeURIComponent(group)}&game=${encodeURIComponent(game)}`, { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404) return { state: "error" as const, missing: true };

        if (!r.ok) throw new Error(String(r.status));

        return { state: "ready" as const, daily: (await r.json()) as DailyPuzzle };
      })
      .catch(() => ({ state: "error" as const, missing: false }))
      .then((next) => {
        if (!cancelled) setLoad(next);
      });

    return () => {
      cancelled = true;
    };
  }, [group, game, valid, attempt]);

  const day = load.state === "ready" ? load.daily.day : "";
  const key = day ? entryKey(day, group, game as GameId) : "";
  const entry: GameEntry | undefined = key ? entries[key] : undefined;

  const onChange = useCallback(
    (data: unknown, finish?: Finish) => {
      if (!key) return;

      saveEntry(key, {
        status: finish ? finish.status : "playing",
        data,
        share: finish?.share,
        score: finish?.score,
        updatedAt: Date.now(),
      });
    },
    [key]
  );

  if (!valid) {
    return (
      <div className="max-w-xl space-y-3">
        <p>{pick("Không tìm thấy trò chơi này.", "That puzzle does not exist.")}</p>
        <Link href="/learn/games" className="btn-secondary inline-block text-sm px-3 py-2">
          {pick("← Câu đố hằng ngày", "← Daily puzzles")}
        </Link>
      </div>
    );
  }

  const meta = gameMeta(game);
  const streak = ready ? streakOf(entries) : 0;

  return (
    <div className="max-w-2xl space-y-4">
      <Link
        href="/learn/games"
        className="inline-block py-2 -my-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        {pick("← Câu đố hằng ngày", "← Daily puzzles")}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <meta.icon className="h-6 w-6" aria-hidden="true" />
            {pick(meta.name.vi, meta.name.en)}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {pick(course.label, course.labelEn)}
            {day && ` · ${day}`}
          </p>
        </div>
        {streak > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-3 py-1 text-sm font-semibold"
            title={pick("Số ngày liên tiếp bạn chơi", "Days in a row you have played")}
          >
            <Flame className="h-4 w-4" aria-hidden="true" />
            {streak}
          </span>
        )}
      </header>

      {load.state === "loading" && <PageLoading />}

      {load.state === "error" && load.missing && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {pick(
            "Khoá này chưa đủ nội dung để tạo câu đố này. Hãy thử trò khác.",
            "This course does not have enough material for this puzzle yet. Try another one."
          )}
        </p>
      )}

      {load.state === "error" && !load.missing && <PageError onRetry={() => setAttempt((a) => a + 1)} />}

      {load.state === "ready" && ready && (
        <>
          <Board
            daily={load.daily}
            // A fresh mount per day and per game, so saved state from another puzzle never leaks in.
            key={key}
            initial={entry?.data}
            onChange={onChange}
          />

          {isFinished(entry) && (
            <Result daily={load.daily} entry={entry!} entries={entries} group={group} game={game as GameId} />
          )}
        </>
      )}
    </div>
  );
}

function Board({
  daily,
  initial,
  onChange,
}: {
  daily: DailyPuzzle;
  initial: unknown;
  onChange: (data: unknown, finish?: Finish) => void;
}) {
  const p = daily.puzzle;

  if (p.game === "wordle") {
    return <WordleGame puzzle={p} initial={initial as WordleData | undefined} onChange={onChange} />;
  }

  if (p.game === "sort") {
    return <SortGame puzzle={p} initial={initial as SortData | undefined} onChange={onChange} />;
  }

  return <SequenceGame puzzle={p} initial={initial as SequenceData | undefined} onChange={onChange} />;
}

function Result({
  daily,
  entry,
  entries,
  group,
  game,
}: {
  daily: DailyPuzzle;
  entry: GameEntry;
  entries: ReturnType<typeof useGameEntries>["entries"];
  group: string;
  game: GameId;
}) {
  const { pick } = useLang();
  const won = entry.status === "won";
  const p = daily.puzzle;
  const meta = gameMeta(game);
  const header = `${pick(meta.name.vi, meta.name.en)} · ${getGroup(group)?.labelEn ?? group} · ${daily.day}`;
  const topic = p.game === "sort" ? undefined : p.topic;

  return (
    <ResultPanel
      won={won}
      headline={
        won
          ? pick("Chính xác! Hẹn bạn câu đố ngày mai.", "Nicely done! New puzzle tomorrow.")
          : pick("Hết lượt rồi. Mai thử lại nhé.", "Out of tries. Come back tomorrow.")
      }
      detail={
        p.game === "wordle" ? pick(`Đáp án: ${p.word}`, `The answer was ${p.word}`) : undefined
      }
      share={`${header}\n${entry.share ?? ""}`}
      topic={topic}
      group={group}
      day={daily.day}
      game={game}
      entries={entries}
    />
  );
}
