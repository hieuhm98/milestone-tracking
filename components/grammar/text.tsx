// The one place that turns authored markup into React.
//
// The data marks the target form with `**bold**` and quotes a word or a
// Vietnamese cue with `*italics*` (content spec §2.1). That is the whole
// syntax — no markdown library, and nothing here ever renders raw HTML.

import { cn } from "@/lib/utils";

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

export interface RichProps {
  text: string;
  /** Extra classes for the **bold** spans — the Part colour, usually. */
  boldClassName?: string;
}

/** The pieces of `text` as React nodes; use `<Rich>` unless you need a list. */
export function richNodes(text: string, boldClassName?: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const parts = text.split(TOKEN);

  parts.forEach((part, index) => {
    if (!part) return;

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      nodes.push(
        <strong key={index} className={cn("font-semibold", boldClassName)}>
          {part.slice(2, -2)}
        </strong>
      );

      return;
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      nodes.push(<em key={index}>{part.slice(1, -1)}</em>);

      return;
    }

    nodes.push(<span key={index}>{part}</span>);
  });

  return nodes;
}

export default function Rich({ text, boldClassName }: RichProps) {
  return <>{richNodes(text, boldClassName)}</>;
}

/** The same string with the marks removed — for `title`, `aria-label`, search. */
export function plain(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
}

/**
 * `t()` has no interpolation, so the dictionary's `{n} of {total} correct`
 * is filled in here.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}

/**
 * How a typed answer is compared: trimmed, case-insensitive, one space between
 * words, curly apostrophes folded, and a trailing full stop ignored.
 */
export function normaliseAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:]+$/, "");
}

/** True when `value` matches any accepted answer. */
export function matchesAnswer(value: string, accepted: string[]): boolean {
  const typed = normaliseAnswer(value);

  if (!typed) return false;

  return accepted.some((answer) => normaliseAnswer(answer) === typed);
}
