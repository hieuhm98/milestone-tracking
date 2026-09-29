"use client";

// Per-item feedback. Never colour alone: an icon, the word ("Correct!" / "Not
// quite") and the reason always travel together (content spec §2.4 rule 9).

import Link from "next/link";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import Rich, { fill } from "./text";
import { FEEDBACK } from "./tokens";

interface Props {
  correct: boolean;
  /** Why the item is right or wrong — English in both language modes. */
  reason?: string;
  /** The model answer, shown after a wrong try unless answers are hidden. */
  answer?: string;
  hideAnswers?: boolean;
  trapId?: string;
  /** Where "See the trap" goes — an in-page anchor or the traps page. */
  trapHref?: string;
  className?: string;
}

export default function Feedback({
  correct,
  reason,
  answer,
  hideAnswers,
  trapId,
  trapHref,
  className,
}: Props) {
  const { t } = useLang();
  const tone = correct ? FEEDBACK.correct : FEEDBACK.incorrect;
  const Icon = correct ? CheckCircle2 : XCircle;

  return (
    <div role="status" className={cn("mt-2 rounded-lg px-3 py-2 text-sm", tone.frame, className)}>
      <p className={cn("flex items-center gap-1.5 font-semibold", tone.text)}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {correct ? t("grammar.fb.correct") : t("grammar.fb.incorrect")}
      </p>

      {reason && (
        <p className="mt-1 text-zinc-700 dark:text-zinc-300">
          <Rich text={reason} />
        </p>
      )}

      {!correct && answer && !hideAnswers && (
        <p className="mt-1 text-zinc-700 dark:text-zinc-300">
          <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t("grammar.fb.showAnswer")}:
          </span>{" "}
          <strong className="font-semibold">{answer}</strong>
        </p>
      )}

      {!correct && trapId && trapHref && (
        <p className="mt-1.5">
          <Link
            href={trapHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-rose-700 underline underline-offset-2 hover:text-rose-600 dark:text-rose-300 dark:hover:text-rose-200"
          >
            {t("grammar.fb.seeTrap")} ({trapId})
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </p>
      )}
    </div>
  );
}

/**
 * "3 of 5 correct" — the running total under an exercise block.
 *
 * `grammar.fb.score` and `grammar.fb.errorsFound` are the two strings of the
 * content spec §4 that never made it into `lib/i18n.ts`, so they are picked
 * here instead of translated.
 */
export function ScoreLine({
  correct,
  total,
  kind = "score",
  className,
}: {
  correct: number;
  total: number;
  /** "score" counts right answers; "errors" counts mistakes found. */
  kind?: "score" | "errors";
  className?: string;
}) {
  const { t } = useLang();
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const template = t(kind === "errors" ? "grammar.fb.errorsFound" : "grammar.fb.score");

  return (
    <p
      data-testid="grammar-score"
      className={cn("text-sm font-medium text-zinc-600 dark:text-zinc-300", className)}
    >
      <span
        className={cn(
          "mr-2 inline-block h-2 w-16 overflow-hidden rounded-full align-middle",
          "bg-zinc-200 dark:bg-zinc-700"
        )}
        aria-hidden="true"
      >
        <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </span>
      {fill(template, { n: correct, total })}
    </p>
  );
}
