"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import { summarizeCourse } from "@/lib/courses";
import { getGroup, GROUP_ACCENT, GROUP_COVER } from "@/lib/groups";
import { lessonKey, type LessonTopic } from "@/lib/lessons";
import { cn } from "@/lib/utils";

export default function CoursePage() {
  const { group: groupId } = useParams<{ group: string }>();
  const { t, pick } = useLang();
  const { progress, ready } = useProgress();
  const [topics, setTopics] = useState<LessonTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/lessons")
      .then((r) => r.json())
      .then((data: LessonTopic[]) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => setTopics([]))
      .finally(() => setLoading(false));
  }, []);

  const group = getGroup(groupId);
  const course = useMemo(
    () => (group ? summarizeCourse(group, topics, progress) : null),
    [group, topics, progress]
  );

  // Open the module the learner is working in, once the data has arrived.
  const resumeSlug = course?.resume?.topic.slug;

  useEffect(() => {
    if (resumeSlug) setOpen(new Set([resumeSlug]));
  }, [resumeSlug]);

  function toggle(slug: string) {
    setOpen((prev) => {
      const next = new Set(prev);

      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }

      return next;
    });
  }

  if (loading || !ready) return <div className="text-zinc-500 text-sm p-8">{t("common.loading")}</div>;

  if (!group || !course || course.lessonCount === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">{pick("Không tìm thấy khoá học.", "Course not found.")}</p>
        <Link href="/learn" className="text-blue-600 dark:text-blue-400 text-sm mt-2 inline-block">
          {pick("← Khoá học của tôi", "← My courses")}
        </Link>
      </div>
    );
  }

  const accent = GROUP_ACCENT[group.accent];
  const allOpen = open.size === course.topics.length;
  const actionLabel =
    course.status === "completed"
      ? pick("Ôn lại từ đầu", "Review from the start")
      : course.status === "in-progress"
        ? pick("Học tiếp", "Continue")
        : pick("Bắt đầu học", "Start course");
  const actionTarget = course.resume ?? { topic: course.topics[0], lesson: course.topics[0].lessons[0] };

  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/learn"
        className="inline-block py-2 -my-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        {pick("← Khoá học của tôi", "← My courses")}
      </Link>

      {/* Course header */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className={cn("relative h-24 sm:h-32 bg-gradient-to-br", GROUP_COVER[group.accent])}>
          <div
            aria-hidden
            className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] bg-[length:14px_14px]"
          />
          <span aria-hidden className="absolute right-5 bottom-2 text-7xl leading-none text-white/80 select-none">
            {group.icon}
          </span>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{pick(group.label, group.labelEn)}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{pick(group.description, group.descriptionEn)}</p>
            <p className="text-xs text-zinc-500 mt-2">
              {course.topics.length} {pick("chủ đề", "topics")} · {course.lessonCount} {pick("bài nhỏ", "lessons")} · ~
              {course.estimatedHours} {pick("giờ học", "hours")}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className={cn("font-medium", course.status === "not-started" ? "text-zinc-500" : accent.text)}>
                {course.status === "not-started"
                  ? pick("Chưa bắt đầu", "Not started")
                  : `${course.pct}% ${pick("hoàn thành", "complete")}`}
              </span>
              <span className="text-zinc-500">
                {course.doneCount}/{course.lessonCount} {pick("bài", "lessons")} · {course.topicsDone}/
                {course.topics.length} {pick("chủ đề", "topics")}
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div className={cn("h-full rounded-full transition-all", accent.bar)} style={{ width: `${course.pct}%` }} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Link
              href={`/learn/${actionTarget.topic.slug}/${actionTarget.lesson.id}`}
              className="btn-primary text-sm px-4 py-2 text-center"
            >
              {actionLabel} →
            </Link>
            {course.resume && course.status === "in-progress" && (
              <span className="text-xs text-zinc-500 truncate">
                {pick(course.resume.lesson.title, course.resume.lesson.titleEn)} ·{" "}
                {pick(course.resume.topic.title, course.resume.topic.titleEn)}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{pick("Nội dung khoá học", "Course content")}</h2>
          <button
            type="button"
            onClick={() => setOpen(allOpen ? new Set() : new Set(course.topics.map((tp) => tp.slug)))}
            className="px-3 py-2 sm:py-1.5 rounded-full text-xs font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {allOpen ? pick("Thu gọn tất cả", "Collapse all") : pick("Mở tất cả", "Expand all")}
          </button>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
          {course.topics.map((topic, index) => {
            const isOpen = open.has(topic.slug);
            const done = topic.lessons.filter((l) => progress.lessons[lessonKey(topic.slug, l.id)]?.completed).length;
            const finished = done === topic.lessons.length;

            return (
              <div key={topic.slug}>
                <button
                  type="button"
                  onClick={() => toggle(topic.slug)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <span
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0",
                      finished
                        ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    {finished ? "✓" : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{pick(topic.title, topic.titleEn)}</div>
                    <div className="text-xs text-zinc-500">
                      {topic.lessons.length} {pick("bài nhỏ", "lessons")} · ~
                      {Math.round(topic.lessons.length * 7.5)} {pick("phút", "min")}
                    </div>
                  </div>
                  <span className="text-xs font-mono text-zinc-500 shrink-0">
                    {done}/{topic.lessons.length}
                  </span>
                  <ChevronDown
                    className={cn("w-5 h-5 text-zinc-500 shrink-0 transition-transform", isOpen && "rotate-180")}
                  />
                </button>

                {isOpen && (
                  <ul className="bg-zinc-50 dark:bg-zinc-950/40 border-t border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800">
                    {topic.lessons.map((lesson, i) => {
                      const state = progress.lessons[lessonKey(topic.slug, lesson.id)];
                      const isDone = state?.completed ?? false;
                      const isNext =
                        course.resume?.topic.slug === topic.slug && course.resume?.lesson.id === lesson.id;

                      return (
                        <li key={lesson.id}>
                          <Link
                            href={`/learn/${topic.slug}/${lesson.id}`}
                            className={cn(
                              "flex items-center gap-3 pl-4 sm:pl-[3.75rem] pr-4 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors",
                              isNext && "bg-blue-50 dark:bg-blue-950/30"
                            )}
                          >
                            <span
                              className={cn(
                                "w-6 h-6 rounded-full border flex items-center justify-center text-xs shrink-0",
                                isDone
                                  ? "bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300"
                                  : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
                              )}
                            >
                              {isDone ? "✓" : i + 1}
                            </span>
                            <span className="flex-1 min-w-0 truncate">{pick(lesson.title, lesson.titleEn)}</span>
                            {isNext && (
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 shrink-0">
                                {pick("Tiếp theo", "Up next")}
                              </span>
                            )}
                            {lesson.recap && !isNext && (
                              <span className="text-xs text-zinc-500 shrink-0">{pick("ôn tập", "recap")}</span>
                            )}
                            {state && state.bestCheckPct > 0 && (
                              <span className="text-xs font-mono text-zinc-500 shrink-0">{state.bestCheckPct}%</span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                    <li>
                      <Link
                        href={`/learn/${topic.slug}`}
                        className="block pl-4 sm:pl-[3.75rem] pr-4 py-2.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                      >
                        {pick("Chi tiết chủ đề", "Topic details")} →
                      </Link>
                    </li>
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
