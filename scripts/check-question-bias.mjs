#!/usr/bin/env node
// Flags multiple-choice questions a learner can answer without knowing the material.
//
//   node scripts/check-question-bias.mjs            # every topic, summary per track
//   node scripts/check-question-bias.mjs aws- -v    # topics starting with "aws-", list each flag
//
// Checked in BOTH languages (the site defaults to Vietnamese):
//   LONGEST — one question: the correct option is ≥ RATIO × the next-longest option.
//   ECHO    — one question: the correct option repeats words from the question that no
//             distractor repeats (e.g. "which element allows or denies?" → "Effect (Allow or Deny)").
//   SKEW    — a whole topic: the correct option is the longest in more than MAX_SKEW of its
//             questions, in either language. Slightly-longer-every-time is still a cue.
//             With -v, the questions behind a skew are listed as `id(vi)` / `id(en)`.
//   SKEW-SHORT — the same for the shortest option, over MAX_SHORT_SKEW (over-correction).
//   MIDDLE  — a topic whose correct option is neither longest nor shortest in over MAX_MIDDLE
//             of its vi+en answers (chance ≈ 50%): ruling out both ends would then pay off.
//
// Answer position is not checked: options are shuffled at display time.
// Exit code is 1 when any LONGEST or SKEW flag remains, so this can gate content changes.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "knowledge-content");
const RATIO = 1.25;
const MAX_SKEW = 0.35;
const MAX_SHORT_SKEW = 0.4;
const MAX_MIDDLE = 0.8;
const args = process.argv.slice(2);
const verbose = args.includes("-v");
const prefix = args.find((a) => !a.startsWith("-")) ?? "";

const STOP = new Set(
  (
    "the a an and or of to in on for is are be by with what which that this when how why who " +
    "does do can should would most best not from into its it as at your you their they them " +
    "than then there these those have has will using used use một các của và cho là được những " +
    "khi nào gì này trong với không có để theo thì đâu nhất"
  ).split(" ")
);

const words = (s) =>
  new Set(
    s
      .toLowerCase()
      .normalize("NFC")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 3 && !STOP.has(w))
  );

const isLongest = (options, answer) => options.every((o, i) => i === answer || options[answer].length > o.length);
const isShortest = (options, answer) => options.every((o, i) => i === answer || options[answer].length < o.length);

function longestFlag(options, answer) {
  const next = Math.max(...options.filter((_, i) => i !== answer).map((o) => o.length));

  return options[answer].length >= next * RATIO;
}

function echoFlag(stem, options, answer) {
  const stemWords = words(stem);
  const shared = options.map((o) => [...words(o)].filter((w) => stemWords.has(w)).length);
  const bestOther = Math.max(...shared.filter((_, i) => i !== answer));

  return shared[answer] >= 2 && shared[answer] - bestOther >= 2;
}

function readQuestions(slug) {
  const file = path.join(ROOT, slug, "questions.json");

  if (!fs.existsSync(file)) return null;

  const raw = JSON.parse(fs.readFileSync(file, "utf8"));

  return Array.isArray(raw) ? raw : raw.questions;
}

const pct = (n, d) => `${d ? Math.round((100 * n) / d) : 0}%`;
const tracks = {};
let failures = 0;

for (const slug of fs.readdirSync(ROOT).sort()) {
  if (!slug.startsWith(prefix)) continue;

  const questions = readQuestions(slug);

  if (!questions) continue;

  const metaFile = path.join(ROOT, slug, "meta.json");
  const group = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf8")).group ?? "it-fundamentals" : "?";
  const t = (tracks[group] ??= { questions: 0, viLong: 0, enLong: 0, viShort: 0, enShort: 0, longest: 0, echo: 0, skewed: 0 });
  const flags = [];
  const longestIds = { vi: [], en: [] };
  const shortestIds = { vi: [], en: [] };
  let middle = 0;

  for (const q of questions) {
    const vi = q.options;
    const en = q.optionsEn ?? q.options;

    t.questions++;

    if (isLongest(vi, q.answer)) longestIds.vi.push(q.id);

    if (isLongest(en, q.answer)) longestIds.en.push(q.id);

    if (isShortest(vi, q.answer)) shortestIds.vi.push(q.id);

    if (isShortest(en, q.answer)) shortestIds.en.push(q.id);

    for (const options of [vi, en]) {
      const len = options[q.answer].length;
      const others = options.filter((_, i) => i !== q.answer).map((o) => o.length);

      if (others.some((l) => l > len) && others.some((l) => l < len)) middle++;
    }

    const longest = longestFlag(vi, q.answer) || longestFlag(en, q.answer);
    const echo = echoFlag(q.question, vi, q.answer) || echoFlag(q.questionEn ?? q.question, en, q.answer);

    if (longest) t.longest++;

    if (echo) t.echo++;

    if (longest) failures++;

    if (longest || echo) flags.push(`${q.id} ${[longest && "LONGEST", echo && "ECHO"].filter(Boolean).join("+")}`);
  }

  t.viLong += longestIds.vi.length;
  t.enLong += longestIds.en.length;
  t.viShort += shortestIds.vi.length;
  t.enShort += shortestIds.en.length;

  // Over-correcting is a cue too: "pick the shortest" must not win either. The
  // limit is looser because some answers are short fixed terms by nature.
  const skews = [
    ["SKEW", longestIds, MAX_SKEW],
    ["SKEW-SHORT", shortestIds, MAX_SHORT_SKEW],
  ];

  for (const [label, idsByLang, limit] of skews) {
    for (const lang of ["vi", "en"]) {
      const ids = idsByLang[lang];

      if (ids.length <= questions.length * limit) continue;

      t.skewed++;
      failures++;
      flags.push(`${label}(${lang} ${pct(ids.length, questions.length)}: ${ids.map((id) => `${id}(${lang})`).join(" ")})`);
    }
  }

  // Never longest and never shortest is a cue as well: "rule out both ends" leaves a coin toss.
  if (middle > questions.length * 2 * MAX_MIDDLE) {
    t.skewed++;
    failures++;
    flags.push(`MIDDLE(${pct(middle, questions.length * 2)} of vi+en answers are neither longest nor shortest)`);
  }

  if (verbose && flags.length > 0) console.log(`${slug}: ${flags.join(", ")}`);
}

console.log("\n                            correct is longest   correct is shortest");
console.log("track            questions      vi      en           vi      en       LONGEST  ECHO  skewed topics");

for (const [group, t] of Object.entries(tracks)) {
  const n = t.questions;

  console.log(
    `${group.padEnd(16)} ${String(n).padStart(9)}  ${pct(t.viLong, n).padStart(6)}  ${pct(t.enLong, n).padStart(6)}       ${pct(t.viShort, n).padStart(6)}  ${pct(t.enShort, n).padStart(6)}       ${String(t.longest).padStart(7)}  ${String(t.echo).padStart(4)}  ${String(t.skewed).padStart(13)}`
  );
}

console.log(
  `\n(chance level is ~25% with 4 options. LONGEST = ≥${RATIO}× the next option; SKEW = a topic over ${MAX_SKEW * 100}% in one language; SKEW-SHORT over ${MAX_SHORT_SKEW * 100}%)`
);
process.exit(failures > 0 ? 1 : 0);
