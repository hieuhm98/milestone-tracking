"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/context/lang";
import ArticleRenderer from "@/components/knowledge/ArticleRenderer";
import BilingualArticle from "@/components/knowledge/BilingualArticle";
import QuizBlock, { type Question } from "@/components/knowledge/QuizBlock";
import { getGroup } from "@/lib/groups";

interface Article {
  slug: string;
  title: string;
  titleEn?: string;
  group?: string;
  content: string;
  contentEn?: string | null;
  questions: Question[];
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, pick, lang, dual } = useLang();
  const [article, setArticle] = useState<Article | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/knowledge/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setArticle(data);
        setQuestions(data.questions ?? []);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <div className="text-zinc-500 text-sm p-8">{t("common.loading")}</div>;
  if (!article)
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">{t("article.notFound")}</p>
        <Link href="/knowledge" className="text-blue-600 dark:text-blue-400 text-sm mt-2 inline-block">
          {t("article.back")}
        </Link>
      </div>
    );

  const title = pick(article.title, article.titleEn);
  // Show English body when in EN mode and a translation exists; otherwise VI.
  const body = lang === "en" && article.contentEn ? article.contentEn : article.content;
  const bilingual = dual && Boolean(article.contentEn);
  const missingTranslation = !article.contentEn && (lang === "en" || dual);
  const accent = getGroup(article.group)?.accent;

  return (
    <div className={bilingual ? "max-w-6xl" : "max-w-3xl"}>
      <div className="mb-6">
        <Link href="/knowledge" className="inline-block py-2 -my-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          {t("article.back")}
        </Link>
        <div className="flex items-center gap-2 mt-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <span className="text-xs px-2 py-0.5 rounded border bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            {t("article.official")}
          </span>
        </div>
      </div>

      {missingTranslation && (
        <div className="mb-4 text-xs text-amber-600 dark:text-amber-400/80 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg px-3 py-2">
          English translation is not available yet — showing Vietnamese.
        </div>
      )}

      {bilingual ? (
        <BilingualArticle vi={article.content} en={article.contentEn!} accent={accent} />
      ) : (
        <ArticleRenderer content={body} accent={accent} />
      )}

      <QuizBlock questions={questions} title={`${t("quiz.title")} — ${title}`} slug={slug} />
    </div>
  );
}
