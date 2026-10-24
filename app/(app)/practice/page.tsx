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
      vi: "Viết và chạy SQL thật trên kho từ vựng tiếng Anh hoặc dữ liệu fintech, kèm sơ đồ cơ sở dữ liệu. Truy vấn chạy trên bản sao trong bộ nhớ.",
      en: "Write and run real SQL against the English word bank or fintech data, with a database diagram. Queries run on an in‑memory copy.",
    },
  },
  {
    href: "/practice/sql/challenges",
    icon: "◆",
    accent: "text-teal-700 dark:text-teal-300",
    title: { vi: "Thử thách SQL", en: "SQL Challenges" },
    desc: {
      vi: "36 bài từ dễ đến khó kiểu LeetCode, chấm tự động: lọc, gộp nhóm, JOIN, truy vấn con, CTE đệ quy, hàm cửa sổ, INSERT/UPDATE/CREATE…",
      en: "36 LeetCode-style challenges from easy to hard, auto-graded: filtering, grouping, JOINs, subqueries, recursive CTEs, window functions, INSERT/UPDATE/CREATE…",
    },
  },
  {
    href: "/practice/api",
    icon: "⇄",
    accent: "text-violet-700 dark:text-violet-300",
    title: { vi: "Luyện tập API", en: "API Practice" },
    desc: {
      vi: "Gọi thử API cửa hàng sách bằng Scalar: request/response, đăng nhập lấy Bearer token, đặt hàng, thanh toán. Sandbox riêng, tự làm mới mỗi ngày.",
      en: "Call a bookstore API from Scalar: requests and responses, log in for a Bearer token, order and pay. A private sandbox that resets daily.",
    },
  },
  {
    href: "/practice/api/web",
    icon: "🛒",
    accent: "text-orange-700 dark:text-orange-300",
    title: { vi: "Cửa hàng web (API)", en: "Web store (API)" },
    desc: {
      vi: "Một website bán sách chạy trên API ở trên: đăng ký, giỏ hàng, đặt hàng, thanh toán. Mở DevTools → Network để xem trang web gọi API thế nào.",
      en: "A bookshop website built on the API above: sign up, cart, order, pay. Open DevTools → Network to see how a real web app calls an API.",
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
