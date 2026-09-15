"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import { lessonKey, type LessonTopic } from "@/lib/lessons";
import { GROUPS, DEFAULT_GROUP, GROUP_ACCENT } from "@/lib/groups";
import { cn } from "@/lib/utils";

export default function LearnTopicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, pick } = useLang();
  const { progress, ready } = useProgress();
  const [topics, setTopics] = useState<LessonTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lessons")
      .then((r) => r.json())
      .then((data: LessonTopic[]) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => setTopics([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !ready) return <div className="text-zinc-500 text-sm p-8">{t("common.loading")}</div>;

  const topic = topics.find((tp) => tp.slug === slug);

  if (!topic) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">{pick("Chủ đề này chưa chia bài nhỏ.", "This topic has no mini-lessons yet.")}</p>
        <Link href="/learn" className="text-blue-600 dark:text-blue-400 text-sm mt-2 inline-block">
          {pick("← Khoá học của tôi", "← My courses")}
        </Link>
      </div>
    );
  }

  const group = GROUPS.find((g) => g.id === (topic.group ?? DEFAULT_GROUP));
  const accent = GROUP_ACCENT[group?.accent ?? "blue"];
  const done = topic.lessons.filter((l) => progress.lessons[lessonKey(topic.slug, l.id)]?.completed).length;
  const nextOne = topic.lessons.find((l) => !progress.lessons[lessonKey(topic.slug, l.id)]?.completed);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={group ? `/learn/course/${group.id}` : "/learn"}
          className="inline-block py-2 -my-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← {group ? pick(group.label, group.labelEn) : pick("Khoá học của tôi", "My courses")}
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xl">{group?.icon ?? "◉"}</span>
          <h1 className="text-2xl font-bold">{pick(topic.title, topic.titleEn)}</h1>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          {topic.lessons.length} {pick("bài nhỏ", "mini-lessons")} · {done} {pick("đã xong", "done")}
        </p>
      </div>

      <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", accent.bar)}
          style={{ width: `${(done / topic.lessons.length) * 100}%` }}
        />
      </div>

      {nextOne && (
        <Link href={`/learn/${topic.slug}/${nextOne.id}`} className="btn-primary text-sm px-4 py-2 inline-block">
          {done === 0 ? pick("Bắt đầu", "Start") : pick("Học tiếp", "Continue")}: {pick(nextOne.title, nextOne.titleEn)} →
        </Link>
      )}

      <ul className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
        {topic.lessons.map((lesson, i) => {
          const state = progress.lessons[lessonKey(topic.slug, lesson.id)];
          const isDone = state?.completed ?? false;

          return (
            <li key={lesson.id}>
              <Link
                href={`/learn/${topic.slug}/${lesson.id}`}
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
              >
                <span
                  className={cn(
                    "w-7 h-7 rounded-full border flex items-center justify-center text-xs shrink-0",
                    isDone
                      ? "bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                      : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
                  )}
                >
                  {isDone ? "✓" : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{pick(lesson.title, lesson.titleEn)}</div>
                  <div className="text-xs text-zinc-500">
                    {lesson.questionIds.length > 0
                      ? `${lesson.questionIds.length} ${pick("câu hỏi", "questions")}`
                      : pick("ôn tập tổng hợp", "cumulative recap")}
                  </div>
                </div>
                {state && state.bestCheckPct > 0 && (
                  <span className="text-xs font-mono text-zinc-500 shrink-0">{state.bestCheckPct}%</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href={`/knowledge/${topic.slug}`}
        className="inline-block py-2 -my-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 inline-block"
      >
        {pick("Xem toàn bộ bài viết & quiz đầy đủ", "View the full article & complete quiz")} →
      </Link>
    </div>
  );
}
