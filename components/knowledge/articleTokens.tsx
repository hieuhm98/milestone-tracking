// The colour system for course articles (every IT track): one kind of content,
// one fixed colour, on every page — the same rule the Grammar for Writing and
// IELTS sections follow (components/grammar/tokens.tsx, components/ielts/tokens.tsx).
//
// Two layers:
//   - the *course accent* (lib/groups.ts) colours the structure — section
//     numbers, sub-headings, list markers, table headers — so a learner always
//     knows which course they are in;
//   - the *callout kind* colours meaning — a misconception is rose and an
//     example is sky in every course, so the colour itself becomes a cue.
//
// Every class is written out in full — Tailwind's JIT only sees literal
// strings, so `bg-${colour}-50` would silently produce no CSS. Each entry
// carries a light *and* a dark value because the app defaults to dark.

import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  FlaskConical,
  Gauge,
  Lightbulb,
  ListChecks,
  Sparkles,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Group } from "@/lib/groups";

export type Accent = Group["accent"];

export interface AccentTokens {
  /** The numbered badge in front of a `## 1. …` heading. */
  badge: string;
  /** The short bar in front of an un-numbered `## ` heading. */
  bar: string;
  /** The rule under every `## ` heading. */
  rule: string;
  /** `### ` sub-headings. */
  h3: string;
  /** Bullet and number markers. */
  marker: string;
  /** Table header row. */
  head: string;
  /** Table frame. */
  frame: string;
  /** `---` section divider. */
  divider: string;
}

export const ACCENT: Record<Accent, AccentTokens> = {
  blue: {
    badge: "bg-blue-600 text-white",
    bar: "bg-blue-500",
    rule: "border-blue-200 dark:border-blue-900/70",
    h3: "text-blue-700 dark:text-blue-300",
    marker: "marker:text-blue-500 dark:marker:text-blue-400",
    head: "bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-100",
    frame: "border-blue-200 dark:border-blue-900/70",
    divider: "from-blue-400/70 via-blue-200 dark:from-blue-500/70 dark:via-blue-900",
  },
  emerald: {
    badge: "bg-emerald-600 text-white",
    bar: "bg-emerald-500",
    rule: "border-emerald-200 dark:border-emerald-900/70",
    h3: "text-emerald-700 dark:text-emerald-300",
    marker: "marker:text-emerald-500 dark:marker:text-emerald-400",
    head: "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100",
    frame: "border-emerald-200 dark:border-emerald-900/70",
    divider: "from-emerald-400/70 via-emerald-200 dark:from-emerald-500/70 dark:via-emerald-900",
  },
  amber: {
    badge: "bg-amber-500 text-white",
    bar: "bg-amber-500",
    rule: "border-amber-200 dark:border-amber-900/70",
    h3: "text-amber-700 dark:text-amber-300",
    marker: "marker:text-amber-500 dark:marker:text-amber-400",
    head: "bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100",
    frame: "border-amber-200 dark:border-amber-900/70",
    divider: "from-amber-400/70 via-amber-200 dark:from-amber-500/70 dark:via-amber-900",
  },
  rose: {
    badge: "bg-rose-600 text-white",
    bar: "bg-rose-500",
    rule: "border-rose-200 dark:border-rose-900/70",
    h3: "text-rose-700 dark:text-rose-300",
    marker: "marker:text-rose-500 dark:marker:text-rose-400",
    head: "bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-100",
    frame: "border-rose-200 dark:border-rose-900/70",
    divider: "from-rose-400/70 via-rose-200 dark:from-rose-500/70 dark:via-rose-900",
  },
  violet: {
    badge: "bg-violet-600 text-white",
    bar: "bg-violet-500",
    rule: "border-violet-200 dark:border-violet-900/70",
    h3: "text-violet-700 dark:text-violet-300",
    marker: "marker:text-violet-500 dark:marker:text-violet-400",
    head: "bg-violet-50 text-violet-900 dark:bg-violet-950/60 dark:text-violet-100",
    frame: "border-violet-200 dark:border-violet-900/70",
    divider: "from-violet-400/70 via-violet-200 dark:from-violet-500/70 dark:via-violet-900",
  },
  orange: {
    badge: "bg-orange-600 text-white",
    bar: "bg-orange-500",
    rule: "border-orange-200 dark:border-orange-900/70",
    h3: "text-orange-700 dark:text-orange-300",
    marker: "marker:text-orange-500 dark:marker:text-orange-400",
    head: "bg-orange-50 text-orange-900 dark:bg-orange-950/60 dark:text-orange-100",
    frame: "border-orange-200 dark:border-orange-900/70",
    divider: "from-orange-400/70 via-orange-200 dark:from-orange-500/70 dark:via-orange-900",
  },
  cyan: {
    badge: "bg-cyan-600 text-white",
    bar: "bg-cyan-500",
    rule: "border-cyan-200 dark:border-cyan-900/70",
    h3: "text-cyan-700 dark:text-cyan-300",
    marker: "marker:text-cyan-500 dark:marker:text-cyan-400",
    head: "bg-cyan-50 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-100",
    frame: "border-cyan-200 dark:border-cyan-900/70",
    divider: "from-cyan-400/70 via-cyan-200 dark:from-cyan-500/70 dark:via-cyan-900",
  },
  indigo: {
    badge: "bg-indigo-600 text-white",
    bar: "bg-indigo-500",
    rule: "border-indigo-200 dark:border-indigo-900/70",
    h3: "text-indigo-700 dark:text-indigo-300",
    marker: "marker:text-indigo-500 dark:marker:text-indigo-400",
    head: "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100",
    frame: "border-indigo-200 dark:border-indigo-900/70",
    divider: "from-indigo-400/70 via-indigo-200 dark:from-indigo-500/70 dark:via-indigo-900",
  },
};

/** Falls back to blue for a topic whose group is missing or unknown. */
export function accentTokens(accent: Accent | undefined): AccentTokens {
  return ACCENT[accent ?? "blue"] ?? ACCENT.blue;
}

/**
 * Bold text = a yellow marker pen, the IELTS "phrase to learn" colour. The
 * highlight sits on the lower part of the line only, so a paragraph with many
 * bold terms still reads as text rather than a wall of yellow.
 */
export const KEY_TERM =
  "font-semibold text-zinc-900 dark:text-zinc-50 box-decoration-clone bg-[linear-gradient(transparent_58%,rgb(253_224_71/0.6)_58%)] dark:bg-[linear-gradient(transparent_52%,rgb(234_179_8/0.4)_52%)]";

export type CalloutKind =
  | "mistake"
  | "example"
  | "try"
  | "ba"
  | "important"
  | "analogy"
  | "answer"
  | "complexity"
  | "scenario"
  | "next"
  | "insight";

export interface CalloutTokens {
  icon: LucideIcon;
  frame: string;
  /** The round icon badge. */
  badge: string;
  /** The callout's own bold text (its label), instead of the yellow marker. */
  label: string;
}

/**
 * Meaning colours, fixed across every course. The icon carries the meaning as
 * well, so the kind is never told by colour alone.
 */
export const CALLOUT: Record<CalloutKind, CalloutTokens> = {
  mistake: {
    icon: AlertTriangle,
    frame: "border-rose-400 bg-rose-50 dark:border-rose-500 dark:bg-rose-950/40",
    badge: "bg-rose-500 text-white",
    label: "font-semibold text-rose-800 dark:text-rose-200",
  },
  example: {
    icon: Briefcase,
    frame: "border-sky-400 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/40",
    badge: "bg-sky-500 text-white",
    label: "font-semibold text-sky-800 dark:text-sky-200",
  },
  try: {
    icon: FlaskConical,
    frame: "border-emerald-400 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40",
    badge: "bg-emerald-500 text-white",
    label: "font-semibold text-emerald-800 dark:text-emerald-200",
  },
  ba: {
    icon: Users,
    frame: "border-teal-400 bg-teal-50 dark:border-teal-500 dark:bg-teal-950/40",
    badge: "bg-teal-500 text-white",
    label: "font-semibold text-teal-800 dark:text-teal-200",
  },
  important: {
    icon: Star,
    frame: "border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/40",
    badge: "bg-amber-500 text-white",
    label: "font-semibold text-amber-900 dark:text-amber-200",
  },
  analogy: {
    icon: Sparkles,
    frame: "border-fuchsia-400 bg-fuchsia-50 dark:border-fuchsia-500 dark:bg-fuchsia-950/40",
    badge: "bg-fuchsia-500 text-white",
    label: "font-semibold text-fuchsia-800 dark:text-fuchsia-200",
  },
  answer: {
    icon: CheckCircle2,
    frame: "border-green-500 bg-green-50 dark:border-green-500 dark:bg-green-950/40",
    badge: "bg-green-600 text-white",
    label: "font-semibold text-green-800 dark:text-green-200",
  },
  complexity: {
    icon: Gauge,
    frame: "border-orange-400 bg-orange-50 dark:border-orange-500 dark:bg-orange-950/40",
    badge: "bg-orange-500 text-white",
    label: "font-semibold text-orange-800 dark:text-orange-200",
  },
  scenario: {
    icon: ListChecks,
    frame: "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40",
    badge: "bg-indigo-500 text-white",
    label: "font-semibold text-indigo-800 dark:text-indigo-200",
  },
  next: {
    icon: ArrowRight,
    frame: "border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900",
    badge: "bg-zinc-500 text-white",
    label: "font-semibold text-zinc-800 dark:text-zinc-200",
  },
  insight: {
    icon: Lightbulb,
    frame: "border-violet-400 bg-violet-50 dark:border-violet-500 dark:bg-violet-950/40",
    badge: "bg-violet-500 text-white",
    label: "font-semibold text-violet-800 dark:text-violet-200",
  },
};

// The labels authors already write, in both languages. Matched against the
// *label* of a callout (its leading bold text, up to the first colon), never
// the sentence after it, so a stray word in the body cannot recolour a box.
// Order matters: the first rule that matches wins.
const QUOTE_RULES: [CalloutKind, RegExp][] = [
  ["try", /try it|tự (làm )?thử/],
  ["ba", /\bba corner|góc ba|^ba:|so what for a ba|ba (được|cần) gì/],
  // Gherkin lines, where the keyword alone is bold — "When two people…" is not one.
  ["scenario", /^(given|when|then|as a|cho|khi|thì)$/],
  [
    "mistake",
    /misconception|hiểu lầm|trap|bẫy|mistake|sai lầm|^wrong|^sai\b|warning|cảnh báo|caution|cautionary|cảnh tỉnh|pitfall|risk|rủi ro|^(do not|don't|never|đừng)\b/,
  ],
  ["example", /example|ví dụ|story|câu chuyện|at work|nơi làm việc|case study/],
  ["analogy", /analogy|ví von|đơn giản hóa|simplif/],
  ["important", /important|quan trọng|principle|nguyên tắc|lesson|bài học|rule|quy tắc|remember|ghi nhớ/],
];

// A paragraph only becomes a callout when it *starts* with one of these.
const PARAGRAPH_RULES: [CalloutKind, RegExp][] = [
  ["analogy", /^(analogy|ví von)\b/],
  ["ba", /^(so what for a ba|ba được gì|ba cần gì)/],
  ["answer", /^(answer|đáp án)\b/],
  ["complexity", /^(complexity|độ phức tạp)\b/],
  ["try", /^(try it|tự (làm )?thử)/],
  ["next", /^(next|tiếp theo)\s*:/],
];

function labelOf(text: string): string {
  const normalized = text.normalize("NFC").trim().toLowerCase();
  const colon = normalized.indexOf(":");

  return colon > 0 && colon <= 60 ? normalized.slice(0, colon) : normalized.slice(0, 60);
}

/** Every blockquote is a callout; its label picks the colour (default: insight). */
export function quoteKind(leadingBold: string | null): CalloutKind {
  if (!leadingBold) return "insight";

  const label = labelOf(leadingBold);

  return QUOTE_RULES.find(([, pattern]) => pattern.test(label))?.[0] ?? "insight";
}

/** A plain paragraph is a callout only when it opens with a known label. */
export function paragraphKind(leadingBold: string | null): CalloutKind | null {
  if (!leadingBold) return null;

  const text = leadingBold.normalize("NFC").trim().toLowerCase();

  return PARAGRAPH_RULES.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}
