// Gate for authored "Grammar for Writing" content.
//
//   node scripts/grammar/check-content.mjs            # every unit
//   node scripts/grammar/check-content.mjs 01 02      # only these units
//
// Enforces the block sizes and the "every wrong answer points somewhere" rule
// from the content spec, plus the ground rule that nothing here may name the
// reference books. Exits non-zero on any failure.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "data", "grammar-for-writing");
const read = (...parts) => JSON.parse(readFileSync(path.join(DIR, ...parts), "utf-8"));

/** The books are a topic map only; their identity must appear nowhere. */
const FORBIDDEN = ["Grammar for Writing 1", "Grammar for Writing 2", "Joyce S. Cain", "Joyce Cain", "Pearson"];

const LIMITS = {
  focusWords: [55, 120],
  pretest: [8, 10],
  contextWords: [80, 160],
  contextTargets: [6, 14],
  selfChecks: 2,
  selfCheckItems: 5,
  traps: 3,
  editingWords: [110, 200],
  editingErrors: [6, 10],
  topics: 3,
};

const failures = [];
const warnings = [];
const only = process.argv.slice(2);

const words = (text) => text.trim().split(/\s+/).filter(Boolean).length;
const fail = (where, message) => failures.push(`${where}: ${message}`);
const warn = (where, message) => warnings.push(`${where}: ${message}`);

function between(where, label, value, [min, max]) {
  if (value < min || value > max) fail(where, `${label} is ${value}, expected ${min}–${max}`);
}

const traps = read("traps.json");
const trapIds = new Set(traps.map((trap) => trap.id));
const syllabus = read("syllabus.json");
const syllabusUnits = syllabus.parts.flatMap((part) => part.units);

for (const trap of traps) {
  if (!trap.title || !trap.wrong || !trap.right || !trap.why) fail(trap.id, "incomplete trap");

  if (!trap.units?.length) fail(trap.id, "belongs to no unit");
}

const unitFiles = existsSync(path.join(DIR, "units"))
  ? readdirSync(path.join(DIR, "units")).filter((file) => file.endsWith(".json"))
  : [];
const units = unitFiles
  .map((file) => read("units", file))
  .filter((unit) => only.length === 0 || only.some((value) => unit.id.startsWith(value)));

function checkItemCommon(where, item, { needsReason = true } = {}) {
  if (!item.id) fail(where, "item has no id");

  // A combine item is not auto-graded: its model answers and `focus` do the
  // explaining, so it carries no `reason` (see CombineItem in the types).
  if (needsReason && !item.reason?.trim()) fail(where, `item ${item.id} has no reason`);

  if (item.trap && !trapIds.has(item.trap)) fail(where, `item ${item.id} references unknown trap ${item.trap}`);
}

function checkSelfCheck(where, check) {
  if (!check.items || check.items.length !== LIMITS.selfCheckItems) {
    fail(where, `self check has ${check.items?.length ?? 0} items, expected ${LIMITS.selfCheckItems}`);
  }

  for (const item of check.items ?? []) {
    checkItemCommon(where, item, { needsReason: check.type !== "combine" });

    if (check.type === "choice") {
      if (!item.options || item.options.length < 2) fail(where, `${item.id}: needs at least two options`);

      if (typeof item.answer !== "number" || !item.options?.[item.answer]) {
        fail(where, `${item.id}: answer does not point at an option`);
      }
    }

    if (check.type === "form") {
      if (!item.stem?.includes("___")) fail(where, `${item.id}: stem has no ___ gap`);

      if (!item.answer?.length) fail(where, `${item.id}: no accepted answers`);

      if (!item.base) fail(where, `${item.id}: no base word`);
    }

    if (check.type === "fix") {
      if (!item.error || !item.fix) fail(where, `${item.id}: needs both error and fix`);
      else if (!item.sentence?.includes(item.error)) fail(where, `${item.id}: error "${item.error}" is not in the sentence`);
    }

    if (check.type === "combine") {
      if (!item.sentences?.length || !item.model?.length) fail(where, `${item.id}: needs sentences and a model answer`);

      if (!item.focus?.trim()) fail(where, `${item.id}: needs a focus line saying what to practise`);
    }
  }
}

for (const unit of units) {
  const where = unit.id;
  const inSyllabus = syllabusUnits.find((entry) => entry.id === unit.id);

  if (!inSyllabus) fail(where, "not in syllabus.json");
  else if (inSyllabus.number !== unit.number || inSyllabus.part !== unit.part) {
    fail(where, "number or part does not match the syllabus");
  }

  if (!["draft", "reviewed"].includes(unit.status)) fail(where, `unknown status "${unit.status}"`);

  // Grammar Focus
  between(where, "focus", words(unit.focus?.text ?? ""), LIMITS.focusWords);

  // Pretest
  between(where, "pretest items", unit.pretest?.length ?? 0, LIMITS.pretest);

  const correct = (unit.pretest ?? []).filter((item) => item.correct).length;
  const total = unit.pretest?.length ?? 0;

  if (total && (correct < total * 0.3 || correct > total * 0.7)) {
    warn(where, `pretest is ${correct}/${total} correct, aim for about half`);
  }

  for (const item of unit.pretest ?? []) {
    checkItemCommon(where, item);

    if (!["core", "extend"].includes(item.layer)) fail(where, `pretest ${item.id}: bad layer`);
  }

  // Grammar in Context
  between(where, "context paragraph", words(unit.context?.paragraph ?? ""), LIMITS.contextWords);
  between(where, "context targets", unit.context?.targets?.length ?? 0, LIMITS.contextTargets);

  for (const target of unit.context?.targets ?? []) {
    if (!unit.context.paragraph.includes(target)) fail(where, `context target "${target}" is not in the paragraph`);
  }

  // Sections
  const sections = unit.sections ?? [];
  const forming = sections.filter((section) => section.kind === "forming");
  const using = sections.filter((section) => section.kind === "using");

  if (forming.length < 1) fail(where, "no Forming section");

  if (using.length < 2) fail(where, `${using.length} Using sections, expected at least 2`);

  if (!forming.some((section) => section.table)) fail(where, "no Forming section has a table");

  if (!sections.some((section) => section.layer === "extend")) warn(where, "no Extend section");

  const checks = sections.filter((section) => section.selfCheck);

  if (checks.length < LIMITS.selfChecks) {
    fail(where, `${checks.length} self checks, expected at least ${LIMITS.selfChecks}`);
  }

  for (const section of sections) {
    const place = `${where} ${section.id}`;

    if (!section.title) fail(place, "section has no title");

    if (section.table && !section.table.caption) warn(place, "table has no caption");

    if (section.timeline && !section.timeline.label) fail(place, "timeline has no text label");

    for (const rule of section.rules ?? []) {
      if (!rule.text) fail(place, "rule has no text");

      if (!rule.examples?.length) fail(place, `rule "${rule.text?.slice(0, 40)}" has no example`);

      for (const example of rule.examples ?? []) {
        for (const bold of example.bold ?? []) {
          if (!example.text.includes(bold)) fail(place, `bold "${bold}" is not in the example`);
        }
      }
    }

    for (const tip of section.tips ?? []) {
      if (words(tip) > 45) warn(place, `writing tip is ${words(tip)} words, keep it under 40`);
    }

    if (section.selfCheck) checkSelfCheck(place, section.selfCheck);
  }

  // Traps
  if ((unit.traps?.length ?? 0) < LIMITS.traps) fail(where, `${unit.traps?.length ?? 0} traps, expected at least ${LIMITS.traps}`);

  for (const id of unit.traps ?? []) {
    if (!trapIds.has(id)) fail(where, `unknown trap ${id}`);
  }

  // Editing Practice
  const editing = unit.editing;

  between(where, "editing paragraph", words(editing?.text ?? ""), LIMITS.editingWords);
  between(where, "editing errors", editing?.errors?.length ?? 0, LIMITS.editingErrors);

  const seen = new Set();

  for (const error of editing?.errors ?? []) {
    if (!editing.text.includes(error.span)) fail(where, `editing span "${error.span}" is not in the paragraph`);

    if (seen.has(error.span)) fail(where, `editing span "${error.span}" appears twice; spans must be unique`);

    seen.add(error.span);

    if (!error.type) fail(where, `editing span "${error.span}" has no error type`);

    if (!error.reason) fail(where, `editing span "${error.span}" has no reason`);

    if (!error.trap && !error.rule) fail(where, `editing span "${error.span}" points at neither a trap nor a rule`);

    if (error.trap && !trapIds.has(error.trap)) fail(where, `editing span "${error.span}" references unknown trap ${error.trap}`);

    if (!error.fix) fail(where, `editing span "${error.span}" has no fix`);
  }

  // Writing Topics
  if ((unit.topics?.length ?? 0) !== LIMITS.topics) {
    fail(where, `${unit.topics?.length ?? 0} writing topics, expected ${LIMITS.topics}`);
  }

  for (const topic of unit.topics ?? []) {
    if (!topic.prompt || !topic.length) fail(where, "writing topic needs a prompt and a length");

    if ((topic.checklist?.length ?? 0) < 2) fail(where, `writing topic "${topic.prompt?.slice(0, 30)}" needs a checklist`);
  }
}

// ------------------------------------------------------- reviews & reference

const reviewDir = path.join(DIR, "reviews");
const reviews = existsSync(reviewDir)
  ? readdirSync(reviewDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => read("reviews", file))
  : [];

for (const review of reviews) {
  const where = `review-${review.part}`;

  if (!["A", "B", "C", "D"].includes(review.part)) fail(where, "unknown part");

  between(where, "editing paragraph", words(review.editing?.text ?? ""), [230, 320]);
  between(where, "editing errors", review.editing?.errors?.length ?? 0, [12, 15]);

  const spans = new Set();

  for (const error of review.editing?.errors ?? []) {
    const occurrences = review.editing.text.split(error.span).length - 1;

    if (occurrences === 0) fail(where, `editing span "${error.span}" is not in the paragraph`);
    else if (occurrences > 1) fail(where, `editing span "${error.span}" occurs ${occurrences} times; it must be unique`);

    if (spans.has(error.span)) fail(where, `editing span "${error.span}" is listed twice`);

    spans.add(error.span);

    if (!error.fix || !error.reason || !error.type) fail(where, `editing span "${error.span}" is incomplete`);

    if (error.trap && !trapIds.has(error.trap)) fail(where, `editing span "${error.span}" references unknown trap ${error.trap}`);
  }

  if ((review.items?.length ?? 0) !== 15) fail(where, `${review.items?.length ?? 0} items, expected 15`);

  for (const item of review.items ?? []) {
    checkItemCommon(where, item);

    if (item.options) {
      if (typeof item.answer !== "number" || !item.options[item.answer]) fail(where, `${item.id}: answer does not point at an option`);
    } else if (item.error) {
      if (!item.sentence?.includes(item.error)) fail(where, `${item.id}: error "${item.error}" is not in the sentence`);

      if (!item.fix) fail(where, `${item.id}: no fix`);
    } else {
      fail(where, `${item.id}: is neither a choice nor a fix item`);
    }
  }
}

const referenceDir = path.join(DIR, "reference");
const referencePages = existsSync(referenceDir)
  ? readdirSync(referenceDir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => read("reference", file))
  : [];

for (const page of referencePages) {
  const where = `reference/${page.slug}`;

  if (!page.title || !page.intro) fail(where, "needs a title and an intro");

  if (!page.tables?.length) fail(where, "has no tables");

  for (const table of page.tables ?? []) {
    if (!table.caption) warn(where, "a table has no caption");

    for (const row of table.rows ?? []) {
      if (row.length !== table.columns.length) {
        fail(where, `a row has ${row.length} cells but the table has ${table.columns.length} columns`);
      }
    }
  }
}

const expectedReference = new Set(syllabus.reference.map((entry) => entry.slug));

for (const slug of expectedReference) {
  if (!referencePages.some((page) => page.slug === slug)) warn("reference", `${slug} has not been written yet`);
}

// Every trap should be taught somewhere, once all units exist.
if (only.length === 0 && units.length === syllabusUnits.length) {
  const used = new Set(units.flatMap((unit) => unit.traps ?? []));

  for (const trap of traps) {
    if (!used.has(trap.id)) warn(trap.id, "is in the bank but no unit uses it");
  }
}

// Ground rule: the reference books are never named.
const blob = JSON.stringify({ units, traps, syllabus, reviews, referencePages });

for (const term of FORBIDDEN) {
  if (blob.includes(term)) fail("data", `names the reference material: "${term}"`);
}

console.log(`units checked   ${units.length}${only.length ? ` (of ${unitFiles.length})` : ""}`);
console.log(`part reviews    ${reviews.length}`);
console.log(`reference pages ${referencePages.length}`);
console.log(`traps           ${traps.length}`);
console.log(`failures        ${failures.length}`);
console.log(`warnings        ${warnings.length}`);

for (const line of failures) console.log(`  FAIL  ${line}`);

for (const line of warnings.slice(0, 25)) console.log(`  warn  ${line}`);

if (warnings.length > 25) console.log(`  … and ${warnings.length - 25} more warnings`);

process.exit(failures.length > 0 ? 1 : 0);
