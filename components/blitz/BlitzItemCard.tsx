"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "@/context/lang";
import { localizeQuestion } from "@/components/knowledge/QuizBlock";
import { localizeDrill, type Drill, type DrillResponse } from "@/lib/drills";
import { type BlitzItem } from "@/lib/blitz";
import { cn } from "@/lib/utils";
import QuestionText from "@/components/knowledge/QuestionText";

interface Props {
  item: BlitzItem;
  /** Frozen once answered — the card still renders, but nothing can change. */
  locked: boolean;
  /** What was submitted, once it has been. */
  response: DrillResponse | null;
  onSubmit: (response: DrillResponse) => void;
}

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];
const OPTION_KEYS = ["1", "2", "3", "4", "5", "6"];

/**
 * A display order for one card: a fresh random permutation every time the card
 * is dealt, held steady for as long as it stays on screen.
 *
 * Content authored with the answers in a fixed position teaches position rather
 * than material, and a learner spots that within a handful of drills. Shuffling
 * here rather than in the content file also means meeting the same item twice is
 * genuinely two different questions — the runner gives each card `key={item.key}`,
 * so every deal is a fresh mount and a fresh order.
 *
 * `useState` with an initialiser, not `useMemo`: useMemo is a performance hint
 * React is explicitly allowed to discard and recompute, which would reshuffle
 * the options underneath a half-finished answer.
 */
function useShuffledOrder(n: number): number[] {
  const [order] = useState(() => {
    const out = Array.from({ length: n }, (_, i) => i);

    for (let i = n - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));

      [out[i], out[j]] = [out[j], out[i]];
    }

    return out;
  });

  return order;
}

/** Shared option-button chrome, so all five formats read as one interface. */
function optionClass(state: "idle" | "picked" | "right" | "wrong" | "dim") {
  return cn(
    "w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl border text-sm transition-colors min-h-[3rem]",
    state === "idle" &&
      "bg-zinc-100 dark:bg-zinc-800/50 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600",
    state === "picked" &&
      "bg-blue-50 dark:bg-blue-900/50 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-100",
    state === "right" &&
      "bg-green-100 dark:bg-green-900/50 border-green-500 dark:border-green-600 text-green-800 dark:text-green-100",
    state === "wrong" &&
      "bg-red-100 dark:bg-red-900/50 border-red-500 dark:border-red-600 text-red-800 dark:text-red-100",
    state === "dim" && "bg-zinc-100/50 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600"
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
        className ?? "border-zinc-400 dark:border-zinc-600 text-zinc-500"
      )}
    >
      {children}
    </span>
  );
}

export default function BlitzItemCard({ item, locked, response, onSubmit }: Props) {
  const { lang, t } = useLang();

  if (item.format === "mcq") {
    return <McqCard item={item} locked={locked} response={response} onSubmit={onSubmit} />;
  }

  const drill = localizeDrill(item.drill, lang);

  if (item.drill.type === "multi") {
    return (
      <MultiCard
        keyId={item.key}
        prompt={drill.prompt}
        options={drill.options ?? []}
        answers={drill.answers ?? []}
        pick={drill.pick ?? 2}
        locked={locked}
        response={response}
        onSubmit={onSubmit}
        pickLabel={t("blitz.pickExactly").replace("{n}", String(drill.pick ?? 2))}
      />
    );
  }

  if (item.drill.type === "recall") {
    return (
      <RecallCard
        prompt={drill.prompt}
        hint={drill.hint}
        answer={drill.answer ?? ""}
        locked={locked}
        response={response}
        onSubmit={onSubmit}
      />
    );
  }

  if (item.drill.type === "match") {
    return (
      <MatchCard
        keyId={item.key}
        prompt={drill.prompt}
        pairs={drill.pairs ?? []}
        locked={locked}
        response={response}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <OrderCard
      keyId={item.key}
      prompt={drill.prompt}
      items={drill.items ?? []}
      locked={locked}
      response={response}
      onSubmit={onSubmit}
    />
  );
}

/** The prompt line every format shares. */
function Prompt({ text, note }: { text: string; note?: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-base sm:text-lg font-medium leading-snug text-zinc-900 dark:text-zinc-100"><QuestionText text={text} /></p>
      {note && <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{note}</p>}
    </div>
  );
}

// ------------------------------------------------------------------------ mcq

function McqCard({ item, locked, response, onSubmit }: Props) {
  const { lang } = useLang();
  const question = item.format === "mcq" ? item.question : null;
  const q = useMemo(() => (question ? localizeQuestion(question, lang) : null), [question, lang]);
  // display position -> the option's index in the content file.
  const order = useShuffledOrder(q?.options.length ?? 0);
  // Everything the parent sees is in content-file indices, so the answer key and
  // the stored question never have to know the options were reordered.
  const picked = Array.isArray(response) ? response[0] : undefined;

  const answer = useCallback(
    (displayIndex: number) => {
      if (locked) return;

      onSubmit([order[displayIndex]]);
    },
    [locked, onSubmit, order]
  );

  useKeyboardOptions(q?.options.length ?? 0, locked, answer);

  if (!q) return null;

  return (
    <div className="space-y-4">
      <Prompt text={q.question} />
      <div className="space-y-2">
        {order.map((canonical, i) => {
          const isKey = canonical === q.answer;
          let state: Parameters<typeof optionClass>[0] = "idle";

          if (locked) {
            state = isKey ? "right" : canonical === picked ? "wrong" : "dim";
          }

          return (
            <button key={canonical} onClick={() => answer(i)} disabled={locked} className={optionClass(state)}>
              <Badge className={badgeTone(state)}>{OPTION_LABELS[i]}</Badge>
              <span className="flex-1 min-w-0 self-center">{q.options[canonical]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function badgeTone(state: ReturnType<typeof String> | string) {
  if (state === "right") return "bg-green-600 border-green-500 text-white";

  if (state === "wrong") return "bg-red-600 border-red-500 text-white";

  if (state === "picked") return "bg-blue-600 border-blue-500 text-white";

  return undefined;
}

/** Number keys and A-D both answer — whichever the hand reaches for first. */
function useKeyboardOptions(count: number, locked: boolean, pick: (i: number) => void) {
  useEffect(() => {
    if (locked || count === 0) return;

    function onKey(e: KeyboardEvent) {
      // A held-down number key fires keydown over and over; one press is one answer.
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;

      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      const byNumber = OPTION_KEYS.indexOf(e.key);
      const byLetter = OPTION_LABELS.indexOf(e.key.toUpperCase());
      const index = byNumber >= 0 ? byNumber : byLetter;

      if (index >= 0 && index < count) {
        e.preventDefault();
        pick(index);
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [count, locked, pick]);
}

// ---------------------------------------------------------------------- multi

interface MultiProps {
  keyId: string;
  prompt: string;
  options: string[];
  answers: number[];
  pick: number;
  pickLabel: string;
  locked: boolean;
  response: DrillResponse | null;
  onSubmit: (response: DrillResponse) => void;
}

/**
 * "Choose TWO." Submits itself the moment the required number of options is
 * selected — asking for a separate confirm click on a timed run would make the
 * format slower than it is hard, which is the wrong kind of difficulty.
 */
function MultiCard({ keyId, prompt, options, answers, pick, pickLabel, locked, response, onSubmit }: MultiProps) {
  // Selections are held in content-file indices, so `answers` and the submitted
  // response never have to know the options were reordered for display.
  const [selected, setSelected] = useState<number[]>([]);
  const order = useShuffledOrder(options.length);

  useEffect(() => {
    setSelected([]);
  }, [keyId]);

  const toggle = useCallback(
    (displayIndex: number) => {
      if (locked) return;

      const canonical = order[displayIndex];
      // Computed outside the updater: React can invoke an updater twice, and
      // submitting twice would score the answer twice.
      const next = selected.includes(canonical)
        ? selected.filter((v) => v !== canonical)
        : [...selected, canonical];

      setSelected(next);

      if (next.length === pick) onSubmit(next);
    },
    [locked, pick, onSubmit, selected, order]
  );

  useKeyboardOptions(options.length, locked, toggle);

  const submitted = Array.isArray(response) ? response : null;
  const shown = submitted ?? selected;

  return (
    <div className="space-y-4">
      <Prompt text={prompt} note={pickLabel} />
      <div className="space-y-2">
        {order.map((canonical, i) => {
          const isKey = answers.includes(canonical);
          const isPicked = shown.includes(canonical);
          let state: Parameters<typeof optionClass>[0] = isPicked ? "picked" : "idle";

          if (locked) {
            state = isKey ? "right" : isPicked ? "wrong" : "dim";
          }

          return (
            <button key={canonical} onClick={() => toggle(i)} disabled={locked} className={optionClass(state)}>
              <Badge className={badgeTone(state)}>{isPicked && !locked ? "✓" : OPTION_LABELS[i]}</Badge>
              <span className="flex-1 min-w-0 self-center">{options[canonical]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------- recall

interface RecallProps {
  prompt: string;
  hint?: string;
  answer: string;
  locked: boolean;
  response: DrillResponse | null;
  onSubmit: (response: DrillResponse) => void;
}

/**
 * Free recall: no options at all.
 *
 * This is the format the multiple-choice bank cannot reach. Four options hand
 * the learner the answer and ask only whether they recognise it; a blank box
 * asks whether they actually know it.
 */
function RecallCard({ prompt, hint, answer, locked, response, onSubmit }: RecallProps) {
  const { t } = useLang();
  const [value, setValue] = useState("");
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setValue("");
    setShowHint(false);
  }, [prompt]);

  const typed = typeof response === "string" ? response : value;

  return (
    <div className="space-y-4">
      <Prompt text={prompt} />

      <input
        // Autofocus is right here and nowhere else: the whole format is typing,
        // and a run that needs a click before every answer is not a blitz.
        autoFocus
        value={typed}
        disabled={locked}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || locked) return;

          e.preventDefault();

          if (value.trim() !== "") onSubmit(value);
        }}
        placeholder={t("blitz.typeAnswer")}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={cn(
          "input text-lg py-3 font-medium",
          locked && "opacity-80"
        )}
      />

      {locked && (
        <div className="text-sm">
          <span className="text-zinc-500">{t("blitz.theAnswer")}: </span>
          <span className="font-semibold text-green-700 dark:text-green-400">{answer}</span>
        </div>
      )}

      {!locked && hint && (
        <button
          onClick={() => setShowHint(true)}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 py-2 -my-1"
        >
          {showHint ? `${t("blitz.hint")}: ${hint}` : `${t("blitz.hint")} ?`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------- match

interface MatchProps {
  keyId: string;
  prompt: string;
  pairs: { left: string; right: string }[];
  locked: boolean;
  response: DrillResponse | null;
  onSubmit: (response: DrillResponse) => void;
}

/**
 * Match each service to its job.
 *
 * Tap-to-pair rather than drag-and-drop: dragging is unreliable on a phone,
 * needs a pointer library to feel right, and is slower than two taps even when
 * it works. The two columns are shuffled independently so neither the row
 * position nor the left column's order leaks the answer.
 *
 * The submitted response is indexed by **canonical left index** and holds the
 * canonical right index chosen for it, so a correct answer is the identity
 * permutation — which is exactly what `gradeDrill` checks.
 */
function MatchCard({ keyId, prompt, pairs, locked, response, onSubmit }: MatchProps) {
  const { t } = useLang();
  const leftOrder = useShuffledOrder(pairs.length);
  const rightOrder = useShuffledOrder(pairs.length);

  /**
   * Links in the order they were made, as an array rather than an object keyed
   * by the left index: JavaScript orders integer-like object keys numerically,
   * not by insertion, so the badge numbers would silently renumber themselves
   * as further pairs were made.
   */
  const [links, setLinks] = useState<{ left: number; right: number }[]>([]);
  const [activeLeft, setActiveLeft] = useState<number | null>(null);

  useEffect(() => {
    setLinks([]);
    setActiveLeft(null);
  }, [keyId]);

  const submitted = Array.isArray(response) ? response : null;
  const pairedRight = new Set(links.map((l) => l.right));

  function tapLeft(canonical: number) {
    if (locked) return;

    // Tapping a paired item breaks the pair and picks it up again, which is the
    // only way back out of a mistake.
    if (links.some((l) => l.left === canonical)) {
      setLinks(links.filter((l) => l.left !== canonical));
      setActiveLeft(canonical);

      return;
    }

    setActiveLeft((prev) => (prev === canonical ? null : canonical));
  }

  function tapRight(canonical: number) {
    if (locked || activeLeft === null || pairedRight.has(canonical)) return;

    const next = [...links, { left: activeLeft, right: canonical }];

    setLinks(next);
    setActiveLeft(null);

    if (next.length === pairs.length) {
      onSubmit(pairs.map((_, i) => next.find((l) => l.left === i)!.right));
    }
  }

  /** The 1-based pair number shown on both halves of a made link. */
  const linkNumber = (canonicalLeft: number) => links.findIndex((l) => l.left === canonicalLeft) + 1;
  const rightLinkNumber = (canonicalRight: number) => links.findIndex((l) => l.right === canonicalRight) + 1;

  return (
    <div className="space-y-4">
      <Prompt text={prompt} note={locked ? undefined : t("blitz.tapToPair")} />

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="space-y-2">
          {leftOrder.map((canonical) => {
            const linked = links.some((l) => l.left === canonical);
            const isActive = activeLeft === canonical;
            let state: Parameters<typeof optionClass>[0] = "idle";

            if (locked) {
              state = submitted && submitted[canonical] === canonical ? "right" : "wrong";
            } else if (isActive) {
              state = "picked";
            } else if (linked) {
              state = "dim";
            }

            return (
              <button
                key={canonical}
                onClick={() => tapLeft(canonical)}
                disabled={locked}
                className={cn(optionClass(state), "px-3 py-2.5")}
              >
                {linked && !locked && (
                  <Badge className="bg-blue-600 border-blue-500 text-white">{linkNumber(canonical)}</Badge>
                )}
                <span className="flex-1 min-w-0 self-center font-medium">{pairs[canonical].left}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {rightOrder.map((canonical) => {
            const taken = pairedRight.has(canonical);
            let state: Parameters<typeof optionClass>[0] = "idle";

            if (locked) {
              state = "dim";
            } else if (taken) {
              state = "dim";
            } else if (activeLeft !== null) {
              state = "idle";
            }

            return (
              <button
                key={canonical}
                onClick={() => tapRight(canonical)}
                disabled={locked || taken}
                className={cn(optionClass(state), "px-3 py-2.5 text-xs sm:text-sm")}
              >
                {taken && !locked && (
                  <Badge className="bg-blue-600 border-blue-500 text-white">{rightLinkNumber(canonical)}</Badge>
                )}
                <span className="flex-1 min-w-0 self-center">{pairs[canonical].right}</span>
              </button>
            );
          })}
        </div>
      </div>

      {locked && (
        <div className="space-y-1.5 pt-1">
          {pairs.map((pair, i) => {
            const right = submitted ? submitted[i] : undefined;
            const ok = right === i;

            return (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 text-xs px-3 py-2 rounded-lg",
                  ok
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                    : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                )}
              >
                <span className="shrink-0 font-bold">{ok ? "✓" : "✗"}</span>
                <span className="min-w-0">
                  <strong>{pair.left}</strong> → {pair.right}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------- order

interface OrderProps {
  keyId: string;
  prompt: string;
  items: string[];
  locked: boolean;
  response: DrillResponse | null;
  onSubmit: (response: DrillResponse) => void;
}

/**
 * Put the steps in order — a request through Route 53, CloudFront, the ALB and
 * back; an object's lifecycle through the storage classes; the DR strategies by
 * cost. Sequence is knowledge that a four-option question cannot ask for.
 *
 * The learner taps items in the order they believe is right; the submitted
 * response is the canonical indices in tap order, so a correct answer is again
 * the identity permutation.
 */
function OrderCard({ keyId, prompt, items, locked, response, onSubmit }: OrderProps) {
  const { t } = useLang();
  const display = useShuffledOrder(items.length);
  const [sequence, setSequence] = useState<number[]>([]);

  useEffect(() => {
    setSequence([]);
  }, [keyId]);

  const submitted = Array.isArray(response) ? response : null;
  const shown = submitted ?? sequence;

  function tap(canonical: number) {
    if (locked || shown.includes(canonical)) return;

    const next = [...sequence, canonical];

    setSequence(next);

    if (next.length === items.length) onSubmit(next);
  }

  function undo() {
    if (locked) return;

    setSequence((prev) => prev.slice(0, -1));
  }

  return (
    <div className="space-y-4">
      <Prompt text={prompt} note={locked ? undefined : t("blitz.tapInOrder")} />

      <div className="space-y-2">
        {display.map((canonical) => {
          const position = shown.indexOf(canonical);
          const placed = position >= 0;
          let state: Parameters<typeof optionClass>[0] = placed ? "picked" : "idle";

          if (locked) {
            state = position === canonical ? "right" : "wrong";
          }

          return (
            <button
              key={canonical}
              onClick={() => tap(canonical)}
              disabled={locked || placed}
              className={cn(optionClass(state), "px-3 py-2.5")}
            >
              <Badge className={placed ? badgeTone(locked ? state : "picked") : undefined}>
                {placed ? position + 1 : "·"}
              </Badge>
              <span className="flex-1 min-w-0 self-center">{items[canonical]}</span>
            </button>
          );
        })}
      </div>

      {!locked && sequence.length > 0 && (
        <button onClick={undo} className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 py-2 -my-1">
          ↩ {t("blitz.undo")}
        </button>
      )}

      {locked && (
        <ol className="space-y-1.5 pt-1">
          {items.map((text, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
            >
              <span className="shrink-0 font-bold">{i + 1}.</span>
              <span className="min-w-0"><QuestionText text={text} /></span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export type { Drill };
