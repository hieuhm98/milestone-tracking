"use client";

// Setup screen of the Random Review page. With 170+ topics in eight tracks a
// flat checkbox grid stopped working, so topics live in collapsible track
// sections with search, a studied/weak filter and each topic's own score, and
// the session settings (mode, size, start) sit in a summary panel beside them.

import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/context/lang";
import { useProgress } from "@/context/progress";
import { GROUPS, DEFAULT_GROUP, GROUP_ACCENT, type Group } from "@/lib/groups";
import {
  MAX_SESSION,
  REVIEW_MODES,
  modeCounts,
  topicMastery,
  type Mastery,
  type QuestionIndex,
  type ReviewMode,
  type TopicMastery,
} from "@/lib/review";
import { cn } from "@/lib/utils";

export interface ReviewTopic {
  slug: string;
  group: string;
  title: string;
  titleEn?: string;
  order?: number;
  questionCount?: number;
}

export interface SessionRequest {
  slugs: string[];
  mode: ReviewMode;
  count: number;
}

type Filter = "all" | "new" | "weak" | "studied";

const COUNTS = [5, 10, 20, 50, 0] as const;
const QUICK_COUNT = 5;
const SETUP_KEY = "review:setup";

interface SavedSetup {
  slugs?: string[];
  mode?: ReviewMode;
  count?: number;
}

function loadSetup(): SavedSetup | null {
  try {
    const raw = window.localStorage.getItem(SETUP_KEY);

    return raw ? (JSON.parse(raw) as SavedSetup) : null;
  } catch {
    return null;
  }
}

function saveSetup(setup: SavedSetup) {
  try {
    window.localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
  } catch {
    // Storage blocked: the page still works, it just won't remember the choice.
  }
}

const MODE_TEXT: Record<ReviewMode, { vi: string; en: string; descVi: string; descEn: string }> = {
  smart: {
    vi: "Ôn thông minh",
    en: "Smart mix",
    descVi: "Ưu tiên câu chưa làm, câu hay sai và câu lâu rồi chưa ôn.",
    descEn: "New questions, weak ones and ones you haven't seen in a while first.",
  },
  random: {
    vi: "Ngẫu nhiên",
    en: "Random",
    descVi: "Rút ngẫu nhiên từ toàn bộ chủ đề đã chọn.",
    descEn: "Drawn at random from every selected topic.",
  },
  mistakes: {
    vi: "Câu từng làm sai",
    en: "Questions I've missed",
    descVi: "Chỉ những câu bạn đã từng trả lời sai.",
    descEn: "Only questions you have answered wrong before.",
  },
  new: {
    vi: "Chỉ câu mới",
    en: "New only",
    descVi: "Chỉ những câu bạn chưa làm lần nào.",
    descEn: "Only questions you have never answered.",
  },
};

const MASTERY_STYLE: Record<Mastery, string> = {
  none: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700",
  weak: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  ok: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  strong:
    "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function matchesFilter(m: TopicMastery, filter: Filter): boolean {
  if (filter === "new") return m.level === "none";

  if (filter === "weak") return m.level === "weak";

  if (filter === "studied") return m.seen > 0;

  return true;
}

export default function ReviewSetup({
  topics,
  index,
  onStart,
}: {
  topics: ReviewTopic[];
  index: QuestionIndex;
  onStart: (request: SessionRequest) => void;
}) {
  const { t, pick } = useLang();
  const { progress } = useProgress();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(topics.map((tp) => tp.slug)));
  const [mode, setMode] = useState<ReviewMode>("smart");
  const [count, setCount] = useState<number>(10);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const restored = useRef(false);

  // Restore the last setup once, dropping topics that no longer exist.
  useEffect(() => {
    const saved = loadSetup();

    if (saved) {
      const known = new Set(topics.map((tp) => tp.slug));

      if (saved.slugs) setSelected(new Set(saved.slugs.filter((s) => known.has(s))));

      if (saved.mode && REVIEW_MODES.includes(saved.mode)) setMode(saved.mode);

      if (typeof saved.count === "number" && (COUNTS as readonly number[]).includes(saved.count)) setCount(saved.count);
    }

    restored.current = true;
  }, [topics]);

  useEffect(() => {
    if (!restored.current) return;

    saveSetup({ slugs: Array.from(selected), mode, count });
  }, [selected, mode, count]);

  const mastery = useMemo(() => {
    const map = new Map<string, TopicMastery>();

    for (const tp of topics) map.set(tp.slug, topicMastery(index, tp.slug, progress));

    return map;
  }, [topics, index, progress]);

  const tracks = useMemo(() => {
    return GROUPS.map((g) => ({
      group: g,
      topics: topics.filter((tp) => (tp.group ?? DEFAULT_GROUP) === g.id),
    })).filter((tr) => tr.topics.length > 0);
  }, [topics]);

  const q = normalizeText(query.trim());
  const narrowing = q !== "" || filter !== "all";

  // Topics that pass the search and the filter, per track.
  const visibleByTrack = useMemo(() => {
    const map = new Map<string, ReviewTopic[]>();

    for (const tr of tracks) {
      map.set(
        tr.group.id,
        tr.topics.filter((tp) => {
          const m = mastery.get(tp.slug)!;

          if (!matchesFilter(m, filter)) return false;

          if (!q) return true;

          return normalizeText(`${tp.title} ${tp.titleEn ?? ""} ${tp.slug}`).includes(q);
        })
      );
    }

    return map;
  }, [tracks, mastery, filter, q]);

  const visibleTopics = useMemo(() => Array.from(visibleByTrack.values()).flat(), [visibleByTrack]);
  const counts = useMemo(() => modeCounts(index, selected, progress), [index, selected, progress]);
  const available = counts[mode];
  const sessionSize = Math.min(count === 0 ? MAX_SESSION : count, available);

  function setMany(slugs: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);

      for (const s of slugs) on ? next.add(s) : next.delete(s);

      return next;
    });
  }

  function toggleOpen(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);

      return next;
    });
  }

  function quickTest(slugs: string[]) {
    onStart({ slugs, mode: "smart", count: QUICK_COUNT });
  }

  const allVisibleSelected = visibleTopics.length > 0 && visibleTopics.every((tp) => selected.has(tp.slug));

  const filters: { id: Filter; vi: string; en: string }[] = [
    { id: "all", vi: "Tất cả", en: "All" },
    { id: "new", vi: "Chưa học", en: "Not studied" },
    { id: "weak", vi: "Còn yếu", en: "Weak" },
    { id: "studied", vi: "Đã học", en: "Studied" },
  ];

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("review.title")}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
          {pick(
            "Chọn chủ đề bên trái, chọn kiểu ôn và số câu bên phải, rồi bắt đầu.",
            "Pick topics on the left, choose how to review on the right, then start."
          )}
        </p>
      </div>

      {/* Daily Quick Test */}
      <div className="card bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden>
              ⚡
            </span>
            <h2 className="font-semibold text-blue-800 dark:text-blue-200">{t("review.quickTitle")}</h2>
          </div>
          <p className="text-xs text-blue-600/80 dark:text-blue-300/70 mt-1">
            {pick(
              "5 câu từ mọi khoá học, ưu tiên câu mới và câu bạn hay sai. Mỗi khoá cũng có nút ⚡ 5 câu riêng.",
              "5 questions from every course, new and weak ones first. Each track below has its own ⚡ 5 button too."
            )}
          </p>
        </div>
        <button onClick={() => quickTest(topics.map((tp) => tp.slug))} className="btn-primary text-sm px-4 py-2 shrink-0">
          {t("review.quickStart")}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        {/* Topic picker */}
        <section className="space-y-3 min-w-0" aria-label={t("review.topics")}>
          <div className="card space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm" aria-hidden>
                ⌕
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={pick("Tìm chủ đề… (vd: SQL, DPD, Docker)", "Search topics… (e.g. SQL, DPD, Docker)")}
                className="w-full pl-8 pr-3 py-2 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={pick("Lọc", "Filter")}>
                {filters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    aria-pressed={filter === f.id}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                      filter === f.id
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    )}
                  >
                    {pick(f.vi, f.en)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-zinc-500">
                  {pick(`Đã chọn ${selected.size}/${topics.length}`, `${selected.size}/${topics.length} selected`)}
                </span>
                <button
                  onClick={() => setMany(visibleTopics.map((tp) => tp.slug), !allVisibleSelected)}
                  disabled={visibleTopics.length === 0}
                  className="py-1.5 -my-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-40"
                >
                  {allVisibleSelected
                    ? narrowing
                      ? pick("Bỏ chọn các mục đang hiện", "Deselect shown")
                      : t("review.deselectAll")
                    : narrowing
                      ? pick("Chọn các mục đang hiện", "Select shown")
                      : t("review.selectAll")}
                </button>
              </div>
            </div>
          </div>

          {visibleTopics.length === 0 && (
            <div className="card text-sm text-zinc-500">
              {pick("Không có chủ đề nào khớp với tìm kiếm/bộ lọc.", "No topics match the search or filter.")}
            </div>
          )}

          {tracks.map(({ group, topics: all }) => {
            const shown = visibleByTrack.get(group.id) ?? [];

            if (narrowing && shown.length === 0) return null;

            return (
              <TrackSection
                key={group.id}
                group={group}
                all={all}
                shown={shown}
                // Searching or filtering opens every track that still has matches.
                expanded={narrowing || open.has(group.id)}
                onToggleOpen={() => toggleOpen(group.id)}
                selected={selected}
                mastery={mastery}
                onSetMany={setMany}
                onQuick={() => quickTest(all.map((tp) => tp.slug))}
              />
            );
          })}
        </section>

        {/* Session summary */}
        <aside className="card space-y-4 lg:sticky lg:top-6 order-first lg:order-none">
          <div>
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {pick("Phiên ôn tập của bạn", "Your session")}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {pick(
                `${selected.size} chủ đề · ${counts.random.toLocaleString()} câu hỏi trong kho`,
                `${selected.size} topics · ${counts.random.toLocaleString()} questions in the pool`
              )}
            </p>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              {pick("Kiểu ôn", "How to review")}
            </legend>
            {REVIEW_MODES.map((m) => {
              const n = counts[m];
              const disabled = n === 0;
              const on = mode === m;

              return (
                <label
                  key={m}
                  className={cn(
                    "flex items-start gap-2.5 px-3 py-2 rounded-lg border text-sm transition-colors",
                    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                    on
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
                  )}
                >
                  <input
                    type="radio"
                    name="review-mode"
                    checked={on}
                    disabled={disabled}
                    onChange={() => setMode(m)}
                    className="accent-blue-500 mt-0.5 shrink-0"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {pick(MODE_TEXT[m].vi, MODE_TEXT[m].en)}
                      </span>
                      <span className="text-[11px] text-zinc-500 tabular-nums">{n.toLocaleString()}</span>
                    </span>
                    <span className="block text-xs text-zinc-500 mt-0.5">{pick(MODE_TEXT[m].descVi, MODE_TEXT[m].descEn)}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div className="space-y-1.5">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("review.numQuestions")}</div>
            <div className="grid grid-cols-5 gap-1.5">
              {COUNTS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCount(c)}
                  aria-pressed={count === c}
                  className={cn(
                    "py-2 rounded-lg text-sm border transition-colors",
                    count === c
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  {c === 0 ? t("review.all") : c}
                </button>
              ))}
            </div>
            {count === 0 && available > MAX_SESSION && (
              <p className="text-[11px] text-zinc-500">
                {pick(`"Tất cả" tối đa ${MAX_SESSION} câu một phiên.`, `"All" is capped at ${MAX_SESSION} questions per session.`)}
              </p>
            )}
          </div>

          <button
            onClick={() => onStart({ slugs: Array.from(selected), mode, count })}
            disabled={sessionSize === 0}
            className="btn-primary w-full disabled:opacity-50"
          >
            {sessionSize === 0
              ? selected.size === 0
                ? pick("Chọn ít nhất một chủ đề", "Pick at least one topic")
                : pick("Không có câu phù hợp", "No matching questions")
              : pick(`Bắt đầu · ${sessionSize} câu →`, `Start · ${sessionSize} questions →`)}
          </button>
        </aside>
      </div>
    </div>
  );
}

function TrackSection({
  group,
  all,
  shown,
  expanded,
  onToggleOpen,
  selected,
  mastery,
  onSetMany,
  onQuick,
}: {
  group: Group;
  all: ReviewTopic[];
  shown: ReviewTopic[];
  expanded: boolean;
  onToggleOpen: () => void;
  selected: Set<string>;
  mastery: Map<string, TopicMastery>;
  onSetMany: (slugs: string[], on: boolean) => void;
  onQuick: () => void;
}) {
  const { pick } = useLang();
  const boxRef = useRef<HTMLInputElement>(null);
  const accent = GROUP_ACCENT[group.accent];
  const selectedCount = all.filter((tp) => selected.has(tp.slug)).length;
  const studied = all.filter((tp) => (mastery.get(tp.slug)?.seen ?? 0) > 0).length;
  const allOn = selectedCount === all.length;
  const someOn = selectedCount > 0 && !allOn;
  const panelId = `review-track-${group.id}`;

  useEffect(() => {
    if (boxRef.current) boxRef.current.indeterminate = someOn;
  }, [someOn]);

  return (
    // Not `.card`: its padding is unlayered CSS and would override p-0.
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <input
          ref={boxRef}
          type="checkbox"
          checked={allOn}
          onChange={() => onSetMany(all.map((tp) => tp.slug), !allOn)}
          aria-label={pick(`Chọn cả khoá ${group.label}`, `Select the whole ${group.labelEn} track`)}
          className="accent-blue-500 w-4 h-4 shrink-0"
        />
        <button
          onClick={onToggleOpen}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex-1 min-w-0 flex items-center gap-3 text-left py-1 -my-1"
        >
          <span className={cn("text-lg shrink-0", accent.text)} aria-hidden>
            {group.icon}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
              {pick(group.label, group.labelEn)}
            </span>
            <span className="block text-xs text-zinc-500">
              {pick(
                `${selectedCount}/${all.length} đã chọn · đã học ${studied}`,
                `${selectedCount}/${all.length} selected · ${studied} studied`
              )}
            </span>
          </span>
          <span className="hidden sm:block w-20 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden shrink-0" aria-hidden>
            <span className={cn("block h-full", accent.bar)} style={{ width: `${(100 * studied) / all.length}%` }} />
          </span>
          <span className={cn("text-zinc-400 transition-transform shrink-0", expanded && "rotate-90")} aria-hidden>
            ›
          </span>
        </button>
        <button
          onClick={onQuick}
          title={pick("Test nhanh 5 câu của khoá này", "Quick 5-question test of this track")}
          className="btn-secondary text-xs px-2.5 py-1.5 shrink-0"
        >
          ⚡ 5
        </button>
      </div>

      {expanded && (
        <ul id={panelId} className="border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2">
          {shown.map((tp) => {
            const m = mastery.get(tp.slug)!;
            const on = selected.has(tp.slug);

            return (
              <li key={tp.slug} className="border-b border-zinc-100 dark:border-zinc-800/60 md:odd:border-r">
                <label
                  className={cn(
                    "flex items-start gap-2.5 px-4 py-2.5 cursor-pointer text-sm transition-colors h-full",
                    on ? "bg-blue-50/60 dark:bg-blue-950/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onSetMany([tp.slug], !on)}
                    className="accent-blue-500 w-4 h-4 mt-0.5 shrink-0"
                  />
                  <span className="w-6 shrink-0 text-xs text-zinc-400 tabular-nums mt-0.5">{tp.order ?? ""}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-zinc-800 dark:text-zinc-200 leading-snug">{pick(tp.title, tp.titleEn)}</span>
                    <span className="block text-[11px] text-zinc-500 mt-0.5">
                      {pick(`${m.total} câu`, `${m.total} questions`)}
                      {m.seen > 0 && pick(` · đã làm ${m.seen}`, ` · ${m.seen} answered`)}
                    </span>
                  </span>
                  <span className={cn("shrink-0 text-[11px] px-1.5 py-0.5 rounded border tabular-nums", MASTERY_STYLE[m.level])}>
                    {m.pct === null ? pick("Mới", "New") : `${m.pct}%`}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
