"use client";

import { useState } from "react";
import { useLang } from "@/context/lang";
import BilingualPair from "@/components/BilingualPair";
import OptionRationale from "@/components/knowledge/OptionRationale";
import { localizeQuestion, type Question } from "@/components/knowledge/QuizBlock";
import { type AnsweredQuestion } from "@/lib/progress";
import { cn } from "@/lib/utils";
import QuestionText from "@/components/knowledge/QuestionText";

/** A question plus where it came from, so recall can be keyed per question. */
export interface TestQuestion extends Question {
  slug: string;
  key: string;
  /** True when the question comes from an earlier mini-lesson. */
  review?: boolean;
}

interface Props {
  questions: TestQuestion[];
  heading: string;
  blurb: string;
  ctaLabel: string;
  onFinish: (answered: AnsweredQuestion[], pct: number) => void;
}

/**
 * One micro-test: a handful of questions, one at a time, with immediate
 * feedback. Feedback is immediate on purpose — in a five-minute session the
 * explanation is the teaching, so deferring it to a results screen wastes it.
 */
export default function LessonTest({ questions, heading, blurb, ctaLabel, onFinish }: Props) {
  const { t, lang, pick, dual } = useLang();
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);

  const optionLabels = ["A", "B", "C", "D", "E"];
  const current = questions[idx];
  const q = localizeQuestion(current, lang);
  // The answer index is shared across languages, so either localization works
  // for grading — dual mode only changes what is displayed.
  const qEn = localizeQuestion(current, "en");
  const qVi = localizeQuestion(current, "vi");
  const revealed = choice !== null;
  const isLast = idx === questions.length - 1;
  const correctSoFar = answered.filter((a) => a.correct).length;

  function handleSelect(option: number) {
    if (revealed) return;

    setChoice(option);
    setAnswered((prev) => [...prev, { key: current.key, correct: option === q.answer }]);
  }

  function handleNext() {
    if (!isLast) {
      setIdx((i) => i + 1);
      setChoice(null);

      return;
    }

    const pct = questions.length > 0 ? Math.round((correctSoFar / questions.length) * 100) : 0;

    onFinish(answered, pct);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{heading}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">{blurb}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${((idx + (revealed ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-zinc-500 font-mono shrink-0">
          {idx + 1}/{questions.length}
        </span>
      </div>

      <div className="card space-y-4">
        {current.review && (
          <span className="inline-block text-xs px-2 py-0.5 rounded border bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
            ↻ {pick("Ôn lại bài trước", "Review from earlier")}
          </span>
        )}

        {dual ? (
          <BilingualPair
            labels
            en={<p className="text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed"><QuestionText text={qEn.question} /></p>}
            vi={<p className="text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed"><QuestionText text={qVi.question} /></p>}
          />
        ) : (
          <p className="text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed"><QuestionText text={q.question} /></p>
        )}

        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.answer;
            const isChosen = i === choice;

            return (
              <div key={i}>
                <button
                  onClick={() => handleSelect(i)}
                  disabled={revealed}
                  className={cn(
                    "w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border text-sm transition-colors",
                    revealed && isCorrect &&
                      "bg-green-50 dark:bg-green-900/40 border-green-400 dark:border-green-700 text-green-800 dark:text-green-200",
                    revealed && isChosen && !isCorrect &&
                      "bg-red-50 dark:bg-red-900/40 border-red-400 dark:border-red-700 text-red-800 dark:text-red-200",
                    revealed && !isCorrect && !isChosen &&
                      "bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-500",
                    !revealed &&
                      "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
                      revealed && isCorrect
                        ? "bg-green-600 border-green-500 text-white"
                        : revealed && isChosen
                          ? "bg-red-600 border-red-500 text-white"
                          : "border-zinc-400 dark:border-zinc-600 text-zinc-500"
                    )}
                  >
                    {optionLabels[i]}
                  </span>
                  {dual ? (
                    <BilingualPair
                      className="flex-1 gap-y-1"
                      en={<span>{qEn.options[i]}</span>}
                      vi={<span className="text-zinc-600 dark:text-zinc-400">{qVi.options[i]}</span>}
                    />
                  ) : (
                    <span><QuestionText text={opt} /></span>
                  )}
                </button>

                {/* Outside the button: a <div> is not valid inside one, and the
                    rationale must stay readable after the button is disabled. */}
                {revealed && (
                  <OptionRationale
                    correct={isCorrect}
                    en={qEn.optionExplanations?.[i]}
                    vi={qVi.optionExplanations?.[i]}
                    className="pl-[3.25rem] pr-4 mt-1 mb-1"
                  />
                )}
              </div>
            );
          })}
        </div>

        {revealed && (qEn.explanation || qVi.explanation) && (
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {dual ? (
              <BilingualPair
                en={
                  <>
                    <span className="text-zinc-500 font-medium">{t("quiz.explanation")}</span>
                    <QuestionText text={qEn.explanation} />
                  </>
                }
                vi={
                  <>
                    <span className="text-zinc-500 font-medium">{t("quiz.explanation")}</span>
                    <QuestionText text={qVi.explanation} />
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

        {revealed && (
          <button onClick={handleNext} className="btn-primary text-sm px-4 py-2 w-full sm:w-auto">
            {isLast ? ctaLabel : t("quiz.next")}
          </button>
        )}
      </div>
    </div>
  );
}
