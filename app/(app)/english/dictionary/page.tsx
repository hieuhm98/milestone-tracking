"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, X } from "lucide-react";
import { useLang } from "@/context/lang";
import { getGroup } from "@/lib/groups";
import {
  DICT_PAGE_SIZE,
  LEVELS,
  POS_CODES,
  highlightParts,
  type DictionaryEntry,
  type DictionaryHit,
  type SenseGroup,
} from "@/lib/dictionary";
import { cn } from "@/lib/utils";

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
/** A long entry ("have", "take") shows this many senses until expanded. */
const SENSES_PREVIEW = 6;
/** Long enough that a keystroke doesn't fire a request, short enough to feel live. */
const SEARCH_DEBOUNCE_MS = 200;

export default function DictionaryPage() {
  const { t, pick, lang } = useLang();
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [letter, setLetter] = useState("");
  const [pos, setPos] = useState("");
  const [courseOnly, setCourseOnly] = useState(false);
  const [level, setLevel] = useState("");
  const [hits, setHits] = useState<DictionaryHit[]>([]);
  const [total, setTotal] = useState(0);
  const [bank, setBank] = useState(true);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  /** Where the open word's fetch stands, so a failure never looks like loading forever. */
  const [entryStatus, setEntryStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [entryAttempt, setEntryAttempt] = useState(0);
  const detailRef = useRef<HTMLDivElement>(null);

  // `?w=` makes a word shareable. Read from the URL directly rather than with
  // useSearchParams, which would force a Suspense boundary at build time.
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("w");

    if (initial) setSelected(initial);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setTerm(query.trim()), SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [query]);

  const load = useCallback(
    async (offset: number) => {
      const params = new URLSearchParams({ limit: String(DICT_PAGE_SIZE), offset: String(offset) });

      if (term) params.set("q", term);

      if (letter) params.set("letter", letter);

      if (pos) params.set("pos", pos);

      if (courseOnly) params.set("course", "1");

      if (level) params.set("level", level);

      setLoading(true);
      setListError(false);

      try {
        const res = await fetch(`/api/english/dictionary?${params}`);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        setHits((prev) => (offset === 0 ? json.items ?? [] : prev.concat(json.items ?? [])));
        setTotal(json.total ?? 0);
        setBank(json.bank !== false);
      } catch {
        if (offset === 0) {
          setHits([]);
          setTotal(0);
        }

        setListError(true);
      } finally {
        setLoading(false);
      }
    },
    [term, letter, pos, courseOnly, level]
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  // Fetch whichever word is open, and keep the URL in step with it.
  useEffect(() => {
    const url = new URL(window.location.href);

    if (selected) {
      url.searchParams.set("w", selected);
    } else {
      url.searchParams.delete("w");
    }

    window.history.replaceState(null, "", url);

    if (!selected) {
      setEntry(null);

      return;
    }

    let cancelled = false;

    setEntry(null);
    setEntryStatus("loading");

    fetch(`/api/english/dictionary?word=${encodeURIComponent(selected)}`)
      .then((res) => {
        if (res.status === 404) return null;

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        return res.json();
      })
      .then((json) => {
        if (cancelled) return;

        const found: DictionaryEntry | null = json?.entry ?? null;

        setEntry(found);
        setEntryStatus(found ? "ready" : "missing");
      })
      .catch(() => {
        if (cancelled) return;

        setEntry(null);
        setEntryStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [selected, entryAttempt]);

  const hasFilters = Boolean(query.trim() || letter || pos || courseOnly);

  function clearFilters() {
    setQuery("");
    setTerm("");
    setLetter("");
    setPos("");
    setCourseOnly(false);
  }

  function openWord(word: string) {
    setSelected(word);
    // On a phone the detail sits above the list, so bring it into view.
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const chip = (active: boolean) =>
    cn(
      "px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors",
      active
        ? "bg-blue-600 border-blue-600 text-white"
        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
    );

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold tracking-tight">{t("dict.title")}</h1>
      <p className="text-sm text-zinc-500 mt-1">{t("dict.subtitle")}</p>

      <div className="card mt-4 space-y-3">
        <input
          className="input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("dict.searchPlaceholder")}
          aria-label={t("dict.search")}
          autoComplete="off"
          spellCheck={false}
        />

        <div className="flex flex-wrap gap-1.5" role="group" aria-label={pick("Lọc theo loại từ", "Filter by word type")}>
          <button type="button" className={chip(!pos)} aria-pressed={!pos} onClick={() => setPos("")}>
            {t("dict.allTypes")}
          </button>
          {POS_CODES.map((code) => (
            <button
              key={code}
              type="button"
              className={chip(pos === code)}
              aria-pressed={pos === code}
              onClick={() => setPos(pos === code ? "" : code)}
            >
              {t(`dict.pos.${code}`)}
            </button>
          ))}
          <button type="button" className={chip(courseOnly)} aria-pressed={courseOnly} onClick={() => setCourseOnly(!courseOnly)}>
            {t("dict.courseOnly")}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label={pick("Lọc theo trình độ", "Filter by level")}>
          <button type="button" className={chip(!level)} aria-pressed={!level} onClick={() => setLevel("")}>
            {t("dict.allLevels")}
          </button>
          {LEVELS.map((code) => (
            <button
              key={code}
              type="button"
              className={chip(level === code)}
              aria-pressed={level === code}
              onClick={() => setLevel(level === code ? "" : code)}
            >
              {t(`dict.level.${code}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label={pick("Lọc theo chữ cái đầu", "Filter by first letter")}>
          <button type="button" className={chip(!letter)} aria-pressed={!letter} onClick={() => setLetter("")}>
            {t("dict.allLetters")}
          </button>
          {LETTERS.map((l) => (
            <button
              key={l}
              type="button"
              className={cn(chip(letter === l), "w-9 sm:w-8 px-0 text-center uppercase")}
              aria-pressed={letter === l}
              onClick={() => setLetter(letter === l ? "" : l)}
            >
              {l}
            </button>
          ))}
        </div>

        {!bank && <p className="text-xs text-amber-600 dark:text-amber-400">{t("dict.bankMissing")}</p>}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* min-w-0: a grid column otherwise grows to its longest unwrapped line (the
            truncated topic titles), which pushed the page past a phone's width. */}
        <div className="lg:order-2 min-w-0" ref={detailRef}>
          {selected ? (
            <EntryCard
              word={selected}
              entry={entry}
              status={entryStatus}
              onRetry={() => setEntryAttempt((n) => n + 1)}
              onClose={() => setSelected(null)}
            />
          ) : (
            <div className="card text-sm text-zinc-500 hidden lg:block">{t("dict.selectHint")}</div>
          )}
        </div>

        <div className="lg:order-1 min-w-0">
          <p className="text-xs text-zinc-500 mb-2" aria-live="polite">
            {loading && hits.length === 0
              ? t("common.loading")
              : listError && hits.length === 0
                ? pick("Không tải được danh sách từ", "Couldn't load the word list")
                : `${total.toLocaleString(lang === "vi" ? "vi-VN" : "en-GB")} ${t("dict.words")}`}
          </p>

          {loading && hits.length === 0 && (
            <ul className="space-y-2" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="card animate-pulse">
                  <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800/60 mt-2" />
                </li>
              ))}
            </ul>
          )}

          <ul className="space-y-2">
            {hits.map((hit) => (
              <li key={hit.word}>
                <button
                  type="button"
                  onClick={() => openWord(hit.word)}
                  aria-current={selected?.toLowerCase() === hit.word.toLowerCase() ? "true" : undefined}
                  className={cn(
                    "card w-full text-left hover:border-blue-400 dark:hover:border-blue-700 transition-colors",
                    selected?.toLowerCase() === hit.word.toLowerCase() && "border-blue-500 dark:border-blue-600"
                  )}
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold">{hit.word}</span>
                    {hit.ipa && <span className="text-xs text-zinc-500">{hit.ipa}</span>}
                    {hit.pos && (
                      <span className="text-[11px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {t(`dict.pos.${hit.pos}`)}
                      </span>
                    )}
                    {hit.level && hit.level !== "common" && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        {t(`dict.level.${hit.level}`)}
                      </span>
                    )}
                    {hit.courseCount > 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300">
                        {hit.courseCount} {t("dict.examples")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 min-w-0">
                    {pick(hit.meaningVi ?? hit.meaningEn ?? "", hit.meaningEn ?? hit.meaningVi ?? "")}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {listError && !loading && (
            <div
              role="alert"
              className="card flex flex-wrap items-center gap-3 mt-2 !border-red-200 dark:!border-red-900/60 text-sm"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-zinc-700 dark:text-zinc-300">
                {pick(
                  "Không tải được từ điển. Kiểm tra kết nối rồi thử lại.",
                  "The dictionary couldn't be loaded. Check your connection and try again."
                )}
              </span>
              <button type="button" className="btn-secondary inline-flex items-center gap-1.5" onClick={() => void load(hits.length)}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {pick("Thử lại", "Try again")}
              </button>
            </div>
          )}

          {hits.length === 0 && !loading && !listError && (
            <div className="card text-sm">
              <p className="font-medium text-zinc-700 dark:text-zinc-300">{t("dict.noResults")}</p>
              <p className="text-zinc-500 mt-1">
                {hasFilters
                  ? pick(
                      "Thử bỏ bớt bộ lọc, kiểm tra chính tả hoặc chỉ gõ phần đầu của từ.",
                      "Try removing a filter, checking the spelling, or typing just the start of the word."
                    )
                  : pick("Thử gõ một từ tiếng Anh khác.", "Try a different English word.")}
              </p>
              {hasFilters && (
                <button type="button" className="btn-secondary mt-3" onClick={clearFilters}>
                  {pick("Xoá bộ lọc", "Clear filters")}
                </button>
              )}
            </div>
          )}

          {hits.length < total && !listError && (
            <button
              type="button"
              className="btn-secondary w-full mt-3"
              disabled={loading}
              onClick={() => void load(hits.length)}
            >
              {loading ? t("common.loading") : t("dict.loadMore")}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-500 mt-6">
        {pick("Nguồn: ", "Sources: ")}
        <a href="https://wordnet.princeton.edu/" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
          Princeton WordNet 3.0
        </a>
        {pick(", từ điển Anh–Việt Hồ Ngọc Đức, wordset-dictionary, ", ", the Hồ Ngọc Đức English–Vietnamese dictionary, wordset-dictionary, ")}
        <a href="https://github.com/cmusphinx/cmudict" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
          CMUdict
        </a>
        {pick(" (phát âm, © Carnegie Mellon University), ", " (pronunciation, © Carnegie Mellon University), ")}
        <a href="https://github.com/hermitdave/FrequencyWords" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
          FrequencyWords
        </a>
        {pick(" (độ phổ biến) và ", " (how common) and ")}
        <a
          href="https://vi.wiktionary.org/"
          className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Wiktionary
        </a>
        {" "}
        (
        <a
          href="https://creativecommons.org/licenses/by-sa/4.0/"
          className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          CC BY-SA 4.0
        </a>
        ).
      </p>
    </div>
  );
}

function EntryCard({
  word,
  entry,
  status,
  onRetry,
  onClose,
}: {
  word: string;
  entry: DictionaryEntry | null;
  status: "loading" | "ready" | "missing" | "error";
  onRetry: () => void;
  onClose: () => void;
}) {
  const { t, pick, lang } = useLang();

  return (
    <div className="card lg:sticky lg:top-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold break-words">{entry?.word ?? word}</h2>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {entry?.ipa && <span className="text-sm text-zinc-500">{entry.ipa}</span>}
            {entry?.pos && (
              <span className="text-[11px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {t(`dict.pos.${entry.pos}`)}
              </span>
            )}
            {entry?.level && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">
                {t(`dict.level.${entry.level}`)}
              </span>
            )}
            {entry && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                {entry.inBank ? t("dict.fromWordBank") : t("dict.fromCourses")}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("dict.close")}
          className="shrink-0 p-2.5 -m-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {status === "error" ? (
        <div role="alert" className="mt-4 text-sm">
          <p className="text-zinc-700 dark:text-zinc-300">
            {pick("Không tải được nghĩa của từ này.", "This word's entry couldn't be loaded.")}
          </p>
          <button type="button" className="btn-secondary mt-3 inline-flex items-center gap-1.5" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {pick("Thử lại", "Try again")}
          </button>
        </div>
      ) : status === "missing" ? (
        <p className="text-sm text-zinc-500 mt-4">
          {pick(
            "Từ này không có trong từ điển. Thử tìm một dạng khác của từ (ví dụ dạng nguyên mẫu).",
            "This word isn't in the dictionary. Try another form of it (for example the base form)."
          )}
        </p>
      ) : !entry ? (
        <p className="text-sm text-zinc-500 mt-4" aria-live="polite">{t("common.loading")}</p>
      ) : (
        <>
          <dl className="mt-4 space-y-3">
            {/* The one-line summaries give way to the full sense lists below when those exist. */}
            {entry.meaningVi && !entry.senses?.vi.length && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("dict.meaningVi")}</dt>
                <dd className="text-sm mt-0.5">{entry.meaningVi}</dd>
              </div>
            )}
            {entry.meaningEn && !entry.senses?.en.length && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("dict.meaningEn")}</dt>
                <dd className="text-sm mt-0.5">{entry.meaningEn}</dd>
              </div>
            )}
            {/* What the courses teach, where that differs from the common sense. */}
            {(entry.courseMeaningVi || entry.courseMeaningEn || entry.courseIpa) && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {t("dict.courseMeaning")}
                </dt>
                <dd className="text-sm mt-0.5 text-zinc-600 dark:text-zinc-400">
                  {entry.courseIpa && <span className="text-zinc-500 mr-2">{entry.courseIpa}</span>}
                  {[entry.courseMeaningVi, entry.courseMeaningEn].filter(Boolean).join(" · ")}
                </dd>
              </div>
            )}
          </dl>

          {entry.senses && (
            <div className="mt-4 space-y-5">
              {(lang === "vi" ? (["vi", "en"] as const) : (["en", "vi"] as const)).map((which) =>
                entry.senses![which].length > 0 ? (
                  <SenseList
                    key={`${entry.word}-${which}`}
                    title={t(which === "vi" ? "dict.allSensesVi" : "dict.allSensesEn")}
                    groups={entry.senses![which]}
                  />
                ) : null
              )}
            </div>
          )}

          {entry.occurrences.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">
                {t("dict.inYourCourses")}
              </h3>
              <ul className="space-y-3">
                {entry.occurrences.map((occurrence) => {
                  const group = getGroup(occurrence.group);

                  return (
                    <li key={occurrence.key} className="border-l-2 border-zinc-200 dark:border-zinc-800 pl-3">
                      {occurrence.sentence && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 italic">
                          “
                          {highlightParts(occurrence.sentence, entry.word).map((part, i) =>
                            part.match ? (
                              <mark key={i} className="bg-amber-200 dark:bg-amber-500/30 text-inherit rounded px-0.5">
                                {part.text}
                              </mark>
                            ) : (
                              <span key={i}>{part.text}</span>
                            )
                          )}
                          ”
                        </p>
                      )}
                      <p className="text-xs text-zinc-500 mt-1">
                        {pick(occurrence.meaningVi ?? "", occurrence.meaningEn ?? occurrence.meaningVi ?? "")}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs">
                        <span className="text-zinc-500 truncate max-w-full">
                          {group ? pick(group.label, group.labelEn) + " · " : ""}
                          {pick(occurrence.topicTitle, occurrence.topicTitleEn ?? occurrence.topicTitle)}
                        </span>
                        <Link
                          href={`/learn/${occurrence.slug}/${occurrence.lessonId}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline py-2 -my-2"
                        >
                          {t("dict.openLesson")}
                        </Link>
                        <Link
                          href={`/knowledge/${occurrence.slug}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline py-2 -my-2"
                        >
                          {t("dict.openArticle")}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Every sense of one language, grouped by part of speech, numbered within each group. */
function SenseList({ title, groups }: { title: string; groups: SenseGroup[] }) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const total = groups.reduce((sum, group) => sum + group.senses.length, 0);
  let budget = expanded ? Infinity : SENSES_PREVIEW;

  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">{title}</h3>
      <div className="space-y-3">
        {groups.map((group, g) => {
          if (budget <= 0) return null;

          const shown = group.senses.slice(0, budget);
          budget -= shown.length;

          return (
            <div key={g}>
              {group.pos && (
                <span className="text-[11px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {t(`dict.pos.${group.pos}`)}
                </span>
              )}
              <ol className="mt-1.5 space-y-2 list-decimal pl-5 marker:text-zinc-400 text-sm">
                {shown.map((sense, i) => (
                  <li key={i} className="min-w-0 break-words">
                    {sense.phrase && <span className="font-semibold">{sense.phrase}: </span>}
                    {sense.meaning}
                    {sense.examples.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {sense.examples.map((example, k) => (
                          <li key={k} className="text-xs text-zinc-500">
                            <span className="italic text-zinc-700 dark:text-zinc-300">{example.text}</span>
                            {example.translation && <> — {example.translation}</>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>

      {total > SENSES_PREVIEW && (
        <button
          type="button"
          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline py-2 -my-2"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? t("dict.showFewerSenses") : t("dict.showAllSenses").replace("{n}", String(total))}
        </button>
      )}
    </section>
  );
}
