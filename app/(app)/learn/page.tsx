"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import CourseCard from "@/components/learn/CourseCard";
import { catalogueOrder, coursesInProgress, summarizeCourses } from "@/lib/courses";
import { GROUP_COVER } from "@/lib/groups";
import { type LessonTopic } from "@/lib/lessons";
import { cn } from "@/lib/utils";

type Filter = "all" | "in-progress" | "not-started" | "completed";

export default function StudyPathPage() {
  const { t, pick } = useLang();
  const { progress, ready } = useProgress();
  const [topics, setTopics] = useState<LessonTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch("/api/lessons")
      .then((r) => r.json())
      .then((data: LessonTopic[]) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => setTopics([]))
      .finally(() => setLoading(false));
  }, []);

  const courses = useMemo(() => catalogueOrder(summarizeCourses(topics, progress)), [topics, progress]);
  const active = useMemo(() => coursesInProgress(courses), [courses]);

  if (loading || !ready) return <div className="text-zinc-500 text-sm p-8">{t("common.loading")}</div>;

  const lessonTotal = courses.reduce((sum, c) => sum + c.lessonCount, 0);
  const lessonDone = courses.reduce((sum, c) => sum + c.doneCount, 0);
  const coursesDone = courses.filter((c) => c.status === "completed").length;
  const shown = filter === "all" ? courses : courses.filter((c) => c.status === filter);
  const current = active[0];

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: pick("Tất cả", "All"), count: courses.length },
    { id: "in-progress", label: pick("Đang học", "In progress"), count: active.length },
    {
      id: "not-started",
      label: pick("Chưa bắt đầu", "Not started"),
      count: courses.filter((c) => c.status === "not-started").length,
    },
    { id: "completed", label: pick("Đã xong", "Completed"), count: coursesDone },
  ];

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{pick("Khoá học của tôi", "My courses")}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1 max-w-2xl">
            {pick(
              "Mỗi khoá gồm nhiều chủ đề, mỗi chủ đề chia thành các bài nhỏ 5–10 phút với bài kiểm tra khởi động và bài kiểm tra cuối.",
              "Each course is a set of topics, and every topic is split into 5–10 minute lessons with a warm-up test before and a check after."
            )}
          </p>
        </div>

        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-xs text-zinc-500">{pick("Khoá học", "Courses")}</dt>
            <dd className="font-semibold">
              {coursesDone}
              <span className="text-zinc-500 font-normal">/{courses.length}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">{pick("Bài nhỏ", "Lessons")}</dt>
            <dd className="font-semibold">
              {lessonDone}
              <span className="text-zinc-500 font-normal">/{lessonTotal}</span>
            </dd>
          </div>
        </dl>
      </div>

      {/* Pick up where you left off — the single most useful thing on the page. */}
      {current?.resume && (
        <section className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row">
          <div
            className={cn(
              "sm:w-48 h-20 sm:h-auto shrink-0 bg-gradient-to-br flex items-center justify-center text-5xl text-white/85",
              GROUP_COVER[current.group.accent]
            )}
            aria-hidden
          >
            {current.group.icon}
          </div>
          <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-zinc-500">
                {pick("Học tiếp", "Continue learning")} · {pick(current.group.label, current.group.labelEn)}
              </div>
              <div className="font-semibold mt-0.5 truncate">
                {pick(current.resume.lesson.title, current.resume.lesson.titleEn)}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {pick(current.resume.topic.title, current.resume.topic.titleEn)}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 max-w-xs rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${current.pct}%` }} />
                </div>
                <span className="text-xs text-zinc-500">{current.pct}%</span>
              </div>
            </div>
            <Link
              href={`/learn/${current.resume.topic.slug}/${current.resume.lesson.id}`}
              className="btn-primary text-sm px-4 py-2 text-center shrink-0"
            >
              {pick("Học tiếp", "Resume")} →
            </Link>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold mr-2">{pick("Tất cả khoá học", "All courses")}</h2>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                "px-3 py-2 sm:py-1.5 rounded-full text-xs font-medium border transition-colors",
                filter === f.id
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                  : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              {f.label} <span className="opacity-60">{f.count}</span>
            </button>
          ))}
        </div>

        {shown.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((course) => (
              <CourseCard key={course.group.id} course={course} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500 py-8 text-center">
            {pick("Không có khoá học nào ở mục này.", "No courses here yet.")}
          </p>
        )}
      </section>
    </div>
  );
}
