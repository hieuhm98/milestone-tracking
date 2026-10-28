"use client";

import { useEffect, useState } from "react";
import { BookA, Dumbbell, Mic, PenLine, type LucideIcon } from "lucide-react";
import HubCard from "@/components/HubCard";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";

/** Recall keys for vocabulary items look like `slug#v12`. */
const VOCAB_KEY = /#v\d+$/;

interface Card {
  href: string;
  icon: LucideIcon;
  tile: string;
  title: string;
  description: string;
  stat?: string;
}

export default function EnglishHome() {
  const { t, pick } = useLang();
  const { progress } = useProgress();
  const [words, setWords] = useState<number | null>(null);

  // One cheap call: the dictionary total, so the card can say how big it is.
  useEffect(() => {
    let cancelled = false;

    fetch("/api/english/dictionary?limit=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && typeof json?.total === "number") setWords(json.total);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const vocabKeys = Object.keys(progress.recall).filter((key) => VOCAB_KEY.test(key));
  const practised = vocabKeys.length;
  const known = vocabKeys.filter((key) => {
    const stat = progress.recall[key];

    return stat.correct > 0 && stat.correct >= stat.seen - stat.correct;
  }).length;

  const cards: Card[] = [
    {
      href: "/english/dictionary",
      icon: BookA,
      tile: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
      title: t("english.dictionary"),
      description: t("english.dictionaryDesc"),
      stat: words === null ? undefined : `${words.toLocaleString("en-GB")} ${t("dict.words")}`,
    },
    {
      href: "/english/practice",
      icon: Dumbbell,
      tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
      title: t("nav.englishPractice"),
      description: t("english.practiceDesc"),
      stat: practised > 0 ? `${known}/${practised} ${t("english.wordsPractised")}` : undefined,
    },
    {
      href: "/english/ielts-speaking",
      icon: Mic,
      tile: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
      title: "IELTS Speaking — Band 6 vs Band 9",
      description: t("ielts.card.desc"),
      stat: `212 ${t("ielts.stat.part1")} · 66 ${t("ielts.stat.cards")} · 283 ${t("ielts.stat.part3")}`,
    },
    {
      href: "/english/grammar-for-writing",
      icon: PenLine,
      tile: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
      title: "Grammar for Writing",
      description: t("grammar.card.desc"),
      stat: `19 ${t("grammar.home.units")} · 48 ${t("grammar.home.traps")}`,
    },
  ];

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight">{t("english.title")}</h1>
      <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">{t("english.subtitle")}</p>

      <div className="grid gap-3 sm:grid-cols-2 mt-6">
        {cards.map((card) => (
          <HubCard
            key={card.href}
            href={card.href}
            icon={card.icon}
            tile={card.tile}
            title={card.title}
            description={card.description}
            stat={card.stat}
          />
        ))}
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-6">
        {pick(
          "Từ vựng ở đây lấy từ chính các bài học IT bạn đang học, cộng với kho từ tiếng Anh thông dụng.",
          "The words here come from the IT lessons you are studying, plus a bank of common English words."
        )}
      </p>
    </div>
  );
}
