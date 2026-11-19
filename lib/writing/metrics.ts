// Objective measurements of an essay. Pure functions, no I/O: they run on the
// server for scoring and could run in the browser for the live word counter.

export interface EssayMetrics {
  words: number;
  sentences: number;
  paragraphs: number;
  avgSentenceLength: number;
  /** Standard deviation of sentence length — a rough proxy for variety. */
  sentenceLengthSpread: number;
  /** Distinct words / total words, measured on the first 100 words so length doesn't skew it. */
  lexicalVariety: number;
  /** Distinct linking devices used. */
  connectors: string[];
  /** Longer (7+ letter) words as a share of all words. */
  longWordShare: number;
  /** Words repeated 5+ times, ignoring common function words. */
  overusedWords: string[];
}

const CONNECTORS = [
  "however", "moreover", "furthermore", "in addition", "on the other hand", "in contrast",
  "for example", "for instance", "as a result", "consequently", "therefore", "thus",
  "although", "whereas", "while", "despite", "in conclusion", "to conclude", "overall",
  "firstly", "secondly", "finally", "nevertheless", "in particular", "similarly",
  "by contrast", "as a consequence", "in spite of", "on balance", "in summary",
];

const STOP = new Set(
  "the a an and or but of to in on at for with by from as is are was were be been it its this that these those they their them he she his her we our you your i my not no can will would could should may might has have had do does did so if than then there here also very more most much many some any such which who whom what when where why how into about over under between among".split(" ")
);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]+(?:['’-][a-z]+)*/g) ?? []);
}

export function countWords(text: string): number {
  return tokenize(text).length;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => tokenize(s).length > 0);
}

export function measure(text: string): EssayMetrics {
  const words = tokenize(text);
  const sentences = splitSentences(text);
  const lengths = sentences.map((s) => tokenize(s).length);
  const avg = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const variance = lengths.length ? lengths.reduce((a, b) => a + (b - avg) ** 2, 0) / lengths.length : 0;
  const lower = text.toLowerCase();
  const sample = words.slice(0, 100);
  const counts = new Map<string, number>();

  for (const w of words) {
    if (!STOP.has(w) && w.length > 3) counts.set(w, (counts.get(w) ?? 0) + 1);
  }

  return {
    words: words.length,
    sentences: sentences.length,
    paragraphs: text.split(/\n\s*\n/).filter((p) => tokenize(p).length > 0).length,
    avgSentenceLength: Math.round(avg * 10) / 10,
    sentenceLengthSpread: Math.round(Math.sqrt(variance) * 10) / 10,
    lexicalVariety: sample.length ? Math.round((new Set(sample).size / sample.length) * 100) / 100 : 0,
    connectors: CONNECTORS.filter((c) => new RegExp(`\\b${c}\\b`).test(lower)),
    longWordShare: words.length ? Math.round((words.filter((w) => w.length >= 7).length / words.length) * 100) / 100 : 0,
    overusedWords: Array.from(counts).filter(([, n]) => n >= 5).map(([w]) => w),
  };
}

/** IELTS rounds the overall band to the nearest half band (…25 and …75 round up). */
export function roundBand(x: number): number {
  return Math.round(x * 2) / 2;
}

/** Cap on Task Response/Achievement imposed by an under-length answer. */
export function lengthCap(words: number, minWords: number): number {
  const ratio = words / minWords;

  if (ratio >= 1) return 9;
  if (ratio >= 0.8) return 6;
  if (ratio >= 0.6) return 5;
  if (ratio >= 0.4) return 4;

  return 3;
}
