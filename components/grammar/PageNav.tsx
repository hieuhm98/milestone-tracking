"use client";

// Previous / next unit at the foot of a unit page, plus the way back up to the
// path. The arrows live in the dictionary strings, so nothing is added here.

import Link from "next/link";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { GRAMMAR_BASE } from "./navigation";
import { type PartTokens } from "./tokens";

export interface NavTarget {
  href: string;
  title: string;
}

export default function PageNav({
  prev,
  next,
  tokens,
}: {
  prev: NavTarget | null;
  next: NavTarget | null;
  tokens: PartTokens;
}) {
  const { t } = useLang();

  return (
    <nav className="mt-8 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <div className="grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={prev.href} className={cn("card transition-colors", tokens.ring)}>
            <p className={cn("text-xs font-medium", tokens.text)}>{t("grammar.nav.prevUnit")}</p>
            <p className="mt-0.5 text-sm font-semibold">{prev.title}</p>
          </Link>
        ) : (
          <span />
        )}

        {next ? (
          <Link href={next.href} className={cn("card text-right transition-colors", tokens.ring)}>
            <p className={cn("text-xs font-medium", tokens.text)}>{t("grammar.nav.nextUnit")}</p>
            <p className="mt-0.5 text-sm font-semibold">{next.title}</p>
          </Link>
        ) : (
          <span />
        )}
      </div>

      <p className="mt-4 text-center">
        <Link
          href={GRAMMAR_BASE}
          className="text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {t("grammar.nav.backToPath")}
        </Link>
      </p>
    </nav>
  );
}
