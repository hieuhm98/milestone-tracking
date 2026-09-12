// Learning-progress store.
//
// The app is public and has no accounts, so the browser's localStorage is the
// live source of truth. Two extra layers keep progress from being tied to a
// single browser session:
//
//   1. A committed snapshot at `data/progress.json` is copied into `public/` at
//      build time, so every deploy ships the latest committed state and a fresh
//      browser seeds from it instead of starting empty.
//   2. On hosts with a writable filesystem (local dev, Railway/Render/Fly, a
//      VPS, Docker) `/api/progress` writes the snapshot back to `data/`.
//      Vercel's runtime filesystem is read-only, so write-back is skipped there
//      and localStorage simply carries on alone.

export const PROGRESS_VERSION = 1;
export const STORAGE_KEY = "progress:v1";
/** Static seed shipped with the build (written by scripts/sync-progress.mjs). */
export const SEED_URL = "/progress.json";
/** Reviews are unbounded over time; keep the snapshot small. */
export const MAX_REVIEWS = 200;

/** One topic's quiz state. `answers` maps question id → chosen option index. */
export interface TopicProgress {
  answers: Record<string, number>;
  /** Question count of the topic at the time of the last attempt. */
  total: number;
  /** Correct answers on the most recent attempt. */
  correct: number;
  /** Best percentage ever scored on this topic (0–100). */
  bestPct: number;
  /** How many times results were viewed for this topic. */
  attempts: number;
  updatedAt: string;
}

/** One finished Daily Quick Test / random review session. */
export interface ReviewEntry {
  at: string;
  total: number;
  correct: number;
  groups: string[];
}

/** One mini-lesson's state. Keyed by `${slug}#${lessonId}`. */
export interface LessonProgress {
  /** Score on the last warm-up test (0–100); diagnostic, never blocks. */
  warmupPct: number;
  /** Score on the last and best check tests (0–100). */
  lastCheckPct: number;
  bestCheckPct: number;
  attempts: number;
  completed: boolean;
  completedAt: string | null;
  updatedAt: string;
}

/** Per-question recall, so review draws favour what is weak or stale. */
export interface RecallStat {
  seen: number;
  correct: number;
  lastAt: string;
}

/**
 * One track's final-exam record, keyed by **group id** rather than by slug —
 * the exam is drawn from the whole track, so the track is the thing that gets
 * passed. `passed` and `passedAt` are sticky: a later failed retake never takes
 * a pass away, the same way a weak quiz retake never lowers `bestPct`.
 */
export interface ExamProgress {
  attempts: number;
  /** Best percentage ever scored on this track's exam (0-100). */
  bestPct: number;
  /** The most recent sitting. */
  lastPct: number;
  lastTotal: number;
  lastCorrect: number;
  /** How long the most recent sitting took, in seconds. */
  lastSeconds: number;
  passed: boolean;
  /** When the track was first passed. */
  passedAt: string | null;
  updatedAt: string;
}

/**
 * One track's Blitz record, keyed by **`${group}:${seconds}`** rather than by
 * group alone — a 60-second best and a 180-second best are not comparable
 * numbers, and folding them into one field would mean every longer run
 * permanently beat every shorter one.
 */
export interface BlitzProgress {
  runs: number;
  /** Best score ever posted on this track at this duration. */
  bestScore: number;
  /** Longest correct streak, and most correct answers, in any single run. */
  bestCombo: number;
  bestCorrect: number;
  /** The most recent run. */
  lastScore: number;
  lastCorrect: number;
  lastAnswered: number;
  updatedAt: string;
}

export interface ProgressData {
  version: number;
  updatedAt: string;
  topics: Record<string, TopicProgress>;
  reviews: ReviewEntry[];
  /** Mini-lesson state, keyed by `${slug}#${lessonId}`. */
  lessons: Record<string, LessonProgress>;
  /** Question recall stats, keyed by `${slug}#${questionId}`. */
  recall: Record<string, RecallStat>;
  /** Final-exam results, keyed by **group id** (see `lib/groups.ts`). */
  exams: Record<string, ExamProgress>;
  /** Blitz records, keyed by `blitzKey(group, seconds)`. */
  blitz: Record<string, BlitzProgress>;
}

/** A check test at or above this score marks the mini-lesson complete. */
export const PASS_PCT = 70;

export function emptyProgress(): ProgressData {
  return {
    version: PROGRESS_VERSION,
    updatedAt: new Date(0).toISOString(),
    topics: {},
    reviews: [],
    lessons: {},
    recall: {},
    exams: {},
    blitz: {},
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function isoOr(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;

  const ms = Date.parse(value);

  return Number.isNaN(ms) ? fallback : new Date(ms).toISOString();
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** A percentage, clamped into 0-100. */
function pct(value: unknown): number {
  return Math.max(0, Math.min(100, num(value)));
}

/**
 * Coerce anything (a hand-edited file, an imported backup, a stale localStorage
 * blob) into a valid ProgressData. Unknown fields are dropped rather than
 * trusted, so a malformed snapshot can never crash the app.
 */
export function normalize(raw: unknown): ProgressData {
  if (!isRecord(raw)) return emptyProgress();

  const epoch = new Date(0).toISOString();
  const topics: Record<string, TopicProgress> = {};

  if (isRecord(raw.topics)) {
    for (const [slug, value] of Object.entries(raw.topics)) {
      if (!isRecord(value)) continue;

      const answers: Record<string, number> = {};

      if (isRecord(value.answers)) {
        for (const [qid, choice] of Object.entries(value.answers)) {
          if (typeof choice === "number" && Number.isInteger(choice) && choice >= 0) {
            answers[qid] = choice;
          }
        }
      }

      topics[slug] = {
        answers,
        total: num(value.total),
        correct: num(value.correct),
        bestPct: Math.max(0, Math.min(100, num(value.bestPct))),
        attempts: num(value.attempts),
        updatedAt: isoOr(value.updatedAt, epoch),
      };
    }
  }

  const reviews: ReviewEntry[] = [];

  if (Array.isArray(raw.reviews)) {
    for (const value of raw.reviews) {
      if (!isRecord(value) || typeof value.at !== "string") continue;

      reviews.push({
        at: isoOr(value.at, epoch),
        total: num(value.total),
        correct: num(value.correct),
        groups: Array.isArray(value.groups) ? value.groups.filter((g): g is string => typeof g === "string") : [],
      });
    }
  }

  reviews.sort((a, b) => b.at.localeCompare(a.at));

  const lessons: Record<string, LessonProgress> = {};

  if (isRecord(raw.lessons)) {
    for (const [key, value] of Object.entries(raw.lessons)) {
      if (!isRecord(value)) continue;

      lessons[key] = {
        warmupPct: Math.max(0, Math.min(100, num(value.warmupPct))),
        lastCheckPct: Math.max(0, Math.min(100, num(value.lastCheckPct))),
        bestCheckPct: Math.max(0, Math.min(100, num(value.bestCheckPct))),
        attempts: num(value.attempts),
        completed: value.completed === true,
        completedAt: typeof value.completedAt === "string" ? isoOr(value.completedAt, epoch) : null,
        updatedAt: isoOr(value.updatedAt, epoch),
      };
    }
  }

  const recall: Record<string, RecallStat> = {};

  if (isRecord(raw.recall)) {
    for (const [key, value] of Object.entries(raw.recall)) {
      if (!isRecord(value)) continue;

      recall[key] = {
        seen: num(value.seen),
        correct: num(value.correct),
        lastAt: isoOr(value.lastAt, epoch),
      };
    }
  }

  const exams: Record<string, ExamProgress> = {};

  if (isRecord(raw.exams)) {
    for (const [group, value] of Object.entries(raw.exams)) {
      if (!isRecord(value)) continue;

      exams[group] = {
        attempts: num(value.attempts),
        bestPct: pct(value.bestPct),
        lastPct: pct(value.lastPct),
        lastTotal: num(value.lastTotal),
        lastCorrect: num(value.lastCorrect),
        lastSeconds: num(value.lastSeconds),
        passed: value.passed === true,
        passedAt: typeof value.passedAt === "string" ? isoOr(value.passedAt, epoch) : null,
        updatedAt: isoOr(value.updatedAt, epoch),
      };
    }
  }

  const blitz: Record<string, BlitzProgress> = {};

  if (isRecord(raw.blitz)) {
    for (const [key, value] of Object.entries(raw.blitz)) {
      if (!isRecord(value)) continue;

      blitz[key] = {
        runs: num(value.runs),
        bestScore: num(value.bestScore),
        bestCombo: num(value.bestCombo),
        bestCorrect: num(value.bestCorrect),
        lastScore: num(value.lastScore),
        lastCorrect: num(value.lastCorrect),
        lastAnswered: num(value.lastAnswered),
        updatedAt: isoOr(value.updatedAt, epoch),
      };
    }
  }

  return {
    version: PROGRESS_VERSION,
    updatedAt: isoOr(raw.updatedAt, epoch),
    topics,
    reviews: reviews.slice(0, MAX_REVIEWS),
    lessons,
    recall,
    exams,
    blitz,
  };
}

/**
 * Combine two snapshots — used when the seed file and localStorage both hold
 * state (a returning browser after a deploy, or an imported backup). Per topic
 * the newer `updatedAt` wins; reviews are unioned and de-duped by timestamp.
 */
export function mergeProgress(a: ProgressData, b: ProgressData): ProgressData {
  const topics: Record<string, TopicProgress> = { ...a.topics };

  for (const [slug, incoming] of Object.entries(b.topics)) {
    const existing = topics[slug];

    if (!existing || incoming.updatedAt >= existing.updatedAt) {
      topics[slug] = { ...incoming, bestPct: Math.max(incoming.bestPct, existing?.bestPct ?? 0) };
    } else {
      topics[slug] = { ...existing, bestPct: Math.max(existing.bestPct, incoming.bestPct) };
    }
  }

  const byTime = new Map<string, ReviewEntry>();
  [...a.reviews, ...b.reviews].forEach((r) => byTime.set(r.at, r));

  const reviews = Array.from(byTime.values())
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, MAX_REVIEWS);

  const lessons: Record<string, LessonProgress> = { ...a.lessons };

  for (const [key, incoming] of Object.entries(b.lessons)) {
    const existing = lessons[key];
    const winner = !existing || incoming.updatedAt >= existing.updatedAt ? incoming : existing;

    // Best score and completion are monotonic — never undone by a merge.
    lessons[key] = {
      ...winner,
      bestCheckPct: Math.max(incoming.bestCheckPct, existing?.bestCheckPct ?? 0),
      attempts: Math.max(incoming.attempts, existing?.attempts ?? 0),
      completed: incoming.completed || (existing?.completed ?? false),
      completedAt: existing?.completedAt ?? incoming.completedAt,
    };
  }

  const recall: Record<string, RecallStat> = { ...a.recall };

  for (const [key, incoming] of Object.entries(b.recall)) {
    const existing = recall[key];

    recall[key] = {
      seen: Math.max(incoming.seen, existing?.seen ?? 0),
      correct: Math.max(incoming.correct, existing?.correct ?? 0),
      lastAt: incoming.lastAt >= (existing?.lastAt ?? "") ? incoming.lastAt : existing.lastAt,
    };
  }

  const exams: Record<string, ExamProgress> = { ...a.exams };

  for (const [group, incoming] of Object.entries(b.exams)) {
    exams[group] = mergeExam(exams[group], incoming);
  }

  const blitz: Record<string, BlitzProgress> = { ...a.blitz };

  for (const [key, incoming] of Object.entries(b.blitz)) {
    blitz[key] = mergeBlitz(blitz[key], incoming);
  }

  return {
    version: PROGRESS_VERSION,
    updatedAt: a.updatedAt >= b.updatedAt ? a.updatedAt : b.updatedAt,
    topics,
    reviews,
    lessons,
    recall,
    exams,
    blitz,
  };
}

// ------------------------------------------------------------- import merging
//
// Importing a backup must never cost the learner work, in either direction.
// A file is not a replacement for what this browser holds and this browser is
// not a replacement for the file — the two are folded together entry by entry,
// always keeping the bigger progress:
//
//   * A topic, lesson, or question only one side has is carried straight over.
//   * A quiz answered on both sides keeps the union of the answers, so a topic
//     half-finished here and half-finished there ends up further along than
//     either side was alone.
//   * Monotonic facts — best score, attempt counts, completion, recall tallies —
//     take the larger value, so nothing ever moves backwards.
//   * Only the fields that describe *the most recent attempt* (last score, the
//     answers chosen for a question both sides answered) follow recency, and
//     they are settled per entry so a stale file cannot undo a fresh answer.
//
// The per-course comparison is what the import *shows* — which track each side
// is further ahead on, and what the merge adds to it — but the courses do not
// decide anything, because deciding at that level would mean discarding a newer
// topic just for sharing a course with an older one.

/** slug → group id, as served by `/api/knowledge`. */
export type TopicGroups = Record<string, string>;

/** Bucket for progress whose topic is no longer in the catalogue. */
export const UNKNOWN_COURSE = "__unknown";

/** Progress is keyed by `slug`, `slug#lessonId`, or `slug#questionId`. */
export function keySlug(key: string): string {
  const hash = key.indexOf("#");

  return hash === -1 ? key : key.slice(0, hash);
}

export function courseOf(key: string, groups: TopicGroups): string {
  return groups[keySlug(key)] ?? UNKNOWN_COURSE;
}

/**
 * Blitz records are keyed by `${group}:${seconds}`, so unlike every other key
 * in the store the course is the prefix rather than a slug that has to be
 * looked up in the catalogue.
 */
export function blitzKey(group: string, seconds: number): string {
  return `${group}:${seconds}`;
}

export function blitzCourse(key: string): string {
  const colon = key.indexOf(":");

  return colon === -1 ? key : key.slice(0, colon);
}

/** What one course holds in a snapshot — the unit the import preview compares. */
export interface CourseSnapshot {
  course: string;
  /** Latest activity anywhere in the course; "" when it holds nothing. */
  updatedAt: string;
  topics: number;
  answered: number;
  lessonsCompleted: number;
  /** Best final-exam score for this course (0-100); 0 when never sat. */
  examBestPct: number;
  /** Best Blitz score for this course, across every duration; 0 when never run. */
  blitzBestScore: number;
}

export function courseSnapshots(data: ProgressData, groups: TopicGroups): Map<string, CourseSnapshot> {
  const out = new Map<string, CourseSnapshot>();

  function bucket(course: string): CourseSnapshot {
    const existing = out.get(course);

    if (existing) return existing;

    const fresh: CourseSnapshot = {
      course,
      updatedAt: "",
      topics: 0,
      answered: 0,
      lessonsCompleted: 0,
      examBestPct: 0,
      blitzBestScore: 0,
    };

    out.set(course, fresh);

    return fresh;
  }

  for (const [slug, topic] of Object.entries(data.topics)) {
    const snap = bucket(courseOf(slug, groups));

    snap.topics += 1;
    snap.answered += Object.keys(topic.answers).length;

    if (topic.updatedAt > snap.updatedAt) snap.updatedAt = topic.updatedAt;
  }

  for (const [key, lesson] of Object.entries(data.lessons)) {
    const snap = bucket(courseOf(key, groups));

    if (lesson.completed) snap.lessonsCompleted += 1;

    if (lesson.updatedAt > snap.updatedAt) snap.updatedAt = lesson.updatedAt;
  }

  for (const [key, stat] of Object.entries(data.recall)) {
    const snap = bucket(courseOf(key, groups));

    if (stat.lastAt > snap.updatedAt) snap.updatedAt = stat.lastAt;
  }

  // Exams are already keyed by course, so unlike everything above they need no
  // slug lookup — and they are the one entry a course can hold with no topics.
  for (const [course, exam] of Object.entries(data.exams)) {
    const snap = bucket(course);

    snap.examBestPct = Math.max(snap.examBestPct, exam.bestPct);

    if (exam.updatedAt > snap.updatedAt) snap.updatedAt = exam.updatedAt;
  }

  // Blitz keys carry their course as a prefix, so they bucket directly too —
  // and the per-duration records of one track all fold into that track's row.
  for (const [key, run] of Object.entries(data.blitz)) {
    const snap = bucket(blitzCourse(key));

    snap.blitzBestScore = Math.max(snap.blitzBestScore, run.bestScore);

    if (run.updatedAt > snap.updatedAt) snap.updatedAt = run.updatedAt;
  }

  return out;
}

/** Which side of a course has been studied more recently. */
export type CourseSide = "local" | "imported" | "equal";

/** What the import adds to one course. */
export interface CourseGain {
  topics: number;
  answered: number;
  lessonsCompleted: number;
  /** Points the import adds to this course's best exam score. */
  examBestPct: number;
  /** Points the import adds to this course's best Blitz score. */
  blitzBestScore: number;
}

export interface CourseDiff {
  course: string;
  /** Context only — being behind never costs a course anything. */
  ahead: CourseSide;
  local: CourseSnapshot | null;
  imported: CourseSnapshot | null;
  gain: CourseGain;
}

export interface CourseMerge {
  data: ProgressData;
  courses: CourseDiff[];
  /** Review sessions the file adds that this browser did not already have. */
  newReviews: number;
}

/** Fold `b` into `a`, reconciling the keys both of them hold. */
function union<T>(a: Record<string, T>, b: Record<string, T>, reconcile: (x: T, y: T) => T): Record<string, T> {
  const out: Record<string, T> = { ...a };

  for (const [key, incoming] of Object.entries(b)) {
    const existing = out[key];

    out[key] = existing ? reconcile(existing, incoming) : incoming;
  }

  return out;
}

/** The first time something was completed, ignoring nulls. */
function earliest(a: string | null, b: string | null): string | null {
  if (!a) return b;

  if (!b) return a;

  return a <= b ? a : b;
}

/**
 * Two records of the same topic. The answer maps are unioned so neither side
 * loses a question it answered; where both answered the *same* question, the
 * more recent sitting is the one that counts.
 */
function mergeTopic(a: TopicProgress, b: TopicProgress): TopicProgress {
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  const older = newer === a ? b : a;

  return {
    answers: { ...older.answers, ...newer.answers },
    total: Math.max(a.total, b.total),
    // `correct` describes the latest attempt, so it comes from that attempt.
    correct: newer.correct,
    bestPct: Math.max(a.bestPct, b.bestPct),
    attempts: Math.max(a.attempts, b.attempts),
    updatedAt: newer.updatedAt,
  };
}

function mergeLesson(a: LessonProgress, b: LessonProgress): LessonProgress {
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  const older = newer === a ? b : a;

  return {
    // A "last score" of 0 means that side never ran the phase — not a result.
    warmupPct: newer.warmupPct || older.warmupPct,
    lastCheckPct: newer.lastCheckPct || older.lastCheckPct,
    bestCheckPct: Math.max(a.bestCheckPct, b.bestCheckPct),
    attempts: Math.max(a.attempts, b.attempts),
    completed: a.completed || b.completed,
    completedAt: earliest(a.completedAt, b.completedAt),
    updatedAt: newer.updatedAt,
  };
}

/**
 * Recall is a pair of lifetime tallies. An export is usually an earlier copy of
 * the same history rather than a separate one, so the larger tally is the true
 * count — summing them would double-count a re-imported backup.
 */
/**
 * Which of two sittings is the later one.
 *
 * `updatedAt` decides it almost always, but two records can carry the same
 * millisecond, and falling back to argument order there would make the merge
 * direction-dependent — importing A into B would not match importing B into A.
 * So the tie runs down every field the winner supplies, and only records that
 * agree on all of them are treated as interchangeable.
 */
function laterExam(a: ExamProgress, b: ExamProgress): ExamProgress {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;

  if (a.attempts !== b.attempts) return a.attempts > b.attempts ? a : b;

  if (a.lastPct !== b.lastPct) return a.lastPct > b.lastPct ? a : b;

  if (a.lastCorrect !== b.lastCorrect) return a.lastCorrect > b.lastCorrect ? a : b;

  if (a.lastTotal !== b.lastTotal) return a.lastTotal > b.lastTotal ? a : b;

  if (a.lastSeconds !== b.lastSeconds) return a.lastSeconds > b.lastSeconds ? a : b;

  return a;
}

/**
 * Two records of the same track's exam. Best score, attempts and the pass are
 * monotonic; only the "last sitting" fields follow recency. A record with no
 * attempts means that side never sat the exam, so its zeroed last-sitting
 * fields must never overwrite a real result from the other side.
 */
function mergeExam(a: ExamProgress | undefined, b: ExamProgress): ExamProgress {
  if (!a) return b;

  const newer = laterExam(a, b);
  const older = newer === a ? b : a;
  const lastFrom = newer.attempts > 0 ? newer : older;

  return {
    attempts: Math.max(a.attempts, b.attempts),
    bestPct: Math.max(a.bestPct, b.bestPct),
    lastPct: lastFrom.lastPct,
    lastTotal: lastFrom.lastTotal,
    lastCorrect: lastFrom.lastCorrect,
    lastSeconds: lastFrom.lastSeconds,
    passed: a.passed || b.passed,
    passedAt: earliest(a.passedAt, b.passedAt),
    updatedAt: newer.updatedAt,
  };
}

/**
 * Which of two Blitz records is the later one. Same reasoning as `laterExam`:
 * two records can share a millisecond, and breaking that tie by argument order
 * would make `mergeImport(a, b)` disagree with `mergeImport(b, a)`.
 */
function laterBlitz(a: BlitzProgress, b: BlitzProgress): BlitzProgress {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;

  if (a.runs !== b.runs) return a.runs > b.runs ? a : b;

  if (a.lastScore !== b.lastScore) return a.lastScore > b.lastScore ? a : b;

  if (a.lastCorrect !== b.lastCorrect) return a.lastCorrect > b.lastCorrect ? a : b;

  if (a.lastAnswered !== b.lastAnswered) return a.lastAnswered > b.lastAnswered ? a : b;

  return a;
}

/**
 * Two records of the same track+duration. Every "best" is monotonic; only the
 * "last run" fields follow recency, and a record with no runs means that side
 * never played, so its zeroed last-run fields must not overwrite a real result.
 */
function mergeBlitz(a: BlitzProgress | undefined, b: BlitzProgress): BlitzProgress {
  if (!a) return b;

  const newer = laterBlitz(a, b);
  const older = newer === a ? b : a;
  const lastFrom = newer.runs > 0 ? newer : older;

  return {
    runs: Math.max(a.runs, b.runs),
    bestScore: Math.max(a.bestScore, b.bestScore),
    bestCombo: Math.max(a.bestCombo, b.bestCombo),
    bestCorrect: Math.max(a.bestCorrect, b.bestCorrect),
    lastScore: lastFrom.lastScore,
    lastCorrect: lastFrom.lastCorrect,
    lastAnswered: lastFrom.lastAnswered,
    updatedAt: newer.updatedAt,
  };
}

function mergeRecall(a: RecallStat, b: RecallStat): RecallStat {
  return {
    seen: Math.max(a.seen, b.seen),
    correct: Math.max(a.correct, b.correct),
    lastAt: a.lastAt >= b.lastAt ? a.lastAt : b.lastAt,
  };
}

/**
 * Compare the two snapshots course by course and report what the merge does to
 * each — this is what the import preview renders before anything is written.
 */
export function diffCourses(
  local: ProgressData,
  imported: ProgressData,
  merged: ProgressData,
  groups: TopicGroups
): CourseDiff[] {
  const mine = courseSnapshots(local, groups);
  const theirs = courseSnapshots(imported, groups);
  const after = courseSnapshots(merged, groups);
  const ids = new Set(Array.from(mine.keys()).concat(Array.from(theirs.keys())));

  return Array.from(ids).map((course) => {
    const a = mine.get(course) ?? null;
    const b = theirs.get(course) ?? null;
    const end = after.get(course) ?? null;
    const at = a?.updatedAt ?? "";
    const bt = b?.updatedAt ?? "";

    let ahead: CourseSide = "equal";

    if (bt > at) {
      ahead = "imported";
    } else if (at > bt) {
      ahead = "local";
    }

    return {
      course,
      ahead,
      local: a,
      imported: b,
      gain: {
        topics: (end?.topics ?? 0) - (a?.topics ?? 0),
        answered: (end?.answered ?? 0) - (a?.answered ?? 0),
        lessonsCompleted: (end?.lessonsCompleted ?? 0) - (a?.lessonsCompleted ?? 0),
        examBestPct: (end?.examBestPct ?? 0) - (a?.examBestPct ?? 0),
        blitzBestScore: (end?.blitzBestScore ?? 0) - (a?.blitzBestScore ?? 0),
      },
    };
  });
}

/** True when an import leaves a course exactly as it was. */
export function isUnchanged(gain: CourseGain): boolean {
  return (
    gain.topics === 0 &&
    gain.answered === 0 &&
    gain.lessonsCompleted === 0 &&
    gain.examBestPct === 0 &&
    gain.blitzBestScore === 0
  );
}

/**
 * Merge an imported snapshot into the current one. Returns the merged data
 * alongside the per-course comparison, so the UI can show what it will do
 * before the learner commits to it.
 */
export function mergeImport(local: ProgressData, imported: ProgressData, groups: TopicGroups): CourseMerge {
  const known = new Set(local.reviews.map((r) => r.at));
  const added = imported.reviews.filter((r) => !known.has(r.at));

  const data: ProgressData = {
    version: PROGRESS_VERSION,
    updatedAt: new Date().toISOString(),
    topics: union(local.topics, imported.topics, mergeTopic),
    reviews: local.reviews.concat(added).sort((x, y) => y.at.localeCompare(x.at)).slice(0, MAX_REVIEWS),
    lessons: union(local.lessons, imported.lessons, mergeLesson),
    recall: union(local.recall, imported.recall, mergeRecall),
    exams: union(local.exams, imported.exams, (x, y) => mergeExam(x, y)),
    blitz: union(local.blitz, imported.blitz, (x, y) => mergeBlitz(x, y)),
  };

  return { data, courses: diffCourses(local, imported, data, groups), newReviews: added.length };
}

// ---------------------------------------------------------------- localStorage

export function loadLocal(): ProgressData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveLocal(data: ProgressData): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota or private-mode failure — progress stays in memory for this session.
  }
}

// ------------------------------------------------------------------- mutations

interface QuizResult {
  answers: Record<string, number>;
  correct: number;
  total: number;
  /** Only count an attempt when the learner actually viewed their results. */
  attempted: boolean;
}

export function recordQuiz(prev: ProgressData, slug: string, result: QuizResult): ProgressData {
  const now = new Date().toISOString();
  const existing = prev.topics[slug];
  const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;

  const topic: TopicProgress = {
    answers: result.answers,
    total: result.total,
    correct: result.correct,
    bestPct: result.attempted ? Math.max(existing?.bestPct ?? 0, pct) : existing?.bestPct ?? 0,
    attempts: (existing?.attempts ?? 0) + (result.attempted ? 1 : 0),
    updatedAt: now,
  };

  return { ...prev, updatedAt: now, topics: { ...prev.topics, [slug]: topic } };
}

/** One finished sitting of a track's final exam. */
export interface ExamResult {
  correct: number;
  total: number;
  /** Wall-clock seconds the learner spent on the paper. */
  seconds: number;
  /** Per-question outcomes, so a sitting also sharpens the review ranking. */
  answered: AnsweredQuestion[];
}

/**
 * Record a finished final exam for one track.
 *
 * A sitting is also logged as a review entry, so an exam feeds the study streak
 * and the review-accuracy figure the same way a Daily Quick Test does — it is,
 * after all, the largest review session the learner ever runs.
 */
export function recordExam(prev: ProgressData, group: string, result: ExamResult): ProgressData {
  const now = new Date().toISOString();
  const existing = prev.exams[group];
  const scored = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
  const passedNow = result.total > 0 && scored >= PASS_PCT;

  const exam: ExamProgress = {
    attempts: (existing?.attempts ?? 0) + 1,
    bestPct: Math.max(existing?.bestPct ?? 0, scored),
    lastPct: scored,
    lastTotal: result.total,
    lastCorrect: result.correct,
    lastSeconds: Math.max(0, Math.round(result.seconds)),
    // Passing is sticky: a weaker retake never takes the pass away.
    passed: (existing?.passed ?? false) || passedNow,
    passedAt: existing?.passedAt ?? (passedNow ? now : null),
    updatedAt: now,
  };

  const reviews = [
    { at: now, total: result.total, correct: result.correct, groups: [group] },
    ...prev.reviews,
  ].slice(0, MAX_REVIEWS);

  return {
    ...prev,
    updatedAt: now,
    reviews,
    recall: applyRecall(prev.recall, result.answered, now),
    exams: { ...prev.exams, [group]: exam },
  };
}

/** One finished Blitz run. */
export interface BlitzResult {
  /** How long the clock was set to, in seconds — part of the record's key. */
  seconds: number;
  score: number;
  answered: number;
  correct: number;
  bestCombo: number;
  /** Per-question outcomes, so a run also sharpens the review ranking. */
  answers: AnsweredQuestion[];
}

/**
 * Record a finished Blitz run.
 *
 * Like an exam sitting, a run is also logged as a review entry — it feeds the
 * study streak and the review-accuracy figure, because from the progress
 * store's point of view that is exactly what it is: a review session that
 * happened to be timed and scored.
 *
 * A run with nothing answered (started, then abandoned before the first answer)
 * still counts as a run but cannot lower any best, since every best is a max.
 */
export function recordBlitz(prev: ProgressData, group: string, result: BlitzResult): ProgressData {
  const now = new Date().toISOString();
  const key = blitzKey(group, result.seconds);
  const existing = prev.blitz[key];

  const record: BlitzProgress = {
    runs: (existing?.runs ?? 0) + 1,
    bestScore: Math.max(existing?.bestScore ?? 0, result.score),
    bestCombo: Math.max(existing?.bestCombo ?? 0, result.bestCombo),
    bestCorrect: Math.max(existing?.bestCorrect ?? 0, result.correct),
    lastScore: result.score,
    lastCorrect: result.correct,
    lastAnswered: result.answered,
    updatedAt: now,
  };

  const reviews =
    result.answered > 0
      ? [{ at: now, total: result.answered, correct: result.correct, groups: [group] }, ...prev.reviews].slice(
          0,
          MAX_REVIEWS
        )
      : prev.reviews;

  return {
    ...prev,
    updatedAt: now,
    reviews,
    recall: applyRecall(prev.recall, result.answers, now),
    blitz: { ...prev.blitz, [key]: record },
  };
}

/** The best score posted on a track at a given duration, or 0. */
export function blitzBest(data: ProgressData, group: string, seconds: number): BlitzProgress | undefined {
  return data.blitz[blitzKey(group, seconds)];
}

export function recordReview(prev: ProgressData, entry: Omit<ReviewEntry, "at">): ProgressData {
  const now = new Date().toISOString();
  const reviews = [{ at: now, ...entry }, ...prev.reviews].slice(0, MAX_REVIEWS);

  return { ...prev, updatedAt: now, reviews };
}

/** One graded answer, identified by `questionKey(slug, questionId)`. */
export interface AnsweredQuestion {
  key: string;
  correct: boolean;
}

function applyRecall(
  recall: Record<string, RecallStat>,
  answered: AnsweredQuestion[],
  now: string
): Record<string, RecallStat> {
  const next = { ...recall };

  for (const { key, correct } of answered) {
    const existing = next[key];

    next[key] = {
      seen: (existing?.seen ?? 0) + 1,
      correct: (existing?.correct ?? 0) + (correct ? 1 : 0),
      lastAt: now,
    };
  }

  return next;
}

/**
 * Record a finished mini-lesson phase. The warm-up is diagnostic — it updates
 * recall and the displayed score but never completes the lesson; only a check
 * test at or above PASS_PCT does that.
 */
export function recordLessonPhase(
  prev: ProgressData,
  key: string,
  phase: "warmup" | "check",
  pct: number,
  answered: AnsweredQuestion[]
): ProgressData {
  const now = new Date().toISOString();
  const existing = prev.lessons[key];
  const passed = phase === "check" && pct >= PASS_PCT;

  const lesson: LessonProgress = {
    warmupPct: phase === "warmup" ? pct : existing?.warmupPct ?? 0,
    lastCheckPct: phase === "check" ? pct : existing?.lastCheckPct ?? 0,
    bestCheckPct: phase === "check" ? Math.max(existing?.bestCheckPct ?? 0, pct) : existing?.bestCheckPct ?? 0,
    attempts: (existing?.attempts ?? 0) + (phase === "check" ? 1 : 0),
    completed: (existing?.completed ?? false) || passed,
    completedAt: existing?.completedAt ?? (passed ? now : null),
    updatedAt: now,
  };

  return {
    ...prev,
    updatedAt: now,
    lessons: { ...prev.lessons, [key]: lesson },
    recall: applyRecall(prev.recall, answered, now),
  };
}

/**
 * Order a pool of questions by how much they are worth reviewing: never-tested
 * first, then weakest by accuracy, then stalest. The jitter keeps the same
 * handful from cycling forever once everything is answered correctly.
 */
export function rankForReview<T extends { key: string }>(data: ProgressData, pool: T[]): T[] {
  return pool
    .map((item) => {
      const stat = data.recall[item.key];
      const accuracy = stat && stat.seen > 0 ? stat.correct / stat.seen : 0;
      const score = (stat ? accuracy * 2 : -1) + Math.random() * 0.3;

      return { item, score, lastAt: stat?.lastAt ?? "" };
    })
    .sort((a, b) => a.score - b.score || a.lastAt.localeCompare(b.lastAt))
    .map((x) => x.item);
}

export function clearTopic(prev: ProgressData, slug: string): ProgressData {
  const existing = prev.topics[slug];

  if (!existing) return prev;

  const now = new Date().toISOString();

  return {
    ...prev,
    updatedAt: now,
    topics: { ...prev.topics, [slug]: { ...existing, answers: {}, correct: 0, updatedAt: now } },
  };
}

// --------------------------------------------------------------------- derived

export interface TopicStats {
  answered: number;
  total: number;
  correct: number;
  bestPct: number;
  attempts: number;
  started: boolean;
  completed: boolean;
}

export function topicStats(data: ProgressData, slug: string, total?: number): TopicStats {
  const t = data.topics[slug];
  const questionCount = total ?? t?.total ?? 0;
  const answered = t ? Object.keys(t.answers).length : 0;

  return {
    answered,
    total: questionCount,
    correct: t?.correct ?? 0,
    bestPct: t?.bestPct ?? 0,
    attempts: t?.attempts ?? 0,
    started: answered > 0 || (t?.attempts ?? 0) > 0,
    completed: questionCount > 0 && answered >= questionCount && (t?.attempts ?? 0) > 0,
  };
}

export interface OverallStats {
  topicsStarted: number;
  topicsCompleted: number;
  questionsAnswered: number;
  avgBestPct: number;
  reviewSessions: number;
  reviewQuestions: number;
  reviewAccuracy: number;
  lessonsCompleted: number;
  lessonsStarted: number;
  examsTaken: number;
  examsPassed: number;
  blitzRuns: number;
  /** Highest Blitz score posted on any track at any duration. */
  blitzBestScore: number;
  streak: number;
  activeDays: number;
}

/** Local calendar day (YYYY-MM-DD) for an ISO timestamp. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function overallStats(data: ProgressData): OverallStats {
  const topics = Object.values(data.topics);
  const started = topics.filter((t) => Object.keys(t.answers).length > 0 || t.attempts > 0);
  const completed = topics.filter((t) => t.total > 0 && Object.keys(t.answers).length >= t.total && t.attempts > 0);
  const questionsAnswered = topics.reduce((sum, t) => sum + Object.keys(t.answers).length, 0);
  const scored = topics.filter((t) => t.attempts > 0);
  const reviewQuestions = data.reviews.reduce((sum, r) => sum + r.total, 0);
  const reviewCorrect = data.reviews.reduce((sum, r) => sum + r.correct, 0);

  const lessons = Object.values(data.lessons);
  const exams = Object.values(data.exams);
  const blitz = Object.values(data.blitz);

  const days = new Set<string>();
  data.reviews.forEach((r) => days.add(dayKey(r.at)));
  topics.forEach((t) => {
    if (t.attempts > 0) days.add(dayKey(t.updatedAt));
  });
  lessons.forEach((l) => days.add(dayKey(l.updatedAt)));
  exams.forEach((e) => days.add(dayKey(e.updatedAt)));
  blitz.forEach((b) => days.add(dayKey(b.updatedAt)));

  // Walk back from today (or yesterday, so an evening-only habit isn't punished
  // before the day is over) counting consecutive active days.
  let streak = 0;
  const cursor = new Date();

  if (!days.has(dayKey(cursor.toISOString()))) cursor.setDate(cursor.getDate() - 1);

  while (days.has(dayKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    topicsStarted: started.length,
    topicsCompleted: completed.length,
    questionsAnswered,
    avgBestPct: scored.length > 0 ? Math.round(scored.reduce((s, t) => s + t.bestPct, 0) / scored.length) : 0,
    reviewSessions: data.reviews.length,
    reviewQuestions,
    reviewAccuracy: reviewQuestions > 0 ? Math.round((reviewCorrect / reviewQuestions) * 100) : 0,
    lessonsCompleted: lessons.filter((l) => l.completed).length,
    lessonsStarted: lessons.length,
    examsTaken: exams.reduce((sum, e) => sum + e.attempts, 0),
    examsPassed: exams.filter((e) => e.passed).length,
    blitzRuns: blitz.reduce((sum, b) => sum + b.runs, 0),
    blitzBestScore: blitz.reduce((best, b) => Math.max(best, b.bestScore), 0),
    streak,
    activeDays: days.size,
  };
}
