"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  Database,
  GraduationCap,
  Languages,
  PenTool,
  RotateCcw,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import { overallStats } from "@/lib/progress";
import { catalogueOrder, coursesInProgress, summarizeCourses } from "@/lib/courses";
import { GROUP_COVER } from "@/lib/groups";
import { type LessonTopic } from "@/lib/lessons";
import { cn } from "@/lib/utils";
import GroupIcon from "@/components/GroupIcon";
import HubCard from "@/components/HubCard";

type Bilingual = { vi: string; en: string };

interface Tool {
  href: string;
  icon: LucideIcon;
  /** Tinted icon tile — literal classes so Tailwind's JIT sees them. */
  tile: string;
  title: Bilingual;
  desc: Bilingual;
}

interface ToolGroup {
  heading: Bilingual;
  tools: Tool[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    heading: { vi: "Học", en: "Learn" },
    tools: [
      {
        href: "/learn",
        icon: GraduationCap,
        tile: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
        title: { vi: "Khoá học của tôi", en: "My courses" },
        desc: {
          vi: "Bài nhỏ 5–10 phút: khởi động → đọc → kiểm tra.",
          en: "5–10 minute lessons: warm-up → read → check.",
        },
      },
      {
        href: "/knowledge",
        icon: BookOpen,
        tile: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
        title: { vi: "Kiến thức", en: "Knowledge" },
        desc: {
          vi: "Đọc trọn bài viết song ngữ của từng chủ đề, kèm quiz.",
          en: "Read each topic's full bilingual article, with a quiz.",
        },
      },
      {
        href: "/exam",
        icon: ClipboardCheck,
        tile: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
        title: { vi: "Thi cuối khoá", en: "Final Test" },
        desc: {
          vi: "Đề thi tính giờ cho từng khoá, có điểm đạt.",
          en: "A timed exam per course, with a pass mark.",
        },
      },
    ],
  },
  {
    heading: { vi: "Ôn tập & luyện tập", en: "Review & practice" },
    tools: [
      {
        href: "/knowledge-review",
        icon: RotateCcw,
        tile: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
        title: { vi: "Ôn tập", en: "Review" },
        desc: {
          vi: "Tự chọn chủ đề, kiểu ôn và số câu.",
          en: "Pick topics, a review mode and how many questions.",
        },
      },
      {
        href: "/practice/blitz",
        icon: Timer,
        tile: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
        title: { vi: "Blitz — Đấu tốc độ", en: "Blitz — Timed Run" },
        desc: {
          vi: "60 giây, điểm nhân theo chuỗi đúng, phá kỷ lục.",
          en: "60 seconds, a combo multiplier, a record to beat.",
        },
      },
      {
        href: "/practice/questions",
        icon: PenTool,
        tile: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
        title: { vi: "Bài tập thiết kế", en: "Design Exercises" },
        desc: {
          vi: "Câu hỏi mở về CSDL, API và kiến trúc AWS.",
          en: "Open database, API and AWS architecture questions.",
        },
      },
      {
        href: "/practice/sql",
        icon: Database,
        tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
        title: { vi: "Luyện tập SQL", en: "SQL Practice" },
        desc: {
          vi: "Viết và chạy SQL thật trên dữ liệu mẫu.",
          en: "Write and run real SQL on sample data.",
        },
      },
      {
        href: "/practice/api",
        icon: ArrowLeftRight,
        tile: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
        title: { vi: "Luyện tập API", en: "API Practice" },
        desc: {
          vi: "Gọi thử API cửa hàng sách trong sandbox riêng.",
          en: "Call a bookstore API in your own sandbox.",
        },
      },
    ],
  },
  {
    heading: { vi: "Khác", en: "More" },
    tools: [
      {
        href: "/progress",
        icon: BarChart3,
        tile: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
        title: { vi: "Tiến độ", en: "Progress" },
        desc: {
          vi: "Chuỗi ngày học, điểm từng chủ đề, sao lưu.",
          en: "Study streak, per-topic scores, backups.",
        },
      },
      {
        href: "/english",
        icon: Languages,
        tile: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
        title: { vi: "Học tiếng Anh", en: "Learn English" },
        desc: {
          vi: "Từ điển, luyện từ vựng, IELTS Speaking, ngữ pháp.",
          en: "Dictionary, vocabulary, IELTS Speaking, grammar.",
        },
      },
    ],
  },
];

/** The one thing to do next: resume the last course, or start the first one. */
function NextStep() {
  const { pick } = useLang();
  const { progress, ready } = useProgress();
  const [topics, setTopics] = useState<LessonTopic[] | null>(null);

  useEffect(() => {
    fetch("/api/lessons")
      .then((r) => r.json())
      .then((data: LessonTopic[]) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => setTopics([]));
  }, []);

  const current = useMemo(() => {
    if (!topics) return null;

    return coursesInProgress(catalogueOrder(summarizeCourses(topics, progress)))[0] ?? null;
  }, [topics, progress]);

  // Same height as the loaded card, so nothing below jumps when it arrives.
  if (!topics || !ready) {
    return (
      <div
        className="h-[156px] sm:h-[120px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse"
        aria-hidden="true"
      />
    );
  }

  const quickTest = (
    <Link
      href="/knowledge-review?quick=1"
      className="btn-secondary inline-flex items-center justify-center gap-2 text-sm"
    >
      <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      {pick("Test nhanh 5 câu", "5-question quick test")}
    </Link>
  );

  if (current?.resume) {
    const { topic, lesson } = current.resume;

    return (
      <section
        aria-label={pick("Học tiếp", "Continue learning")}
        className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row"
      >
        <div
          className={cn(
            "sm:w-36 h-16 sm:h-auto shrink-0 bg-gradient-to-br flex items-center justify-center text-4xl text-white/90",
            GROUP_COVER[current.group.accent]
          )}
        >
          <GroupIcon group={current.group.id} />
        </div>
        <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {pick("Học tiếp", "Continue learning")} · {pick(current.group.label, current.group.labelEn)}
            </div>
            <div className="font-semibold text-lg mt-0.5 truncate">{pick(lesson.title, lesson.titleEn)}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{pick(topic.title, topic.titleEn)}</div>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="h-1.5 flex-1 max-w-xs rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden"
                role="progressbar"
                aria-valuenow={current.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={pick("Tiến độ khoá học", "Course progress")}
              >
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${current.pct}%` }} />
              </div>
              <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">{current.pct}%</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            <Link
              href={`/learn/${topic.slug}/${lesson.id}`}
              className="btn-primary inline-flex items-center justify-center gap-2 text-sm"
            >
              {pick("Học tiếp", "Resume")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {quickTest}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">
          {pick("Bắt đầu từ đâu?", "Where to start?")}
        </h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
          {pick(
            "Chọn một khoá học và làm bài nhỏ đầu tiên — chỉ mất 5–10 phút. Mới học IT thì bắt đầu với Nền tảng IT.",
            "Pick a course and do its first short lesson — it takes 5–10 minutes. New to IT? Start with IT Fundamentals."
          )}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <Link href="/learn" className="btn-primary inline-flex items-center justify-center gap-2 text-sm">
          {pick("Chọn khoá học", "Choose a course")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {quickTest}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { pick } = useLang();
  const { progress, ready } = useProgress();
  const stats = overallStats(progress);
  const hasProgress =
    ready && (stats.questionsAnswered > 0 || stats.lessonsCompleted > 0);

  const statItems = [
    { label: pick("Chuỗi ngày học", "Study streak"), value: stats.streak, unit: pick("ngày", "days") },
    { label: pick("Bài nhỏ hoàn thành", "Lessons done"), value: stats.lessonsCompleted },
    { label: pick("Câu đã trả lời", "Questions answered"), value: stats.questionsAnswered },
    { label: pick("Điểm trung bình", "Average score"), value: `${stats.avgBestPct}%` },
  ];

  return (
    <div className="max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold">{pick("Nền tảng học IT & tiếng Anh", "IT & English Learning Platform")}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1 max-w-2xl">
          {pick(
            "Học IT/AWS song ngữ qua các bài nhỏ, ôn tập bằng quiz và thực hành SQL, API, thiết kế hệ thống.",
            "Learn IT/AWS in short bilingual lessons, review with quizzes, and practise SQL, APIs and system design."
          )}
        </p>
      </header>

      <NextStep />

      {hasProgress && (
        <section aria-label={pick("Tóm tắt tiến độ", "Progress summary")}>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statItems.map((item) => (
              <div key={item.label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
                <dt className="text-xs text-zinc-600 dark:text-zinc-400">{item.label}</dt>
                <dd className="text-xl font-bold tabular-nums mt-0.5">
                  {item.value}
                  {item.unit && <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400"> {item.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <Link
            href="/progress"
            className="inline-flex items-center gap-1 mt-2 py-1 text-sm text-blue-700 dark:text-blue-400 hover:underline"
          >
            {pick("Xem chi tiết tiến độ", "See detailed progress")}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      )}

      {TOOL_GROUPS.map((group) => (
        <section key={group.heading.en} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            {pick(group.heading.vi, group.heading.en)}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.tools.map((tool) => (
              <HubCard
                key={tool.href}
                href={tool.href}
                icon={tool.icon}
                tile={tool.tile}
                title={pick(tool.title.vi, tool.title.en)}
                description={pick(tool.desc.vi, tool.desc.en)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
