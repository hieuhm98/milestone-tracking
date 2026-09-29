"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";

/** Recall keys for vocabulary items look like `slug#v12`. */
const VOCAB_KEY = /#v\d+$/;

interface Card {
  href: string;
  icon: string;
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
      icon: "▤",
      title: t("english.dictionary"),
      description: t("english.dictionaryDesc"),
      stat: words === null ? undefined : `${words.toLocaleString("en-GB")} ${t("dict.words")}`,
    },
    {
      href: "/english/practice",
      icon: "Ⓐ",
      title: t("nav.englishPractice"),
      description: t("english.practiceDesc"),
      stat: practised > 0 ? `${known}/${practised} ${t("english.wordsPractised")}` : undefined,
    },
    {
      href: "/english/ielts-speaking",
      icon: "◍",
      title: "IELTS Speaking — Band 6 vs Band 9",
      description: t("ielts.card.desc"),
      stat: `212 ${t("ielts.stat.part1")} · 66 ${t("ielts.stat.cards")} · 283 ${t("ielts.stat.part3")}`,
    },
    {
      href: "/english/grammar-for-writing",
      icon: "✎",
      title: "Grammar for Writing",
      description: t("grammar.card.desc"),
      stat: `19 ${t("grammar.home.units")} · 48 ${t("grammar.home.traps")}`,
    },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight">{t("english.title")}</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mt-1">{t("english.subtitle")}</p>

      <div className="grid gap-4 sm:grid-cols-2 mt-6">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card hover:border-blue-400 dark:hover:border-blue-700 transition-colors"
          >
            <div className="text-2xl text-blue-600 dark:text-blue-400" aria-hidden="true">
              {card.icon}
            </div>
            <h2 className="font-semibold mt-2">{card.title}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{card.description}</p>
            {card.stat && <p className="text-xs text-zinc-500 mt-2">{card.stat}</p>}
            <span className="inline-block text-sm text-blue-600 dark:text-blue-400 mt-3">{pick("Mở →", "Open →")}</span>
          </Link>
        ))}
      </div>

      <p className="text-xs text-zinc-500 mt-6">
        {pick(
          "Từ vựng ở đây lấy từ chính các bài học IT bạn đang học, cộng với kho từ tiếng Anh thông dụng.",
          "The words here come from the IT lessons you are studying, plus a bank of common English words."
        )}
      </p>
    </div>
  );
}
