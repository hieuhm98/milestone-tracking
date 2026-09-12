// Validate the file-based knowledge content.
//
//   node scripts/validate-content.mjs            # every topic
//   node scripts/validate-content.mjs req-       # only slugs starting with req-
//
// Checks, per topic folder under knowledge-content/:
//   - meta.json parses and carries the bilingual fields + a known group
//   - article.md / article.en.md exist and have the SAME number of `## ` sections
//     (the reading mode zips the two languages section by section)
//   - questions.json parses, ids are unique, options/optionsEn line up, and
//     `answer` is a valid 0-based index
//   - optionExplanations / optionExplanationsEn (optional) are present in both
//     languages and carry exactly one non-empty reason per option
//   - lessons.json (optional) covers every article section exactly once, in
//     order, and only references question ids that exist
//   - drills.json (optional) holds well-formed typed drills whose ids do not
//     collide with any question id in the same topic
//
// Exits non-zero if anything fails, so it can gate a commit or a build.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "knowledge-content");
const KNOWN_GROUPS = new Set(["it-fundamentals", "ba", "po", "pm", "req", "dev"]);
const prefix = process.argv[2] ?? "";
const DRILL_TYPES = new Set(["multi", "recall", "match", "order"]);

/** Mirrors `normalizeAnswer` in lib/drills.ts — keep the two in step. */
const normalizeAnswer = (raw) =>
  String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const problems = [];
const fail = (slug, msg) => problems.push(`${slug}: ${msg}`);

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf-8"));
}

function countSections(markdown) {
  return markdown.split("\n").filter((line) => line.startsWith("## ")).length;
}

const slugs = readdirSync(CONTENT_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith(prefix))
  .map((d) => d.name)
  .sort();

let topicsWithLessons = 0;
let totalQuestions = 0;
let totalLessons = 0;
let topicsWithDrills = 0;
let totalDrills = 0;

for (const slug of slugs) {
  const dir = path.join(CONTENT_DIR, slug);
  const at = (name) => path.join(dir, name);

  // ---------------------------------------------------------------- meta.json
  let meta;
  try {
    meta = readJson(at("meta.json"));
  } catch (err) {
    fail(slug, `meta.json unreadable (${err.message})`);
    continue;
  }

  for (const field of ["group", "title", "titleEn", "description", "descriptionEn"]) {
    if (!meta[field]) fail(slug, `meta.json is missing "${field}"`);
  }
  if (meta.group && !KNOWN_GROUPS.has(meta.group)) fail(slug, `unknown group "${meta.group}"`);

  // ---------------------------------------------------------------- articles
  let viSections = 0;
  let enSections = 0;

  if (!existsSync(at("article.md"))) {
    fail(slug, "article.md is missing");
  } else {
    viSections = countSections(readFileSync(at("article.md"), "utf-8"));
    if (viSections === 0) fail(slug, "article.md has no `## ` sections");
  }

  if (!existsSync(at("article.en.md"))) {
    fail(slug, "article.en.md is missing");
  } else {
    enSections = countSections(readFileSync(at("article.en.md"), "utf-8"));
  }

  if (viSections && enSections && viSections !== enSections) {
    fail(slug, `section count mismatch: article.md has ${viSections}, article.en.md has ${enSections}`);
  }

  // ------------------------------------------------------------ questions.json
  let questions = [];
  try {
    questions = readJson(at("questions.json"));
  } catch (err) {
    fail(slug, `questions.json unreadable (${err.message})`);
  }

  if (!Array.isArray(questions)) {
    fail(slug, "questions.json is not an array");
    questions = [];
  }

  const questionIds = new Set();

  questions.forEach((q, i) => {
    const where = `questions[${i}]${q?.id ? ` (${q.id})` : ""}`;

    if (!q?.id) fail(slug, `${where} has no id`);
    else if (questionIds.has(q.id)) fail(slug, `${where} duplicate id`);
    else questionIds.add(q.id);

    for (const field of ["question", "questionEn", "explanation", "explanationEn"]) {
      if (typeof q?.[field] !== "string" || q[field].trim() === "") fail(slug, `${where} missing "${field}"`);
    }

    if (!Array.isArray(q?.options) || !Array.isArray(q?.optionsEn)) {
      fail(slug, `${where} options/optionsEn must both be arrays`);
      return;
    }

    if (q.options.length !== q.optionsEn.length) {
      fail(slug, `${where} options (${q.options.length}) and optionsEn (${q.optionsEn.length}) differ in length`);
    }

    if (q.options.length < 2) fail(slug, `${where} needs at least 2 options`);

    if (!Number.isInteger(q?.answer) || q.answer < 0 || q.answer >= q.options.length) {
      fail(slug, `${where} answer ${q?.answer} is out of range 0..${q.options.length - 1}`);
    }

    // Per-option rationale is optional, but a partial one is worse than none:
    // the UI indexes it against `options`, so a short array silently drops the
    // "why" from the last options rather than failing loudly.
    const rationaleFields = ["optionExplanations", "optionExplanationsEn"];
    const present = rationaleFields.filter((f) => q?.[f] !== undefined);

    if (present.length === 1) {
      fail(slug, `${where} has "${present[0]}" but not "${rationaleFields.find((f) => f !== present[0])}"`);
    }

    present.forEach((field) => {
      const arr = q[field];

      if (!Array.isArray(arr)) {
        fail(slug, `${where} "${field}" must be an array`);
      } else if (arr.length !== q.options.length) {
        fail(slug, `${where} "${field}" has ${arr.length} entries but there are ${q.options.length} options`);
      } else if (arr.some((s) => typeof s !== "string" || s.trim() === "")) {
        fail(slug, `${where} "${field}" has an empty entry — every option needs a reason`);
      }
    });
  });

  totalQuestions += questions.length;

  // ---------------------------------------------------------------- drills.json
  //
  // Optional, and deliberately separate from questions.json: the exam, the
  // mini-lesson player and the Daily Quick Test all assume one stem / one key /
  // one index, and lessons.json must account for every question in the bank.
  // Drills are neither, so they live alongside rather than inside.
  if (existsSync(at("drills.json"))) {
    let drills = [];

    try {
      ({ drills } = readJson(at("drills.json")));
    } catch (err) {
      fail(slug, `drills.json unreadable (${err.message})`);
      drills = [];
    }

    if (!Array.isArray(drills)) {
      fail(slug, "drills.json has no drills array");
      drills = [];
    }

    const drillIds = new Set();

    drills.forEach((d, i) => {
      const where = `drills[${i}]${d?.id ? ` (${d.id})` : ""}`;
      const nonEmpty = (v) => typeof v === "string" && v.trim() !== "";

      if (!d?.id) {
        fail(slug, `${where} has no id`);
      } else if (drillIds.has(d.id)) {
        fail(slug, `${where} duplicate id`);
      } else if (questionIds.has(d.id)) {
        // Recall stats are keyed `${slug}#${id}` across both banks, so a drill
        // that reuses a question's id would silently share its history.
        fail(slug, `${where} id collides with a question id in questions.json`);
      } else {
        drillIds.add(d.id);
      }

      for (const field of ["prompt", "promptEn", "explanation", "explanationEn"]) {
        if (!nonEmpty(d?.[field])) fail(slug, `${where} missing "${field}"`);
      }

      if (!DRILL_TYPES.has(d?.type)) {
        fail(slug, `${where} unknown type "${d?.type}" (expected ${[...DRILL_TYPES].join(", ")})`);

        return;
      }

      if (d.type === "multi") {
        if (!Array.isArray(d.options) || !Array.isArray(d.optionsEn)) {
          fail(slug, `${where} options/optionsEn must both be arrays`);

          return;
        }

        if (d.options.length !== d.optionsEn.length) {
          fail(slug, `${where} options (${d.options.length}) and optionsEn (${d.optionsEn.length}) differ in length`);
        }

        if (d.options.length < 4) fail(slug, `${where} needs at least 4 options`);

        if (d.options.some((o) => !nonEmpty(o)) || d.optionsEn.some((o) => !nonEmpty(o))) {
          fail(slug, `${where} has an empty option`);
        }

        if (!Array.isArray(d.answers) || d.answers.length < 2) {
          fail(slug, `${where} needs at least 2 answers — otherwise it is a plain question`);

          return;
        }

        if (new Set(d.answers).size !== d.answers.length) fail(slug, `${where} answers contains a duplicate index`);

        d.answers.forEach((n) => {
          if (!Number.isInteger(n) || n < 0 || n >= d.options.length) {
            fail(slug, `${where} answer ${n} is out of range 0..${d.options.length - 1}`);
          }
        });

        // "Pick 4 of 4" is not a question. There must be a wrong answer to avoid.
        if (d.answers.length >= d.options.length) {
          fail(slug, `${where} marks every option correct — there is nothing to get wrong`);
        }
      }

      if (d.type === "recall") {
        for (const field of ["answer", "answerEn"]) {
          if (!nonEmpty(d?.[field])) fail(slug, `${where} missing "${field}"`);
        }

        if (!Array.isArray(d.accept) || d.accept.length === 0 || d.accept.some((a) => !nonEmpty(a))) {
          fail(slug, `${where} needs a non-empty "accept" array`);

          return;
        }

        // The answer shown after grading must itself be accepted, or the drill
        // marks the learner wrong for typing exactly what it then shows them.
        const accepted = new Set(d.accept.map(normalizeAnswer));

        for (const field of ["answer", "answerEn"]) {
          if (nonEmpty(d[field]) && !accepted.has(normalizeAnswer(d[field]))) {
            fail(slug, `${where} "${field}" (${d[field]}) is not in "accept"`);
          }
        }
      }

      if (d.type === "match") {
        if (!Array.isArray(d.pairs) || d.pairs.length < 3) {
          fail(slug, `${where} needs at least 3 pairs`);

          return;
        }

        if (d.pairs.length > 5) fail(slug, `${where} has ${d.pairs.length} pairs — more than 5 is unplayable on a phone`);

        d.pairs.forEach((pair, pi) => {
          for (const field of ["left", "leftEn", "right", "rightEn"]) {
            if (!nonEmpty(pair?.[field])) fail(slug, `${where} pairs[${pi}] missing "${field}"`);
          }
        });

        for (const side of ["left", "right"]) {
          const values = d.pairs.map((pair) => pair?.[side]);

          if (new Set(values).size !== values.length) {
            fail(slug, `${where} has two identical "${side}" values — the pairing would be ambiguous`);
          }
        }
      }

      if (d.type === "order") {
        if (!Array.isArray(d.items) || d.items.length < 3) {
          fail(slug, `${where} needs at least 3 items`);

          return;
        }

        if (d.items.length > 6) fail(slug, `${where} has ${d.items.length} items — more than 6 is unplayable on a clock`);

        d.items.forEach((item, ii) => {
          for (const field of ["text", "textEn"]) {
            if (!nonEmpty(item?.[field])) fail(slug, `${where} items[${ii}] missing "${field}"`);
          }
        });
      }
    });

    totalDrills += drills.length;

    if (drills.length > 0) topicsWithDrills += 1;
  }

  // -------------------------------------------------------------- lessons.json
  if (!existsSync(at("lessons.json"))) continue;

  let lessons = [];
  try {
    ({ lessons } = readJson(at("lessons.json")));
  } catch (err) {
    fail(slug, `lessons.json unreadable (${err.message})`);
    continue;
  }

  if (!Array.isArray(lessons) || lessons.length === 0) {
    fail(slug, "lessons.json has no lessons");
    continue;
  }

  topicsWithLessons += 1;
  totalLessons += lessons.length;

  const lessonIds = new Set();
  const covered = [];
  const usedQuestions = new Set();

  lessons.forEach((lesson, i) => {
    const where = `lessons[${i}]${lesson?.id ? ` (${lesson.id})` : ""}`;

    if (!lesson?.id) fail(slug, `${where} has no id`);
    else if (lessonIds.has(lesson.id)) fail(slug, `${where} duplicate id`);
    else lessonIds.add(lesson.id);

    for (const field of ["title", "titleEn"]) {
      if (typeof lesson?.[field] !== "string" || lesson[field].trim() === "") {
        fail(slug, `${where} missing "${field}"`);
      }
    }

    if (!Array.isArray(lesson?.sections) || lesson.sections.length === 0) {
      fail(slug, `${where} has no sections`);
    } else {
      lesson.sections.forEach((n) => {
        if (!Number.isInteger(n) || n < 1 || n > viSections) {
          fail(slug, `${where} references section ${n}, outside 1..${viSections}`);
        } else {
          covered.push(n);
        }
      });
    }

    if (!Array.isArray(lesson?.questionIds)) {
      fail(slug, `${where} questionIds must be an array`);
    } else {
      lesson.questionIds.forEach((qid) => {
        if (!questionIds.has(qid)) fail(slug, `${where} references unknown question "${qid}"`);
        else usedQuestions.add(qid);
      });

      if (lesson.questionIds.length === 0 && lesson.recap !== true) {
        fail(slug, `${where} has no questions but is not marked "recap": true`);
      }
    }
  });

  // Every section must appear exactly once, and the run must be in order — the
  // player slices the article by these indices, so a gap silently hides content.
  const expected = Array.from({ length: viSections }, (_, i) => i + 1);
  const sorted = [...covered].sort((a, b) => a - b);

  if (sorted.join(",") !== expected.join(",")) {
    fail(slug, `lessons cover sections [${sorted.join(",")}] but the article has 1..${viSections}`);
  }

  if (covered.join(",") !== sorted.join(",")) {
    fail(slug, "lesson sections are not in ascending order across lessons");
  }

  const unused = [...questionIds].filter((qid) => !usedQuestions.has(qid));
  if (unused.length > 0) {
    fail(slug, `questions never used by any lesson: ${unused.join(", ")}`);
  }
}

console.log(
  `Checked ${slugs.length} topic(s): ${totalQuestions} questions, ` +
    `${topicsWithLessons} with lessons (${totalLessons} mini-lessons), ` +
    `${topicsWithDrills} with drills (${totalDrills} drills).`
);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  problems.forEach((p) => console.error(`  - ${p}`));
  process.exit(1);
}

console.log("All content valid.");
