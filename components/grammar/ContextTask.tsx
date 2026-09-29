"use client";

// GRAMMAR IN CONTEXT — an authored paragraph where the learner taps every word
// of the type asked for. A tap on a target turns green and counts; a tap on any
// other word turns red and says why nothing was found there.

import { useMemo, useState } from "react";
import { Eye, RotateCcw } from "lucide-react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { GrammarInContext } from "@/lib/grammar/types";
import Feedback, { ScoreLine } from "./Feedback";
import { tokenise } from "./tokenise";
import { TOKEN, type PartTokens } from "./tokens";

interface Props {
  context: GrammarInContext;
  tokens: PartTokens;
  answers: Record<string, number>;
  mark: (itemId: string, correct: boolean) => void;
  clear: (itemIds: string[]) => void;
  hideAnswers: boolean;
}

export const contextKey = (index: number) => `ctx-${index}`;

/** What "tap every …" means for each task, in interface language. */
function taskName(task: GrammarInContext["task"], pick: (vi: string, en: string) => string): string {
  if (task === "tap-nouns") return pick("danh từ", "noun");

  if (task === "tap-clauses") return pick("mệnh đề", "clause");

  if (task === "tap-errors") return pick("lỗi sai", "mistake");

  return pick("động từ", "verb");
}

export default function ContextTask({ context, tokens, answers, mark, clear, hideAnswers }: Props) {
  const { t, pick } = useLang();
  const pieces = useMemo(() => tokenise(context.paragraph, context.targets), [context]);
  const total = pieces.filter((piece) => piece.hit >= 0).length;
  const [misses, setMisses] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);

  const found = pieces.filter((piece) => piece.hit >= 0 && answers[contextKey(piece.hit)] === 1).length;
  const word = taskName(context.task, pick);

  const reset = () => {
    setMisses([]);
    setRevealed(false);
    clear(pieces.filter((piece) => piece.hit >= 0).map((piece) => contextKey(piece.hit)));
  };

  return (
    <div className="space-y-3">
      <div className={cn("rounded-xl border p-4", tokens.soft)}>
        <h3 className="mb-2 font-semibold">{context.title}</h3>

        <p className="leading-loose">
          {pieces.map((piece, index) => {
            if (piece.gap) return <span key={index}>{piece.text}</span>;

            const isTarget = piece.hit >= 0;
            const hit = isTarget && answers[contextKey(piece.hit)] === 1;
            const missed = misses.includes(index);
            const show = isTarget && revealed && !hit;

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (isTarget) {
                    mark(contextKey(piece.hit), true);

                    return;
                  }

                  setMisses((prev) => (prev.includes(index) ? prev : [...prev, index]));
                }}
                aria-pressed={hit || missed}
                className={cn(
                  "transition-colors",
                  hit ? TOKEN.hit : missed ? TOKEN.miss : show ? TOKEN.revealed : TOKEN.idle
                )}
              >
                {piece.text}
              </button>
            );
          })}
        </p>
      </div>

      {misses.length > 0 && (
        <Feedback
          correct={false}
          reason={pick(
            `Từ đó không phải là ${word} trong câu này. Hãy thử từ khác.`,
            `That word is not a ${word} here. Try another one.`
          )}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ScoreLine correct={found} total={total} />

        <span className="flex flex-wrap items-center gap-4">
          {!hideAnswers && found < total && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              {t("grammar.fb.showAnswer")}
            </button>
          )}

          {(found > 0 || misses.length > 0 || revealed) && (
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
    </div>
  );
}
