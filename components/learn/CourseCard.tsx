"use client";

import Link from "next/link";
import { useLang } from "@/context/lang";
import { type CourseSummary } from "@/lib/courses";
import { GROUP_ACCENT, GROUP_COVER } from "@/lib/groups";
import { cn } from "@/lib/utils";

interface Props {
  course: CourseSummary;
}

// One course in the catalogue. The whole card opens the course page; the
// action button jumps straight into the next lesson. The title link is
// stretched over the card with a pseudo-element so the two links never nest.
export default function CourseCard({ course }: Props) {
  const { pick } = useLang();
  const { group, status, resume } = course;
  const accent = GROUP_ACCENT[group.accent];
  const href = `/learn/course/${group.id}`;

  const action =
    status === "completed"
      ? pick("Ôn lại", "Review")
      : status === "in-progress"
        ? pick("Học tiếp", "Continue")
        : pick("Bắt đầu học", "Start course");
  const actionHref = resume ? `/learn/${resume.topic.slug}/${resume.lesson.id}` : href;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/40 hover:border-zinc-300 dark:hover:border-zinc-700">
      <div className={cn("relative h-20 sm:h-28 bg-gradient-to-br", GROUP_COVER[group.accent])}>
        <div
          aria-hidden
          className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] bg-[length:14px_14px]"
        />
        <span aria-hidden className="absolute right-4 bottom-2 text-5xl sm:text-6xl leading-none text-white/80 select-none">
          {group.icon}
        </span>

        {status === "completed" && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-green-700">
            ✓ {pick("Hoàn thành", "Completed")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-semibold leading-snug">
          <Link href={href} className="after:absolute after:inset-0 focus:outline-none">
            {pick(group.label, group.labelEn)}
          </Link>
        </h3>

        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
          {pick(group.description, group.descriptionEn)}
        </p>

        <p className="mt-3 text-xs text-zinc-500">
          {course.topics.length} {pick("chủ đề", "topics")} · {course.lessonCount} {pick("bài nhỏ", "lessons")} · ~
          {course.estimatedHours} {pick("giờ", "h")}
        </p>

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className={cn("font-medium", status === "not-started" ? "text-zinc-500" : accent.text)}>
              {status === "not-started"
                ? pick("Chưa bắt đầu", "Not started")
                : `${course.pct}% ${pick("hoàn thành", "complete")}`}
            </span>
            <span className="font-mono text-zinc-500">
              {course.doneCount}/{course.lessonCount}
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", accent.bar)} style={{ width: `${course.pct}%` }} />
          </div>

          {status === "in-progress" && resume && (
            <p className="mt-2 text-xs text-zinc-500 truncate">
              {pick("Tiếp theo", "Up next")}: {pick(resume.lesson.title, resume.lesson.titleEn)}
            </p>
          )}

          <Link
            href={actionHref}
            className={cn(
              "relative z-10 mt-3 flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              status === "in-progress"
                ? "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                : "border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            {action} →
          </Link>
        </div>
      </div>
    </article>
  );
}
