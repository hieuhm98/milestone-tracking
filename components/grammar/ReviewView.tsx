"use client";

// A Part review (content spec §3.3): one long editing paragraph across the
// whole Part, then the mixed choose-one / find-and-fix items, then a result
// table broken down by unit.

import { useMemo } from "react";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { ChoiceItem, FixItem, PartReview, SyllabusPart, Trap } from "@/lib/grammar/types";
import { BlockHeading } from "./Blocks";
import EditingBlock from "./EditingBlock";
import { ScoreLine } from "./Feedback";
import { ExerciseRow, selfCheckKey } from "./SelfCheck";
import { reviewTotal } from "./scoring";
import { useGrammarSettings } from "./settings";
import { useScore, useWrongTraps, reviewKey } from "./progress";
import { trapsHref, trapAnchor, unitHref } from "./navigation";
import { partTokens } from "./tokens";

interface Props {
  review: PartReview;
  part: SyllabusPart | null;
  traps: Trap[];
}

export default function ReviewView({ review, part, traps }: Props) {
  const { t, pick } = useLang();
  const [settings] = useGrammarSettings();
  const { addWrong } = useWrongTraps();

  const tokens = partTokens(review.part);
  const total = useMemo(() => reviewTotal(review), [review]);
  const score = useScore(reviewKey(review.part), total);

  // The traps page holds the cards, so a review's "See the trap" leaves the
  // page rather than pointing at an anchor that is not here.
  const trapHref = (id: string) => `${trapsHref()}#${trapAnchor(id)}`;
  const byId = new Map(traps.map((trap) => [trap.id, trap]));

  // Which unit each item belongs to, taken from the trap it points at.
  const unitOf = (item: ChoiceItem | FixItem): number[] => byId.get(item.trap ?? "")?.units ?? [];

  const perUnit = (part?.units ?? []).map((unit) => {
    const items = review.items.filter((item) => unitOf(item).includes(unit.number));
    const answered = items.filter((item) => selfCheckKey(item.id) in score.answers);
    const correct = items.filter((item) => score.answers[selfCheckKey(item.id)] === 1);

    return { unit, items: items.length, answered: answered.length, correct: correct.length };
  });

  const itemsCorrect = review.items.filter((item) => score.answers[selfCheckKey(item.id)] === 1).length;

  return (
    <div className="max-w-4xl space-y-8 pb-10">
      <header>
        <p className={cn("text-xs font-semibold uppercase tracking-[0.2em]", tokens.text)}>
          Part {review.part}
          {part ? ` · ${part.title}` : ""}
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{review.title}</h1>
      </header>

      <section className="space-y-3">
        <BlockHeading
          id="editing"
          label="Editing Practice"
          tokens={tokens}
          instruction={t("grammar.instr.editing")}
        />

        <EditingBlock
          editing={review.editing}
          prefix="rv-"
          tokens={tokens}
          answers={score.answers}
          mark={score.mark}
          clear={score.clear}
          hideAnswers={settings.hideAnswers}
          trapHref={trapHref}
          onWrongTrap={addWrong}
        />
      </section>

      <section className="space-y-3">
        <BlockHeading id="items" label="Mixed Practice" tokens={tokens} instruction={t("grammar.instr.choose")} />

        <ol className="space-y-4">
          {review.items.map((item, index) => (
            <li key={item.id} className="card">
              <ExerciseRow
                item={item}
                index={index}
                tokens={tokens}
                state={score.answers[selfCheckKey(item.id)]}
                mark={score.mark}
                hideAnswers={settings.hideAnswers}
                trapHref={trapHref}
                onWrongTrap={addWrong}
              />
            </li>
          ))}
        </ol>

        <ScoreLine correct={itemsCorrect} total={review.items.length} />
      </section>

      {perUnit.length > 0 && (
        <section className="space-y-3">
          <BlockHeading id="results" label="Results by unit" tokens={tokens} />

          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
                <caption className="sr-only">{pick("Kết quả theo bài", "Results by unit")}</caption>

                <thead>
                  <tr className={tokens.head}>
                    <th scope="col" className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                      Unit
                    </th>
                    <th scope="col" className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                      {pick("Đúng", "Correct")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {perUnit.map((row, index) => (
                    <tr
                      key={row.unit.id}
                      className={cn(
                        "border-t border-zinc-200 dark:border-zinc-800",
                        index % 2 === 1 && "bg-zinc-50 dark:bg-zinc-900/60"
                      )}
                    >
                      <td className="px-3 py-2">
                        <Link href={unitHref(row.unit.id)} className="underline underline-offset-2">
                          {row.unit.number}. {row.unit.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        {row.items === 0 ? "—" : `${row.correct}/${row.items}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {pick("Tổng", "Total")}: {score.correct}/{total}
          </p>
        </section>
      )}
    </div>
  );
}
