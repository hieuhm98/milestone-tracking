"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import BilingualPair from "@/components/BilingualPair";
import OptionRationale from "@/components/knowledge/OptionRationale";
import { clearTopic, recordQuiz } from "@/lib/progress";
import { type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import QuestionText from "./QuestionText";

export interface Question {
  id: string;
  question: string;
  questionEn?: string;
  options: string[];
  optionsEn?: string[];
  answer: number;
  explanation?: string;
  explanationEn?: string;
  /**
   * One rationale per option, aligned index-for-index with `options`: why the
   * key is right, and why each distractor is wrong. Optional — questions
   * written before this existed fall back to the single `explanation`.
   */
  optionExplanations?: string[];
  optionExplanationsEn?: string[];
}

/** Pick the localized rationale array, but only when it lines up with the options. */
function pickOptionExplanations(q: Question, en: boolean): string[] | undefined {
  const preferred = en ? q.optionExplanationsEn : q.optionExplanations;
  const fallback = en ? q.optionExplanations : q.optionExplanationsEn;
  const chosen = preferred ?? fallback;

  if (!Array.isArray(chosen) || chosen.length !== q.options.length) return undefined;

  return chosen;
}

/** Resolve a bilingual question to plain strings for the active language. */
export function localizeQuestion(q: Question, lang: Lang) {
  const en = lang === "en";
  const options =
    en && q.optionsEn && q.optionsEn.length === q.options.length ? q.optionsEn : q.options;

  return {
    id: q.id,
    answer: q.answer,
    question: en ? q.questionEn || q.question : q.question,
    options,
    explanation: en ? q.explanationEn || q.explanation : q.explanation,
    optionExplanations: pickOptionExplanations(q, en),
  };
}

interface Props {
  questions: Question[];
  title?: string;
  /** Topic slug — when given, answers are saved to the progress store. */
  slug?: string;
}

type AnswerMap = Record<string, number | null>;

export default function QuizBlock({ questions, title, slug }: Props) {
  const { lang, t, dual } = useLang();
  const { progress, ready, update } = useProgress();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [showResults, setShowResults] = useState(false);
  const [restored, setRestored] = useState(false);
  const hydratedFor = useRef<string | null>(null);

  // Restore saved answers once, as soon as stored progress is reconciled.
  useEffect(() => {
    if (!slug || !ready || hydratedFor.current === slug) return;

    hydratedFor.current = slug;
    const saved = progress.topics[slug]?.answers;

    if (saved && Object.keys(saved).length > 0) {
      setAnswers(saved);
      setRestored(true);
    }
  }, [slug, ready, progress]);

  const persist = useCallback(
    (next: AnswerMap, attempted: boolean) => {
      if (!slug) return;

      const saved: Record<string, number> = {};

      questions.forEach((q) => {
        const choice = next[q.id];

        if (typeof choice === "number") saved[q.id] = choice;
      });

      const correct = questions.filter((q) => saved[q.id] === q.answer).length;

      update((prev) =>
        recordQuiz(prev, slug, { answers: saved, correct, total: questions.length, attempted })
      );
    },
    [slug, questions, update]
  );

  const bestPct = slug ? progress.topics[slug]?.bestPct ?? 0 : 0;
  const attempts = slug ? progress.topics[slug]?.attempts ?? 0 : 0;

  if (questions.length === 0) {
    return (
      <div className="mt-10 border-t border-zinc-300 dark:border-zinc-700 pt-8 text-sm text-zinc-500">
        {t("quiz.empty")}
      </div>
    );
  }

  const localized = questions.map((q) => localizeQuestion(q, lang));
  // `answer` is a shared index across languages, so these are display-only.
  // Column order is fixed (EN left, VI right) regardless of the active language.
  const enQs = questions.map((q) => localizeQuestion(q, "en"));
  const viQs = questions.map((q) => localizeQuestion(q, "vi"));
  const currentQ = localized[currentIdx];
  // Per-question: does it carry the per-option breakdown, in either language?
  const hasRationale = questions.map(
    (_, i) => Boolean(enQs[i].optionExplanations || viQs[i].optionExplanations)
  );
  const totalAnswered = Object.values(answers).filter((v) => v !== null && v !== undefined).length;
  const correctCount = localized.filter((q) => answers[q.id] === q.answer).length;

  function handleSelect(qId: string, optionIdx: number) {
    if (showResults) return;

    const next = { ...answers, [qId]: optionIdx };

    setAnswers(next);
    setRestored(false);
    persist(next, false);
  }

  function handleViewResults() {
    setShowResults(true);
    persist(answers, true);
  }

  function handleReset() {
    setAnswers({});
    setShowResults(false);
    setCurrentIdx(0);
    setRestored(false);

    // Keep the best score and attempt count; only the answers are cleared.
    if (slug) update((prev) => clearTopic(prev, slug));
  }

  const optionLabels = ["A", "B", "C", "D", "E"];

  return (
    <div className="mt-10 border-t border-zinc-300 dark:border-zinc-700 pt-8">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title ?? t("quiz.title")}</h2>
        <span className="text-xs text-zinc-500 shrink-0">{questions.length} {t("quiz.questions")}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6 min-h-[1.25rem]">
        {attempts > 0 && (
          <span className="text-xs px-2 py-0.5 rounded border bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
            {t("progress.best")}: {bestPct}%
          </span>
        )}
        {restored && (
          <span className="text-xs text-zinc-500">↩ {t("progress.restored")}</span>
        )}
      </div>

      {/* Question palette */}
      <div className="flex flex-wrap gap-2 mb-6">
        {localized.map((q, i) => {
          const answered = answers[q.id] !== undefined && answers[q.id] !== null;
          const isCorrect = showResults && answers[q.id] === q.answer;
          const isWrong = showResults && answered && answers[q.id] !== q.answer;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(i)}
              className={cn(
                "w-9 h-9 rounded-lg text-sm font-medium transition-colors border",
                i === currentIdx && "ring-2 ring-blue-500",
                isCorrect && "bg-green-100 dark:bg-green-800 border-green-400 dark:border-green-600 text-green-800 dark:text-green-200",
                isWrong && "bg-red-100 dark:bg-red-900 border-red-400 dark:border-red-700 text-red-800 dark:text-red-200",
                answered && !showResults && "bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200",
                !answered && "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700"
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Current question */}
      {!showResults && (
        <div className="card space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-xs font-mono text-zinc-500 mt-0.5 shrink-0">
              {currentIdx + 1}/{localized.length}
            </span>
            {dual ? (
              <BilingualPair
                labels
                className="flex-1 min-w-0"
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
              <p className="flex-1 min-w-0 text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed">
                <QuestionText text={currentQ.question} />
              </p>
            )}
          </div>

          <div className="space-y-2">
            {currentQ.options.map((opt, i) => {
              const selected = answers[currentQ.id] === i;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(currentQ.id, i)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors text-sm",
                    selected
                      ? "bg-blue-50 dark:bg-blue-900/50 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-100"
                      : "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                    selected ? "bg-blue-600 border-blue-500 text-white" : "border-zinc-400 dark:border-zinc-600 text-zinc-500"
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
                    <span><QuestionText text={opt} /></span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
              >
                {t("quiz.prev")}
              </button>
              <button
                onClick={() => setCurrentIdx((i) => Math.min(localized.length - 1, i + 1))}
                disabled={currentIdx === localized.length - 1}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
              >
                {t("quiz.next")}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">{t("quiz.answered")}: {totalAnswered}/{localized.length}</span>
              <button
                onClick={handleViewResults}
                className="btn-primary text-sm px-4 py-1.5"
              >
                {t("quiz.viewResults")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-4">
          <div className="card bg-zinc-100 dark:bg-zinc-800/80">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {correctCount}/{localized.length}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                  {Math.round((correctCount / localized.length) * 100)}% {t("quiz.correct")}
                </div>
              </div>
              <button onClick={handleReset} className="btn-secondary text-sm">
                {t("quiz.retry")}
              </button>
            </div>
          </div>

          {localized.map((q, i) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.answer;
            const skipped = userAnswer === undefined || userAnswer === null;

            return (
              <div key={q.id} className={cn(
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
                          <span className="text-zinc-500 mr-1">{i + 1}.</span> <QuestionText text={enQs[i].question} />
                        </p>
                      }
                      vi={
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200"><QuestionText text={viQs[i].question} /></p>
                      }
                    />
                  ) : (
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      <span className="text-zinc-500 mr-1">{i + 1}.</span> <QuestionText text={q.question} />
                    </p>
                  )}
                </div>

                {hasRationale[i] && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600 mb-1.5">
                    {t("quiz.breakdown")}
                  </p>
                )}

                <div className="space-y-1.5 mb-3">
                  {q.options.map((opt, oi) => {
                    const isCorrectOpt = oi === q.answer;
                    const isUserOpt = oi === userAnswer;

                    return (
                      <div key={oi} className={cn(
                        "flex items-start gap-2 px-3 py-2 rounded-lg text-xs",
                        isCorrectOpt ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" :
                        isUserOpt && !isCorrectOpt ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" :
                        "text-zinc-500"
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
      )}
    </div>
  );
}
