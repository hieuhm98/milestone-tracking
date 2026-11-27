"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { useLang } from "@/context/lang";
import { type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Track {
  section: number;
  src: string;
  seconds: number;
}

interface Manifest {
  sections: Record<string, { file: string; seconds: number }>;
}

interface LessonAudioProps {
  slug: string;
  /** 1-based `## ` section numbers of this mini-lesson, in reading order. */
  sections: number[];
  /** Article markdown per language, used to label the parts by their headings. */
  content: string;
  contentEn?: string | null;
}

const minutes = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

const headings = (markdown: string) =>
  markdown
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice(3).replace(/^\d+\.\s*/, "").trim());

/**
 * Narration of a mini-lesson, one part per article section. Files are generated
 * by `scripts/tts/generate.py`; a lesson without any renders nothing.
 */
export default function LessonAudio({ slug, sections, content, contentEn }: LessonAudioProps) {
  const { pick, lang } = useLang();
  const [voice, setVoice] = useState<Lang>(lang);
  const [tracks, setTracks] = useState<Record<Lang, Track[]>>({ vi: [], en: [] });
  const [index, setIndex] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  const continuing = useRef(false);

  useEffect(() => setVoice(lang), [lang]);

  useEffect(() => {
    let cancelled = false;

    async function load(language: Lang): Promise<Track[]> {
      const response = await fetch(`/lesson-audio/${slug}/${language}.json`).catch(() => null);

      if (!response?.ok) return [];

      const manifest = (await response.json()) as Manifest;

      return sections.flatMap((section) => {
        const entry = manifest.sections[String(section)];

        return entry
          ? [{ section, src: `/lesson-audio/${slug}/${entry.file}`, seconds: entry.seconds }]
          : [];
      });
    }

    void Promise.all([load("vi"), load("en")]).then(([vi, en]) => {
      if (!cancelled) setTracks({ vi, en });
    });

    return () => {
      cancelled = true;
    };
  }, [slug, sections]);

  useEffect(() => {
    continuing.current = false;
    setIndex(0);
  }, [slug, sections, voice]);

  // Moving on after a part ends keeps playing; choosing a language does not start audio.
  useEffect(() => {
    if (!continuing.current) return;

    continuing.current = false;
    void audio.current?.play().catch(() => {});
  }, [index]);

  const available = (["vi", "en"] as const).filter((language) => tracks[language].length > 0);

  if (available.length === 0) return null;

  const active: Lang = available.includes(voice) ? voice : available[0];
  const list = tracks[active];
  const current = list[index] ?? list[0];
  const titles = headings(active === "en" && contentEn ? contentEn : content);

  const choose = (position: number) => {
    if (position === index) {
      void audio.current?.play().catch(() => {});
    } else {
      continuing.current = true;
      setIndex(position);
    }
  };

  return (
    <section aria-label={pick("Nghe bài học", "Listen to this lesson")} className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          {pick("Nghe bài học", "Listen to this lesson")}
        </h2>

        {available.length > 1 && (
          <div role="group" aria-label={pick("Ngôn ngữ giọng đọc", "Narration language")} className="flex gap-1">
            {available.map((language) => (
              <button
                key={language}
                type="button"
                aria-pressed={active === language}
                onClick={() => setVoice(language)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  active === language
                    ? "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                    : "border-zinc-200 text-zinc-500 dark:border-zinc-700"
                )}
              >
                {language === "vi" ? "Tiếng Việt" : "English"}
              </button>
            ))}
          </div>
        )}
      </div>

      <audio
        ref={audio}
        key={slug}
        src={current.src}
        controls
        preload="metadata"
        className="w-full"
        onEnded={() => {
          if (index < list.length - 1) choose(index + 1);
        }}
      />

      {list.length > 1 && (
        <ol className="space-y-0.5">
          {list.map((track, position) => (
            <li key={track.src}>
              <button
                type="button"
                aria-current={position === index ? "true" : undefined}
                onClick={() => choose(position)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  position === index ? "font-medium text-blue-700 dark:text-blue-300" : "text-zinc-600 dark:text-zinc-400"
                )}
              >
                <span className="min-w-0 truncate">{titles[track.section - 1]}</span>
                <span className="shrink-0 tabular-nums">{minutes(track.seconds)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-zinc-500">
        {pick("Giọng đọc do AI tạo.", "AI-generated voice.")}
        {active === "en" && " Pocket TTS by Kyutai (CC BY 4.0)."}
      </p>
    </section>
  );
}
