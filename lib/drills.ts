// Typed practice drills — the question formats the multiple-choice bank cannot express.
//
// `questions.json` is one shape: a stem, four options, one key. That trains
// *recognition* — with four options in front of you, a distinctive keyword in
// the stem is often enough, and a format you can beat without recalling
// anything stops being interesting long before it stops being useful.
//
// Drills live in a sibling `drills.json` per topic rather than inside
// `questions.json`, deliberately:
//   - the exam, the mini-lesson player and the Daily Quick Test all assume
//     "one stem, one key, one index" and keep working untouched;
//   - `lessons.json` must account for every question in `questions.json`
//     (the validator enforces it), and drills are not lesson material;
//   - a topic with no `drills.json` simply contributes nothing, so the format
//     can roll out topic by topic.

import { type Lang } from "@/lib/i18n";

export type DrillType = "multi" | "recall" | "match" | "order";

interface DrillBase {
  id: string;
  type: DrillType;
  prompt: string;
  promptEn: string;
  explanation: string;
  explanationEn: string;
}

/** "Choose TWO" — the format the real SAA-C03 paper uses and the bank cannot. */
export interface MultiDrill extends DrillBase {
  type: "multi";
  /** How many options the learner must select. Must equal `answers.length`. */
  pick: number;
  options: string[];
  optionsEn: string[];
  /** 0-based indices into `options`. */
  answers: number[];
}

/** Free recall — type the service name with no options to choose between. */
export interface RecallDrill extends DrillBase {
  type: "recall";
  /** The canonical answer, shown after grading. */
  answer: string;
  answerEn: string;
  /**
   * Every spelling that counts as right, compared after `normalizeAnswer`.
   * Always include the canonical answer and the bare acronym.
   */
  accept: string[];
  hint?: string;
  hintEn?: string;
}

export interface MatchPair {
  left: string;
  leftEn: string;
  right: string;
  rightEn: string;
}

/** Match each service to its use case. */
export interface MatchDrill extends DrillBase {
  type: "match";
  pairs: MatchPair[];
}

export interface OrderItem {
  text: string;
  textEn: string;
}

/** Put the steps in order — request flows, lifecycle transitions, DR tiers. */
export interface OrderDrill extends DrillBase {
  type: "order";
  /** Stored in the CORRECT order; the runner shuffles a copy for display. */
  items: OrderItem[];
}

export type Drill = MultiDrill | RecallDrill | MatchDrill | OrderDrill;

/** What the learner submitted, by drill type. */
export type DrillResponse = number[] | string;

/**
 * Fold a typed answer down to something comparable.
 *
 * AWS names are written a dozen ways — "Amazon S3", "S3", "amazon-s3",
 * "S3 " — and none of those differences mean the learner was wrong. Case,
 * punctuation and runs of whitespace all collapse; a leading "amazon"/"aws"
 * does not, because `accept` lists the short forms explicitly and dropping the
 * prefix here would let "AWS Glue" match a question about "Glue DataBrew".
 */
export function normalizeAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A localized drill, resolved to plain strings for the active language. */
export interface LocalizedDrill {
  id: string;
  type: DrillType;
  prompt: string;
  explanation: string;
  /** multi */
  options?: string[];
  answers?: number[];
  pick?: number;
  /** recall */
  answer?: string;
  hint?: string;
  /** match */
  pairs?: { left: string; right: string }[];
  /** order */
  items?: string[];
}

/** Prefer the active language, fall back to the other rather than render blank. */
function text(vi: string | undefined, en: string | undefined, lang: Lang): string {
  if (lang === "en") return en || vi || "";

  return vi || en || "";
}

/** Pick a parallel array, but only when it lines up with the base one. */
function pickArray<T>(base: T[], alt: T[] | undefined, lang: Lang): T[] {
  if (lang !== "en") return base;

  return Array.isArray(alt) && alt.length === base.length ? alt : base;
}

export function localizeDrill(drill: Drill, lang: Lang): LocalizedDrill {
  const common = {
    id: drill.id,
    type: drill.type,
    prompt: text(drill.prompt, drill.promptEn, lang),
    explanation: text(drill.explanation, drill.explanationEn, lang),
  };

  if (drill.type === "multi") {
    return {
      ...common,
      options: pickArray(drill.options, drill.optionsEn, lang),
      answers: drill.answers,
      pick: drill.pick,
    };
  }

  if (drill.type === "recall") {
    return {
      ...common,
      answer: text(drill.answer, drill.answerEn, lang),
      hint: text(drill.hint, drill.hintEn, lang) || undefined,
    };
  }

  if (drill.type === "match") {
    return {
      ...common,
      pairs: drill.pairs.map((p) => ({
        left: text(p.left, p.leftEn, lang),
        right: text(p.right, p.rightEn, lang),
      })),
    };
  }

  return { ...common, items: drill.items.map((i) => text(i.text, i.textEn, lang)) };
}

/** Compare two index sets ignoring the order they were selected in. */
function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);

  return sortedA.every((v, i) => v === sortedB[i]);
}

/**
 * Grade one response. Returns `false` for a response of the wrong shape rather
 * than throwing — a half-finished drill abandoned when the clock runs out
 * reaches here, and a timeout is a miss, not a crash.
 */
export function gradeDrill(drill: Drill, response: DrillResponse): boolean {
  if (drill.type === "multi") {
    if (!Array.isArray(response)) return false;

    return sameSet(response, drill.answers);
  }

  if (drill.type === "recall") {
    if (typeof response !== "string") return false;

    const typed = normalizeAnswer(response);

    if (typed === "") return false;

    return drill.accept.some((a) => normalizeAnswer(a) === typed);
  }

  // Match and order both submit a permutation of display indices. The runner
  // shuffles for display and maps back before grading, so a correct answer is
  // always the identity permutation 0,1,2…
  if (!Array.isArray(response)) return false;

  if (drill.type === "match") {
    if (response.length !== drill.pairs.length) return false;

    return response.every((v, i) => v === i);
  }

  if (response.length !== drill.items.length) return false;

  return response.every((v, i) => v === i);
}

/**
 * How many of the drill's parts the learner got right. Blitz scores a drill
 * all-or-nothing, but the results screen says "3 of 4 pairs", which is the
 * difference between "nearly" and "no idea".
 */
export function partialScore(drill: Drill, response: DrillResponse): { correct: number; total: number } {
  if (drill.type === "match" || drill.type === "order") {
    const total = drill.type === "match" ? drill.pairs.length : drill.items.length;
    const picks = Array.isArray(response) ? response : [];

    return { correct: picks.filter((v, i) => v === i).length, total };
  }

  if (drill.type === "multi") {
    const picks = Array.isArray(response) ? response : [];

    return { correct: picks.filter((v) => drill.answers.includes(v)).length, total: drill.answers.length };
  }

  return { correct: gradeDrill(drill, response) ? 1 : 0, total: 1 };
}

/** Coerce an untrusted `drills.json` entry into a Drill, or drop it. */
export function parseDrill(raw: unknown): Drill | null {
  if (typeof raw !== "object" || raw === null) return null;

  const d = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : null);
  const strArray = (v: unknown) =>
    Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === "string" && s.trim() !== "")
      ? (v as string[])
      : null;

  const id = str(d.id);
  const prompt = str(d.prompt);
  const promptEn = str(d.promptEn);
  const explanation = str(d.explanation);
  const explanationEn = str(d.explanationEn);

  if (!id || !prompt || !promptEn || !explanation || !explanationEn) return null;

  const base = { id, prompt, promptEn, explanation, explanationEn };

  if (d.type === "multi") {
    const options = strArray(d.options);
    const optionsEn = strArray(d.optionsEn);
    const answers = Array.isArray(d.answers) ? d.answers.filter((n) => Number.isInteger(n)) : [];

    if (!options || !optionsEn || options.length !== optionsEn.length) return null;

    if (answers.length < 2 || answers.some((n) => n < 0 || n >= options.length)) return null;

    return { ...base, type: "multi", options, optionsEn, answers, pick: answers.length };
  }

  if (d.type === "recall") {
    const answer = str(d.answer);
    const answerEn = str(d.answerEn);
    const accept = strArray(d.accept);

    if (!answer || !answerEn || !accept) return null;

    return {
      ...base,
      type: "recall",
      answer,
      answerEn,
      accept,
      hint: str(d.hint) ?? undefined,
      hintEn: str(d.hintEn) ?? undefined,
    };
  }

  if (d.type === "match") {
    if (!Array.isArray(d.pairs) || d.pairs.length < 3) return null;

    const pairs: MatchPair[] = [];

    for (const p of d.pairs) {
      if (typeof p !== "object" || p === null) return null;

      const pair = p as Record<string, unknown>;
      const left = str(pair.left);
      const leftEn = str(pair.leftEn);
      const right = str(pair.right);
      const rightEn = str(pair.rightEn);

      if (!left || !leftEn || !right || !rightEn) return null;

      pairs.push({ left, leftEn, right, rightEn });
    }

    return { ...base, type: "match", pairs };
  }

  if (d.type === "order") {
    if (!Array.isArray(d.items) || d.items.length < 3) return null;

    const items: OrderItem[] = [];

    for (const i of d.items) {
      if (typeof i !== "object" || i === null) return null;

      const item = i as Record<string, unknown>;
      const itemText = str(item.text);
      const textEn = str(item.textEn);

      if (!itemText || !textEn) return null;

      items.push({ text: itemText, textEn });
    }

    return { ...base, type: "order", items };
  }

  return null;
}
