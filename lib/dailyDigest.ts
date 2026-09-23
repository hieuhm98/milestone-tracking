// The morning Telegram message: what the learner did yesterday, their streak,
// and one link to pick up where they left off. Pure — the cron route feeds it
// a learner's synced ProgressData and sends whatever comes back.

import type { ProgressData } from "@/lib/progress";

/** Learners are in Vietnam; "yesterday" and the streak follow its calendar. */
export const DIGEST_TIME_ZONE = "Asia/Ho_Chi_Minh";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: DIGEST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** YYYY-MM-DD in the digest time zone. */
function dayKey(date: Date | string): string {
  return dayFormat.format(typeof date === "string" ? new Date(date) : date);
}

function shiftDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export interface DigestStats {
  lessonsCompleted: number;
  questionsPractised: number;
  reviewSessions: number;
  reviewAccuracy: number | null;
  /** Consecutive active days ending yesterday. */
  streak: number;
  totalLessonsCompleted: number;
  /** Path of the lesson to resume, if any. */
  resumePath: string | null;
}

export function digestStats(data: ProgressData, now = new Date()): DigestStats {
  const yesterday = dayKey(shiftDays(now, -1));
  const lessons = Object.entries(data.lessons);
  const reviewsYesterday = data.reviews.filter((r) => dayKey(r.at) === yesterday);
  const reviewTotal = reviewsYesterday.reduce((sum, r) => sum + r.total, 0);
  const reviewCorrect = reviewsYesterday.reduce((sum, r) => sum + r.correct, 0);

  const days = new Set<string>();

  data.reviews.forEach((r) => days.add(dayKey(r.at)));
  Object.values(data.topics).forEach((t) => {
    if (t.attempts > 0) days.add(dayKey(t.updatedAt));
  });
  lessons.forEach(([, l]) => days.add(dayKey(l.updatedAt)));
  Object.values(data.recall).forEach((r) => days.add(dayKey(r.lastAt)));
  Object.values(data.exams).forEach((e) => days.add(dayKey(e.updatedAt)));
  Object.values(data.blitz).forEach((b) => days.add(dayKey(b.updatedAt)));

  let streak = 0;
  let cursor = shiftDays(now, -1);

  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }

  // Resume the most recently touched unfinished lesson; failing that, reopen
  // the topic of the most recent finished one so the next lesson is one tap away.
  const byRecency = [...lessons].sort(([, a], [, b]) => b.updatedAt.localeCompare(a.updatedAt));
  const unfinished = byRecency.find(([, l]) => !l.completed);
  let resumePath: string | null = null;

  if (unfinished) {
    const [slug, lessonId] = unfinished[0].split("#");

    resumePath = `/learn/${encodeURIComponent(slug)}/${encodeURIComponent(lessonId)}`;
  } else if (byRecency.length > 0) {
    resumePath = `/learn/${encodeURIComponent(byRecency[0][0].split("#")[0])}`;
  }

  return {
    lessonsCompleted: lessons.filter(([, l]) => l.completedAt && dayKey(l.completedAt) === yesterday).length,
    questionsPractised: Object.values(data.recall).filter((r) => dayKey(r.lastAt) === yesterday).length,
    reviewSessions: reviewsYesterday.length,
    reviewAccuracy: reviewTotal > 0 ? Math.round((reviewCorrect / reviewTotal) * 100) : null,
    streak,
    totalLessonsCompleted: lessons.filter(([, l]) => l.completed).length,
    resumePath,
  };
}

export interface DigestInput {
  /** Already HTML-escaped. */
  name: string;
  lang: "vi" | "en";
  data: ProgressData;
  /** Turns an app path into an absolute URL. */
  link: (path: string) => string;
  now?: Date;
}

/** Telegram HTML for one learner's daily message. */
export function buildDailyDigest({ name, lang, data, link, now = new Date() }: DigestInput): string {
  const s = digestStats(data, now);
  const vi = lang === "vi";
  const active = s.lessonsCompleted + s.questionsPractised + s.reviewSessions > 0;
  const lines: string[] = [];

  lines.push(vi ? `☀️ Chào <b>${name}</b>! Bản tin học tập hôm nay.` : `☀️ Good morning, <b>${name}</b>! Your daily learning update.`);
  lines.push("");

  if (active) {
    lines.push(vi ? "<b>Hôm qua bạn đã:</b>" : "<b>Yesterday you:</b>");

    if (s.lessonsCompleted > 0) {
      lines.push(vi ? `• Hoàn thành ${s.lessonsCompleted} bài học` : `• Completed ${s.lessonsCompleted} lesson${s.lessonsCompleted === 1 ? "" : "s"}`);
    }

    if (s.questionsPractised > 0) {
      lines.push(vi ? `• Luyện ${s.questionsPractised} câu hỏi` : `• Practised ${s.questionsPractised} question${s.questionsPractised === 1 ? "" : "s"}`);
    }

    if (s.reviewSessions > 0) {
      const accuracy = s.reviewAccuracy === null ? "" : ` (${s.reviewAccuracy}%)`;

      lines.push(vi ? `• Làm ${s.reviewSessions} bài ôn tập${accuracy}` : `• Took ${s.reviewSessions} review session${s.reviewSessions === 1 ? "" : "s"}${accuracy}`);
    }
  } else {
    lines.push(vi ? "Hôm qua bạn chưa học. Chỉ 5 phút hôm nay là đủ để quay lại nhịp." : "No study yesterday. Five minutes today is enough to get back on track.");
  }

  lines.push("");

  if (s.streak > 1) {
    lines.push(vi ? `🔥 Chuỗi ${s.streak} ngày liên tiếp — giữ lửa nhé!` : `🔥 ${s.streak}-day streak — keep it going!`);
  }

  lines.push(vi ? `📚 Tổng số bài học đã hoàn thành: ${s.totalLessonsCompleted}` : `📚 Lessons completed so far: ${s.totalLessonsCompleted}`);
  lines.push("");

  if (s.resumePath) {
    lines.push(vi ? `👉 <a href="${link(s.resumePath)}">Học tiếp bài đang dở</a>` : `👉 <a href="${link(s.resumePath)}">Continue your lesson</a>`);
  } else {
    lines.push(vi ? `👉 <a href="${link("/learn")}">Chọn một khoá học để bắt đầu</a>` : `👉 <a href="${link("/learn")}">Pick a course to start</a>`);
  }

  lines.push(vi ? `⚡ <a href="${link("/knowledge-review?quick=1")}">Test nhanh 5 câu</a>` : `⚡ <a href="${link("/knowledge-review?quick=1")}">Quick 5-question test</a>`);

  return lines.join("\n");
}
