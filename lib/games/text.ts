// Pulling puzzle material out of the course articles. Pure string work.

/** Words that are bold in an article for emphasis rather than because they are a term. */
const GENERIC = new Set(
  (
    "first second third last never always only must should avoid prefer use using " +
    "good bad best worst simple complex common usually often rarely both either " +
    "every each example note important remember warning tip rule rules step steps " +
    "because instead without within before after while when where which what why how " +
    "more most less least much many some other another same different real fast slow " +
    "high low large small long short free paid right wrong true false yes none all"
  ).split(" ")
);

export function isGenericWord(word: string): boolean {
  return GENERIC.has(word.toLowerCase());
}

/** Drop markdown that would leak into a puzzle sentence. */
export function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1");
}

function balanced(text: string): boolean {
  const open = text.split("(").length - 1;
  const close = text.split(")").length - 1;

  return open === close;
}

/** Every `**bold**` run, trimmed of surrounding punctuation, in order, de-duplicated. */
export function boldTerms(md: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const noCode = md.replace(/```[\s\S]*?```/g, " ");

  for (const m of Array.from(noCode.matchAll(/\*\*([^*\n]{2,60}?)\*\*/g))) {
    const term = m[1]
      .replace(/`/g, "")
      .replace(/^[\s"'“”‘’(\[]+|[\s"'“”‘’)\]:;,.!?]+$/g, "")
      .trim();

    if (!term || term.includes("|") || /[.]\s/.test(term) || !balanced(term)) continue;

    const key = term.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    out.push(term);
  }

  return out;
}

const FUNCTION_WORDS = new Set(
  (
    "is are was were be been being do does did not can could will would should must may might " +
    "has have had the a an of to in on for with and or but if it its this that these those you your we our they " +
    "who what how why when where which one two three four five six seven eight nine ten"
  ).split(" ")
);

/**
 * Turns a bold run into a tile, or null when it is not a term. A tile is a short
 * noun-ish phrase: "SYN cookies", "Path MTU Discovery", "S3". Sentences, figures and
 * ordinary words the author merely emphasised are rejected.
 */
export function tileTerm(raw: string, isCommon: (word: string) => boolean = () => false): string | null {
  const term = raw.replace(/^(the|a|an)[ ]+/i, "").trim();
  const words = term.split(/[ ]+/);

  if (words.length > 3 || term.length < 2 || term.length > 26) return null;

  if (!/[A-Za-z]/.test(term) || /[=^]|[0-9]{2,}/.test(term)) return null;

  if (/[.!?]$/.test(term) || term.includes(",") || words.some((w) => FUNCTION_WORDS.has(w.toLowerCase()))) return null;

  if (isGenericWord(words[0]) || isGenericWord(words[words.length - 1])) return null;

  if (words.length === 1) {
    const acronym = /^[A-Z][A-Z0-9]{1,7}$/.test(term) || /^[A-Za-z]+[0-9][A-Za-z0-9]*$/.test(term);

    if (!acronym && (term.length < 4 || isCommon(term))) return null;
  }

  return term;
}

/** Sentences of the article body: no tables, headings, code or list scaffolding. */
export function sentencesOf(md: string): string[] {
  const body = plainText(md)
    .split("\n")
    .filter((line) => !/^\s*(\||#|>|---|===)/.test(line))
    .map((line) => line.replace(/^\s*([-*+]|\d+[.)])\s+/, "").trim())
    .filter(Boolean)
    .join("\n");

  return body
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export function wordPattern(word: string): RegExp {
  // Anything that is not a plain letter, digit or space is escaped, backslash included.
  const escaped = Array.from(word, (ch) => (/[A-Za-z0-9 ]/.test(ch) ? ch : `\\${ch}`)).join("");

  return new RegExp(`(^|[^A-Za-z])(${escaped})(?![A-Za-z])`, "i");
}

/** Whole-word, case-insensitive containment. */
export function mentions(text: string, term: string): boolean {
  return wordPattern(term).test(text);
}

/** Split an article into its `## ` heading titles. */
export function headingsOf(md: string): string[] {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .split("\n")
    .filter((line) => /^##\s+\S/.test(line))
    .map((line) =>
      line
        .replace(/^##\s+/, "")
        .replace(/^\d+[.)]\s*/, "")
        .replace(/[*`]/g, "")
        .trim()
    );
}

/** How many times a term is mentioned in an article (whole word, any case). */
export function countMentions(text: string, term: string): number {
  const { source } = wordPattern(term);

  return (text.match(new RegExp(source, "gi")) ?? []).length;
}
