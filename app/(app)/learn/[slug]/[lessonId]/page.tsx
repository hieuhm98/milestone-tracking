"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import ArticleRenderer from "@/components/knowledge/ArticleRenderer";
import BilingualArticle from "@/components/knowledge/BilingualArticle";
import LessonTest, { type TestQuestion } from "@/components/learn/LessonTest";
import { type Question } from "@/components/knowledge/QuizBlock";
import {
  lessonKey,
  nextLesson,
  questionKey,
  reviewCandidates,
  sliceSections,
  type Lesson,
  type LessonTopic,
} from "@/lib/lessons";
import {
  PASS_PCT,
  rankForReview,
  recordLessonPhase,
  recordVocab,
  type AnsweredQuestion,
} from "@/lib/progress";
import { lessonVocab, unseenVocabCount, vocabRound, type VocabItem } from "@/lib/vocab";
import { courseTopics, topicGroup } from "@/lib/courses";
import { useVocabStep } from "@/lib/useVocabStep";
import { getGroup } from "@/lib/groups";
import { cn } from "@/lib/utils";

/** How many earlier-lesson questions each phase mixes in. */
const WARMUP_REVIEW = 2;
const CHECK_REVIEW = 2;
/** Questions drawn from the whole topic for a recap lesson's check. */
const RECAP_CHECK = 5;

type Phase = "warmup" | "read" | "check" | "vocab" | "done";

interface TopicData {
  content: string;
  contentEn?: string | null;
  questions: Question[];
  vocab?: VocabItem[];
}

export default function LessonPlayerPage() {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const { pick, lang, t, dual } = useLang();
  const { progress, ready, update } = useProgress();

  const [topics, setTopics] = useState<LessonTopic[]>([]);
  const [topicData, setTopicData] = useState<TopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("warmup");
  const [warmupPct, setWarmupPct] = useState<number | null>(null);
  const [checkPct, setCheckPct] = useState<number | null>(null);
  const [built, setBuilt] = useState(false);
  const [warmupQs, setWarmupQs] = useState<TestQuestion[]>([]);
  const [checkQs, setCheckQs] = useState<TestQuestion[]>([]);
  const [vocabQs, setVocabQs] = useState<TestQuestion[]>([]);
  const [vocabPct, setVocabPct] = useState<number | null>(null);
  // Bumped per vocabulary round so LessonTest remounts with fresh state.
  const [vocabRoundNo, setVocabRoundNo] = useState(0);
  // The learner's choice to include the English step at all (per browser).
  const [vocabOn, setVocabOn] = useVocabStep();

  const key = lessonKey(slug, lessonId);
  const topic = topics.find((tp) => tp.slug === slug) ?? null;
  const lesson: Lesson | null = topic?.lessons.find((l) => l.id === lessonId) ?? null;
  const state = progress.lessons[key];
  const wordsInLesson = useMemo(
    () => (topicData?.vocab && lesson ? lessonVocab(topicData.vocab, lesson.id) : []),
    [topicData, lesson]
  );

  const toVocabQuestions = useCallback(
    (items: VocabItem[]): TestQuestion[] =>
      items.map((item) => ({ ...item, slug, key: questionKey(slug, item.id) })),
    [slug]
  );

  // Curriculum map + this topic's content and questions.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [map, data] = await Promise.all([
        fetch("/api/lessons").then((r) => r.json()).catch(() => []),
        fetch(`/api/knowledge/${slug}?vocab=1`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);

      if (cancelled) return;

      setTopics(Array.isArray(map) ? map : []);
      setTopicData(data);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Build the warm-up and check sets once — they must not reshuffle mid-session.
  useEffect(() => {
    if (built || loading || !ready || !lesson || !topicData) return;

    let cancelled = false;

    async function build() {
      const activeLesson = lesson as Lesson;
      const own = topicData!.questions;
      const ownById = new Map(own.map((q) => [q.id, q]));

      const candidates = reviewCandidates(topics, progress, { excludeKey: key });
      const otherSlugs = Array.from(new Set(candidates.map((c) => c.slug))).filter((s) => s !== slug);

      const fetched = await Promise.all(
        otherSlugs.map((s) =>
          fetch(`/api/knowledge/${s}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => [s, (d?.questions ?? []) as Question[]] as const)
            .catch(() => [s, [] as Question[]] as const)
        )
      );

      if (cancelled) return;

      const byslug: Record<string, Question[]> = { [slug]: own };
      fetched.forEach(([s, qs]) => {
        byslug[s] = qs;
      });

      const toTestQuestion = (s: string, id: string, review: boolean): TestQuestion | null => {
        const source = s === slug ? ownById.get(id) : byslug[s]?.find((q) => q.id === id);

        return source ? { ...source, slug: s, key: questionKey(s, id), review } : null;
      };

      const rankedReview = rankForReview(progress, candidates);
      const reviewQuestions = rankedReview
        .map((c) => toTestQuestion(c.slug, c.questionId, true))
        .filter((q): q is TestQuestion => q !== null);

      // The warm-up recalls ONLY material already studied — it never previews
      // the lesson about to be read. A lesson with nothing behind it (mini-lesson
      // 1 of a fresh study path) therefore has no warm-up at all, so a learner is
      // never shown a question before reading the content it is drawn from.
      const warmReview = reviewQuestions.slice(0, WARMUP_REVIEW);

      // Check: this lesson's own questions (or a topic-wide draw for a recap),
      // plus review questions the warm-up did not already use.
      let checkOwn: TestQuestion[];

      if (activeLesson.questionIds.length > 0) {
        checkOwn = activeLesson.questionIds
          .map((id) => toTestQuestion(slug, id, false))
          .filter((q): q is TestQuestion => q !== null);
      } else {
        const topicPool = own.map((q) => ({ key: questionKey(slug, q.id), id: q.id }));
        checkOwn = rankForReview(progress, topicPool)
          .slice(0, RECAP_CHECK)
          .map((item) => toTestQuestion(slug, item.id, false))
          .filter((q): q is TestQuestion => q !== null);
      }

      const usedInWarmup = new Set(warmReview.map((q) => q.key));
      const checkReview = reviewQuestions.filter((q) => !usedInWarmup.has(q.key)).slice(0, CHECK_REVIEW);

      setWarmupQs(warmReview);
      setCheckQs([...checkOwn, ...checkReview]);
      setVocabQs(toVocabQuestions(vocabRound(lessonVocab(topicData!.vocab ?? [], activeLesson.id), slug, progress)));
      // Nothing to recall yet: open straight on the reading phase.
      if (warmReview.length === 0) setPhase("read");
      setBuilt(true);
    }

    void build();

    return () => {
      cancelled = true;
    };
    // Intentionally built once per lesson: `progress` changes as answers are
    // recorded, and rebuilding mid-session would swap the questions underfoot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built, loading, ready, lesson, topicData, slug, key]);

  const finishWarmup = useCallback(
    (answered: AnsweredQuestion[], pct: number) => {
      setWarmupPct(pct);
      update((prev) => recordLessonPhase(prev, key, "warmup", pct, answered));
      setPhase("read");
    },
    [key, update]
  );

  const finishCheck = useCallback(
    (answered: AnsweredQuestion[], pct: number) => {
      setCheckPct(pct);
      update((prev) => recordLessonPhase(prev, key, "check", pct, answered));
      // The English step comes after the IT result is already recorded, so
      // skipping or failing it can never cost the lesson its completion.
      setPhase(vocabOn && vocabQs.length > 0 ? "vocab" : "done");
    },
    [key, update, vocabQs.length, vocabOn]
  );

  // Switching English off mid-round ends the round; nothing half-answered is recorded.
  useEffect(() => {
    if (!vocabOn && phase === "vocab") setPhase("done");
  }, [vocabOn, phase]);

  const finishVocab = useCallback(
    (answered: AnsweredQuestion[], pct: number) => {
      setVocabPct(pct);
      update((prev) => recordVocab(prev, answered));
      setPhase("done");
    },
    [update]
  );

  // Another round of this lesson's words. `progress` already holds the last
  // round's answers, so unseen words come first and the whole lesson gets covered.
  const startVocabRound = useCallback(() => {
    setVocabQs(toVocabQuestions(vocabRound(wordsInLesson, slug, progress)));
    setVocabPct(null);
    setVocabRoundNo((n) => n + 1);
    setPhase("vocab");
  }, [toVocabQuestions, wordsInLesson, slug, progress]);

  const body = useMemo(() => {
    if (!topicData || !lesson) return "";

    const source = lang === "en" && topicData.contentEn ? topicData.contentEn : topicData.content;

    return sliceSections(source, lesson.sections);
  }, [topicData, lesson, lang]);

  if (loading || !ready) return <div className="text-zinc-500 text-sm p-8">{t("common.loading")}</div>;

  if (!topic || !lesson) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">{pick("Không tìm thấy bài học.", "Mini-lesson not found.")}</p>
        <Link href="/learn" className="text-blue-600 dark:text-blue-400 text-sm mt-2 inline-block">
          {pick("← Khoá học của tôi", "← My courses")}
        </Link>
      </div>
    );
  }

  const position = topic.lessons.findIndex((l) => l.id === lesson.id) + 1;
  // "Next lesson" stays inside the course: finishing AWS should not roll into DSA.
  const course = getGroup(topicGroup(topic));
  const courseHref = course ? `/learn/course/${course.id}` : "/learn";
  const upcoming = nextLesson(courseTopics(topics, topicGroup(topic)), slug, lesson.id);
  const passed = checkPct !== null && checkPct >= PASS_PCT;
  const unseenWords = unseenVocabCount(wordsInLesson, slug, progress);
  const bilingual = dual && Boolean(topicData?.contentEn);

  return (
    <div className={cn("space-y-6", bilingual && phase === "read" ? "max-w-6xl" : "max-w-3xl")}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href={courseHref} className="hover:text-zinc-700 dark:hover:text-zinc-300 shrink-0">
            {course ? pick(course.label, course.labelEn) : pick("Khoá học của tôi", "My courses")}
          </Link>
          <span>›</span>
          <Link href={`/learn/${slug}`} className="hover:text-zinc-700 dark:hover:text-zinc-300 truncate">
            {pick(topic.title, topic.titleEn)}
          </Link>
        </div>
        <h1 className="text-2xl font-bold mt-1">{pick(lesson.title, lesson.titleEn)}</h1>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-1">
          <p className="text-xs text-zinc-500">
            {pick("Bài", "Lesson")} {position}/{topic.lessons.length}
            {state?.completed && <span className="text-green-600 dark:text-green-400 ml-2">✓ {pick("đã hoàn thành", "completed")}</span>}
          </p>

          {wordsInLesson.length > 0 && (
            <button
              type="button"
              role="switch"
              aria-checked={vocabOn}
              onClick={() => setVocabOn(!vocabOn)}
              title={pick(
                "Bật/tắt bước từ vựng tiếng Anh ở cuối mỗi bài nhỏ. Áp dụng cho mọi bài.",
                "Turn the English vocabulary step at the end of each mini-lesson on or off. Applies to every lesson."
              )}
              className="flex items-center gap-2 py-1.5 -my-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <span>{pick("Từ vựng tiếng Anh", "English vocabulary")}</span>
              <span
                aria-hidden
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                  vocabOn ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                    vocabOn ? "translate-x-[18px]" : "translate-x-0.5"
                  )}
                />
              </span>
              <span className="w-6 text-left font-medium">{vocabOn ? pick("Bật", "On") : pick("Tắt", "Off")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Phase rail */}
      <div className="flex items-center gap-2 text-xs">
        {[
          // The warm-up step only exists when there is earlier material to recall.
          ...(warmupQs.length > 0 ? [["warmup", pick("Khởi động", "Warm-up")] as [Phase, string]] : []),
          ["read", pick("Đọc", "Read")] as [Phase, string],
          ["check", pick("Kiểm tra", "Check")] as [Phase, string],
          ...(vocabOn && wordsInLesson.length > 0
            ? [["vocab", pick("Từ vựng", "Vocabulary")] as [Phase, string]]
            : []),
        ].map(([id, label], i) => {
          const order: Phase[] = ["warmup", "read", "check", "vocab", "done"];
          const done = order.indexOf(phase) > order.indexOf(id);
          const active = phase === id;

          return (
            <span
              key={id}
              className={cn(
                "px-2.5 py-1 rounded-full border",
                active && "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
                done && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
                !active && !done && "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
              )}
            >
              {done ? "✓ " : ""}
              {i + 1} · {label}
            </span>
          );
        })}
      </div>

      {!built && <div className="text-zinc-500 text-sm">{t("common.loading")}</div>}

      {built && phase === "warmup" && warmupQs.length > 0 && (
        <LessonTest
          questions={warmupQs}
          heading={pick("Khởi động", "Warm-up")}
          blurb={pick(
            "Ôn nhanh những gì bạn đã học ở các bài trước. Sai cũng không sao — đây là để đo, không phải để chấm.",
            "A quick recall of what you learned in earlier lessons. Getting these wrong is fine — it is a gauge, not a grade."
          )}
          ctaLabel={pick("Bắt đầu đọc →", "Start reading →")}
          onFinish={finishWarmup}
        />
      )}

      {built && phase === "read" && (
        <div className="space-y-5">
          {warmupPct !== null && (
            <div className="text-xs text-zinc-500">
              {pick("Khởi động", "Warm-up")}: {warmupPct}%
            </div>
          )}

          {bilingual ? (
            <BilingualArticle vi={topicData!.content} en={topicData!.contentEn!} sections={lesson.sections} />
          ) : (
            <ArticleRenderer content={body} />
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button onClick={() => setPhase("check")} className="btn-primary text-sm px-4 py-2">
              {pick("Làm bài kiểm tra →", "Take the check test →")}
            </button>
            <Link
              href={`/knowledge/${slug}`}
              className="inline-block py-2 -my-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {pick("Xem toàn bộ bài viết", "View the full article")}
            </Link>
          </div>
        </div>
      )}

      {built && phase === "check" && (
        checkQs.length > 0 ? (
          <LessonTest
            questions={checkQs}
            heading={pick("Kiểm tra", "Check")}
            blurb={pick(
              `Câu hỏi của bài này cộng vài câu ôn lại. Đạt ${PASS_PCT}% để hoàn thành bài.`,
              `This lesson's questions plus a few from earlier. Score ${PASS_PCT}% to complete the lesson.`
            )}
            ctaLabel={pick("Xem kết quả →", "See result →")}
            onFinish={finishCheck}
          />
        ) : (
          <div className="card text-sm text-zinc-500">
            {pick("Bài này chưa có câu hỏi kiểm tra.", "No check questions for this lesson.")}
          </div>
        )
      )}

      {built && phase === "vocab" && vocabQs.length > 0 && (
        <div className="space-y-3">
          <LessonTest
            key={vocabRoundNo}
            questions={vocabQs}
            heading={pick("Từ vựng tiếng Anh", "English vocabulary")}
            blurb={pick(
              `Nghĩa của các từ tiếng Anh dùng trong bài này (${wordsInLesson.length} từ, mỗi lượt ${vocabQs.length}). Không tính vào điểm bài học.`,
              `The meaning of English words used in this lesson (${wordsInLesson.length} words, ${vocabQs.length} per round). Does not count towards the lesson score.`
            )}
            ctaLabel={pick("Xem kết quả →", "See result →")}
            onFinish={finishVocab}
          />
          <button
            onClick={() => setPhase("done")}
            className="inline-block py-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            {pick("Bỏ qua phần từ vựng →", "Skip vocabulary →")}
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-4">
          <div
            className={cn(
              "card border-l-4",
              passed ? "border-l-green-500" : "border-l-amber-500"
            )}
          >
            <div className="text-3xl font-bold">{checkPct}%</div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {passed
                ? pick("Đạt — bài học đã hoàn thành.", "Passed — mini-lesson completed.")
                : pick(
                    `Chưa đạt ${PASS_PCT}%. Đọc lại rồi thử lại — điểm cao nhất của bạn vẫn được giữ.`,
                    `Below ${PASS_PCT}%. Re-read and try again — your best score is kept.`
                  )}
            </p>
            {warmupPct !== null && (
              <p className="text-xs text-zinc-500 mt-2">
                {pick("Khởi động", "Warm-up")} {warmupPct}% → {pick("Kiểm tra", "Check")} {checkPct}%
              </p>
            )}
          </div>

          {wordsInLesson.length > 0 && !vocabOn && (
            <p className="text-xs text-zinc-500">
              {pick("Bước từ vựng tiếng Anh đang tắt.", "The English vocabulary step is off.")}{" "}
              <button
                type="button"
                onClick={() => setVocabOn(true)}
                className="py-2 -my-2 text-blue-600 dark:text-blue-400 hover:underline"
              >
                {pick("Bật lại", "Turn it on")}
              </button>
            </p>
          )}

          {wordsInLesson.length > 0 && vocabOn && (
            <div className="card flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm min-w-0">
                <div className="font-medium">
                  {pick("Từ vựng tiếng Anh", "English vocabulary")}
                  {vocabPct !== null && <span className="ml-2 text-zinc-500">{vocabPct}%</span>}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {unseenWords > 0
                    ? pick(
                        `Còn ${unseenWords}/${wordsInLesson.length} từ chưa luyện trong bài này.`,
                        `${unseenWords} of ${wordsInLesson.length} words in this lesson not practised yet.`
                      )
                    : pick(
                        `Đã luyện cả ${wordsInLesson.length} từ — lượt tiếp theo ưu tiên từ bạn hay sai.`,
                        `All ${wordsInLesson.length} words practised — the next round favours the ones you miss.`
                      )}
                </p>
              </div>
              <button onClick={startVocabRound} className="btn-secondary text-sm">
                {vocabPct === null
                  ? pick("Luyện từ vựng", "Practise words")
                  : pick("Thêm một lượt từ", "Another round of words")}
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {upcoming ? (
              <Link
                href={`/learn/${upcoming.topic.slug}/${upcoming.lesson.id}`}
                className="btn-primary text-sm px-4 py-2"
              >
                {pick("Bài tiếp theo", "Next lesson")}: {pick(upcoming.lesson.title, upcoming.lesson.titleEn)} →
              </Link>
            ) : (
              <Link href={courseHref} className="btn-primary text-sm px-4 py-2">
                {pick("Hoàn thành khoá học 🎉", "Course complete 🎉")}
              </Link>
            )}
            <button
              onClick={() => {
                setPhase("read");
                setCheckPct(null);
                setVocabPct(null);
                setBuilt(false);
              }}
              className="btn-secondary text-sm"
            >
              {pick("Đọc lại & thử lại", "Re-read & retry")}
            </button>
            <Link href={`/learn/${slug}`} className="btn-secondary text-sm">
              {pick("Về chủ đề", "Back to topic")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
