"use client";

import { useState, useEffect, useMemo } from "react";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import BilingualPair from "@/components/BilingualPair";
import OptionRationale from "@/components/knowledge/OptionRationale";
import { recordReview } from "@/lib/progress";
import { GROUPS, DEFAULT_GROUP, GROUP_ACCENT } from "@/lib/groups";
import { cn } from "@/lib/utils";
import { type Question, localizeQuestion } from "./QuizBlock";
import QuestionText from "./QuestionText";

interface StaticTopic {
  slug: string;
  group: string;
  title: string;
  titleEn?: string;
  description?: string;
}

type SessionQuestion = Question & { topic_slug: string };

const COUNTS = [5, 10, 20, 50, 0] as const;
const QUICK_COUNT = 5;

type AnswerMap = Record<number, number | null>;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ReviewSession() {
  const { t, pick, lang, dual } = useLang();
  const { update } = useProgress();
  const [topics, setTopics] = useState<StaticTopic[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [count, setCount] = useState<number>(10);
  const [sessionQ, setSessionQ] = useState<SessionQuestion[]>([]);
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [autoQuick, setAutoQuick] = useState(false);

  // Load topics + detect ?quick=1 (without useSearchParams, to avoid Suspense).
  useEffect(() => {
    const quick =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("quick") === "1";
    setAutoQuick(quick);

    fetch("/api/knowledge")
      .then((r) => r.json())
      .then((data: StaticTopic[]) => {
        setTopics(data);
        setSelectedGroups(new Set(GROUPS.map((g) => g.id)));
        setSelected(new Set(data.map((tp) => tp.slug)));
        setLoading(false);
      });
  }, []);

  // Groups that actually have topics.
  const activeGroups = useMemo(
    () => GROUPS.filter((g) => topics.some((tp) => (tp.group ?? DEFAULT_GROUP) === g.id)),
    [topics]
  );

  // Topics visible given the selected groups.
  const visibleTopics = useMemo(
    () => topics.filter((tp) => selectedGroups.has(tp.group ?? DEFAULT_GROUP)),
    [topics, selectedGroups]
  );

  async function buildSession(slugs: string[], n: number) {
    setBuilding(true);
    const staticQs: SessionQuestion[] = [];
    await Promise.all(
      slugs.map(async (slug) => {
        const res = await fetch(`/api/knowledge/${slug}`);
        if (!res.ok) return;
        const data = await res.json();
        (data.questions ?? []).forEach((q: Question) => staticQs.push({ ...q, topic_slug: slug }));
      })
    );

    const combined = shuffle(staticQs);
    const final = n === 0 ? combined : combined.slice(0, n);
    setSessionQ(final);
    setAnswers({});
    setCurrentIdx(0);
    setShowResults(false);
    setStarted(true);
    setBuilding(false);
  }

  // Auto-start the quick test when arriving via ?quick=1.
  useEffect(() => {
    if (autoQuick && !loading && !started && topics.length > 0) {
      setAutoQuick(false);
      buildSession(topics.map((tp) => tp.slug), QUICK_COUNT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoQuick, loading, topics]);

  function handleStart() {
    buildSession(Array.from(selected).filter((s) => visibleTopics.some((tp) => tp.slug === s)), count);
  }

  function toggleGroup(id: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTopic(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }

  function toggleAll() {
    const visibleSlugs = visibleTopics.map((tp) => tp.slug);
    const allSelected = visibleSlugs.every((s) => selected.has(s));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) visibleSlugs.forEach((s) => next.delete(s));
      else visibleSlugs.forEach((s) => next.add(s));
      return next;
    });
  }

  const optionLabels = ["A", "B", "C", "D", "E"];
  const localized = sessionQ.map((q) => localizeQuestion(q, lang));
  // Display-only alternates for side-by-side mode; `answer` is a shared index.
  const enQs = sessionQ.map((q) => localizeQuestion(q, "en"));
  const viQs = sessionQ.map((q) => localizeQuestion(q, "vi"));
  const correctCount = localized.filter((q, i) => answers[i] === q.answer).length;
  const selectedVisibleCount = visibleTopics.filter((tp) => selected.has(tp.slug)).length;

  // Finishing a session is what the progress store logs — it feeds the daily
  // streak and the review accuracy on /progress.
  function finishSession() {
    setShowResults(true);

    if (sessionQ.length === 0) return;

    const groups = Array.from(
      new Set(sessionQ.map((q) => topics.find((tp) => tp.slug === q.topic_slug)?.group ?? DEFAULT_GROUP))
    );

    update((prev) => recordReview(prev, { total: sessionQ.length, correct: correctCount, groups }));
  }

  if (loading || building) return <div className="text-zinc-500 text-sm">{t("common.loading")}</div>;

  // ---- Setup screen ----
  if (!started) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("review.title")}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">{t("review.subtitle")}</p>
        </div>

        {/* Daily Quick Test */}
        <div className="card bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h2 className="font-semibold text-blue-800 dark:text-blue-200">{t("review.quickTitle")}</h2>
            </div>
            <p className="text-xs text-blue-600/80 dark:text-blue-300/70 mt-1">{t("review.quickSubtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => buildSession(topics.map((tp) => tp.slug), QUICK_COUNT)}
              className="btn-primary text-sm px-4 py-2"
            >
              {t("review.quickStart")}
            </button>
            {activeGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => buildSession(topics.filter((tp) => (tp.group ?? DEFAULT_GROUP) === g.id).map((tp) => tp.slug), QUICK_COUNT)}
                className="btn-secondary text-sm px-3 py-2"
              >
                {g.icon} {pick(g.label, g.labelEn)}
              </button>
            ))}
          </div>
        </div>

        {/* Track filter */}
        {activeGroups.length > 1 && (
          <div className="card space-y-3">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("review.groups")}</span>
            <div className="flex flex-wrap gap-2">
              {activeGroups.map((g) => {
                const on = selectedGroups.has(g.id);
                const accent = GROUP_ACCENT[g.accent];
                return (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                      on ? accent.badge : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    )}
                  >
                    {g.icon} {pick(g.label, g.labelEn)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Topic selection */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t("review.topics")} ({selectedVisibleCount}/{visibleTopics.length})
            </span>
            <button onClick={toggleAll} className="shrink-0 py-1.5 -my-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
              {visibleTopics.every((tp) => selected.has(tp.slug)) ? t("review.deselectAll") : t("review.selectAll")}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {visibleTopics.map((tp) => (
              <label key={tp.slug} className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors text-sm",
                selected.has(tp.slug)
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200"
                  : "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600"
              )}>
                <input
                  type="checkbox"
                  checked={selected.has(tp.slug)}
                  onChange={() => toggleTopic(tp.slug)}
                  className="accent-blue-500 w-4 h-4 shrink-0"
                />
                <span className="truncate">{pick(tp.title, tp.titleEn)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Count */}
        <div className="card space-y-3">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("review.numQuestions")}</span>
          <div className="flex gap-2">
            {COUNTS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm border transition-colors",
                  count === c
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                )}
              >
                {c === 0 ? t("review.all") : c}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={selectedVisibleCount === 0}
          className="btn-primary disabled:opacity-50"
        >
          {t("review.start")}
        </button>
      </div>
    );
  }

  // ---- Results screen ----
  if (showResults) {
    return (
      <div className={cn("space-y-6", dual ? "max-w-5xl" : "max-w-2xl")}>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{correctCount}/{localized.length}</div>
              <div className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
                {localized.length > 0 ? Math.round((correctCount / localized.length) * 100) : 0}% {t("quiz.correct")}
              </div>
            </div>
            <button onClick={() => setStarted(false)} className="btn-secondary">
              {t("review.reviewAgain")}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {localized.map((q, i) => {
            const userAnswer = answers[i];
            const isCorrect = userAnswer === q.answer;
            const skipped = userAnswer === undefined || userAnswer === null;
            return (
              <div key={`${q.id}-${i}`} className={cn(
                "card border-l-4",
                isCorrect ? "border-l-green-500" : skipped ? "border-l-zinc-400 dark:border-l-zinc-600" : "border-l-red-500"
              )}>
                <div className="flex items-start gap-2 mb-3">
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded shrink-0",
                    isCorrect ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" : skipped ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400" : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                  )}>
                    {isCorrect ? "✓" : skipped ? "—" : "✗"}
                  </span>
                  {dual ? (
                    <BilingualPair
                      className="flex-1"
                      en={
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          <span className="text-zinc-500 mr-1">{i + 1}.</span><QuestionText text={enQs[i].question} />
                        </p>
                      }
                      vi={<p className="text-sm font-medium text-zinc-800 dark:text-zinc-200"><QuestionText text={viQs[i].question} /></p>}
                    />
                  ) : (
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      <span className="text-zinc-500 mr-1">{i + 1}.</span><QuestionText text={q.question} />
                    </p>
                  )}
                </div>
                {(enQs[i].optionExplanations || viQs[i].optionExplanations) && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600 mb-1.5">
                    {t("quiz.breakdown")}
                  </p>
                )}

                <div className="space-y-1 mb-3">
                  {q.options.map((opt, oi) => {
                    const isCorrectOpt = oi === q.answer;
                    const isUserOpt = oi === userAnswer;

                    return (
                      <div key={oi} className={cn(
                        "flex items-start gap-2 px-3 py-1.5 rounded text-xs",
                        isCorrectOpt ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" :
                        isUserOpt ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" : "text-zinc-500"
                      )}>
                        <span className="font-bold shrink-0">{optionLabels[oi]}.</span>
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
                            {isCorrectOpt && <span className="shrink-0">✓</span>}
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
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
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

  // ---- Question screen ----
  if (localized.length === 0) {
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-zinc-600 dark:text-zinc-400 text-sm">{t("review.noQuestions")}</p>
        <button onClick={() => setStarted(false)} className="btn-secondary text-sm">{t("review.exit")}</button>
      </div>
    );
  }

  const currentQ = localized[currentIdx];
  return (
    <div className={cn("space-y-4", dual ? "max-w-5xl" : "max-w-2xl")}>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("review.title")}</h1>
        <button onClick={() => setStarted(false)} className="inline-block py-2 -my-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">{t("review.exit")}</button>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{t("review.question")} {currentIdx + 1}/{localized.length}</span>
          <span>{t("review.answered")}: {Object.keys(answers).length}</span>
        </div>
        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${((currentIdx + 1) / localized.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Palette */}
      <div className="flex flex-wrap gap-1.5">
        {localized.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIdx(i)}
            className={cn(
              "w-8 h-8 rounded text-xs font-medium border transition-colors",
              i === currentIdx && "ring-2 ring-blue-500",
              answers[i] !== undefined ? "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question */}
      <div className="card space-y-4">
        {dual ? (
          <BilingualPair
            labels
            en={
              <p className="text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed">
                <QuestionText text={enQs[currentIdx].question} />
              </p>
            }
            vi={
              <p className="text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed">
                <QuestionText text={viQs[currentIdx].question} />
              </p>
            }
          />
        ) : (
          <p className="text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed"><QuestionText text={currentQ.question} /></p>
        )}
        <div className="space-y-2">
          {currentQ.options.map((opt, i) => {
            const isSel = answers[currentIdx] === i;
            return (
              <button
                key={i}
                onClick={() => setAnswers((prev) => ({ ...prev, [currentIdx]: i }))}
                className={cn(
                  "w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border text-sm transition-colors",
                  isSel
                    ? "bg-blue-50 dark:bg-blue-900/50 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-100"
                    : "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                )}
              >
                <span className={cn(
                  "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0",
                  isSel ? "bg-blue-600 border-blue-500 text-white" : "border-zinc-400 dark:border-zinc-600 text-zinc-500"
                )}>
                  {optionLabels[i]}
                </span>
                {dual ? (
                  <BilingualPair
                    className="flex-1 gap-y-1"
                    en={<span>{enQs[currentIdx].options[i]}</span>}
                    vi={<span className="text-zinc-600 dark:text-zinc-400">{viQs[currentIdx].options[i]}</span>}
                  />
                ) : (
                  opt
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-2">
            <button onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40">{t("quiz.prev")}</button>
            <button onClick={() => setCurrentIdx((i) => Math.min(localized.length - 1, i + 1))} disabled={currentIdx === localized.length - 1} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40">{t("quiz.next")}</button>
          </div>
          <button onClick={finishSession} className="btn-primary text-sm px-4 py-1.5">{t("quiz.viewResults")}</button>
        </div>
      </div>
    </div>
  );
}
