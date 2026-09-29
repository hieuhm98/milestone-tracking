"use client";

// The home of the section (content spec §3.1): hero and chips, the buttons,
// "How a unit works", the path of four Part cards, the links out to the traps
// and reference pages, and the spelling note.
//
// It is a client component because the path shows progress, which only the
// browser knows.

import Link from "next/link";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import { cn } from "@/lib/utils";
import type { PartId, Syllabus } from "@/lib/grammar/types";
import { referenceHref, reviewHref, trapsHref, unitHref } from "./navigation";
import { unitStats, useWrongTraps } from "./progress";
import { PART } from "./tokens";

interface Props {
  syllabus: Syllabus;
  trapCount: number;
  /** Unit id → how many gradable items it holds; missing = not authored yet. */
  unitTotals: Record<string, number>;
  reviewParts: PartId[];
  referenceSlugs: string[];
}

const TILES: { name: string; key: string }[] = [
  { name: "Grammar Focus", key: "grammar.home.tile.focus" },
  { name: "Pretest", key: "grammar.home.tile.pretest" },
  { name: "Grammar in Context", key: "grammar.home.tile.context" },
  { name: "Forming", key: "grammar.home.tile.forming" },
  { name: "Using", key: "grammar.home.tile.using" },
  { name: "Self Check", key: "grammar.home.tile.selfCheck" },
  { name: "Vietnamese Learner Traps", key: "grammar.home.tile.traps" },
  { name: "Editing Practice & Writing Topics", key: "grammar.home.tile.editing" },
];

const RADIUS = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** How much of a unit has been answered. The text beside it says it in words. */
function Ring({ pct, part }: { pct: number; part: PartId }) {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="16" cy="16" r={RADIUS} fill="none" strokeWidth="3" className="stroke-zinc-200 dark:stroke-zinc-700" />
      <circle
        cx="16"
        cy="16"
        r={RADIUS}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${(CIRCUMFERENCE * Math.min(100, Math.max(0, pct))) / 100} ${CIRCUMFERENCE}`}
        className={PART[part].stroke}
      />
    </svg>
  );
}

export default function GrammarHome({
  syllabus,
  trapCount,
  unitTotals,
  reviewParts,
  referenceSlugs,
}: Props) {
  const { t, pick } = useLang();
  const { progress } = useProgress();
  const { ids: wrongTraps } = useWrongTraps();

  const allUnits = syllabus.parts.flatMap((part) => part.units);
  const firstAuthored = allUnits.find((unit) => unit.id in unitTotals) ?? allUnits[0];
  const reference = syllabus.reference.filter((entry) => referenceSlugs.includes(entry.slug));

  return (
    <div className="max-w-4xl space-y-10 pb-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Grammar for Writing</h1>

        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{t("grammar.home.subtitle")}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs", PART.A.chip)}>
            {allUnits.length} {t("grammar.home.units")}
          </span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs", PART.B.chip)}>
            {syllabus.parts.length} {t("grammar.home.parts")}
          </span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs", PART.C.chip)}>
            {trapCount} {t("grammar.home.traps")}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {firstAuthored && (
            <Link href={unitHref(firstAuthored.id)} className="btn-primary">
              {t("grammar.home.start")}
            </Link>
          )}

          {wrongTraps.length > 0 && (
            <Link href={`${trapsHref()}?mine=1`} className="btn-secondary">
              {t("grammar.home.weakPoints")} ({wrongTraps.length})
            </Link>
          )}
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
          {t("grammar.home.howItWorks")}
        </h2>

        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map((tile, index) => (
            <li key={tile.key} className="card">
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{index + 1}</p>
              <p className="mt-0.5 font-semibold">{tile.name}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t(tile.key)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="path" className="scroll-mt-28 space-y-4">
        {syllabus.parts.map((part) => (
          <div key={part.id} id={`part-${part.id}`} className="scroll-mt-28 card">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black",
                  PART[part.id].block
                )}
                aria-hidden="true"
              >
                {part.id}
              </span>

              <h2 className={cn("text-lg font-bold", PART[part.id].text)}>
                Part {part.id} · {part.title}
              </h2>

              {reviewParts.includes(part.id) && (
                <Link
                  href={reviewHref(part.id)}
                  className="ml-auto text-sm underline underline-offset-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  {t("grammar.home.review")} {part.id}
                </Link>
              )}
            </div>

            <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
              {part.units.map((unit) => {
                const total = unitTotals[unit.id];
                const authored = typeof total === "number";
                const stats = unitStats(progress, unit.id, total ?? 0);
                const pct = total && total > 0 ? Math.round((stats.answered / total) * 100) : 0;
                const label = !stats.started
                  ? t("grammar.progress.notStarted")
                  : stats.answered >= (total ?? 0)
                    ? t("grammar.progress.done")
                    : t("grammar.progress.inProgress");

                const row = (
                  <div className="flex items-start gap-3 py-2">
                    <Ring pct={pct} part={part.id} />

                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        <span className="text-zinc-400 dark:text-zinc-500">{unit.number}.</span> {unit.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{unit.core}</p>
                    </div>

                    <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                      {authored ? label : pick("Sắp có", "Coming soon")}
                    </span>
                  </div>
                );

                return (
                  <li key={unit.id}>
                    {authored ? (
                      <Link
                        href={unitHref(unit.id)}
                        className="block rounded-lg px-1 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div className="px-1 opacity-60">{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href={trapsHref()} className="card transition-colors hover:border-rose-400 dark:hover:border-rose-700">
          <h2 className="font-semibold text-rose-700 dark:text-rose-300">{t("grammar.traps.title")}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("grammar.traps.subtitle")}</p>
          <p className="mt-2 text-xs text-zinc-500">{trapCount}</p>
        </Link>

        <div className="card">
          <h2 className="font-semibold">{t("grammar.home.reference")}</h2>

          {reference.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("grammar.traps.none")}</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {reference.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={referenceHref(entry.slug)}
                    className="text-sm text-blue-600 underline underline-offset-2 dark:text-blue-400"
                  >
                    {entry.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("grammar.home.spellingNote")}</p>
    </div>
  );
}
