"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { getGroup } from "@/lib/groups";
import {
  DICT_PAGE_SIZE,
  POS_CODES,
  highlightParts,
  type DictionaryEntry,
  type DictionaryHit,
} from "@/lib/dictionary";
import { cn } from "@/lib/utils";

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
/** Long enough that a keystroke doesn't fire a request, short enough to feel live. */
const SEARCH_DEBOUNCE_MS = 200;

export default function DictionaryPage() {
  const { t, pick, lang } = useLang();
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [letter, setLetter] = useState("");
  const [pos, setPos] = useState("");
  const [courseOnly, setCourseOnly] = useState(false);
  const [hits, setHits] = useState<DictionaryHit[]>([]);
  const [total, setTotal] = useState(0);
  const [bank, setBank] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
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

      setLoading(true);

      try {
        const res = await fetch(`/api/english/dictionary?${params}`);
        const json = await res.json();

        setHits((prev) => (offset === 0 ? json.items ?? [] : prev.concat(json.items ?? [])));
        setTotal(json.total ?? 0);
        setBank(json.bank !== false);
      } catch {
        if (offset === 0) setHits([]);
      } finally {
        setLoading(false);
      }
    },
    [term, letter, pos, courseOnly]
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

    fetch(`/api/english/dictionary?word=${encodeURIComponent(selected)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setEntry(json?.entry ?? null);
      })
      .catch(() => {
        if (!cancelled) setEntry(null);
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

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
        />

        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip(!pos)} onClick={() => setPos("")}>
            {t("dict.allTypes")}
          </button>
          {POS_CODES.map((code) => (
            <button key={code} type="button" className={chip(pos === code)} onClick={() => setPos(pos === code ? "" : code)}>
              {t(`dict.pos.${code}`)}
            </button>
          ))}
          <button type="button" className={chip(courseOnly)} onClick={() => setCourseOnly(!courseOnly)}>
            {t("dict.courseOnly")}
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          <button type="button" className={chip(!letter)} onClick={() => setLetter("")}>
            {t("dict.allLetters")}
          </button>
          {LETTERS.map((l) => (
            <button
              key={l}
              type="button"
              className={cn(chip(letter === l), "w-8 px-0 text-center uppercase")}
              onClick={() => setLetter(letter === l ? "" : l)}
            >
              {l}
            </button>
          ))}
        </div>

        {!bank && <p className="text-xs text-amber-600 dark:text-amber-400">{t("dict.bankMissing")}</p>}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="lg:order-2" ref={detailRef}>
          {selected ? (
            <EntryCard word={selected} entry={entry} onClose={() => setSelected(null)} />
          ) : (
            <div className="card text-sm text-zinc-500 hidden lg:block">{t("dict.selectHint")}</div>
          )}
        </div>

        <div className="lg:order-1">
          <p className="text-xs text-zinc-500 mb-2" aria-live="polite">
            {loading && hits.length === 0
              ? t("common.loading")
              : `${total.toLocaleString(lang === "vi" ? "vi-VN" : "en-GB")} ${t("dict.words")}`}
          </p>

          <ul className="space-y-2">
            {hits.map((hit) => (
              <li key={hit.word}>
                <button
                  type="button"
                  onClick={() => openWord(hit.word)}
                  className={cn(
                    "card w-full text-left hover:border-blue-400 dark:hover:border-blue-700 transition-colors",
                    selected?.toLowerCase() === hit.word.toLowerCase() && "border-blue-500 dark:border-blue-600"
                  )}
                >
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold">{hit.word}</span>
                    {hit.ipa && <span className="text-xs text-zinc-500">{hit.ipa}</span>}
                    {hit.pos && (
                      <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {t(`dict.pos.${hit.pos}`)}
                      </span>
                    )}
                    {hit.courseCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300">
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

          {hits.length === 0 && !loading && <p className="text-sm text-zinc-500">{t("dict.noResults")}</p>}

          {hits.length < total && (
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
    </div>
  );
}

function EntryCard({
  word,
  entry,
  onClose,
}: {
  word: string;
  entry: DictionaryEntry | null;
  onClose: () => void;
}) {
  const { t, pick } = useLang();

  return (
    <div className="card lg:sticky lg:top-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold break-words">{entry?.word ?? word}</h2>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {entry?.ipa && <span className="text-sm text-zinc-500">{entry.ipa}</span>}
            {entry?.pos && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {t(`dict.pos.${entry.pos}`)}
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              {entry?.inBank ? t("dict.fromWordBank") : t("dict.fromCourses")}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("dict.close")}
          className="shrink-0 p-2 -m-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ✕
        </button>
      </div>

      {!entry ? (
        <p className="text-sm text-zinc-500 mt-4">{t("common.loading")}</p>
      ) : (
        <>
          <dl className="mt-4 space-y-3">
            {entry.meaningVi && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t("dict.meaningVi")}</dt>
                <dd className="text-sm mt-0.5">{entry.meaningVi}</dd>
              </div>
            )}
            {entry.meaningEn && (
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
