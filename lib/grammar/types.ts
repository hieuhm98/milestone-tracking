// "Grammar for Writing" data contract.
//
// Every word of this section is written for this project. The two textbooks
// named in the plan are a topic map only — which points to teach and in what
// order — and no script that produces page data ever reads them.
//
// Language rule (same as the IELTS section): learning content is English in
// both modes; only interface chrome switches. The one exception is a trap's
// `viCue`, the Vietnamese wording that causes the error, shown in both modes.
//
// Strings marked "may contain **bold**" carry the target form between double
// asterisks, which the components render as bold.

export type PartId = "A" | "B" | "C" | "D";
export type Layer = "core" | "extend";

export interface Table {
  columns: string[];
  rows: string[][];
  /** Required by the accessibility rule in the content spec. */
  caption?: string;
}

/** A small inline diagram of where the action sits in time. */
export interface Timeline {
  tense: string;
  marks: ("point" | "span" | "repeat" | "now")[];
  /** Text equivalent, so the diagram never carries meaning on its own. */
  label: string;
}

export interface Example {
  /** May contain **bold** around the target form. */
  text: string;
  bold: string[];
}

export interface Rule {
  text: string;
  examples: Example[];
}

export interface TickItem {
  id: string;
  sentence: string;
  correct: boolean;
  reason: string;
  trap?: string;
  layer: Layer;
}

export interface ChoiceItem {
  id: string;
  stem: string;
  options: string[];
  answer: number;
  reason: string;
  trap?: string;
}

export interface FormItem {
  id: string;
  /** The sentence with ___ where the answer goes. */
  stem: string;
  /** The word in brackets the learner has to change. */
  base: string;
  /** Accepted answers; the first is the model. */
  answer: string[];
  reason: string;
  trap?: string;
}

export interface FixItem {
  id: string;
  sentence: string;
  /** The wrong span, exactly as it appears in `sentence`. */
  error: string;
  fix: string;
  reason: string;
  trap?: string;
}

export interface CombineItem {
  id: string;
  sentences: string[];
  /** Model answers — not auto-graded. */
  model: string[];
  focus: string;
}

export type SelfCheckItem = ChoiceItem | FormItem | FixItem | CombineItem;

export interface SelfCheck {
  title: string;
  type: "choice" | "form" | "fix" | "combine";
  items: SelfCheckItem[];
}

export interface Section {
  id: string;
  kind: "forming" | "using";
  layer: Layer;
  title: string;
  table?: Table;
  timeline?: Timeline;
  rules?: Rule[];
  /** WRITING TIP boxes, ≤40 words each. */
  tips?: string[];
  /** NOTE callouts. */
  notes?: string[];
  selfCheck?: SelfCheck;
}

export interface EditingError {
  /** The wrong span, exactly as it appears in `text`. */
  span: string;
  fix: string;
  type: string;
  reason: string;
  trap?: string;
  rule?: string;
}

export interface EditingPractice {
  text: string;
  errors: EditingError[];
}

export interface WritingTopic {
  prompt: string;
  /** e.g. "120–150 words". */
  length: string;
  checklist: string[];
}

export interface GrammarInContext {
  title: string;
  paragraph: string;
  task: "tap-verbs" | "tap-nouns" | "tap-clauses" | "tap-errors";
  /** The words in `paragraph` that count as hits. */
  targets: string[];
}

export interface Unit {
  /** "01-present-time". */
  id: string;
  number: number;
  part: PartId;
  title: string;
  /** Units stay "draft" until the teacher has reviewed them. */
  status: "draft" | "reviewed";
  focus: { text: string; summaryTable?: Table };
  pretest: TickItem[];
  context: GrammarInContext;
  sections: Section[];
  /** Trap ids in traps.json (≥3). */
  traps: string[];
  editing: EditingPractice;
  topics: WritingTopic[];
}

export interface Trap {
  /** "T-A01". */
  id: string;
  /** Unit numbers this trap belongs to. */
  units: number[];
  title: string;
  /** Both may contain **bold**. */
  wrong: string;
  right: string;
  why: string;
  /** The Vietnamese trigger; shown in both language modes. */
  viCue?: string;
}

export interface SyllabusUnit {
  id: string;
  number: number;
  part: PartId;
  title: string;
  core: string;
  extend: string;
}

export interface SyllabusPart {
  id: PartId;
  title: string;
  units: SyllabusUnit[];
}

export interface Syllabus {
  parts: SyllabusPart[];
  reference: { slug: string; title: string }[];
}

/** A Part review: one long editing practice plus mixed items. */
export interface PartReview {
  part: PartId;
  title: string;
  editing: EditingPractice;
  items: (ChoiceItem | FixItem)[];
}

export interface ReferencePage {
  slug: string;
  title: string;
  intro: string;
  tables: Table[];
  /** Optional prose notes under the tables. */
  notes?: string[];
  /** Turns on the search box (used by the irregular-verb list). */
  searchable?: boolean;
}
