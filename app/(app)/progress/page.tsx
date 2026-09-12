"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import {
  PASS_PCT,
  UNKNOWN_COURSE,
  isUnchanged,
  mergeImport,
  normalize,
  overallStats,
  topicStats,
  type CourseGain,
  type CourseMerge,
  type CourseSnapshot,
  type ExamProgress,
  type BlitzProgress,
  blitzCourse,
} from "@/lib/progress";
import { GROUPS, DEFAULT_GROUP, GROUP_ACCENT } from "@/lib/groups";
import { cn } from "@/lib/utils";

interface StaticTopic {
  slug: string;
  group: string;
  title: string;
  titleEn?: string;
  questionCount?: number;
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{value}</div>
      {hint && <div className="text-xs text-zinc-500 mt-0.5">{hint}</div>}
    </div>
  );
}

export default function ProgressPage() {
  const { t, pick, lang } = useLang();
  const { progress, ready, writable, lastSyncedAt, replaceAll, reset } = useProgress();
  const [topics, setTopics] = useState<StaticTopic[]>([]);
  const [lessonTotal, setLessonTotal] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  /** A parsed import waiting for the learner to confirm the comparison. */
  const [pending, setPending] = useState<{ fileName: string; merge: CourseMerge } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/knowledge")
      .then((r) => r.json())
      .then((data: StaticTopic[]) => setTopics(data ?? []))
      .catch(() => setTopics([]));

    fetch("/api/lessons")
      .then((r) => r.json())
      .then((data: { lessons: unknown[] }[]) =>
        setLessonTotal(Array.isArray(data) ? data.reduce((n, tp) => n + (tp.lessons?.length ?? 0), 0) : 0)
      )
      .catch(() => setLessonTotal(0));
  }, []);

  const stats = useMemo(() => overallStats(progress), [progress]);

  // Tracks the learner has actually sat, in curriculum order.
  const examRows = useMemo(
    () =>
      GROUPS.map((group) => ({ group, exam: progress.exams[group.id] }))
        .filter((row): row is { group: (typeof GROUPS)[number]; exam: ExamProgress } =>
          Boolean(row.exam && row.exam.attempts > 0)
        ),
    [progress]
  );

  // Tracks with at least one Blitz run, best score first — the record is the point.
  const blitzRows = useMemo(() => {
    const best = new Map<string, BlitzProgress>();

    for (const [key, run] of Object.entries(progress.blitz)) {
      if (run.runs === 0) continue;

      const course = blitzCourse(key);
      const existing = best.get(course);

      if (!existing || run.bestScore > existing.bestScore) best.set(course, run);
    }

    return GROUPS.map((group) => ({ group, run: best.get(group.id) })).filter(
      (row): row is { group: (typeof GROUPS)[number]; run: BlitzProgress } => Boolean(row.run)
    );
  }, [progress]);

  // Only topics with something recorded — the full catalogue lives on /knowledge.
  const startedTopics = useMemo(() => {
    const known = new Map(topics.map((tp) => [tp.slug, tp]));

    return Object.keys(progress.topics)
      .map((slug) => {
        const topic = known.get(slug);
        const stat = topicStats(progress, slug, topic?.questionCount);

        return { slug, topic, stat };
      })
      .filter((row) => row.stat.started)
      .sort((a, b) => (progress.topics[b.slug]?.updatedAt ?? "").localeCompare(progress.topics[a.slug]?.updatedAt ?? ""));
  }, [progress, topics]);

  /** Progress is keyed by slug; the catalogue is what maps a slug to a course. */
  const topicGroups = useMemo(
    () => Object.fromEntries(topics.map((tp) => [tp.slug, tp.group])),
    [topics]
  );

  const courseRows = useMemo(() => {
    if (!pending) return [];

    const order = new Map(GROUPS.map((g, i) => [g.id, i]));

    return [...pending.merge.courses].sort(
      (a, b) => (order.get(a.course) ?? 99) - (order.get(b.course) ?? 99) || a.course.localeCompare(b.course)
    );
  }, [pending]);

  function handleExport() {
    const now = new Date();
    const stamp = `${now.toISOString().slice(0, 10)}-${now.toTimeString().slice(0, 5).replace(":", "")}`;

    // `exportedAt` and `app` are provenance only — normalize() ignores unknown
    // keys, so the file still imports as a plain snapshot.
    const payload = { app: "milestone-tracking", exportedAt: now.toISOString(), ...progress };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = `progress-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Revoking synchronously can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Importing never overwrites blind: the file is compared with what this
   * browser holds, course by course, and the result is shown for confirmation
   * before anything is written.
   */
  async function handleImport(file: File) {
    try {
      const imported = normalize(JSON.parse(await file.text()));

      setNotice(null);
      setPending({ fileName: file.name, merge: mergeImport(progress, imported, topicGroups) });
    } catch {
      setPending(null);
      setNotice(t("progress.importFailed"));
    }
  }

  async function applyImport() {
    if (!pending) return;

    const { merge } = pending;
    const grew = merge.courses.filter((c) => !isUnchanged(c.gain)).length;

    setPending(null);
    await replaceAll(merge.data);
    setNotice(
      grew === 0 && merge.newReviews === 0
        ? pick(
            "Đã nhập — file không có gì mới so với tiến độ hiện tại.",
            "Imported — the file held nothing this browser did not already have."
          )
        : pick(
            `Đã nhập tiến độ — ${grew} khoá học được bổ sung, ${merge.newReviews} lượt ôn tập mới.`,
            `Progress imported — ${grew} course(s) gained progress, ${merge.newReviews} new review session(s).`
          )
    );
  }

  function handleReset() {
    if (window.confirm(t("progress.resetConfirm"))) {
      setPending(null);
      void reset();
    }
  }

  const dateFmt = new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const shortDate = new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-GB", { dateStyle: "short" });

  // The three comparison cells share the row below the course name on a narrow
  // screen and line up as columns from sm up, so the table reflows instead of
  // scrolling sideways. Each carries its own label for when the header is hidden.
  const cellClass = "flex-1 min-w-0 sm:flex-none sm:w-24 text-xs sm:text-right";

  function cellLabel(label: string) {
    return (
      <span className="block sm:hidden text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
        {label}
      </span>
    );
  }

  /** What the merge adds to a course — nothing here is ever a subtraction. */
  function gainCell(gain: CourseGain) {
    const parts: string[] = [];

    if (gain.topics > 0) parts.push(`+${gain.topics} ${pick("chủ đề", "topics")}`);

    if (gain.answered > 0) parts.push(`+${gain.answered} ${pick("câu", "q")}`);

    if (gain.lessonsCompleted > 0) parts.push(`+${gain.lessonsCompleted} ${pick("bài", "lessons")}`);

    // Exam gain is a jump in the best score, not a count, so it reads "+12% thi".
    if (gain.examBestPct > 0) parts.push(`+${gain.examBestPct}% ${pick("thi", "exam")}`);

    // Blitz gain is a jump in points, so it reads "+340 Blitz".
    if (gain.blitzBestScore > 0) parts.push(`+${gain.blitzBestScore} Blitz`);

    return (
      <span className={cellClass}>
        {cellLabel(pick("Sau khi nhập", "After import"))}
        {isUnchanged(gain) ? (
          <span className="block text-[11px] text-zinc-400 dark:text-zinc-600">
            {pick("không đổi", "unchanged")}
          </span>
        ) : (
          parts.map((part) => (
            <span key={part} className="block text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              {part}
            </span>
          ))
        )}
      </span>
    );
  }

  /** One side of a course comparison: last activity, then what it holds. */
  function sideCell(label: string, snap: CourseSnapshot | null, active: boolean) {
    return (
      <span className={cellClass}>
        {cellLabel(label)}
        {!snap || !snap.updatedAt ? (
          <span className="block text-zinc-400 dark:text-zinc-600">—</span>
        ) : (
          <>
            <span
              className={cn(
                "block font-mono",
                active ? "text-zinc-900 dark:text-zinc-100 font-medium" : "text-zinc-500"
              )}
            >
              {shortDate.format(new Date(snap.updatedAt))}
            </span>
            <span className="block text-[10px] text-zinc-500">
              {snap.topics} {pick("chủ đề", "topics")} · {snap.answered} {pick("câu", "q")}
            </span>
          </>
        )}
      </span>
    );
  }

  if (!ready) return <div className="text-zinc-500 text-sm p-8">{t("common.loading")}</div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t("progress.title")}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">{t("progress.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label={t("progress.streak")}
          value={`${stats.streak} ${t("progress.streakDays")}`}
          hint={`${stats.activeDays} ${t("progress.activeDays")}`}
        />
        <StatTile
          label={pick("Bài nhỏ hoàn thành", "Mini-lessons done")}
          value={`${stats.lessonsCompleted}${lessonTotal ? `/${lessonTotal}` : ""}`}
          hint={`${stats.topicsCompleted}/${topics.length || "—"} ${pick("chủ đề", "topics")}`}
        />
        <StatTile label={t("progress.questionsAnswered")} value={String(stats.questionsAnswered)} />
        <StatTile label={t("progress.avgScore")} value={`${stats.avgBestPct}%`} />
      </div>

      {/* Final tests */}
      {examRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("exam.indexTitle")}</h2>
          <div className="space-y-2">
            {examRows.map(({ group, exam }) => {
              const accent = GROUP_ACCENT[group.accent];

              return (
                <Link
                  key={group.id}
                  href={`/exam/${group.id}`}
                  className="card flex flex-wrap items-center gap-x-3 gap-y-2 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <span className={cn("text-lg shrink-0", accent.text)}>{group.icon}</span>
                  <span className="flex-1 min-w-0 basis-full sm:basis-auto text-sm font-medium truncate">
                    {pick(group.label, group.labelEn)}
                  </span>
                  {exam.passed && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded border bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 shrink-0">
                      {t("exam.passed")}
                    </span>
                  )}
                  <div className="h-1.5 flex-1 sm:flex-none sm:w-28 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        exam.bestPct >= PASS_PCT ? "bg-green-500" : accent.bar
                      )}
                      style={{ width: `${exam.bestPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 tabular-nums shrink-0">
                    {exam.bestPct}% · {exam.attempts} {t("exam.attempts").toLowerCase()}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Blitz */}
      {blitzRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("blitz.navTitle")}</h2>
          <div className="space-y-2">
            {blitzRows.map(({ group, run }) => {
              const accent = GROUP_ACCENT[group.accent];

              return (
                <Link
                  key={group.id}
                  href="/practice/blitz"
                  className="card flex flex-wrap items-center gap-x-3 gap-y-2 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <span className={cn("text-lg shrink-0", accent.text)}>{group.icon}</span>
                  <span className="flex-1 min-w-0 basis-full sm:basis-auto text-sm font-medium truncate">
                    {pick(group.label, group.labelEn)}
                  </span>
                  <span className={cn("text-lg font-bold tabular-nums shrink-0", accent.text)}>
                    {run.bestScore}
                  </span>
                  <span className="text-xs text-zinc-500 tabular-nums shrink-0">
                    {run.bestCombo}🔥 · {run.runs} {t("blitz.runs")}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* By topic */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("progress.byTopic")}</h2>

        {startedTopics.length === 0 ? (
          <div className="card text-sm text-zinc-500">{t("progress.notStarted")}</div>
        ) : (
          <div className="space-y-2">
            {startedTopics.map(({ slug, topic, stat }) => {
              const group = GROUPS.find((g) => g.id === (topic?.group ?? DEFAULT_GROUP));
              const accent = GROUP_ACCENT[group?.accent ?? "blue"];
              // Clamped: a topic that lost questions since the last attempt can
              // otherwise report over 100% and overrun its own bar.
              const pct = stat.total > 0 ? Math.min(100, Math.round((stat.answered / stat.total) * 100)) : 0;

              return (
                <Link
                  key={slug}
                  href={`/knowledge/${slug}`}
                  className="card block hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="text-base shrink-0 leading-5">{group?.icon ?? "◉"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {topic ? pick(topic.title, topic.titleEn) : slug}
                      </div>
                      <div className="mt-1.5 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", accent.bar)} style={{ width: `${pct}%` }} />
                      </div>

                      {/* Too little room for a side column on a phone, so the
                          same numbers sit under the bar instead. */}
                      <div className="sm:hidden mt-1.5 flex items-baseline gap-2 text-xs">
                        <span className="font-mono text-zinc-700 dark:text-zinc-300 shrink-0">
                          {stat.answered}/{stat.total || "?"}
                        </span>
                        <span className="text-zinc-500">
                          {stat.attempts > 0
                            ? `${t("progress.best")} ${stat.bestPct}% · ${stat.attempts} ${t("progress.attempts")}`
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="hidden sm:block text-right shrink-0">
                      <div className="text-sm font-mono text-zinc-700 dark:text-zinc-300">
                        {stat.answered}/{stat.total || "?"}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {stat.attempts > 0
                          ? `${t("progress.best")} ${stat.bestPct}% · ${stat.attempts} ${t("progress.attempts")}`
                          : "—"}
                      </div>
                    </div>
                    {stat.completed && <span className="text-green-600 dark:text-green-400 shrink-0">✓</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Review history */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("progress.recentSessions")}</h2>
          {stats.reviewSessions > 0 && (
            <span className="text-xs text-zinc-500">
              {stats.reviewSessions} · {t("progress.reviewAccuracy")} {stats.reviewAccuracy}%
            </span>
          )}
        </div>

        {progress.reviews.length === 0 ? (
          <div className="card text-sm text-zinc-500">{t("progress.noSessions")}</div>
        ) : (
          // Spelled out rather than `.card`: its p-5 beats any p-0 utility, and
          // the rows need to own their own padding for the divider to reach.
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
            {progress.reviews.slice(0, 15).map((r) => {
              const pct = r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0;

              return (
                <div
                  key={r.at}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 sm:px-4 py-2.5 text-sm"
                >
                  <span className="order-1 text-xs text-zinc-500 font-mono shrink-0 sm:w-40">
                    {dateFmt.format(new Date(r.at))}
                  </span>
                  <span className="order-4 sm:order-2 flex flex-wrap gap-x-2 gap-y-0.5 w-full sm:w-auto sm:flex-1 min-w-0">
                    {r.groups.map((id) => {
                      const g = GROUPS.find((x) => x.id === id);

                      return (
                        <span key={id} className="text-xs text-zinc-500">
                          {g ? `${g.icon} ${pick(g.label, g.labelEn)}` : id}
                        </span>
                      );
                    })}
                  </span>
                  <span className="order-2 sm:order-3 ml-auto sm:ml-0 font-mono text-zinc-700 dark:text-zinc-300 shrink-0">
                    {r.correct}/{r.total}
                  </span>
                  <span
                    className={cn(
                      "order-3 sm:order-4 text-xs font-medium shrink-0 w-10 text-right",
                      pct >= 80
                        ? "text-green-600 dark:text-green-400"
                        : pct >= 50
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Storage + backup */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("progress.storage")}</h2>

        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded border",
                writable
                  ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
              )}
            >
              {writable ? t("progress.storageSynced") : t("progress.storageLocal")}
            </span>
            {writable && lastSyncedAt && (
              <span className="text-xs text-zinc-500">
                {t("progress.lastSynced")}: {dateFmt.format(new Date(lastSyncedAt))}
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed">
            {writable ? t("progress.storageSyncedHint") : t("progress.storageLocalHint")}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={handleExport} className="btn-secondary text-sm">
              ↓ {t("progress.export")}
            </button>
            <button onClick={() => fileInput.current?.click()} className="btn-secondary text-sm">
              ↑ {t("progress.import")}
            </button>
            <button
              onClick={handleReset}
              className="text-sm px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              {t("progress.reset")}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file) void handleImport(file);

                e.target.value = "";
              }}
            />
          </div>

          {pending && (
            <div className="rounded-lg border border-blue-300 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-3 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {pick("So sánh theo khoá học", "Course-by-course comparison")}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  {pick(
                    `Đang so sánh “${pending.fileName}” với tiến độ trên máy này, theo từng khoá học. Hai bên được gộp lại — luôn giữ phần tiến độ nhiều hơn, nên nhập file không bao giờ làm mất bài đã làm. Câu đã trả lời ở hai bên được cộng gộp, điểm cao nhất và số bài đã hoàn thành không bao giờ giảm; chỉ điểm của lần làm gần nhất là lấy theo bên mới hơn.`,
                    `Comparing “${pending.fileName}” with the progress in this browser, course by course. The two are merged — the bigger progress always wins, so importing can never lose work. Answers from both sides are combined, best scores and completed lessons never go down, and only the most recent sitting's score follows recency.`
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50">
                  <span className="flex-1 min-w-0">{pick("Khoá học", "Course")}</span>
                  <span className="w-24 shrink-0 text-right">{pick("Máy này", "This browser")}</span>
                  <span className="w-24 shrink-0 text-right">{pick("Trong file", "In the file")}</span>
                  <span className="w-24 shrink-0 text-right">{pick("Sau khi nhập", "After import")}</span>
                </div>

                {courseRows.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-zinc-500">
                    {pick("Không có tiến độ nào để so sánh.", "There is no progress to compare.")}
                  </div>
                ) : (
                  courseRows.map((row) => {
                    const group = GROUPS.find((g) => g.id === row.course);

                    return (
                      <div
                        key={row.course}
                        className="flex flex-wrap items-start gap-x-3 gap-y-1.5 px-3 py-2.5 sm:items-center sm:py-2"
                      >
                        <span className="w-full sm:w-auto sm:flex-1 min-w-0 truncate text-sm font-medium sm:font-normal text-zinc-800 dark:text-zinc-200">
                          {group
                            ? `${group.icon} ${pick(group.label, group.labelEn)}`
                            : row.course === UNKNOWN_COURSE
                              ? pick("Chủ đề ngoài danh mục", "Topics outside the catalogue")
                              : row.course}
                        </span>
                        {sideCell(pick("Máy này", "This browser"), row.local, row.ahead !== "imported")}
                        {sideCell(pick("Trong file", "In the file"), row.imported, row.ahead === "imported")}
                        {gainCell(row.gain)}
                      </div>
                    );
                  })
                )}
              </div>

              {pending.merge.newReviews > 0 && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  + {pending.merge.newReviews}{" "}
                  {pick("lượt ôn tập mới từ file", "new review session(s) from the file")}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void applyImport()}
                  className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  {pick("Áp dụng", "Apply")}
                </button>
                <button onClick={() => setPending(null)} className="btn-secondary text-sm">
                  {pick("Huỷ", "Cancel")}
                </button>
              </div>
            </div>
          )}

          {notice && <p className="text-xs text-zinc-600 dark:text-zinc-400">{notice}</p>}
        </div>
      </section>
    </div>
  );
}
