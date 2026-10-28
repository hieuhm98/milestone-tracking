"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ExamRunner from "@/components/exam/ExamRunner";
import { useLang } from "@/context/lang";
import { DEFAULT_GROUP, getGroup } from "@/lib/groups";
import { PageError, PageLoading } from "@/components/learn/PageState";

interface CatalogueTopic {
  slug: string;
  group?: string;
  title: string;
  titleEn?: string;
}

export default function ExamPage({ params }: { params: { group: string } }) {
  const { t, pick } = useLang();
  const group = getGroup(params.group);
  const [topics, setTopics] = useState<CatalogueTopic[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setTopics(null);
    setError(false);

    fetch("/api/knowledge")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));

        return r.json();
      })
      .then((data: CatalogueTopic[]) =>
        setTopics((Array.isArray(data) ? data : []).filter((tp) => (tp.group ?? DEFAULT_GROUP) === params.group))
      )
      .catch(() => setError(true));
  }, [params.group, attempt]);

  if (!group) {
    return (
      <div className="max-w-2xl space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {pick("Không tìm thấy khoá thi này.", "This exam track does not exist.")}
        </p>
        <Link href="/exam" className="inline-block py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
          {t("exam.backToTracks")}
        </Link>
      </div>
    );
  }

  if (error) return <PageError onRetry={() => setAttempt((n) => n + 1)} />;

  if (topics === null) return <PageLoading />;

  return <ExamRunner group={group} topics={topics} />;
}
