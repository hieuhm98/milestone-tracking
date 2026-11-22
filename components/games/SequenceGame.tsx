"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { seededRandom, shuffled } from "@/lib/games/rng";
import type { MatchPuzzle, OrderPuzzle, SequencePuzzle } from "@/lib/games/types";
import { Lives, type GameProps } from "./shared";

export interface OrderData {
  /** Canonical item indices in the order the learner currently has them. */
  order: number[];
  /** Per check: how many items sat in the right place, out of `order.length`. */
  checks: number[];
}

export interface MatchData {
  matched: number[];
  /** One entry per pair attempt: true = right. */
  attempts: boolean[];
}

export type SequenceData = OrderData | MatchData;

/** A shuffle that is never already the answer, or the puzzle would be solved on arrival. */
function scrambled(n: number, seed: string): number[] {
  const rand = seededRandom(seed);
  const identity = Array.from({ length: n }, (_, i) => i);
  let out = shuffled(identity, rand);

  for (let tries = 0; tries < 20 && out.every((v, i) => v === i); tries++) out = shuffled(identity, rand);

  return out;
}

export default function SequenceGame(props: GameProps<SequencePuzzle, SequenceData>) {
  const { puzzle } = props;
  const { pick } = useLang();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {puzzle.kind === "order" ? pick("Sắp xếp thứ tự", "Put in order") : pick("Ghép cặp", "Match up")} ·{" "}
          {pick(puzzle.topic.vi, puzzle.topic.en)}
        </p>
        <p className="text-base leading-relaxed">{pick(puzzle.prompt.vi, puzzle.prompt.en)}</p>
      </div>

      {puzzle.kind === "order" ? (
        <OrderBoard {...(props as GameProps<SequencePuzzle, SequenceData>)} puzzle={puzzle} />
      ) : (
        <MatchBoard {...(props as GameProps<SequencePuzzle, SequenceData>)} puzzle={puzzle} />
      )}
    </div>
  );
}

function Explanation({ puzzle }: { puzzle: SequencePuzzle }) {
  const { pick } = useLang();

  if (!puzzle.explanation.vi && !puzzle.explanation.en) return null;

  return (
    <p className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-3 text-sm leading-relaxed">
      {pick(puzzle.explanation.vi, puzzle.explanation.en)}
    </p>
  );
}

// ── Order ──────────────────────────────────────────────────────────────────

function OrderBoard({ puzzle, initial, onChange }: GameProps<SequencePuzzle, SequenceData> & { puzzle: OrderPuzzle }) {
  const { pick } = useLang();
  const n = puzzle.items.length;
  const saved = initial && "order" in initial ? initial : undefined;
  const [order, setOrder] = useState<number[]>(() => saved?.order ?? scrambled(n, puzzle.seed));
  const [checks, setChecks] = useState<number[]>(saved?.checks ?? []);
  // Which rows were right at the last check, so a move clears the green.
  const [marks, setMarks] = useState<boolean[] | null>(null);

  const solved = checks[checks.length - 1] === n;
  const out = !solved && checks.length >= puzzle.attempts;
  const over = solved || out;
  const shown = out ? Array.from({ length: n }, (_, i) => i) : order;

  const move = (pos: number, by: -1 | 1) => {
    const to = pos + by;

    if (over || to < 0 || to >= n) return;

    const next = [...order];

    [next[pos], next[to]] = [next[to], next[pos]];
    setOrder(next);
    setMarks(null);
  };

  const check = () => {
    if (over) return;

    const right = order.map((item, pos) => item === pos);
    const count = right.filter(Boolean).length;
    const nextChecks = [...checks, count];
    const nowSolved = count === n;
    const nowOut = !nowSolved && nextChecks.length >= puzzle.attempts;

    setMarks(right);
    setChecks(nextChecks);
    onChange(
      { order, checks: nextChecks },
      nowSolved || nowOut
        ? {
            status: nowSolved ? "won" : "lost",
            score: nextChecks.length,
            share: [
              `${nowSolved ? "✅" : "❌"} ${nextChecks.length}/${puzzle.attempts}`,
              ...nextChecks.map((c) => "🟩".repeat(c) + "⬛".repeat(n - c)),
            ].join("\n"),
          }
        : undefined
    );
  };

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {shown.map((item, pos) => {
          const ok = out ? true : marks?.[pos];

          return (
            <li
              key={item}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2 pl-3",
                ok === true && "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800",
                ok === false && "border-rose-400 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800",
                ok === undefined || ok === null
                  ? "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  : ""
              )}
            >
              <span className="w-5 shrink-0 text-xs font-semibold text-zinc-500">{pos + 1}</span>
              <span className="flex-1 text-sm">{pick(puzzle.items[item].vi, puzzle.items[item].en)}</span>
              {!over && (
                <span className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => move(pos, -1)}
                    disabled={pos === 0}
                    aria-label={pick("Chuyển lên", "Move up")}
                    className="h-10 w-10 flex items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(pos, 1)}
                    disabled={pos === n - 1}
                    aria-label={pick("Chuyển xuống", "Move down")}
                    className="h-10 w-10 flex items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800 disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {!over && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <p className="text-sm text-zinc-500" aria-live="polite">
            {checks.length > 0 &&
              pick(
                `Lần kiểm tra gần nhất: ${checks[checks.length - 1]}/${n} đúng vị trí. `,
                `Last check: ${checks[checks.length - 1]}/${n} in the right place. `
              )}
            {pick(`Còn ${puzzle.attempts - checks.length} lần kiểm tra`, `${puzzle.attempts - checks.length} checks left`)}
          </p>
          <button type="button" onClick={check} className="btn-primary text-sm px-4 py-2">
            {pick("Kiểm tra", "Check order")}
          </button>
        </div>
      )}

      {over && <Explanation puzzle={puzzle} />}
    </div>
  );
}

// ── Match ──────────────────────────────────────────────────────────────────

function MatchBoard({ puzzle, initial, onChange }: GameProps<SequencePuzzle, SequenceData> & { puzzle: MatchPuzzle }) {
  const { pick } = useLang();
  const n = puzzle.pairs.length;
  const saved = initial && "matched" in initial ? initial : undefined;
  const [matched, setMatched] = useState<number[]>(saved?.matched ?? []);
  const [attempts, setAttempts] = useState<boolean[]>(saved?.attempts ?? []);
  const [left, setLeft] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const [wrong, setWrong] = useState<{ l: number; r: number } | null>(null);

  const mistakes = attempts.filter((a) => !a).length;
  const won = matched.length === n;
  const lost = !won && mistakes >= puzzle.mistakes;
  const over = won || lost;

  const leftOrder = useMemo(() => scrambled(n, `${puzzle.seed}|left`), [n, puzzle.seed]);
  const rightOrder = useMemo(() => scrambled(n, `${puzzle.seed}|right`), [n, puzzle.seed]);

  const attempt = (l: number, r: number) => {
    const ok = l === r;
    const nextAttempts = [...attempts, ok];
    const nextMatched = ok ? [...matched, l] : matched;
    const nowWon = nextMatched.length === n;
    const nowLost = !nowWon && nextAttempts.filter((a) => !a).length >= puzzle.mistakes;

    setAttempts(nextAttempts);
    setMatched(nextMatched);
    setLeft(null);
    setRight(null);
    setWrong(ok ? null : { l, r });

    if (!ok) window.setTimeout(() => setWrong(null), 700);

    onChange(
      { matched: nextMatched, attempts: nextAttempts },
      nowWon || nowLost
        ? {
            status: nowWon ? "won" : "lost",
            score: nextAttempts.filter((a) => !a).length,
            share: [
              `${nowWon ? "✅" : "❌"} ${nextAttempts.filter((a) => !a).length}/${puzzle.mistakes}`,
              nextAttempts.map((a) => (a ? "🟩" : "🟥")).join(""),
            ].join("\n"),
          }
        : undefined
    );
  };

  const pickLeft = (i: number) => {
    if (over || matched.includes(i)) return;

    if (right !== null) attempt(i, right);
    else setLeft(left === i ? null : i);
  };

  const pickRight = (i: number) => {
    if (over || matched.includes(i)) return;

    if (left !== null) attempt(left, i);
    else setRight(right === i ? null : i);
  };

  const cell = (i: number, side: "l" | "r", picked: number | null) =>
    cn(
      "w-full rounded-lg border p-3 text-left text-sm transition-colors",
      matched.includes(i) || lost
        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800"
        : wrong && wrong[side] === i
          ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800"
          : picked === i
            ? "border-zinc-800 dark:border-zinc-200 bg-zinc-100 dark:bg-zinc-800"
            : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
    );

  // After a loss every pair is shown solved, in the left column's order.
  if (lost) {
    return (
      <div className="space-y-3">
        <ul className="space-y-2">
          {puzzle.pairs.map((p, i) => (
            <li key={i} className={cn(cell(i, "l", null), "grid gap-1 sm:grid-cols-2")}>
              <span className="font-medium">{pick(p.left.vi, p.left.en)}</span>
              <span>{pick(p.right.vi, p.right.en)}</span>
            </li>
          ))}
        </ul>
        <Explanation puzzle={puzzle} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          {leftOrder.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => pickLeft(i)}
              disabled={matched.includes(i)}
              aria-pressed={left === i}
              className={cell(i, "l", left)}
            >
              {pick(puzzle.pairs[i].left.vi, puzzle.pairs[i].left.en)}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rightOrder.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => pickRight(i)}
              disabled={matched.includes(i)}
              aria-pressed={right === i}
              className={cell(i, "r", right)}
            >
              {pick(puzzle.pairs[i].right.vi, puzzle.pairs[i].right.en)}
            </button>
          ))}
        </div>
      </div>

      {!over && (
        <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
          {pick("Lượt sai còn lại", "Mistakes left")}
          <Lives left={puzzle.mistakes - mistakes} total={puzzle.mistakes} />
        </div>
      )}

      {over && <Explanation puzzle={puzzle} />}
    </div>
  );
}
