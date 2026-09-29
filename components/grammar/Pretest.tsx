"use client";

// PRETEST — "tick the sentences that are correct". Each row has two buttons so
// the learner commits to a judgement either way, which is what makes instant
// per-item feedback possible; a sentence left alone is simply not answered yet.

import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { TickItem } from "@/lib/grammar/types";
import Feedback, { ScoreLine } from "./Feedback";
import Rich from "./text";
import { LAYER, type PartTokens } from "./tokens";

interface Props {
  items: TickItem[];
  tokens: PartTokens;
  /** Item id → `pt-<id>` in the score map. */
  answers: Record<string, number>;
  mark: (itemId: string, correct: boolean) => void;
  clear: (itemIds: string[]) => void;
  hideAnswers: boolean;
  trapHref: (trapId: string) => string;
  onWrongTrap: (trapId?: string) => void;
  /** Shows the layer chip when both layers are on screen. */
  showLayerChip?: boolean;
}

export const pretestKey = (id: string) => `pt-${id}`;

export default function Pretest({
  items,
  tokens,
  answers,
  mark,
  clear,
  hideAnswers,
  trapHref,
  onWrongTrap,
  showLayerChip,
}: Props) {
  const { t, pick } = useLang();
  // What the learner said about each item — the score map only keeps right or
  // wrong, and the buttons have to show which one was pressed.
  const [choice, setChoice] = useState<Record<string, boolean>>({});

  const answered = items.filter((item) => pretestKey(item.id) in answers);
  const correct = answered.filter((item) => answers[pretestKey(item.id)] === 1);

  const answer = (item: TickItem, saidCorrect: boolean) => {
    const right = saidCorrect === item.correct;

    setChoice((prev) => ({ ...prev, [item.id]: saidCorrect }));
    mark(pretestKey(item.id), right);

    if (!right) onWrongTrap(item.trap);
  };

  const reset = () => {
    setChoice({});
    clear(items.map((item) => pretestKey(item.id)));
  };

  if (items.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("grammar.traps.none")}</p>;
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {items.map((item, index) => {
          const key = pretestKey(item.id);
          const state = answers[key];
          const said = choice[item.id];
          const done = state !== undefined;

          return (
            <li key={item.id} className="card p-3 sm:p-3">
              <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">{index + 1}.</span>

                <p className="min-w-0 flex-1 basis-48">
                  <Rich text={item.sentence} boldClassName={tokens.target} />
                </p>

                {showLayerChip && (
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px]", LAYER[item.layer].chip)}>
                    {t(item.layer === "core" ? "grammar.unit.core" : "grammar.unit.extend")}
                  </span>
                )}

                <span className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => answer(item, true)}
                    aria-pressed={done && said === true}
                    aria-label={pick("Câu này đúng", "This sentence is correct")}
                    className={cn(
                      "flex h-8 w-9 items-center justify-center rounded-lg border text-sm transition-colors",
                      done && said === true
                        ? "border-green-500 bg-green-600 text-white"
                        : "border-zinc-300 text-zinc-600 hover:bg-green-50 hover:text-green-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-green-950/50"
                    )}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={() => answer(item, false)}
                    aria-pressed={done && said === false}
                    aria-label={pick("Câu này sai", "This sentence has a mistake")}
                    className={cn(
                      "flex h-8 w-9 items-center justify-center rounded-lg border text-sm transition-colors",
                      done && said === false
                        ? "border-red-500 bg-red-600 text-white"
                        : "border-zinc-300 text-zinc-600 hover:bg-red-50 hover:text-red-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-red-950/50"
                    )}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              </div>

              {done && (
                <Feedback
                  correct={state === 1}
                  reason={item.reason}
                  hideAnswers={hideAnswers}
                  trapId={item.trap}
                  trapHref={item.trap ? trapHref(item.trap) : undefined}
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ScoreLine correct={correct.length} total={items.length} />

        {answered.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("grammar.unit.retakePretest")}
          </button>
        )}
      </div>
    </div>
  );
}
