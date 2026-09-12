"use client";

import Link from "next/link";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import { overallStats } from "@/lib/progress";

const CARDS = [
  {
    href: "/learn",
    icon: "◐",
    accent: "text-indigo-700 dark:text-indigo-300",
    title: { vi: "Lộ trình học", en: "Study path" },
    desc: {
      vi: "Từng bài nhỏ 5–10 phút: kiểm tra khởi động → đọc → kiểm tra lại, có ôn tập kiến thức cũ xen kẽ.",
      en: "5–10 minute mini-lessons: warm-up test → read → check test, with earlier material mixed back in.",
    },
  },
  {
    href: "/knowledge",
    icon: "◉",
    accent: "text-blue-700 dark:text-blue-300",
    title: { vi: "Kiến thức", en: "Knowledge" },
    desc: {
      vi: "Các chủ đề IT cho BA/PO/PM và khóa AWS SAA-C03 — bài viết song ngữ kèm quiz.",
      en: "IT topics for BA/PO/PM and the AWS SAA-C03 course — bilingual articles with quizzes.",
    },
  },
  {
    href: "/knowledge-review?quick=1",
    icon: "⚡",
    accent: "text-amber-700 dark:text-amber-300",
    title: { vi: "Test nhanh", en: "Quick Test" },
    desc: {
      vi: "Bài kiểm tra ngẫu nhiên nhanh từ tất cả chủ đề để ôn tập mỗi ngày.",
      en: "A fast randomized test across every topic to review each day.",
    },
  },
  {
    href: "/practice/blitz",
    icon: "⚡",
    accent: "text-orange-700 dark:text-orange-300",
    title: { vi: "Blitz — Đấu tốc độ", en: "Blitz — Timed Run" },
    desc: {
      vi: "60 giây tính giờ, điểm nhân theo chuỗi đúng, kỷ lục để phá — kèm dạng chọn nhiều đáp án, tự gõ, ghép cặp và sắp thứ tự.",
      en: "A 60-second clock, a combo multiplier and a record to beat — with choose-several, type-the-answer, matching and ordering.",
    },
  },
  {
    href: "/exam",
    icon: "◎",
    accent: "text-rose-700 dark:text-rose-300",
    title: { vi: "Thi cuối khoá", en: "Final Test" },
    desc: {
      vi: "Đề thi sinh ngẫu nhiên cho từng khoá (BA, PO, PM, AWS…), phủ đều mọi chủ đề, có tính giờ và điểm đạt.",
      en: "A randomly generated exam per track (BA, PO, PM, AWS…) covering every topic, timed, with a pass mark.",
    },
  },
  {
    href: "/practice/questions",
    icon: "✐",
    accent: "text-sky-700 dark:text-sky-300",
    title: { vi: "Bài tập thiết kế", en: "Design Exercises" },
    desc: {
      vi: "Câu hỏi mở về thiết kế CSDL, API và kiến trúc AWS — tự làm rồi mở đáp án chi tiết.",
      en: "Open-ended database, API and AWS architecture questions — solve, then reveal a detailed answer.",
    },
  },
  {
    href: "/practice/sql",
    icon: "▤",
    accent: "text-emerald-700 dark:text-emerald-300",
    title: { vi: "Luyện tập SQL", en: "SQL Practice" },
    desc: {
      vi: "Viết và chạy SQL thật trên kho từ vựng tiếng Anh (~23k từ).",
      en: "Write and run real SQL against the English word bank (~23k words).",
    },
  },
  {
    href: "/progress",
    icon: "◑",
    accent: "text-violet-700 dark:text-violet-300",
    title: { vi: "Tiến độ", en: "Progress" },
    desc: {
      vi: "Xem chuỗi ngày học, điểm từng chủ đề và lịch sử ôn tập — kèm xuất/nhập file sao lưu.",
      en: "Your study streak, per-topic scores and review history — with file export/import.",
    },
  },
];

export default function HomePage() {
  const { pick } = useLang();
  const { progress, ready } = useProgress();
  const stats = overallStats(progress);
  const hasProgress =
    ready && (stats.questionsAnswered > 0 || stats.reviewSessions > 0 || stats.lessonsStarted > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          {pick("Nền tảng học IT & tiếng Anh", "IT & English Learning Platform")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
          {pick(
            "Học kiến thức IT/AWS song ngữ, luyện quiz, thực hành thiết kế hệ thống và viết SQL — miễn phí, không cần đăng nhập.",
            "Learn bilingual IT/AWS knowledge, take quizzes, practice system design and write SQL — free, no login required."
          )}
        </p>
      </div>

      {hasProgress && (
        <Link
          href="/progress"
          className="card flex flex-wrap items-center gap-x-8 gap-y-3 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
        >
          <div>
            <div className="text-xs text-zinc-500">{pick("Chuỗi ngày học", "Study streak")}</div>
            <div className="text-xl font-bold">
              {stats.streak} <span className="text-sm font-normal text-zinc-500">{pick("ngày", "days")}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">{pick("Bài nhỏ hoàn thành", "Mini-lessons done")}</div>
            <div className="text-xl font-bold">{stats.lessonsCompleted}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">{pick("Câu đã trả lời", "Questions answered")}</div>
            <div className="text-xl font-bold">{stats.questionsAnswered}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">{pick("Điểm trung bình", "Average score")}</div>
            <div className="text-xl font-bold">{stats.avgBestPct}%</div>
          </div>
          <span className="ml-auto text-sm text-blue-600 dark:text-blue-400">
            {pick("Xem tiến độ →", "View progress →")}
          </span>
        </Link>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="card hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors group"
          >
            <div className={`text-2xl mb-2 ${c.accent}`}>{c.icon}</div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-900 dark:group-hover:text-white">
              {pick(c.title.vi, c.title.en)}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
              {pick(c.desc.vi, c.desc.en)}
            </p>
            <span className="inline-block mt-3 text-sm text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
              {pick("Mở →", "Open →")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
