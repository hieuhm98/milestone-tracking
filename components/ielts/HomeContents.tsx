"use client";

// "Main contents" (`#contents`): Part 1 by group, then the cue cards by group.
// Each line shows the label and title, the Vietnamese subtitle from the source,
// and a chip — the question range for Part 1, the number of Part 3 follow-ups
// for a card, or the "no Part 3 in source" badge when it has none.

import Link from "next/link";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { Toc, TocSection } from "@/lib/ielts/types";
import { PART, type PartKey } from "./tokens";
import { anchorFor, byGroup, cardHref, part1Href } from "./navigation";

function questionRange(section: TocSection): string {
  const numbers = section.questions
    .map((question) => Number(/q(\d+)$/.exec(question.id)?.[1] ?? question.label))
    .filter((value) => Number.isFinite(value));

  if (numbers.length === 0) return "";

  const from = Math.min(...numbers);
  const to = Math.max(...numbers);

  return from === to ? `Q${from}` : `Q${from}–Q${to}`;
}

function part3Count(section: TocSection): number {
  return section.questions.filter((question) => anchorFor(question.id).startsWith("p3-")).length;
}

function Line({ section, part, chip }: { section: TocSection; part: PartKey; chip: React.ReactNode }) {
  const href = part === "part1" ? part1Href(section.slug) : cardHref(section.slug);

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg px-2 py-2 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
        )}
      >
        <span className={cn("text-sm font-semibold", PART[part].text)}>{section.label}</span>
        <span className="text-sm text-zinc-800 dark:text-zinc-100">— {section.title}</span>
        {section.titleVi && (
          <span className="text-xs italic text-zinc-500 dark:text-zinc-400">{section.titleVi}</span>
        )}
        <span className="ml-auto shrink-0">{chip}</span>
      </Link>
    </li>
  );
}

export default function HomeContents({ toc }: { toc: Toc }) {
  const { t, pick } = useLang();

  return (
    <section id="contents" className="scroll-mt-28">
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{pick("Mục lục chính", "Main contents")}</h2>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <p className={cn("text-xs font-semibold uppercase tracking-wider", PART.part1.text)}>
            Part 1 · {toc.stats.part1.toLocaleString("en-GB")} {t("ielts.stat.part1")}
          </p>

          <div className="mt-2 space-y-3">
            {byGroup(toc.part1).map(({ group, sections }) => (
              <div key={group}>
                <p className="px-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">{group}</p>

                <ul>
                  {sections.map((section) => (
                    <Line
                      key={section.slug}
                      section={section}
                      part="part1"
                      chip={
                        <span className={cn("rounded-full px-2 py-0.5 text-xs", PART.part1.chip)}>
                          {questionRange(section)}
                        </span>
                      }
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <p className={cn("text-xs font-semibold uppercase tracking-wider", PART.part23.text)}>
            Part 2 &amp; 3 · {toc.stats.cards.toLocaleString("en-GB")} {t("ielts.stat.cards")}
          </p>

          <div className="mt-2 space-y-3">
            {byGroup(toc.part23).map(({ group, sections }) => (
              <div key={group}>
                <p className="px-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">{group}</p>

                <ul>
                  {sections.map((section) => {
                    const count = part3Count(section);

                    return (
                      <Line
                        key={section.slug}
                        section={section}
                        part="part23"
                        chip={
                          count > 0 ? (
                            <span className={cn("rounded-full px-2 py-0.5 text-xs", PART.part23.chip)}>
                              +{count} Part 3
                            </span>
                          ) : (
                            <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                              {t("ielts.badge.noPart3")}
                            </span>
                          )
                        }
                      />
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
