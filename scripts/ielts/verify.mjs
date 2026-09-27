// Reconciliation report for the converted IELTS Speaking data.
//
//   node scripts/ielts/verify.mjs
//
// Checks what the conversion plan asks for: the counts in the source, that
// every question is complete, that the recounted answers match the word counts
// printed in the source, and that no watermark text survived. Exits non-zero
// if anything fails, so it can gate a re-run of the extractor.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "data", "ielts-speaking");
const BANNED = ["Thầy Hà", "Academic English", "Complete Edition"];
/** The source's own word counts are approximate; allow the same slack the plan does. */
const WORD_TOLERANCE = 2;

const read = (...parts) => JSON.parse(readFileSync(path.join(DIR, ...parts), "utf-8"));
const list = (dir) => readdirSync(path.join(DIR, dir)).map((file) => read(dir, file));

const topics = list("part1");
const cards = list("part23");
const toc = read("toc.json");

const units = [
  ...topics.flatMap((topic) => topic.questions),
  ...cards.flatMap((card) => [card.part2, ...card.part3].filter(Boolean)),
];

const failures = [];
const warnings = [];

function expect(label, actual, wanted) {
  if (actual !== wanted) failures.push(`${label}: ${actual}, expected ${wanted}`);
}

expect("Part 1 topics", topics.length, 46);
expect("Part 1 questions", topics.reduce((sum, t) => sum + t.questions.length, 0), 212);
expect("cue cards", cards.length, 66);
expect("Part 3 questions", cards.reduce((sum, c) => sum + c.part3.length, 0), 283);
expect("question units", units.length, 561);
expect("contents Part 1 sections", toc.part1.length, 46);
expect("contents cards", toc.part23.length, 66);

const answerText = (answer) => answer.segments.map((segment) => segment.v).join(" ");
// Punctuation split off a highlighted phrase is its own segment; it is not a word.
const countWords = (answer) =>
  answerText(answer)
    .split(/\s+/)
    .filter((token) => /[A-Za-z0-9]/.test(token)).length;

let ipa = 0;
let phrases = 0;

for (const unit of units) {
  const where = unit.id;

  if (!unit.question) failures.push(`${where}: no question text`);

  for (const band of ["band6", "band9"]) {
    const answer = unit[band];

    if (!answer || answer.segments.length === 0) {
      failures.push(`${where}: empty ${band}`);

      continue;
    }

    const recounted = countWords(answer);

    if (Math.abs(recounted - answer.words) > WORD_TOLERANCE) {
      warnings.push(`${where}: ${band} recounted ${recounted} words, header says ${answer.words}`);
    }

    if (!/[.!?”]$/.test(answerText(answer).trim())) {
      warnings.push(`${where}: ${band} does not end in punctuation`);
    }
  }

  for (const criterion of ["fluency", "lexical", "grammar"]) {
    const row = unit.analysis?.[criterion];

    if (!row?.band6 || !row?.band9) failures.push(`${where}: analysis row '${criterion}' incomplete`);
  }

  if (!unit.analysis?.keyDifference) failures.push(`${where}: no key difference`);

  if (!unit.vocabulary?.length) failures.push(`${where}: no vocabulary rows`);

  for (const row of unit.vocabulary ?? []) {
    if (!row.term || !row.definition || !row.example || !row.vietnamese) {
      warnings.push(`${where}: incomplete vocabulary row "${row.term}"`);
    }
  }

  const highlighted = unit.band9.segments.filter((segment) => segment.t === "phrase");

  phrases += highlighted.length;
  ipa += unit.band9.segments.filter((s) => s.t === "ipa").length;
  ipa += highlighted.reduce((sum, segment) => sum + (segment.ipa?.length ?? 0), 0);

  if (highlighted.length !== unit.band9.phrases) {
    warnings.push(`${where}: ${highlighted.length} highlighted phrases, header says ${unit.band9.phrases}`);
  }

  for (const segment of highlighted) {
    if (segment.vocabIndex < 0 || segment.vocabIndex >= unit.vocabulary.length) {
      failures.push(`${where}: phrase "${segment.v}" points outside the vocabulary table`);
    }
  }
}

for (const card of cards) {
  if (!card.prompt) failures.push(`card ${card.number}: no cue card prompt`);

  if (card.bullets.length < 3 || card.bullets.length > 5) {
    failures.push(`card ${card.number}: ${card.bullets.length} bullets, expected 3-5`);
  }

  if (card.notes.length !== 4) warnings.push(`card ${card.number}: ${card.notes.length} one-minute notes`);
}

const blob = JSON.stringify({ topics, cards, intro: read("intro.json") });

for (const banned of BANNED) {
  if (blob.includes(banned)) failures.push(`watermark text present: ${banned}`);
}

console.log(`units            ${units.length}`);
console.log(`vocabulary rows  ${units.reduce((sum, u) => sum + u.vocabulary.length, 0)}`);
console.log(`highlighted      ${phrases}`);
console.log(`IPA words        ${ipa}`);
console.log(`failures         ${failures.length}`);
console.log(`warnings         ${warnings.length}`);

for (const line of failures) console.log(`  FAIL  ${line}`);

for (const line of warnings.slice(0, 20)) console.log(`  warn  ${line}`);

if (warnings.length > 20) console.log(`  … and ${warnings.length - 20} more warnings`);

process.exit(failures.length > 0 ? 1 : 0);
