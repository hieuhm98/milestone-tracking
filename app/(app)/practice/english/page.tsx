"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search, X } from "lucide-react";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import LessonTest, { type TestQuestion } from "@/components/learn/LessonTest";
import {
  buildDeck,
  decodeIndex,
  flattenIndex,
  isMistake,
  MAX_DECK,
  PRACTICE_COUNTS,
  uniqueCount,
  wordKey,
  type LocatedWord,
  type PracticeFilter,
  type PracticeOrder,
  type VocabIndexTopic,
  type WireTopic,
} from "@/lib/englishPractice";
import { GROUPS, GROUP_ACCENT } from "@/lib/groups";
import { recordVocab, type AnsweredQuestion } from "@/lib/progress";
import { type VocabItem } from "@/lib/vocab";
import { cn } from "@/lib/utils";

type Stage = "setup" | "loading" | "running" | "results";

const SELECTION_KEY = "english-practice:selection";
const SEARCH_LIMIT = 60;

// --------------------------------------------------------------- tri-checkbox

function TriCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 shrink-0 rounded border-zinc-300 dark:border-zinc-600 accent-blue-600 cursor-pointer"
    />
  );
}

/** Selected/total for a node, and the checkbox state that follows from it. */
function nodeState(keys: string[], selected: Set<string>) {
  let count = 0;

  for (const key of keys) {
    if (selected.has(key)) count += 1;
  }

  return { count, checked: keys.length > 0 && count === keys.length, indeterminate: count > 0 && count < keys.length };
}

// ------------------------------------------------------------------------ page

export default function EnglishPracticePage() {
  const { t, pick, lang } = useLang();
  const { progress, ready, update } = useProgress();

  const [topics, setTopics] = useState<VocabIndexTopic[]>([]);
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const [count, setCount] = useState<number>(20);
  const [order, setOrder] = useState<PracticeOrder>("weakest");
  const [filter, setFilter] = useState<PracticeFilter>("all");
  const [unique, setUnique] = useState(true);

  const [stage, setStage] = useState<Stage>("setup");
  const [deck, setDeck] = useState<TestQuestion[]>([]);
  const [roundNo, setRoundNo] = useState(0);
  const [result, setResult] = useState<{ answered: AnsweredQuestion[]; pct: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vocab")
      .then((r) => r.json())
      .then((data: { topics?: WireTopic[] }) => setTopics(Array.isArray(data.topics) ? decodeIndex(data.topics) : []))
      .catch(() => setTopics([]))
      .finally(() => setLoadingIndex(false));
  }, []);

  const words = useMemo(() => flattenIndex(topics), [topics]);
  const wordByKey = useMemo(() => new Map(words.map((w) => [w.key, w])), [words]);

  // Restore the last selection once the index is known (dropping words that no longer exist).
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current || words.length === 0) return;

    restored.current = true;

    try {
      const saved = JSON.parse(window.localStorage.getItem(SELECTION_KEY) ?? "[]");

      if (Array.isArray(saved)) setSelected(new Set(saved.filter((k: unknown) => typeof k === "string" && wordByKey.has(k))));
    } catch {
      // Nothing saved, or storage is blocked — start empty.
    }
  }, [words, wordByKey]);

  useEffect(() => {
    if (!restored.current) return;

    try {
      window.localStorage.setItem(SELECTION_KEY, JSON.stringify(Array.from(selected)));
    } catch {
      // Selection still works for this visit.
    }
  }, [selected]);

  const courses = useMemo(
    () =>
      GROUPS.map((group) => {
        const own = topics.filter((tp) => tp.group === group.id);
        const keys = own.flatMap((tp) => tp.lessons.flatMap((l) => l.words.map((w) => wordKey(tp.slug, w.id))));

        return { group, topics: own, keys };
      }).filter((c) => c.keys.length > 0),
    [topics]
  );

  const setMany = useCallback((keys: string[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);

      for (const key of keys) {
        if (on) {
          next.add(key);
        } else {
          next.delete(key);
        }
      }

      return next;
    });
  }, []);

  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });

  const selectedWords = useMemo(
    () => words.filter((w) => selected.has(w.key)),
    [words, selected]
  );

  const eligibleCount = useMemo(() => {
    const deckPreview = buildDeck(selectedWords, progress, { count: Infinity, order: "random", filter, unique });

    return deckPreview.length;
  }, [selectedWords, progress, filter, unique]);

  const mistakesInSelection = useMemo(
    () => selectedWords.filter((w) => isMistake(progress, w.key)).length,
    [selectedWords, progress]
  );

  // Search: a flat list of matching words across every course.
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (q.length < 2) return [];

    return words.filter((w) => w.word.toLowerCase().includes(q));
  }, [query, words]);

  const topicTitle = useMemo(() => new Map(topics.map((tp) => [tp.slug, pick(tp.title, tp.titleEn)])), [topics, pick]);

  // ------------------------------------------------------------------ session

  const startRound = useCallback(
    async (pool: LocatedWord[], size: number) => {
      const drawn = buildDeck(pool, progress, { count: size, order, filter: "all", unique });

      if (drawn.length === 0) return;

      setStage("loading");
      setError(null);

      try {
        const res = await fetch("/api/vocab", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: drawn.map((w) => w.key) }),
        });
        const data: { items?: (VocabItem & { slug: string })[] } = await res.json();
        const questions = (data.items ?? []).map((item) => ({ ...item, key: wordKey(item.slug, item.id) }));

        if (questions.length === 0) throw new Error("empty");

        setDeck(questions);
        setResult(null);
        setRoundNo((n) => n + 1);
        setStage("running");
      } catch {
        setError(pick("Không tải được câu hỏi. Thử lại nhé.", "Could not load the questions. Please try again."));
        setStage("setup");
      }
    },
    [progress, order, unique, pick]
  );

  const start = () => {
    const pool = selectedWords.filter((w) => {
      if (filter === "unseen") return !progress.recall[w.key];

      if (filter === "mistakes") return isMistake(progress, w.key);

      return true;
    });

    void startRound(pool, count);
  };

  const finish = useCallback(
    (answered: AnsweredQuestion[], pct: number) => {
      update((prev) => recordVocab(prev, answered));
      setResult({ answered, pct });
      setStage("results");
    },
    [update]
  );

  if (loadingIndex || !ready) return <div className="text-zinc-500 text-sm p-8">{t("common.loading")}</div>;

  // ------------------------------------------------------------------ running

  if (stage === "running" && deck.length > 0) {
    return (
      <div className="max-w-3xl space-y-4">
        <button
          type="button"
          onClick={() => setStage("setup")}
          className="inline-block py-2 -my-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← {pick("Dừng và chọn lại từ", "Stop and change words")}
        </button>
        <LessonTest
          key={roundNo}
          questions={deck}
          heading={pick("Luyện từ vựng tiếng Anh", "English practice")}
          blurb={pick(
            `${deck.length} từ từ các bài bạn đã chọn. Kết quả được lưu vào lịch sử ôn tập của từng từ.`,
            `${deck.length} words from the lessons you picked. Results feed each word's review history.`
          )}
          ctaLabel={pick("Xem kết quả →", "See results →")}
          onFinish={finish}
        />
      </div>
    );
  }

  // ------------------------------------------------------------------ results

  if (stage === "results" && result) {
    const byKey = new Map(deck.map((q) => [q.key, q]));
    const missed = result.answered.filter((a) => !a.correct).map((a) => byKey.get(a.key)).filter(Boolean) as TestQuestion[];
    const missedWords = missed.map((q) => wordByKey.get(q.key)).filter(Boolean) as LocatedWord[];
    const correct = result.answered.length - missed.length;

    return (
      <div className="max-w-3xl space-y-5">
        <div className={cn("card border-l-4", result.pct >= 70 ? "border-l-green-500" : "border-l-amber-500")}>
          <div className="text-3xl font-bold">{result.pct}%</div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {pick(`Đúng ${correct}/${result.answered.length} từ.`, `${correct} of ${result.answered.length} words correct.`)}
          </p>
        </div>

        {missed.length > 0 && (
          <div className="card space-y-3">
            <h2 className="font-semibold">{pick("Từ cần ôn lại", "Words to review")}</h2>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {missed.map((q) => {
                const item = q as TestQuestion & VocabItem;
                const meaning = lang === "en" ? item.optionsEn?.[item.answer] ?? item.options[item.answer] : item.options[item.answer];

                return (
                  <li key={q.key} className="py-2 flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{item.word}</span>
                    {item.ipa && <span className="text-xs text-zinc-500">{item.ipa}</span>}
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">— {meaning}</span>
                    <span className="w-full text-xs text-zinc-500 truncate">{topicTitle.get(q.slug)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={start} className="btn-primary text-sm px-4 py-2">
            {pick("Luyện lượt mới", "Practise again")} →
          </button>
          {missedWords.length > 0 && (
            <button
              type="button"
              onClick={() => void startRound(missedWords, missedWords.length)}
              className="btn-secondary text-sm"
            >
              {pick(`Ôn lại ${missedWords.length} từ sai`, `Retry ${missedWords.length} missed`)}
            </button>
          )}
          <button type="button" onClick={() => setStage("setup")} className="btn-secondary text-sm">
            {pick("Chọn lại từ", "Change words")}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------- setup

  const allKeys = words.map((w) => w.key);
  const all = nodeState(allKeys, selected);
  const drawSize = Math.min(count, eligibleCount, MAX_DECK);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link href="/practice" className="inline-block py-2 -my-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          ← {pick("Luyện tập", "Practice")}
        </Link>
        <h1 className="text-2xl font-bold mt-1">{pick("Luyện tiếng Anh", "English Practice")}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl">
          {pick(
            `Chọn từ vựng từ bất kỳ khoá học, chủ đề, bài nhỏ hay từng từ riêng lẻ (${words.length} từ), rồi bắt đầu luyện.`,
            `Pick vocabulary from any course, topic, lesson or single word (${words.length} words in total), then start practising.`
          )}
        </p>
      </div>

      {words.length === 0 ? (
        <div className="card text-sm text-zinc-500">{pick("Chưa có từ vựng nào.", "No vocabulary available yet.")}</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
          {/* ---------------------------------------------------- word picker */}
          <section className="space-y-3 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={pick("Tìm một từ ở mọi khoá học…", "Find a word across every course…")}
                // `.input` is unlayered CSS, so its px-3 beats plain utilities here.
                className="input w-full !pl-9 !pr-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={pick("Xoá tìm kiếm", "Clear search")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <label className="flex items-center gap-2 py-1 cursor-pointer">
                <TriCheckbox
                  checked={all.checked}
                  indeterminate={all.indeterminate}
                  onChange={(on) => setMany(allKeys, on)}
                  label={pick("Chọn tất cả", "Select everything")}
                />
                {pick("Chọn tất cả", "Select everything")}
              </label>
              {selected.size > 0 && (
                <button type="button" onClick={() => setSelected(new Set())} className="py-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
                  {pick("Bỏ chọn hết", "Clear selection")}
                </button>
              )}
            </div>

            {query.trim().length >= 2 ? (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
                  <span>
                    {matches.length} {pick("kết quả", "matches")}
                    {matches.length > SEARCH_LIMIT && ` · ${pick("hiện", "showing")} ${SEARCH_LIMIT}`}
                  </span>
                  {matches.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMany(matches.map((m) => m.key), !nodeState(matches.map((m) => m.key), selected).checked)}
                      className="py-1 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {nodeState(matches.map((m) => m.key), selected).checked
                        ? pick("Bỏ chọn tất cả kết quả", "Unselect all matches")
                        : pick("Chọn tất cả kết quả", "Select all matches")}
                    </button>
                  )}
                </div>
                {matches.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-zinc-500 text-center">{pick("Không có từ nào khớp.", "No words match.")}</p>
                ) : (
                  <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {matches.slice(0, SEARCH_LIMIT).map((m) => (
                      <li key={m.key}>
                        <label className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <TriCheckbox
                            checked={selected.has(m.key)}
                            indeterminate={false}
                            onChange={(on) => setMany([m.key], on)}
                            label={m.word}
                          />
                          <span className="font-medium">{m.word}</span>
                          {m.pos && <span className="text-xs text-zinc-500">{m.pos}</span>}
                          <span className="ml-auto text-xs text-zinc-500 truncate min-w-0">{topicTitle.get(m.slug)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
                {courses.map(({ group, topics: courseTopicList, keys }) => {
                  const state = nodeState(keys, selected);
                  const isOpen = open.has(group.id);

                  return (
                    <div key={group.id}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <TriCheckbox
                          checked={state.checked}
                          indeterminate={state.indeterminate}
                          onChange={(on) => setMany(keys, on)}
                          label={pick(group.label, group.labelEn)}
                        />
                        <button
                          type="button"
                          onClick={() => toggleOpen(group.id)}
                          aria-expanded={isOpen}
                          className="flex flex-1 min-w-0 items-center gap-2 text-left"
                        >
                          <span className={cn("text-base", GROUP_ACCENT[group.accent].text)}>{group.icon}</span>
                          <span className="font-semibold text-sm truncate">{pick(group.label, group.labelEn)}</span>
                          <span className="ml-auto text-xs font-mono text-zinc-500 shrink-0">
                            {state.count}/{keys.length}
                          </span>
                          <ChevronDown className={cn("w-4 h-4 text-zinc-500 shrink-0 transition-transform", isOpen && "rotate-180")} />
                        </button>
                      </div>

                      {isOpen && (
                        <div className="border-t border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
                          {courseTopicList.map((topic) => {
                            const topicKeys = topic.lessons.flatMap((l) => l.words.map((w) => wordKey(topic.slug, w.id)));
                            const ts = nodeState(topicKeys, selected);
                            const topicOpen = open.has(topic.slug);

                            return (
                              <div key={topic.slug}>
                                <div className="flex items-center gap-3 pl-8 pr-4 py-2.5">
                                  <TriCheckbox
                                    checked={ts.checked}
                                    indeterminate={ts.indeterminate}
                                    onChange={(on) => setMany(topicKeys, on)}
                                    label={pick(topic.title, topic.titleEn)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleOpen(topic.slug)}
                                    aria-expanded={topicOpen}
                                    className="flex flex-1 min-w-0 items-center gap-2 text-left"
                                  >
                                    <span className="text-sm truncate">{pick(topic.title, topic.titleEn)}</span>
                                    <span className="ml-auto text-xs font-mono text-zinc-500 shrink-0">
                                      {ts.count}/{topicKeys.length}
                                    </span>
                                    <ChevronDown className={cn("w-4 h-4 text-zinc-500 shrink-0 transition-transform", topicOpen && "rotate-180")} />
                                  </button>
                                </div>

                                {topicOpen &&
                                  topic.lessons.map((lesson) => {
                                    const lessonKeys = lesson.words.map((w) => wordKey(topic.slug, w.id));
                                    const ls = nodeState(lessonKeys, selected);

                                    return (
                                      <div key={lesson.id} className="pl-14 pr-4 py-2.5 space-y-2">
                                        <label className="flex items-center gap-3 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer">
                                          <TriCheckbox
                                            checked={ls.checked}
                                            indeterminate={ls.indeterminate}
                                            onChange={(on) => setMany(lessonKeys, on)}
                                            label={pick(lesson.title, lesson.titleEn)}
                                          />
                                          <span className="truncate">{pick(lesson.title, lesson.titleEn)}</span>
                                          <span className="ml-auto font-mono text-zinc-500 shrink-0">
                                            {ls.count}/{lessonKeys.length}
                                          </span>
                                        </label>
                                        <div className="flex flex-wrap gap-1.5 pl-7">
                                          {lesson.words.map((w) => {
                                            const key = wordKey(topic.slug, w.id);
                                            const on = selected.has(key);

                                            return (
                                              <label
                                                key={key}
                                                className={cn(
                                                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs cursor-pointer transition-colors",
                                                  on
                                                    ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                                                    : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                )}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={on}
                                                  onChange={(e) => setMany([key], e.target.checked)}
                                                  className="h-3.5 w-3.5 accent-blue-600"
                                                />
                                                {w.word}
                                                {isMistake(progress, key) && (
                                                  <span className="text-amber-600 dark:text-amber-400" title={pick("Từng trả lời sai", "Missed before")}>
                                                    •
                                                  </span>
                                                )}
                                              </label>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ------------------------------------------------- session options */}
          <aside className="card space-y-5 lg:sticky lg:top-6">
            <div>
              <div className="text-xs text-zinc-500">{pick("Đã chọn", "Selected")}</div>
              <div className="text-2xl font-bold">
                {selected.size}
                <span className="text-sm font-normal text-zinc-500 ml-1.5">{pick("từ", "words")}</span>
              </div>
              {selected.size > 0 && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  {uniqueCount(selectedWords)} {pick("từ khác nhau", "distinct")} · {mistakesInSelection}{" "}
                  {pick("từng sai", "missed before")}
                </p>
              )}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-zinc-500 mb-2">{pick("Số từ mỗi lượt", "Words per round")}</legend>
              <div className="flex flex-wrap gap-2">
                {PRACTICE_COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    aria-pressed={count === n}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                      count === n
                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                        : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-medium text-zinc-500 mb-2">{pick("Từ nào", "Which words")}</legend>
              <div className="space-y-1.5 text-sm">
                {(
                  [
                    ["all", pick("Tất cả từ đã chọn", "All selected words")],
                    ["unseen", pick("Chỉ từ chưa luyện", "Only words not practised yet")],
                    ["mistakes", pick("Chỉ từ từng sai", "Only words I missed before")],
                  ] as [PracticeFilter, string][]
                ).map(([id, label]) => (
                  <label key={id} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input type="radio" name="filter" checked={filter === id} onChange={() => setFilter(id)} className="accent-blue-600" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-medium text-zinc-500 mb-2">{pick("Thứ tự", "Order")}</legend>
              <div className="space-y-1.5 text-sm">
                {(
                  [
                    ["weakest", pick("Ưu tiên từ yếu & chưa học", "Weakest & new words first")],
                    ["random", pick("Ngẫu nhiên", "Random")],
                  ] as [PracticeOrder, string][]
                ).map(([id, label]) => (
                  <label key={id} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input type="radio" name="order" checked={order === id} onChange={() => setOrder(id)} className="accent-blue-600" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} className="mt-0.5 accent-blue-600" />
              <span>
                {pick("Bỏ qua từ trùng lặp", "Skip duplicate words")}
                <span className="block text-xs text-zinc-500">
                  {pick("Một từ xuất hiện ở nhiều chủ đề chỉ hỏi một lần.", "A word taught in several topics is asked once.")}
                </span>
              </span>
            </label>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="button"
              onClick={start}
              disabled={drawSize === 0 || stage === "loading"}
              className="btn-primary w-full py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stage === "loading"
                ? t("common.loading")
                : drawSize === 0
                  ? selected.size === 0
                    ? pick("Chọn ít nhất một từ", "Select at least one word")
                    : pick("Không có từ phù hợp bộ lọc", "No words match the filter")
                  : pick(`Bắt đầu luyện ${drawSize} từ →`, `Start practising ${drawSize} words →`)}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
