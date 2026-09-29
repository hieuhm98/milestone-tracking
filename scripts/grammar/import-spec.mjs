// Turns the two authored spec documents into the section's fixed data:
//
//   node scripts/grammar/import-spec.mjs
//
// Reads local_cowork/Grammar-for-Writing-{Plan,Content}-EN.md — our own
// documents, not the reference books, which no script here ever opens — and
// writes data/grammar-for-writing/{syllabus,traps}.json. The unit files
// themselves are authored by hand against the content spec.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PLAN = path.join(ROOT, "local_cowork", "Grammar-for-Writing-Plan-EN.md");
const CONTENT = path.join(ROOT, "local_cowork", "Grammar-for-Writing-Content.md");
const OUT = path.join(ROOT, "data", "grammar-for-writing");

const PART_TITLES = {
  A: "Verbs and time",
  B: "Nouns and reference",
  C: "Sentences",
  D: "Words",
};

const REFERENCE = [
  { slug: "irregular-verbs", title: "Irregular verbs" },
  { slug: "spelling-rules", title: "Spelling rules (-s, -ing, -ed)" },
  { slug: "punctuation", title: "Punctuation quick guide" },
  { slug: "phrasal-verbs-for-writing", title: "Phrasal verbs for writing" },
  { slug: "problem-words", title: "Problem words" },
];

/** Split a markdown table row into trimmed cells. */
const cells = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ------------------------------------------------------------------ syllabus

function buildSyllabus() {
  const plan = readFileSync(PLAN, "utf-8");
  // Only the syllabus table: later sections (the roadmap) also have rows that
  // begin with a number.
  const from = plan.indexOf("## 3. Merged syllabus");
  const to = plan.indexOf("**Reference pages**", from);
  const lines = plan.slice(from, to > 0 ? to : undefined).split(/\r?\n/);
  const units = [];
  let part = null;

  for (const line of lines) {
    const header = /^\|\s*\*\*Part ([A-D]) ·/.exec(line);

    if (header) {
      part = header[1];

      continue;
    }

    const row = /^\|\s*\*{0,2}(\d+)\*{0,2}\s*\|/.exec(line);

    if (!row || !part) continue;

    const [number, title, core, extend] = cells(line);
    const n = Number(number.replace(/\*/g, ""));

    units.push({
      id: `${String(n).padStart(2, "0")}-${slugify(title)}`,
      number: n,
      part,
      title,
      core,
      extend,
    });
  }

  const parts = Object.entries(PART_TITLES).map(([id, title]) => ({
    id,
    title,
    units: units.filter((unit) => unit.part === id).sort((a, b) => a.number - b.number),
  }));

  return { parts, reference: REFERENCE };
}

// --------------------------------------------------------------------- traps

function buildTraps() {
  const lines = readFileSync(CONTENT, "utf-8").split(/\r?\n/);
  const traps = [];

  for (const line of lines) {
    if (!/^\|\s*T-[A-D]\d\d\s*\|/.test(line)) continue;

    const [id, units, title, wrong, right, why, viCue] = cells(line);

    traps.push({
      id,
      units: units
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value)),
      title,
      wrong,
      right,
      why,
      ...(viCue && viCue !== "—" ? { viCue } : {}),
    });
  }

  return traps;
}

const syllabus = buildSyllabus();
// Traps found missing while the units were being written live in the repo, so
// regenerating from the spec never drops them.
const extra = JSON.parse(readFileSync(path.join(ROOT, "scripts", "grammar", "extra-traps.json"), "utf-8"));
const traps = [...buildTraps(), ...extra].sort((a, b) => a.id.localeCompare(b.id));
const unitCount = syllabus.parts.reduce((sum, part) => sum + part.units.length, 0);

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "syllabus.json"), `${JSON.stringify(syllabus, null, 1)}\n`, "utf-8");
writeFileSync(path.join(OUT, "traps.json"), `${JSON.stringify(traps, null, 1)}\n`, "utf-8");

console.log(`syllabus  ${unitCount} units in ${syllabus.parts.length} parts`);
console.log(`traps     ${traps.length}`);

for (const part of syllabus.parts) {
  console.log(`  Part ${part.id} · ${part.title}: ${part.units.map((u) => u.number).join(", ")}`);
}
