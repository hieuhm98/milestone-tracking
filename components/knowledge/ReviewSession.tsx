"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import BilingualPair from "@/components/BilingualPair";
import OptionRationale from "@/components/knowledge/OptionRationale";
import { recordReview } from "@/lib/progress";
import { DEFAULT_GROUP } from "@/lib/groups";
import { questionKey } from "@/lib/lessons";
import { pickSession, type QuestionIndex } from "@/lib/review";
import { cn } from "@/lib/utils";
import { type Question, localizeQuestion } from "./QuizBlock";
import QuestionText from "./QuestionText";
import ReviewSetup, { type ReviewTopic, type SessionRequest } from "./ReviewSetup";

const QUICK_COUNT = 5;

type SessionQuestion = Question & { topic_slug: string };

type AnswerMap = Record<number, number | null>;

export default function ReviewSession() {
  const { t, lang, dual } = useLang();
  const { progress, update } = useProgress();
  const [topics, setTopics] = useState<ReviewTopic[]>([]);
  const [index, setIndex] = useState<QuestionIndex>({});
  const [sessionQ, setSessionQ] = useState<SessionQuestion[]>([]);
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [autoQuick, setAutoQuick] = useState(false);

  // Load topics + the question index; detect ?quick=1 (without useSearchParams, to avoid Suspense).
  useEffect(() => {
    const quick = new URLSearchParams(window.location.search).get("quick") === "1";
    setAutoQuick(quick);

    Promise.all([
      fetch("/api/knowledge").then((r) => r.json() as Promise<ReviewTopic[]>),
      fetch("/api/review").then((r) => r.json() as Promise<{ topics: QuestionIndex }>),
    ])
      .then(([data, idx]) => {
        setTopics(data);
        setIndex(idx.topics ?? {});
      })
      .finally(() => setLoading(false));
  }, []);

  // Draw the keys locally (the index carries answer indices, so past mistakes
  // can be found), then fetch only those questions.
  async function buildSession({ slugs, mode, count }: SessionRequest) {
    setBuilding(true);

    const keys = pickSession(index, slugs, progress, mode, count);
    let questions: SessionQuestion[] = [];

    if (keys.length > 0) {
      try {
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys }),
        });

        if (res.ok) questions = ((await res.json()) as { questions: SessionQuestion[] }).questions ?? [];
      } catch {
        questions = [];
      }
    }

    setSessionQ(questions);
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
      buildSession({ slugs: topics.map((tp) => tp.slug), mode: "smart", count: QUICK_COUNT });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoQuick, loading, topics]);

  const optionLabels = ["A", "B", "C", "D", "E"];
  const localized = sessionQ.map((q) => localizeQuestion(q, lang));
  // Display-only alternates for side-by-side mode; `answer` is a shared index.
  const enQs = sessionQ.map((q) => localizeQuestion(q, "en"));
  const viQs = sessionQ.map((q) => localizeQuestion(q, "vi"));
  const correctCount = localized.filter((q, i) => answers[i] === q.answer).length;

  // Finishing a session is what the progress store logs — it feeds the daily
  // streak and the review accuracy on /progress.
  function finishSession() {
    setShowResults(true);

    if (sessionQ.length === 0) return;

    const groups = Array.from(
      new Set(sessionQ.map((q) => topics.find((tp) => tp.slug === q.topic_slug)?.group ?? DEFAULT_GROUP))
    );

    // Answered questions also feed per-question recall, which drives the
    // "smart mix" and "questions I've missed" modes next time.
    const answered = sessionQ.flatMap((q, i) =>
      answers[i] === undefined || answers[i] === null
        ? []
        : [{ key: questionKey(q.topic_slug, q.id), correct: answers[i] === localized[i].answer }]
    );

    update((prev) => recordReview(prev, { total: sessionQ.length, correct: correctCount, groups }, answered));
  }

  if (loading || building) return <div className="text-zinc-500 text-sm">{t("common.loading")}</div>;

  // ---- Setup screen ----
  if (!started) return <ReviewSetup topics={topics} index={index} onStart={buildSession} />;

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
