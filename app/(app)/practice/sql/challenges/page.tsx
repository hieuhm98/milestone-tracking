"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { DIFFICULTIES, type Difficulty } from "@/lib/sqlChallenges";
import { useChallenges, useSolved } from "@/components/sql/useChallenges";
import { DB_LABEL, DIFFICULTY_CLASS, DIFFICULTY_LABEL } from "@/components/sql/labels";

type Status = "all" | "todo" | "solved";

export default function SqlChallengesPage() {
  const { pick } = useLang();
  const { challenges, loading } = useChallenges();
  const [solved] = useSolved();
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [status, setStatus] = useState<Status>("all");

  const solvedCount = challenges.filter((c) => solved[c.id]).length;
  const shown = challenges.filter(
    (c) =>
      (difficulty === "all" || c.difficulty === difficulty) &&
      (status === "all" || (status === "solved") === Boolean(solved[c.id]))
  );
  const nextUp = challenges.find((c) => !solved[c.id]);

  const chip = (active: boolean) =>
    cn(
      "px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors",
      active
        ? "bg-blue-600 border-blue-600 text-white"
        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
    );

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/practice/sql" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
        {pick("← Luyện tập SQL", "← SQL Practice")}
      </Link>

      <div className="mt-2 mb-5">
        <h1 className="text-2xl font-bold">{pick("Thử thách SQL", "SQL Challenges")}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
          {pick(
            "Các bài từ dễ đến khó, mỗi bài luyện một tính năng SQL — từ SELECT cơ bản tới JOIN, truy vấn con, CTE đệ quy, hàm cửa sổ và thay đổi dữ liệu. Bài được chấm tự động bằng cách so kết quả với lời giải; bạn phải dùng đúng tính năng bài yêu cầu.",
            "Challenges from easy to hard, each practising one SQL feature — from basic SELECT to JOINs, subqueries, recursive CTEs, window functions and changing data. Answers are graded automatically against a reference solution, and you must use the feature the challenge practises."
          )}
        </p>
      </div>

      {/* Progress */}
      <div className="card mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">
              {pick(`Đã giải ${solvedCount}/${challenges.length || "…"}`, `Solved ${solvedCount}/${challenges.length || "…"}`)}
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-zinc-500">
              {DIFFICULTIES.map((d) => {
                const all = challenges.filter((c) => c.difficulty === d);

                return (
                  <span key={d}>
                    {pick(DIFFICULTY_LABEL[d].vi, DIFFICULTY_LABEL[d].en)}: {all.filter((c) => solved[c.id]).length}/{all.length}
                  </span>
                );
              })}
            </div>
          </div>
          {nextUp && (
            <Link href={`/practice/sql/challenges/${nextUp.id}`} className="btn-primary text-sm">
              {solvedCount === 0 ? pick("Bắt đầu →", "Start →") : pick("Làm tiếp →", "Continue →")}
            </Link>
          )}
        </div>
        <div
          className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 mt-3 overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={challenges.length}
          aria-valuenow={solvedCount}
        >
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: challenges.length ? `${(100 * solvedCount) / challenges.length}%` : 0 }}
          />
        </div>
        <p className="text-[11px] text-zinc-500 mt-2">
          {pick(
            "Tiến độ được lưu cùng tiến độ học tập — đồng bộ với tài khoản khi bạn đăng nhập.",
            "Saved with your learning progress — synced to your account when you're signed in."
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip(difficulty === "all")} onClick={() => setDifficulty("all")}>
            {pick("Mọi độ khó", "All levels")}
          </button>
          {DIFFICULTIES.map((d) => (
            <button key={d} type="button" className={chip(difficulty === d)} onClick={() => setDifficulty(d)}>
              {pick(DIFFICULTY_LABEL[d].vi, DIFFICULTY_LABEL[d].en)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", pick("Tất cả", "All")],
              ["todo", pick("Chưa giải", "To do")],
              ["solved", pick("Đã giải", "Solved")],
            ] as [Status, string][]
          ).map(([id, label]) => (
            <button key={id} type="button" className={chip(status === id)} onClick={() => setStatus(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-zinc-500">{pick("Đang tải…", "Loading…")}</p>}

      <ol className="space-y-2">
        {shown.map((c) => {
          const done = Boolean(solved[c.id]);

          return (
            <li key={c.id}>
              <Link
                href={`/practice/sql/challenges/${c.id}`}
                className="card flex items-start gap-3 hover:border-blue-400 dark:hover:border-blue-700 transition-colors"
              >
                <span
                  className={cn(
                    "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold",
                    done
                      ? "bg-emerald-500 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}
                  aria-label={done ? pick("Đã giải", "Solved") : undefined}
                >
                  {done ? "✓" : c.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{pick(c.title.vi, c.title.en)}</span>
                    <span className={cn("text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold", DIFFICULTY_CLASS[c.difficulty])}>
                      {pick(DIFFICULTY_LABEL[c.difficulty].vi, DIFFICULTY_LABEL[c.difficulty].en)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {pick(DB_LABEL[c.db].vi, DB_LABEL[c.db].en)}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1 mt-1.5">
                    {c.concepts.map((concept) => (
                      <span
                        key={concept}
                        className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
                      >
                        {concept}
                      </span>
                    ))}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {!loading && shown.length === 0 && (
        <p className="text-sm text-zinc-500">{pick("Không có bài nào khớp bộ lọc.", "No challenges match these filters.")}</p>
      )}
    </div>
  );
}
