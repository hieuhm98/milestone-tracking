"use client";

// One unit, in the order the content spec §3.2 fixes: opener → GRAMMAR FOCUS →
// PRETEST → GRAMMAR IN CONTEXT → the Forming / Using sections with their Self
// Checks, Writing Tips and Notes → VIETNAMESE LEARNER TRAPS → EDITING PRACTICE
// → WRITING TOPICS → prev / next.
//
// Core / Extend filter the sections and the pretest by layer; the traps, the
// editing practice and the topics always show.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { Layer, Section, Trap, Unit } from "@/lib/grammar/types";
import { BlockHeading, NoteCallout, RuleList, WritingTip } from "./Blocks";
import ContextTask from "./ContextTask";
import EditingBlock from "./EditingBlock";
import GrammarTable from "./GrammarTable";
import PageNav, { type NavTarget } from "./PageNav";
import Pretest from "./Pretest";
import SelfCheckBlock from "./SelfCheck";
import TimelineSvg from "./TimelineSvg";
import TrapCard from "./TrapCard";
import WritingTopics from "./WritingTopics";
import Rich from "./text";
import { gradableTotal } from "./scoring";
import { useGrammarSettings } from "./settings";
import { useScore, useWrongTraps, unitKey } from "./progress";
import { trapAnchor } from "./navigation";
import { LAYER, partTokens } from "./tokens";

interface Props {
  unit: Unit;
  /** The unit's traps, already looked up in traps.json. */
  traps: Trap[];
  partTitle: string;
  prev: NavTarget | null;
  next: NavTarget | null;
}

export default function UnitView({ unit, traps, partTitle, prev, next }: Props) {
  const { t, pick } = useLang();
  const [settings] = useGrammarSettings();
  const [layer, setLayer] = useState<Layer>("core");
  const { addWrong } = useWrongTraps();

  const tokens = partTokens(unit.part);
  const total = useMemo(() => gradableTotal(unit), [unit]);
  const score = useScore(unitKey(unit.id), total);

  const hasExtend = unit.sections.some((section) => section.layer === "extend");
  const active: Layer = settings.showExtend && hasExtend ? layer : "core";

  const sections = unit.sections.filter((section) => section.layer === active);
  const pretest = unit.pretest.filter((item) => item.layer === active);

  // Self Check numbers are fixed by the unit, not by the tab, so "Self Check 3"
  // means the same block whichever layer is on screen.
  const selfCheckNumber = new Map<string, number>();
  let counter = 0;

  for (const section of unit.sections) {
    if (!section.selfCheck) continue;

    counter += 1;
    selfCheckNumber.set(section.id, counter);
  }

  const trapHref = (id: string) => `#${trapAnchor(id)}`;

  return (
    <article className="max-w-4xl space-y-8 pb-10">
      <header>
        <p className={cn("text-xs font-semibold uppercase tracking-[0.2em]", tokens.text)}>{partTitle}</p>

        <div className="mt-2 flex flex-wrap items-center gap-4">
          <span
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-black",
              tokens.block
            )}
            aria-hidden="true"
          >
            {unit.number}
          </span>

          <h1 className="min-w-0 flex-1 basis-48 text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="sr-only">Unit {unit.number} — </span>
            {unit.title}
          </h1>
        </div>

        {unit.status === "draft" && (
          <p className="mt-2">
            <span className="inline-block rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-100">
              {t("grammar.unit.draft")}
            </span>
          </p>
        )}

        {settings.showExtend && hasExtend && (
          <div className="mt-3 flex gap-2" role="tablist" aria-label="Core / Extend">
            {(["core", "extend"] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active === id}
                data-testid={`grammar-tab-${id}`}
                onClick={() => setLayer(id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  active === id ? LAYER[id].on : LAYER[id].off
                )}
              >
                {t(id === "core" ? "grammar.unit.core" : "grammar.unit.extend")}
              </button>
            ))}
          </div>
        )}
      </header>

      <section className="space-y-3">
        <BlockHeading id="focus" label="Grammar Focus" tokens={tokens} />

        <p>
          <Rich text={unit.focus.text} boldClassName={tokens.target} />
        </p>

        {unit.focus.summaryTable && <GrammarTable table={unit.focus.summaryTable} tokens={tokens} />}
      </section>

      <section className="space-y-3">
        <BlockHeading id="pretest" label="Pretest" tokens={tokens} instruction={t("grammar.instr.tick")} />

        <Pretest
          items={pretest}
          tokens={tokens}
          answers={score.answers}
          mark={score.mark}
          clear={score.clear}
          hideAnswers={settings.hideAnswers}
          trapHref={trapHref}
          onWrongTrap={addWrong}
          showLayerChip={false}
        />
      </section>

      <section className="space-y-3">
        <BlockHeading
          id="context"
          label="Grammar in Context"
          tokens={tokens}
          instruction={t("grammar.instr.context")}
        />

        <ContextTask
          context={unit.context}
          tokens={tokens}
          answers={score.answers}
          mark={score.mark}
          clear={score.clear}
          hideAnswers={settings.hideAnswers}
        />
      </section>

      {sections.map((section) => (
        <SectionView
          key={section.id}
          section={section}
          number={selfCheckNumber.get(section.id) ?? 1}
          tokens={tokens}
          score={score}
          hideAnswers={settings.hideAnswers}
          trapHref={trapHref}
          onWrongTrap={addWrong}
        />
      ))}

      <section className="space-y-3">
        <BlockHeading id="traps" label="Vietnamese Learner Traps" tokens={tokens} />

        <p className="text-sm italic text-zinc-500 dark:text-zinc-400">Lỗi thường gặp của người Việt</p>

        {traps.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("grammar.traps.none")}</p>
        ) : (
          <div className="space-y-3">
            {traps.map((trap) => (
              <TrapCard key={trap.id} trap={trap} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <BlockHeading
          id="editing"
          label="Editing Practice"
          tokens={tokens}
          instruction={t("grammar.instr.editing")}
        />

        <EditingBlock
          editing={unit.editing}
          prefix="ed-"
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
        <BlockHeading
          id="topics"
          label="Writing Topics"
          tokens={tokens}
          instruction={t("grammar.instr.topics")}
        />

        <WritingTopics topics={unit.topics} tokens={tokens} />
      </section>

      <p>
        <Link
          href="#pretest"
          className={cn(
            "inline-block rounded-lg border px-3 py-1.5 text-sm font-medium",
            "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          )}
        >
          {t("grammar.unit.retakePretest")}
        </Link>
      </p>

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {pick("Điểm của bài này", "Your score for this unit")}: {score.correct}/{total}
      </p>

      <PageNav prev={prev} next={next} tokens={tokens} />
    </article>
  );
}

function SectionView({
  section,
  number,
  tokens,
  score,
  hideAnswers,
  trapHref,
  onWrongTrap,
}: {
  section: Section;
  number: number;
  tokens: ReturnType<typeof partTokens>;
  score: ReturnType<typeof useScore>;
  hideAnswers: boolean;
  trapHref: (trapId: string) => string;
  onWrongTrap: (trapId?: string) => void;
}) {
  const { t } = useLang();

  return (
    <section id={section.id} className="scroll-mt-28 space-y-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2
          className={cn(
            "text-lg font-bold underline decoration-2 underline-offset-8 sm:text-xl",
            tokens.underline
          )}
        >
          {section.title}
        </h2>

        <span className={cn("rounded-full px-2 py-0.5 text-[11px]", LAYER[section.layer].chip)}>
          {t(section.layer === "core" ? "grammar.unit.core" : "grammar.unit.extend")}
        </span>
      </div>

      {section.timeline && <TimelineSvg timeline={section.timeline} tokens={tokens} />}

      {section.table && <GrammarTable table={section.table} tokens={tokens} />}

      {section.rules && section.rules.length > 0 && <RuleList rules={section.rules} tokens={tokens} />}

      {section.notes?.map((note, index) => <NoteCallout key={index} text={note} />)}

      {section.tips?.map((tip, index) => <WritingTip key={index} text={tip} />)}

      {section.selfCheck && (
        <SelfCheckBlock
          selfCheck={section.selfCheck}
          number={number}
          tokens={tokens}
          answers={score.answers}
          mark={score.mark}
          clear={score.clear}
          hideAnswers={hideAnswers}
          trapHref={trapHref}
          onWrongTrap={onWrongTrap}
        />
      )}
    </section>
  );
}
