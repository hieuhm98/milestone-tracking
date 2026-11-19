"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Clock, Loader2, RotateCcw, Send } from "lucide-react";
import { useLang } from "@/context/lang";
import { useAuth } from "@/context/auth";
import { PROMPTS, TASK_RULES, type WritingPrompt, type WritingTaskKind } from "@/lib/writing/prompts";
import { countWords } from "@/lib/writing/metrics";
import { cn } from "@/lib/utils";

interface Lint {
  start: number;
  end: number;
  kind: string;
  message: string;
  suggestions: string[];
  text: string;
}

interface Criterion {
  band: number;
  en: string;
  vi: string;
}

interface Result {
  metrics: {
    words: number;
    sentences: number;
    paragraphs: number;
    avgSentenceLength: number;
    lexicalVariety: number;
    connectors: string[];
    overusedWords: string[];
  };
  minWords: number;
  lints: Lint[];
  bands: { taskResponse: number | null; coherence: number | null; lexical: number; grammar: number; overall: number | null };
  harper: { errorsPer100: number; spelling: number; grammarBand: number };
  ai: {
    offTopic: boolean;
    taskResponse: Criterion;
    coherence: Criterion;
    lexical: Criterion;
    grammar: Criterion;
    improvements: { en: string; vi: string }[];
  } | null;
  aiError: string | null;
  fallback: { notes: { en: string; vi: string }[] } | null;
}

const fmt = (n: number | null) => (n === null ? "—" : n.toFixed(1));

function bandColor(b: number | null) {
  if (b === null) return "text-zinc-400";
  if (b >= 7) return "text-emerald-600 dark:text-emerald-400";
  if (b >= 6) return "text-blue-600 dark:text-blue-400";
  if (b >= 5) return "text-amber-600 dark:text-amber-400";

  return "text-rose-600 dark:text-rose-400";
}

function formatTime(sec: number) {
  const s = Math.max(0, sec);

  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function WritingTest() {
  const { pick } = useLang();
  const { session } = useAuth();
  const [task, setTask] = useState<WritingTaskKind>("task2");
  const [promptId, setPromptId] = useState<string>(PROMPTS.find((p) => p.task === "task2")!.id);
  const [text, setText] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [submitted, setSubmitted] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  const prompt = PROMPTS.find((p) => p.id === promptId) as WritingPrompt;
  const rules = TASK_RULES[task];
  const words = useMemo(() => countWords(text), [text]);
  const remaining = rules.minutes * 60 - elapsed;

  useEffect(() => {
    if (!running) return;

    const id = setInterval(() => setElapsed((e) => e + 1), 1000);

    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const reset = (nextPrompt?: string) => {
    setText("");
    setElapsed(0);
    setRunning(false);
    setResult(null);
    setError(null);

    if (nextPrompt) setPromptId(nextPrompt);
  };

  const switchTask = (next: WritingTaskKind) => {
    setTask(next);
    reset(PROMPTS.find((p) => p.task === next)!.id);
  };

  const errorText = (code: string, extra?: { minWords?: number; limit?: number }) => {
    if (code === "too_short") return pick(`Bài quá ngắn để chấm (cần ít nhất ${extra?.minWords ?? 30} từ).`, `Too short to score (at least ${extra?.minWords ?? 30} words).`);
    if (code === "daily_limit") return pick(`Bạn đã dùng hết ${extra?.limit ?? 8} lượt chấm hôm nay.`, `You have used today's ${extra?.limit ?? 8} scorings.`);
    if (code === "unauthorized") return pick("Hãy đăng nhập lại.", "Please sign in again.");

    return pick("Không chấm được bài. Thử lại sau.", "Could not score the essay. Try again later.");
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setRunning(false);

    try {
      const res = await fetch("/api/english/writing", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ promptId, text }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(errorText(json?.error ?? "", json ?? undefined));

        return;
      }

      setSubmitted(text);
      setResult(json as Result);
    } catch {
      setError(errorText("network"));
    } finally {
      setBusy(false);
    }
  };

  const prompts = PROMPTS.filter((p) => p.task === task);

  return (
    <div className="max-w-4xl space-y-6 pb-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{pick("IELTS Writing — thi thử", "IELTS Writing — mock test")}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          {pick(
            "Viết bài trong thời gian quy định. Lỗi chính tả và ngữ pháp do Harper kiểm tra; band ước tính theo 4 tiêu chí công khai của IELTS.",
            "Write under exam conditions. Harper checks spelling and grammar; the band is estimated on IELTS's four public criteria."
          )}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["task2", "task1"] as const).map((k) => (
          <button
            key={k}
            onClick={() => switchTask(k)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              task === k
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            )}
          >
            {TASK_RULES[k].label} · {TASK_RULES[k].minutes} {pick("phút", "min")} · {TASK_RULES[k].minWords}+ {pick("từ", "words")}
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <label className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
            {pick("Đề bài", "Prompt")}
            <select
              value={promptId}
              onChange={(e) => reset(e.target.value)}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-sm"
            >
              {prompts.map((p) => (
                <option key={p.id} value={p.id} className="text-zinc-900">
                  {p.title} — {p.type}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="whitespace-pre-line leading-relaxed">{prompt.question}</p>

        {prompt.table && (
          <div className="overflow-x-auto">
            <p className="text-xs text-zinc-500 mb-1">{prompt.table.caption}</p>
            <table className="text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border border-zinc-300 dark:border-zinc-700 px-3 py-1" />
                  {prompt.table.columns.map((c) => (
                    <th key={c} className="border border-zinc-300 dark:border-zinc-700 px-3 py-1 font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prompt.table.rows.map((r) => (
                  <tr key={r.label}>
                    <th className="border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-left font-medium">{r.label}</th>
                    {r.values.map((v, i) => (
                      <td key={i} className="border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-right tabular-nums">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className={cn("flex items-center gap-1.5 tabular-nums", remaining < 0 && "text-rose-600 dark:text-rose-400")}>
            <Clock className="h-4 w-4" aria-hidden="true" />
            {remaining >= 0 ? formatTime(remaining) : `+${formatTime(-remaining)}`}
            {!running && elapsed === 0 && <span className="text-zinc-500">({pick("tự chạy khi bạn bắt đầu gõ", "starts when you type")})</span>}
          </span>
          <span className={cn("tabular-nums", words >= rules.minWords ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-400")}>
            {words} / {rules.minWords}+ {pick("từ", "words")}
          </span>
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);

            if (!running && elapsed === 0 && e.target.value.trim()) setRunning(true);
          }}
          rows={16}
          spellCheck={false}
          placeholder={pick("Viết bài của bạn ở đây…", "Write your answer here…")}
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={submit}
            disabled={busy || words < 30}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {busy ? pick("Đang chấm…", "Scoring…") : pick("Nộp bài & chấm", "Submit & score")}
          </button>
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <RotateCcw className="h-4 w-4" />
            {pick("Làm lại", "Reset")}
          </button>
          {words < 30 && <span className="text-xs text-zinc-500">{pick("Cần ít nhất 30 từ để chấm.", "At least 30 words to score.")}</span>}
        </div>

        {error && (
          <p role="alert" className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" /> {error}
          </p>
        )}
      </section>

      {result && (
        <div ref={resultRef}>
          <Results result={result} essay={submitted} task={task} />
        </div>
      )}
    </div>
  );
}

function Results({ result, essay, task }: { result: Result; essay: string; task: WritingTaskKind }) {
  const { pick, lang } = useLang();
  const { bands, ai, metrics } = result;
  const fb = (c?: Criterion) => (c ? (lang === "vi" ? c.vi || c.en : c.en || c.vi) : "");
  const criteria = [
    { label: task === "task1" ? "Task Achievement" : "Task Response", band: bands.taskResponse, text: fb(ai?.taskResponse) },
    { label: "Coherence & Cohesion", band: bands.coherence, text: fb(ai?.coherence) },
    { label: "Lexical Resource", band: bands.lexical, text: fb(ai?.lexical) || pick(`Chính tả: ${result.harper.spelling} lỗi. Độ đa dạng từ: ${metrics.lexicalVariety}.`, `Spelling slips: ${result.harper.spelling}. Word variety: ${metrics.lexicalVariety}.`) },
    {
      label: "Grammatical Range & Accuracy",
      band: bands.grammar,
      text: fb(ai?.grammar) || pick(`Harper tìm thấy ${result.lints.length} lỗi (${result.harper.errorsPer100}/100 từ).`, `Harper found ${result.lints.length} issues (${result.harper.errorsPer100} per 100 words).`),
    },
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex items-center gap-5">
        <div className="text-center">
          <div className={cn("text-5xl font-bold tabular-nums", bandColor(bands.overall))}>{fmt(bands.overall)}</div>
          <div className="text-xs text-zinc-500 mt-1">{ai ? pick("Band ước tính", "Estimated band") : pick("Band ước tính (không AI)", "Estimated band (no AI)")}</div>
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
          <p>
            {metrics.words} {pick("từ", "words")} · {metrics.paragraphs} {pick("đoạn", "paragraphs")} · {metrics.sentences} {pick("câu", "sentences")} · {metrics.connectors.length} {pick("từ nối", "linking devices")}
          </p>
          {metrics.words < result.minWords && (
            <p className="text-amber-600 dark:text-amber-400">
              {pick(`Chưa đủ ${result.minWords} từ — điểm Task bị hạ.`, `Under ${result.minWords} words — the task band is capped.`)}
            </p>
          )}
          {ai?.offTopic && <p className="text-rose-600 dark:text-rose-400">{pick("Bài có vẻ lạc đề.", "The answer looks off-topic.")}</p>}
          <p className="text-xs">
            {pick(
              "Đây là ước tính, không phải điểm chính thức; giám khảo thật có thể chấm khác.",
              "This is an estimate, not an official score; a real examiner may differ."
            )}
          </p>
        </div>
      </div>

      {!ai && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm space-y-1.5">
          <p>
            {pick(
              "Bộ chấm AI đang không khả dụng (có thể đã hết lượt miễn phí), nên Task Response và Coherence chỉ là ước tính theo quy tắc (độ dài, bố cục, từ nối, bám đề) và tối đa 6.5. Hãy chấm lại sau để có kết quả chính xác hơn.",
              "The AI judge was unavailable (the free quota may be used up), so Task Response and Coherence are rule-based estimates — length, structure, linking words, coverage of the question — capped at 6.5. Score again later for a fuller assessment."
            )}{" "}
            <span className="text-xs text-zinc-500">({result.aiError})</span>
          </p>
          {result.fallback && result.fallback.notes.length > 0 && (
            <ul className="list-disc pl-5">
              {result.fallback.notes.map((n, i) => (
                <li key={i}>{lang === "vi" ? n.vi : n.en}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {criteria.map((c) => (
          <div key={c.label} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">{c.label}</h3>
              <span className={cn("text-2xl font-bold tabular-nums", bandColor(c.band))}>{fmt(c.band)}</span>
            </div>
            {c.text && <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-snug">{c.text}</p>}
          </div>
        ))}
      </div>

      {ai && ai.improvements.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <h3 className="text-sm font-semibold mb-2">{pick("Nên cải thiện trước", "Fix these first")}</h3>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm">
            {ai.improvements.map((i, n) => (
              <li key={n}>{lang === "vi" ? i.vi || i.en : i.en || i.vi}</li>
            ))}
          </ol>
        </div>
      )}

      <Marked essay={essay} lints={result.lints} />

      {(metrics.overusedWords.length > 0) && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {pick("Từ lặp nhiều lần: ", "Overused words: ")}
          <b>{metrics.overusedWords.join(", ")}</b>
        </p>
      )}
    </section>
  );
}

function Marked({ essay, lints }: { essay: string; lints: Lint[] }) {
  const { pick } = useLang();
  const [active, setActive] = useState<number | null>(null);
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  lints.forEach((l, i) => {
    if (l.start < cursor) return;

    parts.push(essay.slice(cursor, l.start));
    parts.push(
      <mark
        key={i}
        onClick={() => setActive(active === i ? null : i)}
        className={cn(
          "cursor-pointer rounded px-0.5",
          l.kind === "Spelling" ? "bg-rose-200/70 dark:bg-rose-500/30" : "bg-amber-200/70 dark:bg-amber-500/30",
          active === i && "ring-2 ring-blue-500"
        )}
      >
        {essay.slice(l.start, l.end)}
      </mark>
    );
    cursor = l.end;
  });
  parts.push(essay.slice(cursor));

  const sel = active !== null ? lints[active] : null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      <h3 className="text-sm font-semibold">
        {pick("Lỗi Harper tìm thấy", "Issues Harper found")} ({lints.length})
      </h3>
      <p className="whitespace-pre-wrap leading-relaxed text-sm">{parts}</p>
      {sel && (
        <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 p-3 text-sm">
          <p className="font-medium">
            <span className="text-xs uppercase text-zinc-500 mr-2">{sel.kind}</span>
            {sel.message}
          </p>
          {sel.suggestions.length > 0 && (
            <p className="mt-1">
              {pick("Gợi ý: ", "Try: ")}
              <b>{sel.suggestions.join(" · ")}</b>
            </p>
          )}
        </div>
      )}
      {lints.length === 0 && <p className="text-sm text-emerald-600 dark:text-emerald-400">{pick("Không tìm thấy lỗi nào.", "No issues found.")}</p>}
      <p className="text-xs text-zinc-500">
        {pick(
          "Harper bắt lỗi rõ ràng nhưng bỏ sót một số lỗi ngữ pháp tinh tế (vd. chia động từ, số ít/số nhiều).",
          "Harper catches clear slips but misses some subtler grammar (e.g. subject-verb agreement, plurals)."
        )}
      </p>
    </div>
  );
}
