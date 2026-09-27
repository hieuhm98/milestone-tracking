"use client";

// The top of the home page: hero with the section totals, "How to use this
// page" (source text, English in both modes) and "How to navigate this page".
//
// The navigation help is the one block of *content* that switches language: it
// was written for this page, not taken from the source, so the data carries both
// versions and `lang` picks one. `**bold**` marks each bullet's lead-in.

import Link from "next/link";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { Intro, Toc } from "@/lib/ielts/types";
import { BAND, PART } from "./tokens";
import { cardHref, part1Href } from "./navigation";

interface Props {
  intro: Intro;
  stats: Toc["stats"];
  firstPart1?: string;
  firstCard?: string;
}

/** Renders the `**lead-in**` of a navigation bullet in bold. */
function bulletParts(bullet: string): React.ReactNode[] {
  return bullet.split("**").map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold text-zinc-900 dark:text-zinc-50">
        {part}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

export default function HomeIntro({ intro, stats, firstPart1, firstCard }: Props) {
  const { t, lang, pick } = useLang();

  const chips = [
    { value: stats.part1.toLocaleString("en-GB"), label: t("ielts.stat.part1"), style: PART.part1.chip },
    { value: stats.cards.toLocaleString("en-GB"), label: t("ielts.stat.cards"), style: PART.part23.chip },
    { value: stats.part3.toLocaleString("en-GB"), label: t("ielts.stat.part3"), style: PART.part23.chip },
    {
      value: `~${stats.phrases.toLocaleString("en-GB")}`,
      label: t("ielts.stat.phrases"),
      style: "border border-yellow-300 bg-yellow-100 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-100",
    },
  ];

  const bullets = lang === "vi" ? intro.navigate.vi : intro.navigate.en;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          IELTS Speaking —{" "}
          <span className={BAND.band6.label}>Band 6</span> vs <span className={BAND.band9.label}>Band 9</span>
        </h1>

        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">{t("ielts.hero.subtitle")}</p>

        <ul className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip.label}
              className={cn("rounded-full px-3 py-1 text-xs", chip.style)}
            >
              <span className="font-semibold">{chip.value}</span> {chip.label}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          {firstPart1 && (
            <Link href={part1Href(firstPart1)} className="btn-primary text-sm">
              {t("ielts.hero.startPart1")}
            </Link>
          )}
          {firstCard && (
            <Link href={cardHref(firstCard)} className="btn-secondary text-sm">
              {t("ielts.hero.startPart23")}
            </Link>
          )}
        </div>
      </header>

      <section className="card">
        <h2 className="text-lg font-semibold tracking-tight">{intro.howToUse.title}</h2>
        <p className="text-sm italic text-zinc-500 dark:text-zinc-400">{intro.howToUse.titleVi}</p>

        <div className="mt-3 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          {intro.howToUse.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="text-lg font-semibold tracking-tight">
          {pick(intro.navigate.titleVi, intro.navigate.title)}
        </h2>

        <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          {bullets.map((bullet, index) => (
            <li key={index} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600" aria-hidden="true" />
              <span>{bulletParts(bullet)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
