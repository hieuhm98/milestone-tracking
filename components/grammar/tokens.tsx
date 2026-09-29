// The colour system for the Grammar for Writing section (plan §5.2): one kind
// of content, one fixed colour, everywhere on the page.
//
// Every class is written out in full — Tailwind's JIT only sees literal
// strings, so `bg-${colour}-50` would silently produce no CSS. Same rule as
// GROUP_ACCENT in lib/groups.ts and components/ielts/tokens.tsx. Each entry
// carries a light *and* a dark value because the app defaults to dark.

import type { PartId } from "@/lib/grammar/types";

export interface PartTokens {
  /** The chapter-opener number block. */
  block: string;
  text: string;
  chip: string;
  dot: string;
  bar: string;
  /** SVG fill and stroke — literal classes, like every other. */
  fill: string;
  stroke: string;
  /** Card hover border. */
  ring: string;
  /** Tinted panel. */
  soft: string;
  /** Table header row. */
  head: string;
  /** The underline accent under a "Forming…" / "Using…" subhead. */
  underline: string;
  /** Bolded target words inside an example. */
  target: string;
}

/** Part A blue · Part B emerald · Part C violet · Part D amber. */
export const PART: Record<PartId, PartTokens> = {
  A: {
    block: "bg-blue-600 text-white",
    text: "text-blue-700 dark:text-blue-300",
    chip: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
    bar: "bg-blue-500",
    fill: "fill-blue-500",
    stroke: "stroke-blue-500",
    ring: "hover:border-blue-400 dark:hover:border-blue-700",
    soft: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900",
    head: "bg-blue-700 text-white dark:bg-blue-800",
    underline: "decoration-blue-500",
    target: "text-blue-700 dark:text-blue-300",
  },
  B: {
    block: "bg-emerald-600 text-white",
    text: "text-emerald-700 dark:text-emerald-300",
    chip: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    fill: "fill-emerald-500",
    stroke: "stroke-emerald-500",
    ring: "hover:border-emerald-400 dark:hover:border-emerald-700",
    soft: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900",
    head: "bg-emerald-700 text-white dark:bg-emerald-800",
    underline: "decoration-emerald-500",
    target: "text-emerald-700 dark:text-emerald-300",
  },
  C: {
    block: "bg-violet-600 text-white",
    text: "text-violet-700 dark:text-violet-300",
    chip: "bg-violet-100 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-800",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
    fill: "fill-violet-500",
    stroke: "stroke-violet-500",
    ring: "hover:border-violet-400 dark:hover:border-violet-700",
    soft: "bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900",
    head: "bg-violet-700 text-white dark:bg-violet-800",
    underline: "decoration-violet-500",
    target: "text-violet-700 dark:text-violet-300",
  },
  D: {
    block: "bg-amber-500 text-white",
    text: "text-amber-700 dark:text-amber-300",
    chip: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    fill: "fill-amber-500",
    stroke: "stroke-amber-500",
    ring: "hover:border-amber-400 dark:hover:border-amber-700",
    soft: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900",
    head: "bg-amber-600 text-white dark:bg-amber-700",
    underline: "decoration-amber-500",
    target: "text-amber-700 dark:text-amber-300",
  },
};

/** Falls back to Part A for a unit whose part is missing from the data. */
export function partTokens(part: PartId | undefined): PartTokens {
  return PART[part ?? "A"] ?? PART.A;
}

/** Core = sky, Extend = purple. */
export const LAYER = {
  core: {
    on: "bg-sky-600 text-white border-sky-600",
    off: "border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/50",
    chip: "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800",
  },
  extend: {
    on: "bg-purple-600 text-white border-purple-600",
    off: "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/50",
    chip: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800",
  },
} as const;

/** SELF CHECK = indigo. */
export const SELF_CHECK = {
  frame: "border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/30",
  label: "text-indigo-700 dark:text-indigo-300",
  badge: "bg-indigo-600 text-white",
  option:
    "border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-900 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/50",
} as const;

/** WRITING TIP = teal, with the striped header the books use. */
export const TIP = {
  frame: "border border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/40",
  stripe:
    "bg-teal-600 text-white [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.18)_0_6px,transparent_6px_12px)]",
  text: "text-teal-900 dark:text-teal-100",
} as const;

/** NOTE: = a quiet grey callout. */
export const NOTE =
  "border-l-4 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300";

/** Vietnamese Learner Traps: rose for the ✗ line, green for the ✓ line. */
export const TRAP = {
  frame: "border border-rose-200 dark:border-rose-900 bg-white dark:bg-zinc-900",
  id: "bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200",
  wrong: "border-l-4 border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100",
  right: "border-l-4 border-green-500 bg-green-50 dark:bg-green-950/40 text-green-900 dark:text-green-100",
  cue: "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-800",
} as const;

/**
 * Feedback: green / red, always with an icon *and* the word, so the state is
 * never carried by colour alone (content spec §2.4 rule 9).
 */
export const FEEDBACK = {
  correct: {
    frame: "border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/40",
    text: "text-green-800 dark:text-green-200",
    chip: "bg-green-600 text-white",
  },
  incorrect: {
    frame: "border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40",
    text: "text-red-800 dark:text-red-200",
    chip: "bg-red-600 text-white",
  },
} as const;

/** A tappable word in the context task / editing paragraph. */
export const TOKEN = {
  idle:
    "rounded px-0.5 underline decoration-dotted decoration-zinc-300 underline-offset-4 hover:bg-zinc-200 hover:decoration-zinc-500 dark:decoration-zinc-600 dark:hover:bg-zinc-700 dark:hover:decoration-zinc-400",
  hit: "rounded bg-green-200 px-0.5 font-semibold text-green-900 dark:bg-green-800/70 dark:text-green-50",
  miss: "rounded bg-red-200 px-0.5 text-red-900 line-through dark:bg-red-900/70 dark:text-red-50",
  revealed: "rounded bg-amber-200 px-0.5 text-amber-950 dark:bg-amber-800/70 dark:text-amber-50",
} as const;

/** The caps block headings the books use (GRAMMAR FOCUS, PRETEST, …). */
export const BLOCK_HEADING = "text-xs font-bold uppercase tracking-[0.18em]";
