// The colour system for the IELTS Speaking section (plan §6.2): one content
// type, one fixed colour, everywhere on the page.
//
// Every class is written out in full — Tailwind's JIT only sees literal
// strings, so `bg-${colour}-50` would silently produce no CSS. Same rule as
// GROUP_ACCENT in lib/groups.ts. Each entry carries a light *and* a dark value
// because the app defaults to dark.

/** Band 6 = amber, Band 9 = emerald. */
export const BAND = {
  band6: {
    frame:
      "border border-amber-200 dark:border-amber-900 border-l-4 border-l-amber-400 dark:border-l-amber-500 bg-amber-50 dark:bg-amber-950/40",
    label: "text-amber-800 dark:text-amber-200",
    count: "text-amber-700/80 dark:text-amber-300/80",
  },
  band9: {
    frame:
      "border border-emerald-200 dark:border-emerald-900 border-l-4 border-l-emerald-500 dark:border-l-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
    label: "text-emerald-800 dark:text-emerald-200",
    count: "text-emerald-700/80 dark:text-emerald-300/80",
  },
} as const;

/** Part 1 = sky, Part 2 & 3 = violet. */
export const PART = {
  part1: {
    text: "text-sky-700 dark:text-sky-300",
    chip: "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800",
    dot: "bg-sky-500",
    ring: "hover:border-sky-400 dark:hover:border-sky-700",
  },
  part23: {
    text: "text-violet-700 dark:text-violet-300",
    chip: "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-800",
    dot: "bg-violet-500",
    ring: "hover:border-violet-400 dark:hover:border-violet-700",
  },
} as const;

export type PartKey = keyof typeof PART;

/** The three analysis rows, plus Pronunciation for the home-page table. */
export const CRITERION = {
  fluency: {
    name: "text-indigo-700 dark:text-indigo-300",
    bar: "bg-indigo-500",
    cell: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900",
  },
  lexical: {
    name: "text-teal-700 dark:text-teal-300",
    bar: "bg-teal-500",
    cell: "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900",
  },
  grammar: {
    name: "text-orange-700 dark:text-orange-300",
    bar: "bg-orange-500",
    cell: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900",
  },
  pronunciation: {
    name: "text-pink-700 dark:text-pink-300",
    bar: "bg-pink-500",
    cell: "bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-900",
  },
} as const;

export type CriterionKey = keyof typeof CRITERION;

/** Key difference = fuchsia callout. */
export const KEY_DIFFERENCE = {
  frame: "border border-fuchsia-200 dark:border-fuchsia-900 bg-fuchsia-50 dark:bg-fuchsia-950/40",
  label: "text-fuchsia-700 dark:text-fuchsia-300",
} as const;

/** Vocabulary = cyan. */
export const VOCAB = {
  head: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-900 dark:text-cyan-100",
  term: "text-cyan-800 dark:text-cyan-200",
  frame: "border border-cyan-200 dark:border-cyan-900",
  /** Applied for a moment when a highlighted phrase jumps to its row. */
  flash: ["bg-cyan-100", "dark:bg-cyan-900/50", "ring-2", "ring-cyan-400", "ring-inset"],
} as const;

/** A phrase to learn = yellow highlighter. */
export const PHRASE =
  "bg-yellow-200/80 dark:bg-yellow-500/25 text-yellow-950 dark:text-yellow-100 decoration-yellow-600/60 dark:decoration-yellow-400/60 underline decoration-dotted underline-offset-2 rounded px-0.5";

/** IPA under the word — grey, never competing with the answer text. */
export const IPA_TEXT = "text-zinc-500 dark:text-zinc-400";

/** 1-MINUTE NOTES: four rotating pastels, reused in order. */
export const NOTE_COLOURS = [
  "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900",
  "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900",
  "bg-lime-50 dark:bg-lime-950/40 border-lime-200 dark:border-lime-900",
  "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900",
] as const;
