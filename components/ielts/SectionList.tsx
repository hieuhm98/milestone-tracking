"use client";

// The per-page question list, the same one the source prints under each topic
// and card — minus the page numbers. Every "↑ Back to section list" link at the
// foot of a question returns here.

import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { PART, type PartKey } from "./tokens";

export interface SectionListItem {
  /** In-page anchor, e.g. "q18" or "p3-1". */
  anchor: string;
  /** "18" or "Part 3 · 1" — stays English. */
  marker: string;
  text: string;
}

interface Props {
  items: SectionListItem[];
  part: PartKey;
  id?: string;
}

export default function SectionList({ items, part, id = "questions" }: Props) {
  const { t } = useLang();

  return (
    <section id={id} className="card scroll-mt-28">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {t("ielts.section.questions")}
      </h2>

      <ol className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.anchor}>
            <a
              href={`#${item.anchor}`}
              className="flex gap-2 rounded-md px-1 py-1 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <span className={cn("shrink-0 font-semibold", PART[part].text)}>{item.marker}</span>
              <span>{item.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
