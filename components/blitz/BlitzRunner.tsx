"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import BlitzItemCard from "@/components/blitz/BlitzItemCard";
import { GROUPS, GROUP_ACCENT, getGroup } from "@/lib/groups";
import { gradeDrill, partialScore, type DrillResponse } from "@/lib/drills";
import { recordBlitz, blitzBest, type AnsweredQuestion } from "@/lib/progress";
import {
  BASE_POINTS,
  BLITZ_DURATIONS,
  COMBO_CAP,
  DEFAULT_DURATION,
  comboMultiplier,
  scoreAnswer,
  summarize,
  weakestFirst,
  type BlitzAnswer,
  type BlitzDuration,
  type BlitzItem,
  type BlitzItemFormat,
} from "@/lib/blitz";
import { cn } from "@/lib/utils";
import QuestionText from "@/components/knowledge/QuestionText";

type Phase = "setup" | "running" | "results";

const FORMATS: BlitzItemFormat[] = ["mcq", "multi", "recall", "match", "order"];
/** Default track — the AWS course is the one this was built for. */
const DEFAULT_GROUP_ID = "dev";
/** How long a correct answer's green flash stays up before the next item. */
const FLASH_MS = 420;
const TICK_MS = 100;

interface PoolStat {
  group: string;
  topics: number;
  questions: number;
  drills: number;
  byFormat: Record<string, number>;
}

interface DeckResponse {
  group: string;
  items: BlitzItem[];
  topics: { slug: string; title: string; titleEn: string }[];
}

interface Feedback {
  correct: boolean;
  points: number;
  explanation: string;
}

/**
 * Blitz: a timed run over a mixed deck.
 *
 * The shape of a session is the whole point. Reading a topic and answering its
 * quiz has no end condition other than losing interest, so a study session ends
 * whenever attention does. A run has a clock, a score that compounds while you
 * are right, and a personal best — you can win or lose it, and it is over in a
 * minute either way.
 *
 * Two deliberate asymmetries:
 *   - A correct answer flashes and moves on; a miss **stops the clock** and
 *     shows the explanation. Reading why you were wrong is the most valuable
 *     second of the run and must not be the most expensive one.
 *   - Harder formats are worth more points, so typing an answer from nothing
 *     beats guessing from four options. Otherwise the cheapest format is always
 *     the right play and the formats that actually teach never get chosen.
 */
export default function BlitzRunner() {
  const { t, lang, pick } = useLang();
  const { progress, update } = useProgress();

  const [phase, setPhase] = useState<Phase>("setup");
  const [groupId, setGroupId] = useState(DEFAULT_GROUP_ID);
  const [duration, setDuration] = useState<BlitzDuration>(DEFAULT_DURATION);
  const [formats, setFormats] = useState<Set<BlitzItemFormat>>(new Set(FORMATS));
  const [pools, setPools] = useState<PoolStat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [deck, setDeck] = useState<BlitzItem[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<BlitzAnswer[]>([]);
  const [response, setResponse] = useState<DrillResponse | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [msLeft, setMsLeft] = useState(0);
  const [ranOut, setRanOut] = useState(false);
  const [prevBest, setPrevBest] = useState(0);

  // The clock stops while a miss is on screen, so learning is never on the clock.
  const paused = useRef(false);
  const itemStartedAt = useRef(0);
  // Finishing must happen exactly once: the clock, the last item in the deck and
  // the Quit button can all reach it.
  const finished = useRef(false);
  // And one item must be graded exactly once. `feedback` cannot guard this on
  // its own: it is state, so two clicks inside one frame — or one held-down
  // number key — both read it as null and both score.
  const grading = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const group = getGroup(groupId) ?? GROUPS[0];
  const accent = GROUP_ACCENT[group.accent];
  const record = blitzBest(progress, groupId, duration);
  const pool = pools?.find((p) => p.group === groupId);

  // --------------------------------------------------------------- pool stats
  useEffect(() => {
    let alive = true;

    fetch("/api/blitz")
      .then((r) => r.json())
      .then((data) => {
        if (alive && Array.isArray(data.pools)) setPools(data.pools);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  /** How many items the current track holds for the currently enabled formats. */
  const available = useMemo(() => {
    if (!pool) return null;

    return FORMATS.filter((f) => formats.has(f)).reduce((sum, f) => sum + (pool.byFormat[f] ?? 0), 0);
  }, [pool, formats]);

  // ------------------------------------------------------------------ the run
  const finish = useCallback(
    (outOfTime: boolean) => {
      if (finished.current) return;

      finished.current = true;

      if (advanceTimer.current) clearTimeout(advanceTimer.current);

      setRanOut(outOfTime);
      setPhase("results");
      setPrevBest(blitzBest(progress, groupId, duration)?.bestScore ?? 0);

      const graded: AnsweredQuestion[] = answers.map((a) => ({ key: a.key, correct: a.correct }));

      update((prev) =>
        recordBlitz(prev, groupId, {
          seconds: duration,
          score: answers.reduce((sum, a) => sum + a.points, 0),
          answered: answers.length,
          correct: answers.filter((a) => a.correct).length,
          bestCombo,
          answers: graded,
        })
      );
    },
    [answers, bestCombo, duration, groupId, progress, update]
  );

  // Kept in a ref so the ticking effect never has to re-subscribe when the run's
  // state changes — a timer that tears down and rebuilds every answer drifts.
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  useEffect(() => {
    if (phase !== "running") return;

    let last = Date.now();

    const id = setInterval(() => {
      const now = Date.now();
      const delta = now - last;

      last = now;

      if (paused.current) return;

      setMsLeft((prev) => Math.max(0, prev - delta));
    }, TICK_MS);

    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "running" && msLeft === 0) finishRef.current(true);
  }, [phase, msLeft]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const advance = useCallback(() => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }

    setFeedback(null);
    setResponse(null);
    paused.current = false;
    grading.current = false;
    itemStartedAt.current = Date.now();

    // Clearing the whole deck ends the run the same way the clock does.
    if (cursor + 1 >= deck.length) {
      finishRef.current(false);

      return;
    }

    setCursor((prev) => prev + 1);
  }, [cursor, deck.length]);

  const submit = useCallback(
    (given: DrillResponse) => {
      const item = deck[cursor];

      if (!item || feedback || grading.current) return;

      grading.current = true;

      const elapsed = Date.now() - itemStartedAt.current;
      const correct =
        item.format === "mcq"
          ? Array.isArray(given) && given[0] === item.question.answer
          : gradeDrill(item.drill, given);

      const points = correct ? scoreAnswer(item.format, streak, elapsed) : 0;
      const partial =
        item.format === "mcq"
          ? { correct: correct ? 1 : 0, total: 1 }
          : partialScore(item.drill, given);

      const explanation =
        item.format === "mcq"
          ? (lang === "en" ? item.question.explanationEn || item.question.explanation : item.question.explanation) ?? ""
          : lang === "en"
            ? item.drill.explanationEn || item.drill.explanation
            : item.drill.explanation;

      setResponse(given);
      setAnswers((prev) => [
        ...prev,
        { key: item.key, slug: item.slug, format: item.format, correct, points, partial },
      ]);

      if (correct) {
        const nextStreak = streak + 1;

        setScore((s) => s + points);
        setStreak(nextStreak);
        setBestCombo((b) => Math.max(b, nextStreak));
        setFeedback({ correct: true, points, explanation });

        advanceTimer.current = setTimeout(advance, FLASH_MS);
      } else {
        setStreak(0);
        paused.current = true;
        setFeedback({ correct: false, points: 0, explanation });
      }
    },
    [advance, cursor, deck, feedback, lang, streak]
  );

  /**
   * Give up on the current item.
   *
   * Without this a learner who cannot answer a four-pair matching drill has to
   * either guess their way through all four pairs or watch the clock burn on a
   * single card — on a 60-second run that is most of the run. An empty response
   * grades as a miss for every format, so skipping costs the combo and marks the
   * item weak, and the explanation comes up with the clock stopped.
   */
  const skip = useCallback(() => {
    if (feedback) return;

    submit([]);
  }, [feedback, submit]);

  // Enter or Space clears a miss. The hands are already on the keyboard.
  useEffect(() => {
    if (!feedback || feedback.correct) return;

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" && e.key !== " ") return;

      e.preventDefault();
      advance();
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [feedback, advance]);

  // -------------------------------------------------------------------- start
  const start = useCallback(async () => {
    if (formats.size === 0) return;

    setLoading(true);
    setLoadError(false);

    try {
      const query = new URLSearchParams({
        group: groupId,
        formats: FORMATS.filter((f) => formats.has(f)).join(","),
      });
      const res = await fetch(`/api/blitz?${query.toString()}`);

      if (!res.ok) throw new Error("deck");

      const data: DeckResponse = await res.json();

      if (!Array.isArray(data.items) || data.items.length === 0) throw new Error("empty");

      const titleMap: Record<string, string> = {};

      data.topics.forEach((tp) => {
        titleMap[tp.slug] = pick(tp.title, tp.titleEn);
      });

      finished.current = false;
      paused.current = false;
      grading.current = false;
      itemStartedAt.current = Date.now();

      setTitles(titleMap);
      setDeck(weakestFirst(data.items, progress.recall));
      setCursor(0);
      setAnswers([]);
      setResponse(null);
      setFeedback(null);
      setScore(0);
      setStreak(0);
      setBestCombo(0);
      setRanOut(false);
      setMsLeft(duration * 1000);
      setPhase("running");
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [duration, formats, groupId, pick, progress.recall]);

  function toggleFormat(format: BlitzItemFormat) {
    setFormats((prev) => {
      const next = new Set(prev);

      if (next.has(format)) {
        next.delete(format);
      } else {
        next.add(format);
      }

      return next;
    });
  }

  function quit() {
    if (!window.confirm(t("blitz.quitConfirm"))) return;

    finished.current = true;

    if (advanceTimer.current) clearTimeout(advanceTimer.current);

    setPhase("setup");
  }

  // ======================================================================= UI
  if (phase === "setup") {
    return (
      <SetupScreen
        group={group}
        groupId={groupId}
        setGroupId={setGroupId}
        duration={duration}
        setDuration={setDuration}
        formats={formats}
        toggleFormat={toggleFormat}
        pools={pools}
        pool={pool}
        available={available}
        record={record}
        loading={loading}
        loadError={loadError}
        onStart={start}
      />
    );
  }

  if (phase === "running") {
    const item = deck[cursor];
    const isPaused = feedback !== null && !feedback.correct;
    const seconds = Math.ceil(msLeft / 1000);
    const fraction = duration > 0 ? msLeft / (duration * 1000) : 0;
    const urgent = msLeft <= 10000;

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* HUD */}
        <div className="sticky top-0 z-10 -mx-4 px-4 pt-2 pb-3 bg-[var(--background)] space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2 min-w-0">
              <span
                className={cn(
                  "text-2xl sm:text-3xl font-bold tabular-nums",
                  urgent ? "text-red-500" : "text-zinc-900 dark:text-zinc-100"
                )}
              >
                {seconds}
              </span>
              <span className="text-xs text-zinc-500 shrink-0">{t("blitz.seconds")}</span>
              {isPaused && (
                <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                  {t("blitz.paused")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {streak >= 2 && (
                <span
                  className={cn(
                    "text-xs font-bold px-2 py-1 rounded-lg border tabular-nums",
                    comboMultiplier(streak) >= 3
                      ? "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700"
                  )}
                >
                  {streak}🔥 ×{comboMultiplier(streak)}
                </span>
              )}
              <span className="text-xl sm:text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {score}
              </span>
              <button
                onClick={quit}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 py-2 -my-1"
              >
                {t("blitz.quit")}
              </button>
            </div>
          </div>

          <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className={cn(
                "h-full transition-[width] duration-100 ease-linear",
                urgent ? "bg-red-500" : accent.bar
              )}
              style={{ width: `${Math.max(0, Math.min(100, fraction * 100))}%` }}
            />
          </div>
        </div>

        {/* The item */}
        {item && (
          <div
            className={cn(
              "card border-2 transition-colors",
              feedback?.correct && "border-green-500 bg-green-50/50 dark:bg-green-950/30",
              feedback && !feedback.correct && "border-red-500",
              !feedback && "border-transparent"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-600">
                {t(`blitz.format.${item.format}`)} · {BASE_POINTS[item.format]}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600 truncate max-w-[55%] text-right">
                {titles[item.slug] ?? item.slug}
              </span>
            </div>

            <BlitzItemCard
              key={item.key}
              item={item}
              locked={feedback !== null}
              response={response}
              onSubmit={submit}
            />

            {!feedback && (
              <div className="flex justify-end pt-3">
                <button
                  onClick={skip}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 py-2 -my-1"
                >
                  {t("blitz.skip")} →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feedback */}
        {feedback?.correct && (
          <div className="text-center text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums">
            +{feedback.points} {feedback.points > BASE_POINTS[deck[cursor]?.format ?? "mcq"] && `· ${t("blitz.speedBonus")}`}
          </div>
        )}

        {feedback && !feedback.correct && (
          <div className="card border-l-4 border-l-red-500 space-y-3">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">{t("blitz.wrong")}</p>
            {feedback.explanation && (
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"><QuestionText text={feedback.explanation} /></p>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-500">{t("blitz.continueHint")}</span>
              <button onClick={advance} className="btn-primary text-sm px-4 py-2 shrink-0">
                {t("blitz.continue")} ↵
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------- results
  const summary = summarize(answers, bestCombo);
  const isRecord = summary.score > prevBest && summary.answered > 0;
  const missed = answers.filter((a) => !a.correct);
  const perMinute = duration > 0 ? Math.round((summary.answered / duration) * 60) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="card text-center space-y-3">
        {ranOut ? (
          <p className="text-xs uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-600">
            {t("blitz.timeUp")}
          </p>
        ) : (
          <p className="text-xs uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-600">
            {t("blitz.deckEmpty")}
          </p>
        )}

        <div className="text-5xl sm:text-6xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
          {summary.score}
        </div>

        {isRecord ? (
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{t("blitz.newRecord")}</p>
        ) : (
          prevBest > 0 && (
            <p className="text-xs text-zinc-500">
              {t("blitz.previousBest")}: <span className="tabular-nums font-medium">{prevBest}</span>
            </p>
          )
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <Stat label={t("blitz.answered")} value={String(summary.answered)} />
          <Stat label={t("blitz.accuracy")} value={`${summary.accuracy}%`} />
          <Stat label={t("blitz.bestCombo")} value={`${summary.bestCombo}🔥`} />
          <Stat label={t("blitz.perMinute")} value={String(perMinute)} />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button onClick={start} disabled={loading} className="btn-primary text-sm disabled:opacity-50">
            {loading ? t("blitz.starting") : t("blitz.playAgain")}
          </button>
          <button onClick={() => setPhase("setup")} className="btn-secondary text-sm">
            {t("blitz.backToSetup")}
          </button>
        </div>
      </div>

      {summary.byTopic.length > 0 && (
        <div className="card space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("blitz.weakestTopics")}</h2>
          {summary.byTopic.slice(0, 6).map((topic) => (
            <Link
              key={topic.slug}
              href={`/knowledge/${topic.slug}`}
              className="flex items-center justify-between gap-3 text-sm py-2 -my-0.5 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <span className="min-w-0 truncate text-zinc-700 dark:text-zinc-300">
                {titles[topic.slug] ?? topic.slug}
              </span>
              <span
                className={cn(
                  "tabular-nums shrink-0 text-xs font-medium",
                  topic.pct >= 70 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}
              >
                {topic.correct}/{topic.total}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="card space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("blitz.missed")}</h2>
        {missed.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("blitz.nothingMissed")}</p>
        ) : (
          missed.map((answer, i) => (
            <div key={`${answer.key}-${i}`} className="flex items-center justify-between gap-3 text-sm py-1.5">
              <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-400">
                {titles[answer.slug] ?? answer.slug}
              </span>
              <span className="shrink-0 text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-600">
                {t(`blitz.format.${answer.format}`)}
                {answer.partial.total > 1 && ` · ${answer.partial.correct}/${answer.partial.total}`}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-600">{label}</div>
    </div>
  );
}

// ------------------------------------------------------------------- setup UI

interface SetupProps {
  group: (typeof GROUPS)[number];
  groupId: string;
  setGroupId: (id: string) => void;
  duration: BlitzDuration;
  setDuration: (d: BlitzDuration) => void;
  formats: Set<BlitzItemFormat>;
  toggleFormat: (f: BlitzItemFormat) => void;
  pools: PoolStat[] | null;
  pool: PoolStat | undefined;
  available: number | null;
  record: ReturnType<typeof blitzBest>;
  loading: boolean;
  loadError: boolean;
  onStart: () => void;
}

function SetupScreen({
  group,
  groupId,
  setGroupId,
  duration,
  setDuration,
  formats,
  toggleFormat,
  pools,
  pool,
  available,
  record,
  loading,
  loadError,
  onStart,
}: SetupProps) {
  const { t, pick } = useLang();
  const accent = GROUP_ACCENT[group.accent];
  const blocked = formats.size === 0 || available === 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t("blitz.title")}</h1>
        <p className="text-sm text-zinc-500 mt-1">{t("blitz.subtitle")}</p>
      </div>

      <div className="card space-y-5">
        {/* Track */}
        <div>
          <span className="label">{t("blitz.pickTrack")}</span>
          <div className="flex flex-wrap gap-2">
            {GROUPS.map((g) => {
              const stat = pools?.find((p) => p.group === g.id);
              const empty = stat !== undefined && stat.questions + stat.drills === 0;

              return (
                <button
                  key={g.id}
                  onClick={() => setGroupId(g.id)}
                  disabled={empty}
                  className={cn(
                    "text-sm px-3 py-2 rounded-lg border transition-colors disabled:opacity-40",
                    g.id === groupId
                      ? GROUP_ACCENT[g.accent].badge
                      : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  <span className="mr-1.5">{g.icon}</span>
                  {pick(g.label, g.labelEn)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration */}
        <div>
          <span className="label">{t("blitz.duration")}</span>
          <div className="flex flex-wrap gap-2">
            {BLITZ_DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cn(
                  "text-sm px-4 py-2 rounded-lg border transition-colors tabular-nums",
                  d === duration
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                )}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        {/* Formats */}
        <div>
          <span className="label">{t("blitz.formats")}</span>
          <div className="space-y-2">
            {FORMATS.map((f) => {
              const on = formats.has(f);
              const count = pool?.byFormat[f] ?? 0;

              return (
                <label
                  key={f}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                    on
                      ? "bg-zinc-100 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700"
                      : "bg-transparent border-zinc-200 dark:border-zinc-800 opacity-60",
                    count === 0 && "opacity-40"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleFormat(f)}
                    className="mt-0.5 w-4 h-4 shrink-0 accent-blue-600"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {t(`blitz.format.${f}`)}
                      </span>
                      <span className="text-[10px] tabular-nums text-zinc-400 dark:text-zinc-600 shrink-0">
                        {count} · {BASE_POINTS[f]}pt
                      </span>
                    </span>
                    <span className="block text-xs text-zinc-500 mt-0.5">{t(`blitz.format.${f}Hint`)}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-zinc-500 mt-2">{t("blitz.formatsHint")}</p>
        </div>

        {/* Record + start */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-600">
                {t("blitz.personalBest")} · {duration}s
              </div>
              {record && record.runs > 0 ? (
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-2xl font-bold tabular-nums", accent.text)}>{record.bestScore}</span>
                  <span className="text-xs text-zinc-500 tabular-nums">
                    {record.bestCombo}🔥 · {record.runs} {t("blitz.runs")}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-zinc-500">{t("blitz.noRecord")}</div>
              )}
            </div>

            <button onClick={onStart} disabled={loading || blocked} className="btn-primary shrink-0 disabled:opacity-40">
              {loading ? t("blitz.starting") : t("blitz.start")}
            </button>
          </div>

          {formats.size === 0 && <p className="text-xs text-red-500">{t("blitz.noFormats")}</p>}
          {available === 0 && formats.size > 0 && <p className="text-xs text-red-500">{t("blitz.poolEmpty")}</p>}
          {loadError && <p className="text-xs text-red-500">{t("blitz.loadFailed")}</p>}
        </div>
      </div>

      <div className="card space-y-2 text-xs text-zinc-500 leading-relaxed">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t("blitz.scoring")}</h2>
        <p>{t("blitz.scoringHint")}</p>
        <p>{t("blitz.pausedOnMiss")}</p>
        <p className="tabular-nums">
          {FORMATS.map((f) => `${t(`blitz.format.${f}`)} ${BASE_POINTS[f]}`).join(" · ")} · max ×{COMBO_CAP}
        </p>
      </div>
    </div>
  );
}
