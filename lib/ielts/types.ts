// "IELTS Speaking — Band 6 vs Band 9" data contract.
//
// Every field below is verbatim source text extracted from the PDF by
// `scripts/ielts/extract.py` — never translated and never paraphrased. The
// EN/VI switch changes interface chrome only (see local_cowork content spec §1).

/** A run of answer text: plain, a highlighted phrase, or a word carrying IPA. */
export type Segment =
  | { t: "text"; v: string }
  /** `ipa` carries transcriptions for words inside the phrase, when it has any. */
  | { t: "phrase"; v: string; vocabIndex: number; ipa?: { word: string; ipa: string }[] }
  | { t: "ipa"; v: string; ipa: string };

export interface Answer {
  /** Word count as printed in the source header, not recomputed. */
  words: number;
  /** Only on Band 9: "N phrases to learn". */
  phrases?: number;
  segments: Segment[];
}

export interface Analysis {
  fluency: { band6: string; band9: string };
  lexical: { band6: string; band9: string };
  grammar: { band6: string; band9: string };
  keyDifference: string;
  /** A "Note: …" sentence split out of Key difference on a few cards. */
  note?: string;
}

export interface VocabRow {
  term: string;
  definition: string;
  example: string;
  vietnamese: string;
}

export type QuestionKind = "part1" | "part2" | "part3";

export interface QuestionUnit {
  /** "p1-q18", "c1-part2", "c1-p3-1". */
  id: string;
  kind: QuestionKind;
  /** Question number in Part 1, or the follow-up index in Part 3. */
  number: number;
  question: string;
  band6: Answer;
  band9: Answer;
  analysis: Analysis;
  vocabulary: VocabRow[];
}

export interface Part1Topic {
  slug: string;
  /** "Compulsory frames", "Topics 1–10", … — the group shown in the contents. */
  group: string;
  /** "Topic 1", "Compulsory Frame 1" — the label before the em dash. */
  label: string;
  title: string;
  /** Vietnamese subtitle from the source; shown in both languages. */
  titleVi?: string;
  range: [number, number];
  /** Verbatim source note under the header (Frame 2 only). */
  note?: string;
  questions: QuestionUnit[];
}

export interface CueCard {
  number: number;
  slug: string;
  group: string;
  title: string;
  titleVi?: string;
  prompt: string;
  bullets: string[];
  /** The 1-MINUTE NOTES cells. */
  notes: { label: string; text: string }[];
  part2: QuestionUnit;
  part3: QuestionUnit[];
}

/** One entry in the contents tree. */
export interface TocSection {
  slug: string;
  group: string;
  label: string;
  title: string;
  titleVi?: string;
  /** Part 1: question numbers. Cards: Part 3 count. */
  questions: { id: string; label: string }[];
}

export interface Toc {
  part1: TocSection[];
  part23: TocSection[];
  stats: { part1: number; cards: number; part3: number; phrases: number };
}

/** Home-page copy: the intro sections kept from the source. */
export interface Intro {
  howToUse: { title: string; titleVi: string; paragraphs: string[] };
  /**
   * Written for the web page rather than taken from the source, so unlike
   * everything else here it switches with the interface language. `**bold**`
   * marks the lead-in of each bullet.
   */
  navigate: { title: string; titleVi: string; en: string[]; vi: string[] };
  criteria: {
    title: string;
    titleVi: string;
    rows: { name: string; nameVi: string; band6: string; band9: string }[];
  };
  movesPart1: { title: string; steps: { label: string; text: string }[] };
  movesPart23: {
    title: string;
    titleVi: string;
    steps: { label: string; text: string }[];
    tip: { label: string; text: string };
  };
}
