"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { seededRandom, shuffled } from "@/lib/games/rng";
import type { SortPuzzle } from "@/lib/games/types";
import { Lives, type GameProps } from "./shared";

export interface SortData {
  /** Group indices in the order they were found. */
  solved: number[];
  /** One entry per submitted guess: the group each of the four tiles belonged to. */
  history: number[][];
  mistakes: number;
}

// Literal class strings (Tailwind's JIT cannot see built ones).
const GROUP_STYLE = [
  { tile: "bg-amber-200 dark:bg-amber-900/60 border-amber-400 dark:border-amber-700", dot: "🟨" },
  { tile: "bg-emerald-200 dark:bg-emerald-900/60 border-emerald-400 dark:border-emerald-700", dot: "🟩" },
  { tile: "bg-sky-200 dark:bg-sky-900/60 border-sky-400 dark:border-sky-700", dot: "🟦" },
  { tile: "bg-violet-200 dark:bg-violet-900/60 border-violet-400 dark:border-violet-700", dot: "🟪" },
] as const;

interface Tile {
  term: string;
  group: number;
}

export default function SortGame({ puzzle, initial, onChange }: GameProps<SortPuzzle, SortData>) {
  const { pick } = useLang();
  const total = puzzle.mistakes;
  const [state, setState] = useState<SortData>(initial ?? { solved: [], history: [], mistakes: 0 });
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [shuffleNo, setShuffleNo] = useState(0);

  const seed = puzzle.groups.map((g) => g.topic.slug).join("|");
  const all = useMemo<Tile[]>(
    () => puzzle.groups.flatMap((g, group) => g.terms.map((term) => ({ term, group }))),
    [puzzle]
  );
  const board = useMemo(() => shuffled(all, seededRandom(`${seed}|tiles|${shuffleNo}`)), [all, seed, shuffleNo]);
  const legend = useMemo(
    () =>
      shuffled(
        puzzle.groups.map((_, i) => i),
        seededRandom(`${seed}|legend`)
      ),
    [puzzle, seed]
  );

  const lost = state.mistakes >= total;
  const won = state.solved.length === puzzle.groups.length;
  const over = won || lost;
  // After a loss the groups still hidden are shown, in order, as "missed".
  const missed = lost ? puzzle.groups.map((_, i) => i).filter((i) => !state.solved.includes(i)) : [];
  const revealed = [...state.solved, ...missed];
  const remaining = board.filter((t) => !revealed.includes(t.group));

  const toggle = (term: string) => {
    if (over) return;

    setNotice("");
    setSelected((cur) => (cur.includes(term) ? cur.filter((t) => t !== term) : cur.length < 4 ? [...cur, term] : cur));
  };

  const submit = () => {
    if (selected.length !== 4 || over) return;

    const groups = selected.map((term) => all.find((t) => t.term === term)!.group);
    const counts = new Map<number, number>();

    for (const g of groups) counts.set(g, (counts.get(g) ?? 0) + 1);

    const best = Math.max(...Array.from(counts.values()));
    const history = [...state.history, groups];
    let next: SortData;

    if (best === 4) {
      next = { ...state, history, solved: [...state.solved, groups[0]] };
      setNotice("");
    } else {
      next = { ...state, history, mistakes: state.mistakes + 1 };
      setNotice(
        best === 3 ? pick("Gần đúng — chỉ lệch một thuật ngữ!", "One away!") : pick("Chưa đúng nhóm nào.", "Not a group.")
      );
    }

    const nowWon = next.solved.length === puzzle.groups.length;
    const nowLost = next.mistakes >= total;

    setState(next);
    setSelected([]);
    onChange(
      next,
      nowWon || nowLost
        ? {
            status: nowWon ? "won" : "lost",
            score: next.mistakes,
            share: [
              `${nowWon ? "✅" : "❌"} ${next.mistakes}/${total}`,
              ...next.history.map((row) => row.map((g) => GROUP_STYLE[g].dot).join("")),
            ].join("\n"),
          }
        : undefined
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
        <p className="text-sm">
          {pick(
            "Chọn 4 thuật ngữ cùng thuộc một chủ đề rồi bấm Gửi. Bốn chủ đề hôm nay:",
            "Pick four terms from the same topic, then Submit. Today's four topics:"
          )}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {legend.map((g) => (
            <li
              key={g}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs",
                revealed.includes(g)
                  ? cn(GROUP_STYLE[g].tile, "font-semibold")
                  : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
              )}
            >
              {pick(puzzle.groups[g].topic.vi, puzzle.groups[g].topic.en)}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        {revealed.map((g) => (
          <div key={g} className={cn("rounded-lg border px-3 py-2.5 text-center", GROUP_STYLE[g].tile)}>
            <p className="text-xs font-semibold">
              {pick(puzzle.groups[g].topic.vi, puzzle.groups[g].topic.en)}
              {missed.includes(g) && ` · ${pick("bỏ lỡ", "missed")}`}
            </p>
            <p className="text-sm font-medium" lang="en">
              {puzzle.groups[g].terms.join(" · ")}
            </p>
          </div>
        ))}

        {remaining.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {remaining.map((tile) => {
              const on = selected.includes(tile.term);

              return (
                <button
                  key={tile.term}
                  type="button"
                  onClick={() => toggle(tile.term)}
                  aria-pressed={on}
                  lang="en"
                  className={cn(
                    "min-h-14 rounded-lg border px-2 py-2 text-sm font-medium break-words transition-colors",
                    on
                      ? "bg-zinc-800 text-white border-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                      : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  {tile.term}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="min-h-5 text-center text-sm text-amber-600 dark:text-amber-400" aria-live="polite">
        {notice}
      </p>

      {!over && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            {pick("Lượt sai còn lại", "Mistakes left")}
            <Lives left={total - state.mistakes} total={total} />
          </div>
          <button type="button" onClick={() => setShuffleNo((n) => n + 1)} className="btn-secondary text-sm px-3 py-2">
            {pick("Xáo trộn", "Shuffle")}
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            disabled={selected.length === 0}
            className="btn-secondary text-sm px-3 py-2 disabled:opacity-50"
          >
            {pick("Bỏ chọn", "Deselect")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={selected.length !== 4}
            className="btn-primary text-sm px-4 py-2 disabled:opacity-50"
          >
            {pick("Gửi", "Submit")} ({selected.length}/4)
          </button>
        </div>
      )}
    </div>
  );
}
