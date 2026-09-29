"use client";

// SELF CHECK — the four exercise types of the content spec §2.2, each with
// instant per-item feedback. The rows are exported on their own because the
// Part review pages mix choose-one and find-and-fix items in one list.

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type {
  ChoiceItem,
  CombineItem,
  FixItem,
  FormItem,
  SelfCheck as SelfCheckData,
  SelfCheckItem,
} from "@/lib/grammar/types";
import Feedback, { ScoreLine } from "./Feedback";
import Rich, { matchesAnswer } from "./text";
import { isChoice, isFix, isForm, isGraded } from "./scoring";
import { SELF_CHECK, type PartTokens } from "./tokens";

export const selfCheckKey = (id: string) => `sc-${id}`;

export { isChoice, isCombine, isFix, isForm, isGraded } from "./scoring";

export interface RowProps {
  item: SelfCheckItem;
  index: number;
  tokens: PartTokens;
  state: number | undefined;
  mark: (itemId: string, correct: boolean) => void;
  hideAnswers: boolean;
  trapHref: (trapId: string) => string;
  onWrongTrap: (trapId?: string) => void;
}

const INSTRUCTION: Record<SelfCheckData["type"], string> = {
  choice: "grammar.instr.choose",
  form: "grammar.instr.form",
  fix: "grammar.instr.fix",
  combine: "grammar.instr.combine",
};

function Stem({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <div className="flex gap-3">
      <span className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">{index + 1}.</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ChoiceRow({ item, index, tokens, state, mark, hideAnswers, trapHref, onWrongTrap }: RowProps) {
  const choice = item as ChoiceItem;
  const [picked, setPicked] = useState<number | null>(null);
  const done = state !== undefined;

  return (
    <Stem index={index}>
      <p>
        <Rich text={choice.stem} boldClassName={tokens.target} />
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {choice.options.map((option, optionIndex) => {
          const chosen = picked === optionIndex;
          const right = optionIndex === choice.answer;

          return (
            <button
              key={optionIndex}
              type="button"
              onClick={() => {
                setPicked(optionIndex);
                mark(selfCheckKey(choice.id), right);

                if (!right) onWrongTrap(choice.trap);
              }}
              aria-pressed={chosen}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                done && chosen && right && "border-green-500 bg-green-600 text-white",
                done && chosen && !right && "border-red-500 bg-red-600 text-white",
                !(done && chosen) && SELF_CHECK.option
              )}
            >
              <Rich text={option} />
            </button>
          );
        })}
      </div>

      {done && (
        <Feedback
          correct={state === 1}
          reason={choice.reason}
          answer={choice.options[choice.answer]}
          hideAnswers={hideAnswers}
          trapId={choice.trap}
          trapHref={choice.trap ? trapHref(choice.trap) : undefined}
        />
      )}
    </Stem>
  );
}

function TypedRow({
  index,
  tokens,
  state,
  mark,
  hideAnswers,
  trapHref,
  onWrongTrap,
  id,
  prompt,
  hint,
  accepted,
  reason,
  trap,
  placeholder,
}: Omit<RowProps, "item"> & {
  id: string;
  prompt: React.ReactNode;
  hint?: string;
  accepted: string[];
  reason: string;
  trap?: string;
  placeholder: string;
}) {
  const { t } = useLang();
  const [value, setValue] = useState("");
  const done = state !== undefined;

  const check = () => {
    if (!value.trim()) return;

    const right = matchesAnswer(value, accepted);

    mark(selfCheckKey(id), right);

    if (!right) onWrongTrap(trap);
  };

  return (
    <Stem index={index}>
      <div>{prompt}</div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {hint && (
          <span className={cn("rounded-md px-2 py-1 text-sm font-medium", tokens.chip)}>({hint})</span>
        )}

        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              check();
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="input w-auto min-w-0 flex-1 basis-40 py-1.5"
        />

        <button type="button" onClick={check} className="btn-primary px-3 py-1.5 text-sm">
          {t("grammar.fb.check")}
        </button>
      </div>

      {done && (
        <Feedback
          correct={state === 1}
          reason={reason}
          answer={accepted[0]}
          hideAnswers={hideAnswers}
          trapId={trap}
          trapHref={trap ? trapHref(trap) : undefined}
        />
      )}
    </Stem>
  );
}

function FormRow(props: RowProps) {
  const { pick } = useLang();
  const item = props.item as FormItem;

  return (
    <TypedRow
      {...props}
      id={item.id}
      prompt={
        <p>
          <Rich text={item.stem} boldClassName={props.tokens.target} />
        </p>
      }
      hint={item.base}
      accepted={item.answer}
      reason={item.reason}
      trap={item.trap}
      placeholder={pick("Dạng đúng", "Correct form")}
    />
  );
}

function FixRow(props: RowProps) {
  const { pick } = useLang();
  const item = props.item as FixItem;
  // The whole corrected sentence is accepted too — a learner who rewrites the
  // sentence has found the same mistake.
  const accepted = [item.fix, item.sentence.replace(item.error, item.fix)];

  return (
    <TypedRow
      {...props}
      id={item.id}
      prompt={
        <p>
          <Rich text={item.sentence} boldClassName={props.tokens.target} />
        </p>
      }
      accepted={accepted}
      reason={item.reason}
      trap={item.trap}
      placeholder={pick("Phần sửa", "The correction")}
    />
  );
}

function CombineRow({ item, index, hideAnswers }: RowProps) {
  const { t, pick } = useLang();
  const combine = item as CombineItem;
  const [value, setValue] = useState("");
  const [shown, setShown] = useState(false);

  return (
    <Stem index={index}>
      <ul className="space-y-0.5 text-sm">
        {combine.sentences.map((sentence, sentenceIndex) => (
          <li key={sentenceIndex} className="text-zinc-700 dark:text-zinc-300">
            <Rich text={sentence} />
          </li>
        ))}
      </ul>

      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{combine.focus}</p>

      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={2}
        aria-label={pick("Câu của bạn", "Your sentence")}
        className="input mt-2 resize-y"
      />

      {!hideAnswers && (
        <button
          type="button"
          onClick={() => setShown(!shown)}
          className="mt-2 text-sm text-indigo-700 underline underline-offset-2 dark:text-indigo-300"
        >
          {t("grammar.fb.model")}
        </button>
      )}

      {shown && !hideAnswers && (
        <ul className="mt-1 space-y-0.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm dark:border-indigo-900 dark:bg-indigo-950/40">
          {combine.model.map((model, modelIndex) => (
            <li key={modelIndex}>
              <Rich text={model} />
            </li>
          ))}
        </ul>
      )}
    </Stem>
  );
}

export function ExerciseRow(props: RowProps) {
  if (isChoice(props.item)) return <ChoiceRow {...props} />;

  if (isForm(props.item)) return <FormRow {...props} />;

  if (isFix(props.item)) return <FixRow {...props} />;

  return <CombineRow {...props} />;
}

interface Props {
  selfCheck: SelfCheckData;
  number: number;
  tokens: PartTokens;
  answers: Record<string, number>;
  mark: (itemId: string, correct: boolean) => void;
  clear: (itemIds: string[]) => void;
  hideAnswers: boolean;
  trapHref: (trapId: string) => string;
  onWrongTrap: (trapId?: string) => void;
}

export default function SelfCheckBlock({
  selfCheck,
  number,
  tokens,
  answers,
  mark,
  clear,
  hideAnswers,
  trapHref,
  onWrongTrap,
}: Props) {
  const { t } = useLang();
  const graded = selfCheck.items.filter(isGraded);
  const keys = graded.map((item) => selfCheckKey(item.id));
  const answered = keys.filter((key) => key in answers);
  const correct = keys.filter((key) => answers[key] === 1);

  return (
    <section
      id={`self-check-${number}`}
      className={cn("scroll-mt-28 space-y-3 rounded-xl p-4", SELF_CHECK.frame)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
            SELF_CHECK.badge
          )}
          aria-hidden="true"
        >
          {number}
        </span>

        <h3 className={cn("text-xs font-bold uppercase tracking-[0.18em]", SELF_CHECK.label)}>
          Self Check {number}
        </h3>

        {/* The authored title is usually just "Self Check N" — the heading
            beside it already says that, so it only shows when it adds
            something. */}
        {selfCheck.title.trim().toLowerCase() !== `self check ${number}` && (
          <span className="text-sm text-zinc-600 dark:text-zinc-300">— {selfCheck.title}</span>
        )}
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">{t(INSTRUCTION[selfCheck.type])}</p>

      <ol className="space-y-4">
        {selfCheck.items.map((item, index) => (
          <li key={item.id}>
            <ExerciseRow
              item={item}
              index={index}
              tokens={tokens}
              state={answers[selfCheckKey(item.id)]}
              mark={mark}
              hideAnswers={hideAnswers}
              trapHref={trapHref}
              onWrongTrap={onWrongTrap}
            />
          </li>
        ))}
      </ol>

      {graded.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ScoreLine correct={correct.length} total={graded.length} />

          {answered.length > 0 && (
            <button
              type="button"
              onClick={() => clear(keys)}
              className="inline-flex items-center gap-1.5 text-sm text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("grammar.fb.reset")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
