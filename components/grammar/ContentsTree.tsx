"use client";

// The contents tree: the four Parts, their units, the Part reviews, the traps
// page and the reference pages. Used twice — as the desktop sidebar and inside
// the mobile drawer. The unit being read opens to show its blocks.

import Link from "next/link";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { PartId, Syllabus } from "@/lib/grammar/types";
import { GRAMMAR_BASE, referenceHref, reviewHref, trapsHref, unitHref } from "./navigation";
import { PART } from "./tokens";

export interface OutlineEntry {
  anchor: string;
  label: string;
}

interface Props {
  syllabus: Syllabus;
  /** Parts that have an authored review file. */
  reviewParts: PartId[];
  /** Reference slugs that have an authored file. */
  referenceSlugs: string[];
  activeUnitId?: string;
  /** The blocks of the unit being read, so the tree can jump inside it. */
  outline?: OutlineEntry[];
  onNavigate?: () => void;
}

export default function ContentsTree({
  syllabus,
  reviewParts,
  referenceSlugs,
  activeUnitId,
  outline,
  onNavigate,
}: Props) {
  const { t } = useLang();
  const reference = syllabus.reference.filter((entry) => referenceSlugs.includes(entry.slug));

  return (
    <nav aria-label={t("grammar.nav.contents")} className="pb-6 text-sm">
      <Link
        href={GRAMMAR_BASE}
        onClick={onNavigate}
        className="block rounded-md px-2 py-1.5 font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {t("grammar.nav.backToPath")}
      </Link>

      {syllabus.parts.map((part) => (
        <div key={part.id} className="mt-3">
          <p className={cn("px-2 text-xs font-bold uppercase tracking-wider", PART[part.id].text)}>
            Part {part.id} · {part.title}
          </p>

          <ul className="mt-1">
            {part.units.map((unit) => {
              const active = unit.id === activeUnitId;

              return (
                <li key={unit.id}>
                  <Link
                    href={unitHref(unit.id)}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      active ? cn("font-semibold", PART[part.id].text) : "text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        active ? PART[part.id].dot : "bg-zinc-300 dark:bg-zinc-600"
                      )}
                      aria-hidden="true"
                    />
                    <span>
                      {unit.number}. {unit.title}
                    </span>
                  </Link>

                  {active && outline && outline.length > 0 && (
                    <ul className="ml-4 border-l border-zinc-200 pl-2 dark:border-zinc-800">
                      {outline.map((entry) => (
                        <li key={entry.anchor}>
                          <a
                            href={`#${entry.anchor}`}
                            onClick={onNavigate}
                            className="block rounded px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          >
                            {entry.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}

            {reviewParts.includes(part.id) && (
              <li>
                <Link
                  href={reviewHref(part.id)}
                  onClick={onNavigate}
                  className="ml-4 block rounded-md px-2 py-1.5 text-xs italic text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  {t("grammar.home.review")} {part.id}
                </Link>
              </li>
            )}
          </ul>
        </div>
      ))}

      <div className="mt-4 border-t border-zinc-200 pt-2 dark:border-zinc-800">
        <Link
          href={trapsHref()}
          onClick={onNavigate}
          className="block rounded-md px-2 py-1.5 font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
        >
          {t("grammar.traps.title")}
        </Link>

        {reference.length > 0 && (
          <>
            <p className="mt-2 px-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {t("grammar.home.reference")}
            </p>

            <ul>
              {reference.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={referenceHref(entry.slug)}
                    onClick={onNavigate}
                    className="block rounded-md px-2 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {entry.title}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </nav>
  );
}
