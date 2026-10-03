"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLang } from "@/context/lang";
import QuestionText from "@/components/knowledge/QuestionText";
import { localizeQuestion, type Question } from "@/components/knowledge/QuizBlock";
import { splitArticle } from "@/lib/lessons";
import { cn } from "@/lib/utils";

type PdfLang = "vi" | "en" | "both";

interface Props {
  courseLabel: string;
  courseLabelEn: string;
  topicTitle: string;
  topicTitleEn?: string;
  lessonTitle: string;
  lessonTitleEn?: string;
  /** 1-based position of the lesson in its topic, and the topic's lesson count. */
  position: number;
  total: number;
  /** 1-based `## ` section indices this lesson covers. */
  sections: number[];
  content: string;
  contentEn?: string | null;
  /** This lesson's own check questions (empty for a recap). */
  questions: Question[];
}

/** Body class that switches the print stylesheet to "only the lesson copy". */
const PRINT_CLASS = "lesson-print";
const LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * "Export PDF" for one mini-lesson.
 *
 * The browser's own print engine makes the PDF ("Save as PDF" in the print
 * dialog): text stays selectable, Vietnamese diacritics and tables come out
 * exactly as on screen, and nothing heavy ships to the client. A canvas-based
 * generator would rasterise the text instead.
 *
 * While exporting, a light-themed copy of the lesson is portalled into
 * `<body>` and `body.lesson-print` hides everything else (see globals.css), so
 * an ordinary Ctrl+P elsewhere in the app is unaffected.
 */
export default function LessonPdfExport(props: Props) {
  const { pick, lang, dual } = useLang();
  const hasEnglish = Boolean(props.contentEn);
  const [open, setOpen] = useState(false);
  const [pdfLang, setPdfLang] = useState<PdfLang>(dual && hasEnglish ? "both" : lang === "en" ? "en" : "vi");
  const [withQuestions, setWithQuestions] = useState(true);
  const [printing, setPrinting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the options panel on an outside click or Escape.
  useEffect(() => {
    if (!open) return;

    const onPointer = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Once the print copy has rendered, open the dialog; tidy up when it closes.
  useEffect(() => {
    if (!printing) return;

    const previousTitle = document.title;
    // Browsers name the saved PDF after the document title.
    const en = hasEnglish && pdfLang === "en";
    document.title = fileTitle(
      en ? props.topicTitleEn || props.topicTitle : props.topicTitle,
      en ? props.lessonTitleEn || props.lessonTitle : props.lessonTitle
    );
    document.body.classList.add(PRINT_CLASS);

    const finish = () => {
      document.body.classList.remove(PRINT_CLASS);
      document.title = previousTitle;
      setPrinting(false);
    };

    window.addEventListener("afterprint", finish, { once: true });
    // One frame so the portal is laid out before the print snapshot is taken.
    const frame = requestAnimationFrame(() => window.print());

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove(PRINT_CLASS);
      document.title = previousTitle;
    };
    // Runs once per export; the props are fixed for the lesson on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printing]);

  const exportPdf = () => {
    setOpen(false);
    setPrinting(true);
  };

  return (
    <div ref={menuRef} className="relative print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 py-1.5 -my-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10 2.5a.75.75 0 0 1 .75.75v7.69l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L5.72 9.53a.75.75 0 0 1 1.06-1.06l2.47 2.47V3.25A.75.75 0 0 1 10 2.5Z" />
          <path d="M3.5 13.25a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 17.5h10.5A2.75 2.75 0 0 0 18 14.75v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
        </svg>
        {pick("Xuất PDF", "Export PDF")}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={pick("Xuất bài học ra PDF", "Export lesson to PDF")}
          className="absolute right-0 z-20 mt-2 w-64 card shadow-lg space-y-3 text-sm"
        >
          {hasEnglish && (
            <fieldset className="space-y-1">
              <legend className="text-xs font-medium text-zinc-500 mb-1">{pick("Ngôn ngữ", "Language")}</legend>
              {(
                [
                  ["vi", "Tiếng Việt", "Vietnamese"],
                  ["en", "Tiếng Anh", "English"],
                  ["both", "Song ngữ (Việt + Anh)", "Both (Vietnamese + English)"],
                ] as const
              ).map(([value, vi, en]) => (
                <label key={value} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="radio"
                    name="pdf-lang"
                    checked={pdfLang === value}
                    onChange={() => setPdfLang(value)}
                  />
                  {pick(vi, en)}
                </label>
              ))}
            </fieldset>
          )}

          {props.questions.length > 0 && (
            <label className="flex items-start gap-2 py-1 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={withQuestions}
                onChange={(e) => setWithQuestions(e.target.checked)}
              />
              <span>{pick("Kèm câu hỏi luyện tập và đáp án", "Include practice questions and answers")}</span>
            </label>
          )}

          <button type="button" onClick={exportPdf} className="btn-primary w-full text-sm">
            {pick("Lưu PDF", "Save PDF")}
          </button>
          <p className="text-xs text-zinc-500">
            {pick(
              "Trong hộp thoại in, chọn “Lưu dưới dạng PDF” (Save as PDF).",
              "In the print dialog, choose “Save as PDF” as the destination."
            )}
          </p>
        </div>
      )}

      {printing &&
        createPortal(
          <LessonPrintDocument {...props} pdfLang={hasEnglish ? pdfLang : "vi"} withQuestions={withQuestions} />,
          document.body
        )}
    </div>
  );
}

/** A file-system-safe "Topic - Lesson" title, used as the PDF's default name. */
function fileTitle(topic: string, lesson: string): string {
  return `${topic} - ${lesson}`.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
}

function LessonPrintDocument({
  courseLabel,
  courseLabelEn,
  topicTitle,
  topicTitleEn,
  lessonTitle,
  lessonTitleEn,
  position,
  total,
  sections,
  content,
  contentEn,
  questions,
  pdfLang,
  withQuestions,
}: Props & { pdfLang: PdfLang; withQuestions: boolean }) {
  // The printout's chrome follows the chosen language, not the screen's.
  const en = pdfLang === "en";
  const say = (vi: string, english?: string) => (en ? english || vi : vi);

  const viSections = splitArticle(content).sections;
  const enSections = splitArticle(contentEn ?? "").sections;
  const qs = withQuestions ? questions.map((q) => localizeQuestion(q, en ? "en" : "vi")) : [];
  const source = typeof window === "undefined" ? "" : window.location.href.split("?")[0];

  return (
    <div id="lesson-print-root" className="bg-white text-zinc-900">
      <header className="border-b border-zinc-300 pb-3 mb-6">
        <p className="text-xs text-zinc-500">
          {say(courseLabel, courseLabelEn)} › {say(topicTitle, topicTitleEn)}
        </p>
        <h1 className="text-2xl font-bold mt-1">{say(lessonTitle, lessonTitleEn)}</h1>
        {pdfLang === "both" && lessonTitleEn && <p className="text-base text-zinc-600 mt-0.5">{lessonTitleEn}</p>}
        <p className="text-xs text-zinc-500 mt-1">
          {say("Bài", "Lesson")} {position}/{total}
        </p>
      </header>

      {sections.map((n) => {
        const vi = viSections[n - 1];
        const english = enSections[n - 1];

        if (pdfLang === "vi") return vi ? <PrintMarkdown key={n} content={vi} /> : null;

        if (pdfLang === "en") return english || vi ? <PrintMarkdown key={n} content={english ?? vi!} /> : null;

        return (
          <div key={n} className="print-section">
            {vi && <PrintMarkdown content={vi} />}
            {english && (
              <div className="mt-3 border-l-4 border-zinc-300 pl-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">English</p>
                <PrintMarkdown content={english} />
              </div>
            )}
          </div>
        );
      })}

      {qs.length > 0 && (
        <>
          <section className="mt-8">
            <h2 className="text-xl font-bold mb-1">{say("Câu hỏi luyện tập", "Practice questions")}</h2>
            <p className="text-xs text-zinc-500 mb-4">
              {say("Đáp án ở trang cuối.", "Answers are on the last page.")}
            </p>
            <ol className="space-y-4">
              {qs.map((q, i) => (
                <li key={q.id} className="print-avoid-break">
                  <p className="font-medium">
                    {i + 1}. <QuestionText text={q.question} />
                  </p>
                  <ul className="mt-1.5 space-y-1 pl-5">
                    {q.options.map((option, j) => (
                      <li key={j}>
                        <span className="font-semibold mr-1.5">{LETTERS[j]}.</span>
                        <QuestionText text={option} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>

          <section className="print-page-break">
            <h2 className="text-xl font-bold mb-4">{say("Đáp án", "Answer key")}</h2>
            <ol className="space-y-3 text-sm">
              {qs.map((q, i) => (
                <li key={q.id} className="print-avoid-break">
                  <span className="font-semibold">
                    {i + 1}. {LETTERS[q.answer]}
                  </span>
                  {q.explanation && (
                    <>
                      {" — "}
                      <QuestionText text={q.explanation} />
                    </>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      {source && <p className="mt-10 pt-3 border-t border-zinc-300 text-[10px] text-zinc-500">{source}</p>}
    </div>
  );
}

/** Markdown for paper: light colours only, tables at full width, code that wraps. */
function PrintMarkdown({ content }: { content: string }) {
  return (
    <div
      className={cn(
        "prose prose-zinc max-w-none prose-sm",
        "prose-headings:font-bold prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2 prose-h3:text-base prose-h3:mt-4",
        "prose-code:before:content-none prose-code:after:content-none prose-code:bg-zinc-100 prose-code:px-1 prose-code:rounded",
        "prose-pre:bg-zinc-100 prose-pre:text-zinc-900 prose-pre:border prose-pre:border-zinc-300 prose-pre:whitespace-pre-wrap",
        "prose-th:bg-zinc-100 prose-blockquote:border-zinc-400 prose-blockquote:not-italic"
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
