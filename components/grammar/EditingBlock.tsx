"use client";

// EDITING PRACTICE — tap a mistake in the paragraph, then type the correction.
// A tap on a span that is not a mistake says so; a wrong correction shows the
// reason and, where there is one, the trap behind the error.

import { useMemo, useState } from "react";
import { Eye, RotateCcw } from "lucide-react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { EditingPractice } from "@/lib/grammar/types";
import Feedback, { ScoreLine } from "./Feedback";
import Rich, { matchesAnswer } from "./text";
import { tokenise } from "./tokenise";
import { TOKEN, type PartTokens } from "./tokens";

interface Props {
  editing: EditingPractice;
  /** `ed-` for a unit, `rv-` for a Part review, so keys never collide. */
  prefix: string;
  tokens: PartTokens;
  answers: Record<string, number>;
  mark: (itemId: string, correct: boolean) => void;
  clear: (itemIds: string[]) => void;
  hideAnswers: boolean;
  trapHref: (trapId: string) => string;
  onWrongTrap: (trapId?: string) => void;
}

export const editingKey = (prefix: string, index: number) => `${prefix}${index}`;

export default function EditingBlock({
  editing,
  prefix,
  tokens,
  answers,
  mark,
  clear,
  hideAnswers,
  trapHref,
  onWrongTrap,
}: Props) {
  const { t, pick } = useLang();
  // The tokeniser numbers the mistakes by where they sit in the paragraph,
  // which need not be the order they were authored in, so each occurrence is
  // paired back to its own entry in `errors`.
  const { pieces, errorOf } = useMemo(() => {
    const parts = tokenise(editing.text, editing.errors.map((item) => item.span));
    const used = new Set<number>();
    const map: number[] = [];

    for (const piece of parts) {
      if (piece.hit < 0) continue;

      const index = editing.errors.findIndex((item, i) => !used.has(i) && item.span === piece.text);

      used.add(index);
      map[piece.hit] = index;
    }

    return { pieces: parts, errorOf: map };
  }, [editing]);

  const hits = pieces.filter((piece) => piece.hit >= 0);
  const [active, setActive] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const [tried, setTried] = useState(false);
  const [missIndex, setMissIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const fixed = hits.filter((piece) => answers[editingKey(prefix, piece.hit)] === 1).length;
  const error = active === null ? null : editing.errors[errorOf[active]] ?? null;
  const lastTryRight = active !== null && answers[editingKey(prefix, active)] === 1;

  const open = (hit: number) => {
    setActive(hit);
    setMissIndex(null);
    setTried(false);
    setValue("");
  };

  const check = () => {
    if (active === null || !error || !value.trim()) return;

    const right = matchesAnswer(value, [error.fix, editing.text.replace(error.span, error.fix)]);

    setTried(true);
    mark(editingKey(prefix, active), right);

    if (!right) onWrongTrap(error.trap);
  };

  const reset = () => {
    setActive(null);
    setValue("");
    setTried(false);
    setMissIndex(null);
    setRevealed(false);
    clear(hits.map((piece) => editingKey(prefix, piece.hit)));
  };

  return (
    <div className="space-y-3">
      <div className="card">
        <p className="leading-loose">
          {pieces.map((piece, index) => {
            if (piece.gap) return <span key={index}>{piece.text}</span>;

            const isError = piece.hit >= 0;
            const done = isError && answers[editingKey(prefix, piece.hit)] === 1;
            const selected = isError && active === piece.hit && !done;
            const missed = missIndex === index;
            const show = isError && revealed && !done;

            if (done) {
              return (
                <span key={index} className={cn("mx-0.5 inline-flex items-baseline gap-1")}>
                  <s className="text-zinc-400 dark:text-zinc-500">{piece.text}</s>
                  <span className={TOKEN.hit}>{editing.errors[errorOf[piece.hit]]?.fix}</span>
                </span>
              );
            }

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (isError) {
                    open(piece.hit);

                    return;
                  }

                  setMissIndex(index);
                  setActive(null);
                }}
                aria-pressed={selected || missed}
                className={cn(
                  "transition-colors",
                  missed
                    ? TOKEN.miss
                    : selected
                      ? "rounded bg-amber-300 px-0.5 font-semibold text-amber-950 dark:bg-amber-600 dark:text-amber-50"
                      : show
                        ? TOKEN.revealed
                        : TOKEN.idle
                )}
              >
                {piece.text}
              </button>
            );
          })}
        </p>
      </div>

      {missIndex !== null && (
        <Feedback
          correct={false}
          reason={pick(
            "Chỗ đó không có lỗi. Hãy tìm chỗ khác.",
            "There is no mistake there. Look somewhere else."
          )}
        />
      )}

      {error && !lastTryRight && (
        <div className="card space-y-2 p-3 sm:p-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {pick("Sửa", "Correct")}: <strong className="font-semibold">{error.span}</strong>
            <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[11px]", tokens.chip)}>{error.type}</span>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  check();
                }
              }}
              placeholder={pick("Phần sửa", "The correction")}
              aria-label={pick("Phần sửa", "The correction")}
              className="input w-auto min-w-0 flex-1 basis-40 py-1.5"
            />

            <button type="button" onClick={check} className="btn-primary px-3 py-1.5 text-sm">
              {t("grammar.fb.check")}
            </button>
          </div>

          {tried && (
            <Feedback
              correct={false}
              reason={error.reason}
              answer={error.fix}
              hideAnswers={hideAnswers}
              trapId={error.trap}
              trapHref={error.trap ? trapHref(error.trap) : undefined}
            />
          )}
        </div>
      )}

      {error && lastTryRight && (
        <Feedback correct reason={error.reason} trapId={error.trap} trapHref={error.trap ? trapHref(error.trap) : undefined} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ScoreLine correct={fixed} total={hits.length} kind="errors" />

        <span className="flex flex-wrap items-center gap-4">
          {!hideAnswers && fixed < hits.length && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              {t("grammar.fb.showAnswer")}
            </button>
          )}

          {(fixed > 0 || active !== null || missIndex !== null || revealed) && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("grammar.fb.reset")}
            </button>
          )}
        </span>
      </div>

      {revealed && !hideAnswers && (
        <ul className="space-y-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {editing.errors.map((item, index) => (
            <li key={index}>
              <span className="text-rose-700 line-through dark:text-rose-300">{item.span}</span>{" "}
              <span aria-hidden="true">→</span>{" "}
              <span className="font-semibold text-green-700 dark:text-green-300">{item.fix}</span>{" "}
              <span className="text-zinc-600 dark:text-zinc-400">
                — <Rich text={item.reason} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
