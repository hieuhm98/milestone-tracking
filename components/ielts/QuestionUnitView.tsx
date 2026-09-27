"use client";

// One complete question: title, jump bar, Band 6, Band 9, the three-criteria
// analysis, Key difference, Vocabulary, and the two footer links. Shared by
// Part 1, Part 2 and Part 3 — the only difference is the title and, for Part 2,
// the cue card above the answers.

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { CueCard, QuestionUnit } from "@/lib/ielts/types";
import { BAND, KEY_DIFFERENCE, PART, VOCAB, type PartKey } from "./tokens";
import { IELTS_BASE, type FlatEntry } from "./navigation";
import { useReaderSettings } from "./settings";
import AnswerBlock from "./AnswerBlock";
import AnalysisTable from "./AnalysisTable";
import KeyDifference from "./KeyDifference";
import VocabTable from "./VocabTable";
import CueCardBox from "./CueCardBox";

interface Props {
  unit: QuestionUnit;
  /** In-page anchor: "q18", "part2", "p3-1". */
  anchor: string;
  /** Eyebrow above the question, e.g. "Part 3 · 1". */
  eyebrow?: string;
  /** Which half of the section this unit belongs to, for the accent colour. */
  part: PartKey;
  /** Part 2 only: the cue card and its 1-minute notes. */
  cueCard?: CueCard;
  prev: FlatEntry | null;
  next: FlatEntry | null;
  /** Anchor of the in-page question list. */
  listAnchor: string;
}

const PILL =
  "rounded-full border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-xs font-medium transition-colors";

export default function QuestionUnitView({
  unit,
  anchor,
  eyebrow,
  part,
  cueCard,
  prev,
  next,
  listAnchor,
}: Props) {
  const { t } = useLang();
  const [settings] = useReaderSettings();
  const [revealed, setRevealed] = useState(false);

  // Practice mode: the learner answers first, so Band 9 — and everything that
  // gives the answer away — stays folded until they ask for it.
  const hidden = settings.practice && !revealed;

  return (
    <section id={anchor} className="scroll-mt-28 border-t border-zinc-200 pt-6 dark:border-zinc-800">
      {eyebrow && (
        <p className={cn("text-xs font-semibold uppercase tracking-[0.2em]", PART[part].text)}>{eyebrow}</p>
      )}

      <h3 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
        {unit.kind === "part1" ? `${unit.number}. ` : ""}
        {unit.question}
      </h3>

      {unit.kind === "part2" && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Part 2 · Long turn: 1 minute to prepare, then speak for 1–2 minutes
        </p>
      )}

      {/* Jump bar */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
        {settings.band6 && (
          <a href={`#${unit.id}-band6`} className={cn(PILL, BAND.band6.label, "hover:bg-amber-100 dark:hover:bg-amber-900/40")}>
            Band 6
          </a>
        )}

        <a href={`#${unit.id}-band9`} className={cn(PILL, BAND.band9.label, "hover:bg-emerald-100 dark:hover:bg-emerald-900/40")}>
          Band 9
        </a>

        <a href={`#${unit.id}-analysis`} className={cn(PILL, KEY_DIFFERENCE.label, "hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/40")}>
          {t("ielts.jump.analysis")}
        </a>

        <a href={`#${unit.id}-vocab`} className={cn(PILL, VOCAB.term, "hover:bg-cyan-100 dark:hover:bg-cyan-900/40")}>
          {t("ielts.jump.vocab")}
        </a>

        <span className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          {prev && (
            <Link href={prev.href} title={prev.label} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              {t("ielts.nav.prev")}
            </Link>
          )}
          {next && (
            <Link href={next.href} title={next.label} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              {t("ielts.nav.next")}
            </Link>
          )}
        </span>
      </div>

      {cueCard && (
        <div className="mt-4">
          <CueCardBox card={cueCard} />
        </div>
      )}

      <div className="mt-4 space-y-4">
        {settings.band6 && (
          <AnswerBlock
            id={`${unit.id}-band6`}
            band={6}
            answer={unit.band6}
            vocabulary={unit.vocabulary}
            unitId={unit.id}
          />
        )}

        {settings.practice && (
          <button
            type="button"
            onClick={() => setRevealed(!revealed)}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            {hidden ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
            {hidden ? t("ielts.practice.reveal") : t("ielts.practice.hide")}
          </button>
        )}

        {!hidden && (
          <>
            <AnswerBlock
              id={`${unit.id}-band9`}
              band={9}
              answer={unit.band9}
              vocabulary={unit.vocabulary}
              unitId={unit.id}
            />

            <AnalysisTable id={`${unit.id}-analysis`} analysis={unit.analysis} />

            <KeyDifference text={unit.analysis.keyDifference} note={unit.analysis.note} />

            <VocabTable id={`${unit.id}-vocab`} rows={unit.vocabulary} unitId={unit.id} />
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href={`#${listAnchor}`} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          {t("ielts.nav.backToList")}
        </a>
        <Link href={`${IELTS_BASE}#contents`} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          {t("ielts.nav.mainContents")}
        </Link>
      </div>
    </section>
  );
}
