"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import BilingualPair from "@/components/BilingualPair";
import OptionRationale from "@/components/knowledge/OptionRationale";
import { localizeQuestion, type Question } from "@/components/knowledge/QuizBlock";
import { GROUP_ACCENT, type Group } from "@/lib/groups";
import { questionKey } from "@/lib/lessons";
import { PASS_PCT, recordExam, type AnsweredQuestion } from "@/lib/progress";
import {
  DEFAULT_EXAM_COUNT,
  EXAM_COUNTS,
  drawExam,
  examSeconds,
  formatClock,
  topicBreakdown,
} from "@/lib/exam";
import { cn } from "@/lib/utils";
import QuestionText from "@/components/knowledge/QuestionText";

interface TrackTopic {
  slug: string;
  title: string;
  titleEn?: string;
}

interface Props {
  group: Group;
  topics: TrackTopic[];
}

/** One question on the paper, with the topic it was drawn from. */
type PaperQuestion = Question & { slug: string };

type Phase = "setup" | "running" | "results";

const OPTION_LABELS = ["A", "B", "C", "D", "E"];

/**
 * A track's final exam: a randomly generated paper, optionally timed, graded
 * against the same pass mark the mini-lessons use.
 *
 * The paper is built client-side from the same `/api/knowledge/[slug]` payloads
 * the quizzes use, so there is no exam-specific content to author or keep in
 * step — adding a topic to a track widens its exam automatically.
 */
export default function ExamRunner({ group, topics }: Props) {
  const { t, lang, pick, dual } = useLang();
  const { progress, ready, update } = useProgress();

  const [phase, setPhase] = useState<Phase>("setup");
  const [count, setCount] = useState<number>(DEFAULT_EXAM_COUNT);
  const [timed, setTimed] = useState(true);
  const [building, setBuilding] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [paper, setPaper] = useState<PaperQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [idx, setIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [ranOutOfTime, setRanOutOfTime] = useState(false);

  const startedAt = useRef<number>(0);
  // Grading must happen exactly once per paper — the timer, the Submit button
  // and a fast double-click can all reach it.
  const submitted = useRef(false);

  const accent = GROUP_ACCENT[group.accent];
  const record = progress.exams[group.id];
  const titleOf = useCallback(
    (slug: string) => {
      const topic = topics.find((tp) => tp.slug === slug);

      return topic ? pick(topic.title, topic.titleEn) : slug;
    },
    [topics, pick]
  );

  // ------------------------------------------------------------------ grading
  const localized = useMemo(() => paper.map((q) => localizeQuestion(q, lang)), [paper, lang]);
  const enQs = useMemo(() => paper.map((q) => localizeQuestion(q, "en")), [paper]);
  const viQs = useMemo(() => paper.map((q) => localizeQuestion(q, "vi")), [paper]);

  const correctFlags = useMemo(
    () => paper.map((q, i) => answers[i] === q.answer),
    [paper, answers]
  );
  const correctCount = correctFlags.filter(Boolean).length;
  const answeredCount = Object.keys(answers).length;
  const scorePct = paper.length > 0 ? Math.round((correctCount / paper.length) * 100) : 0;
  const passed = paper.length > 0 && scorePct >= PASS_PCT;

  const finish = useCallback(
    (outOfTime: boolean) => {
      if (submitted.current || paper.length === 0) return;

      submitted.current = true;

      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      const graded: AnsweredQuestion[] = paper.map((q, i) => ({
        key: questionKey(q.slug, q.id),
        correct: answers[i] === q.answer,
      }));

      setElapsed(seconds);
      setRanOutOfTime(outOfTime);
      setPhase("results");
      setIdx(0);

      update((prev) =>
        recordExam(prev, group.id, {
          correct: paper.filter((q, i) => answers[i] === q.answer).length,
          total: paper.length,
          seconds,
          answered: graded,
        })
      );
    },
    [paper, answers, group.id, update]
  );

  // The countdown. Runs only while the paper is open, and submits at zero.
  useEffect(() => {
    if (phase !== "running" || !timed) return;

    const tick = setInterval(() => {
      setSecondsLeft((left) => {
        if (left <= 1) {
          clearInterval(tick);
          finish(true);

          return 0;
        }

        return left - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [phase, timed, finish]);

  // Leaving mid-paper loses it, which is worth a browser warning.
  useEffect(() => {
    if (phase !== "running") return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  // ------------------------------------------------------------------ actions
  async function startExam() {
    setBuilding(true);
    setLoadError(false);

    const loaded = await Promise.all(
      topics.map(async (topic) => {
        try {
          const res = await fetch(`/api/knowledge/${topic.slug}`);

          if (!res.ok) return { slug: topic.slug, questions: [] as Question[] };

          const data = await res.json();

          return { slug: topic.slug, questions: (data.questions ?? []) as Question[] };
        } catch {
          return { slug: topic.slug, questions: [] as Question[] };
        }
      })
    );

    const drawn = drawExam(loaded, count).map(({ slug, question }) => ({ ...question, slug }));

    setBuilding(false);

    if (drawn.length === 0) {
      setLoadError(true);

      return;
    }

    submitted.current = false;
    startedAt.current = Date.now();

    setPaper(drawn);
    setAnswers({});
    setFlagged(new Set());
    setIdx(0);
    setSecondsLeft(examSeconds(drawn.length));
    setRanOutOfTime(false);
    setPhase("running");
  }

  function select(option: number) {
    setAnswers((prev) => ({ ...prev, [idx]: option }));
  }

  function toggleFlag() {
    setFlagged((prev) => {
      const next = new Set(prev);

      next.has(idx) ? next.delete(idx) : next.add(idx);

      return next;
    });
  }

  function handleSubmit() {
    const missing = paper.length - answeredCount;
    const message = missing > 0
      ? t("exam.confirmSubmit").replace("{n}", String(missing))
      : t("exam.confirmSubmitAll");

    if (window.confirm(message)) finish(false);
  }

  function handleAbandon() {
    if (!window.confirm(t("exam.abandonConfirm"))) return;

    submitted.current = true;
    setPaper([]);
    setPhase("setup");
  }

  // ======================================================================
  // Setup
  // ======================================================================
  if (phase === "setup") {
    const poolNote = `${topics.length} ${t("exam.topicsCovered")}`;

    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <Link href="/exam" className="text-sm text-blue-600 dark:text-blue-400 py-2 -my-2 inline-block">
            {t("exam.backToTracks")}
          </Link>
          <div className="flex items-start gap-3 mt-2">
            <span className={cn("text-2xl shrink-0", accent.text)}>{group.icon}</span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">{pick(group.label, group.labelEn)}</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {pick(group.description, group.descriptionEn)}
              </p>
            </div>
          </div>
        </div>

        {/* Previous record */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("exam.yourRecord")}</span>
            {ready && record?.passed && (
              <span className="text-xs px-2 py-0.5 rounded border bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                {t("exam.passed")}
              </span>
            )}
          </div>
          {ready && record && record.attempts > 0 ? (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span>
                <span className="text-zinc-500">{t("exam.best")}: </span>
                <span className="font-semibold">{record.bestPct}%</span>
              </span>
              <span>
                <span className="text-zinc-500">{t("exam.lastScore")}: </span>
                <span className="font-semibold">{record.lastPct}%</span>
                <span className="text-zinc-500"> ({record.lastCorrect}/{record.lastTotal})</span>
              </span>
              <span>
                <span className="text-zinc-500">{t("exam.attempts")}: </span>
                <span className="font-semibold">{record.attempts}</span>
              </span>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">{t("exam.neverTaken")}</p>
          )}
        </div>

        {/* Paper setup */}
        <div className="card space-y-5">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("exam.setupTitle")}</h2>

          <div className="space-y-2">
            <span className="text-xs text-zinc-500">{t("exam.count")}</span>
            <div className="flex flex-wrap gap-2">
              {EXAM_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm border transition-colors",
                    count === n
                      ? accent.badge
                      : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={timed}
                onChange={() => setTimed((on) => !on)}
                className="accent-blue-500 w-4 h-4 shrink-0"
              />
              <span className="text-sm">{t("exam.timer")}</span>
            </label>
            <p className="text-xs text-zinc-500">{t("exam.timerHint")}</p>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <div>
              <dt className="text-xs text-zinc-500">{t("exam.count")}</dt>
              <dd className="font-semibold">{count}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("exam.duration")}</dt>
              <dd className="font-semibold">{timed ? formatClock(examSeconds(count)) : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("exam.passMark")}</dt>
              <dd className="font-semibold">{PASS_PCT}%</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t("exam.coverage")}</dt>
              <dd className="font-semibold">{poolNote}</dd>
            </div>
          </dl>

          <p className="text-xs text-zinc-500">{t("exam.coverageHint")}</p>

          {loadError && (
            <p className="text-sm text-red-600 dark:text-red-400">{t("exam.poolTooSmall")}</p>
          )}

          <button onClick={startExam} disabled={building} className="btn-primary px-5 py-2.5 disabled:opacity-50">
            {building ? t("exam.building") : record?.attempts ? t("exam.retake") : t("exam.start")}
          </button>
        </div>
      </div>
    );
  }

  // ======================================================================
  // Running
  // ======================================================================
  if (phase === "running") {
    const current = localized[idx];
    const lowOnTime = timed && secondsLeft <= 60;

    return (
      <div className="max-w-3xl space-y-4">
        {/* Status bar. Sticky so the clock and Submit stay reachable on a long paper. */}
        <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-zinc-50/95 dark:bg-zinc-950/95 supports-[backdrop-filter]:backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-sm font-semibold">{pick(group.label, group.labelEn)}</span>
            {timed && (
              <span
                className={cn(
                  "text-sm font-mono tabular-nums px-2 py-0.5 rounded border",
                  lowOnTime
                    ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
                )}
                aria-live={lowOnTime ? "polite" : "off"}
              >
                ⏱ {formatClock(secondsLeft)}
              </span>
            )}
            <span className="text-xs text-zinc-500">
              {t("exam.answeredCount")}: {answeredCount}/{paper.length}
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={handleAbandon} className="btn-secondary text-xs px-3 py-1.5">
                {t("exam.abandon")}
              </button>
              <button onClick={handleSubmit} className="btn-primary text-sm px-4 py-1.5">
                {t("exam.submit")}
              </button>
            </div>
          </div>
        </div>

        {/* Question palette */}
        <div className="flex flex-wrap gap-1.5">
          {paper.map((_, i) => {
            const done = answers[i] !== undefined;

            return (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`${i + 1}`}
                className={cn(
                  "w-8 h-8 rounded-md text-xs font-medium border transition-colors relative",
                  i === idx && "ring-2 ring-blue-500",
                  done
                    ? "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200"
                    : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                )}
              >
                {i + 1}
                {flagged.has(i) && (
                  <span className="absolute -top-1 -right-1 text-[10px] text-amber-500" aria-hidden>
                    ●
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Current question */}
        <div className="card space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-xs font-mono text-zinc-500 mt-0.5 shrink-0">
              {idx + 1}/{paper.length}
            </span>
            {dual ? (
              <BilingualPair
                labels
                className="flex-1 min-w-0"
                en={<p className="font-medium leading-relaxed"><QuestionText text={enQs[idx].question} /></p>}
                vi={<p className="font-medium leading-relaxed"><QuestionText text={viQs[idx].question} /></p>}
              />
            ) : (
              <p className="flex-1 min-w-0 font-medium leading-relaxed"><QuestionText text={current.question} /></p>
            )}
          </div>

          <div className="space-y-2">
            {current.options.map((opt, i) => {
              const selected = answers[idx] === i;

              return (
                <button
                  key={i}
                  onClick={() => select(i)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors text-sm",
                    selected
                      ? "bg-blue-50 dark:bg-blue-900/50 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-100"
                      : "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                      selected ? "bg-blue-600 border-blue-500 text-white" : "border-zinc-400 dark:border-zinc-600 text-zinc-500"
                    )}
                  >
                    {OPTION_LABELS[i]}
                  </span>
                  {dual ? (
                    <BilingualPair
                      className="flex-1 gap-y-1"
                      en={<span>{enQs[idx].options[i]}</span>}
                      vi={<span className="text-zinc-600 dark:text-zinc-400">{viQs[idx].options[i]}</span>}
                    />
                  ) : (
                    <span><QuestionText text={opt} /></span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex gap-2">
              <button
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
              >
                {t("quiz.prev")}
              </button>
              <button
                onClick={() => setIdx((i) => Math.min(paper.length - 1, i + 1))}
                disabled={idx === paper.length - 1}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
              >
                {t("quiz.next")}
              </button>
            </div>
            <button
              onClick={toggleFlag}
              aria-pressed={flagged.has(idx)}
              className={cn(
                "text-sm px-3 py-1.5 rounded-lg border transition-colors",
                flagged.has(idx)
                  ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                  : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
            >
              ● {flagged.has(idx) ? t("exam.flagged") : t("exam.flag")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======================================================================
  // Results
  // ======================================================================
  const breakdown = topicBreakdown(paper.map((q) => q.slug), correctFlags);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/exam" className="text-sm text-blue-600 dark:text-blue-400 py-2 -my-2 inline-block">
        {t("exam.backToTracks")}
      </Link>

      {ranOutOfTime && (
        <p className="card bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-200">
          {t("exam.timeUpNotice")}
        </p>
      )}

      {/* Verdict */}
      <div
        className={cn(
          "card border-l-4",
          passed ? "border-l-green-500" : "border-l-red-500"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div
              className={cn(
                "text-xs font-bold tracking-wider",
                passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
              )}
            >
              {passed ? t("exam.resultPass") : t("exam.resultFail")}
            </div>
            <div className="text-4xl font-bold mt-1">{scorePct}%</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
              {correctCount}/{paper.length} {t("quiz.correct")} · {t("exam.timeUsed")} {formatClock(elapsed)}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              {passed
                ? t("exam.resultPassNote")
                : t("exam.resultFailNote").replace("{n}", String(PASS_PCT))}
            </p>
          </div>
          <button onClick={() => setPhase("setup")} className="btn-secondary text-sm shrink-0">
            {t("exam.newPaper")}
          </button>
        </div>
      </div>

      {/* Score by topic — the part that says where to go back to */}
      <div className="card space-y-3">
        <div>
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("exam.byTopic")}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{t("exam.byTopicHint")}</p>
        </div>
        <div className="space-y-1.5">
          {breakdown.map((row) => (
            <Link
              key={row.slug}
              href={`/knowledge/${row.slug}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 rounded-lg text-sm bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <span className="flex-1 min-w-0 basis-full sm:basis-auto truncate">{titleOf(row.slug)}</span>
              <div className="h-1.5 w-20 rounded-full bg-zinc-300 dark:bg-zinc-700 overflow-hidden shrink-0">
                <div
                  className={cn("h-full rounded-full", row.pct >= PASS_PCT ? "bg-green-500" : "bg-red-500")}
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <span className="text-xs text-zinc-500 tabular-nums shrink-0 w-16 text-right">
                {row.correct}/{row.total}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Full answer review */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("exam.reviewAnswers")}</h2>

        {localized.map((q, i) => {
          const chosen = answers[i];
          const isCorrect = chosen === q.answer;
          const skipped = chosen === undefined;
          const hasRationale = Boolean(enQs[i].optionExplanations || viQs[i].optionExplanations);

          return (
            <div
              key={`${q.id}-${i}`}
              className={cn(
                "card border-l-4",
                isCorrect ? "border-l-green-500" : skipped ? "border-l-zinc-400 dark:border-l-zinc-600" : "border-l-red-500"
              )}
            >
              <div className="flex items-start gap-2 mb-2">
                <span
                  className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded shrink-0",
                    isCorrect
                      ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                      : skipped
                        ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                        : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                  )}
                >
                  {isCorrect ? "✓" : skipped ? "—" : "✗"}
                </span>
                {dual ? (
                  <BilingualPair
                    className="flex-1"
                    en={
                      <p className="text-sm font-medium">
                        <span className="text-zinc-500 mr-1">{i + 1}.</span> <QuestionText text={enQs[i].question} />
                      </p>
                    }
                    vi={<p className="text-sm font-medium"><QuestionText text={viQs[i].question} /></p>}
                  />
                ) : (
                  <p className="text-sm font-medium">
                    <span className="text-zinc-500 mr-1">{i + 1}.</span> <QuestionText text={q.question} />
                  </p>
                )}
              </div>

              <Link
                href={`/knowledge/${paper[i].slug}`}
                className="inline-block text-xs text-blue-600 dark:text-blue-400 mb-3 py-2 -my-1"
              >
                {titleOf(paper[i].slug)} →
              </Link>

              {hasRationale && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600 mb-1.5">
                  {t("quiz.breakdown")}
                </p>
              )}

              <div className="space-y-1.5 mb-3">
                {q.options.map((opt, oi) => {
                  const isCorrectOpt = oi === q.answer;
                  const isUserOpt = oi === chosen;

                  return (
                    <div
                      key={oi}
                      className={cn(
                        "flex items-start gap-2 px-3 py-2 rounded-lg text-xs",
                        isCorrectOpt
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                          : isUserOpt
                            ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                            : "text-zinc-500"
                      )}
                    >
                      <span className="font-bold shrink-0">{OPTION_LABELS[oi]}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            {dual ? (
                              <BilingualPair
                                className="gap-y-0.5"
                                divider={false}
                                en={<span>{enQs[i].options[oi]}</span>}
                                vi={<span className="opacity-80">{viQs[i].options[oi]}</span>}
                              />
                            ) : (
                              <span><QuestionText text={opt} /></span>
                            )}
                          </div>
                          {isCorrectOpt && <span className="shrink-0">{t("quiz.correctLabel")}</span>}
                          {isUserOpt && !isCorrectOpt && <span className="shrink-0">{t("quiz.yourAnswer")}</span>}
                        </div>
                        <OptionRationale
                          correct={isCorrectOpt}
                          en={enQs[i].optionExplanations?.[oi]}
                          vi={viQs[i].optionExplanations?.[oi]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {(q.explanation || (dual && (enQs[i].explanation || viQs[i].explanation))) && (
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {dual ? (
                    <BilingualPair
                      en={
                        <>
                          <span className="text-zinc-500 font-medium">{t("quiz.explanation")}</span>
                          <QuestionText text={enQs[i].explanation} />
                        </>
                      }
                      vi={
                        <>
                          <span className="text-zinc-500 font-medium">{t("quiz.explanation")}</span>
                          <QuestionText text={viQs[i].explanation} />
                        </>
                      }
                    />
                  ) : (
                    <>
                      <span className="text-zinc-500 font-medium">{t("quiz.explanation")}</span>
                      <QuestionText text={q.explanation} />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
