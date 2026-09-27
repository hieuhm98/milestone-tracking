"use client";

// The footer of a topic or card page: the neighbouring section with its title,
// so Previous / Next keeps running across pages.

import Link from "next/link";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { PART, type PartKey } from "./tokens";

export interface PageNavTarget {
  href: string;
  /** "Topic 2 — Collecting things" */
  title: string;
}

interface Props {
  part: PartKey;
  prev: PageNavTarget | null;
  next: PageNavTarget | null;
}

export default function PageNav({ part, prev, next }: Props) {
  const { t } = useLang();
  const prevLabel = part === "part1" ? t("ielts.nav.prevSection") : t("ielts.nav.prevCard");
  const nextLabel = part === "part1" ? t("ielts.nav.nextSection") : t("ielts.nav.nextCard");

  return (
    <nav className="grid gap-3 sm:grid-cols-2">
      {prev ? (
        <Link href={prev.href} className={cn("card transition-colors", PART[part].ring)}>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{prevLabel}</p>
          <p className={cn("mt-1 text-sm font-medium", PART[part].text)}>{prev.title}</p>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}

      {next && (
        <Link href={next.href} className={cn("card text-right transition-colors", PART[part].ring)}>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{nextLabel}</p>
          <p className={cn("mt-1 text-sm font-medium", PART[part].text)}>{next.title}</p>
        </Link>
      )}
    </nav>
  );
}
