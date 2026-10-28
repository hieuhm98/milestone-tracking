"use client";

import { ArrowLeftRight, Database, PenTool, ShoppingCart, Timer, Trophy } from "lucide-react";
import { useLang } from "@/context/lang";
import HubCard from "@/components/HubCard";

const CARDS = [
  {
    href: "/practice/blitz",
    icon: Timer,
    tile: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    title: { vi: "Blitz — Đấu tốc độ", en: "Blitz — Timed Run" },
    desc: {
      vi: "60 giây, điểm nhân theo chuỗi đúng, và một kỷ lục để phá. Gồm cả dạng chọn nhiều đáp án, tự gõ tên dịch vụ, ghép cặp và sắp thứ tự.",
      en: "60 seconds, a multiplier that compounds while you're right, and a record to beat. Includes choose‑several, type‑the‑service, matching and ordering.",
    },
  },
  {
    href: "/practice/questions",
    icon: PenTool,
    tile: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    title: { vi: "Bài tập thiết kế", en: "Design Exercises" },
    desc: {
      vi: "Câu hỏi mở về thiết kế CSDL, API và kiến trúc AWS. Tự làm ra giấy rồi mở đáp án chi tiết để đối chiếu.",
      en: "Open‑ended questions on database, API and AWS architecture design. Solve on paper, then reveal a detailed answer.",
    },
  },
  {
    href: "/practice/sql",
    icon: Database,
    tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    title: { vi: "Luyện tập SQL", en: "SQL Practice" },
    desc: {
      vi: "Viết và chạy SQL thật trên kho từ vựng tiếng Anh hoặc dữ liệu fintech, kèm sơ đồ cơ sở dữ liệu. Truy vấn chạy trên bản sao trong bộ nhớ.",
      en: "Write and run real SQL against the English word bank or fintech data, with a database diagram. Queries run on an in‑memory copy.",
    },
  },
  {
    href: "/practice/sql/challenges",
    icon: Trophy,
    tile: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    title: { vi: "Thử thách SQL", en: "SQL Challenges" },
    desc: {
      vi: "36 bài từ dễ đến khó kiểu LeetCode, chấm tự động: lọc, gộp nhóm, JOIN, truy vấn con, CTE đệ quy, hàm cửa sổ, INSERT/UPDATE/CREATE…",
      en: "36 LeetCode-style challenges from easy to hard, auto-graded: filtering, grouping, JOINs, subqueries, recursive CTEs, window functions, INSERT/UPDATE/CREATE…",
    },
  },
  {
    href: "/practice/api",
    icon: ArrowLeftRight,
    tile: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    title: { vi: "Luyện tập API", en: "API Practice" },
    desc: {
      vi: "Gọi thử API cửa hàng sách bằng Scalar: request/response, đăng nhập lấy Bearer token, đặt hàng, thanh toán. Sandbox riêng, tự làm mới mỗi ngày.",
      en: "Call a bookstore API from Scalar: requests and responses, log in for a Bearer token, order and pay. A private sandbox that resets daily.",
    },
  },
  {
    href: "/practice/api/web",
    icon: ShoppingCart,
    tile: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
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
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{pick("Luyện tập", "Practice")}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
          {pick(
            "Rèn kỹ năng thực hành: đấu tốc độ có tính giờ, bài tập thiết kế, viết SQL và gọi API.",
            "Sharpen hands‑on skills: the timed blitz, design exercises, SQL queries and API calls."
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CARDS.map((c) => (
          <HubCard
            key={c.href}
            href={c.href}
            icon={c.icon}
            tile={c.tile}
            title={pick(c.title.vi, c.title.en)}
            description={pick(c.desc.vi, c.desc.en)}
          />
        ))}
      </div>
    </div>
  );
}
