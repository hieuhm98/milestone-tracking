"use client";

import Link from "next/link";
import { useLang } from "@/context/lang";

const CARDS = [
  {
    href: "/practice/blitz",
    icon: "⚡",
    accent: "text-orange-700 dark:text-orange-300",
    title: { vi: "Blitz — Đấu tốc độ", en: "Blitz — Timed Run" },
    desc: {
      vi: "60 giây, điểm nhân theo chuỗi đúng, và một kỷ lục để phá. Gồm cả dạng chọn nhiều đáp án, tự gõ tên dịch vụ, ghép cặp và sắp thứ tự.",
      en: "60 seconds, a multiplier that compounds while you're right, and a record to beat. Includes choose‑several, type‑the‑service, matching and ordering.",
    },
  },
  {
    href: "/practice/questions",
    icon: "✎",
    accent: "text-blue-700 dark:text-blue-300",
    title: { vi: "Bài tập thiết kế", en: "Design Exercises" },
    desc: {
      vi: "Câu hỏi mở về thiết kế CSDL, API và kiến trúc AWS. Tự làm ra giấy rồi mở đáp án chi tiết để đối chiếu.",
      en: "Open‑ended questions on database, API and AWS architecture design. Solve on paper, then reveal a detailed answer.",
    },
  },
  {
    href: "/practice/sql",
    icon: "▤",
    accent: "text-emerald-700 dark:text-emerald-300",
    title: { vi: "Luyện tập SQL", en: "SQL Practice" },
    desc: {
      vi: "Viết và chạy SQL thật trên kho từ vựng tiếng Anh (~23k từ). Truy vấn chạy trên bản sao trong bộ nhớ.",
      en: "Write and run real SQL against the English word bank (~23k words). Queries run on an in‑memory copy.",
    },
  },
];

export default function PracticeHomePage() {
  const { pick } = useLang();
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{pick("Luyện tập", "Practice")}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
          {pick(
            "Rèn kỹ năng thực hành: đấu tốc độ có tính giờ, giải bài tập thiết kế và viết truy vấn SQL.",
            "Sharpen hands‑on skills: run the timed blitz, work through design exercises, and write SQL queries."
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
