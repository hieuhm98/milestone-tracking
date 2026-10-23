"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { QueryResult } from "@/lib/sqlPlayground";
import type { PublicChallenge, Solution, SubmitResult } from "@/lib/sqlChallenges";
import { ErrorBox, QueryResultView, ResultTable } from "@/components/sql/ResultTable";
import { RichText } from "@/components/sql/RichText";
import { SchemaDiagram } from "@/components/sql/SchemaDiagram";
import { SqlEditor } from "@/components/sql/SqlEditor";
import { readDraft, useChallenges, useSolved, writeDraft } from "@/components/sql/useChallenges";
import { useSchema } from "@/components/sql/useSchema";
import { DB_LABEL, DIFFICULTY_CLASS, DIFFICULTY_LABEL } from "@/components/sql/labels";

type Pick = (vi: string, en: string) => string;

type Outcome = { kind: "run"; result: QueryResult } | { kind: "submit"; result: SubmitResult };

export default function SqlChallengePage() {
  const { id } = useParams<{ id: string }>();
  const { pick } = useLang();
  const { challenges, loading } = useChallenges();
  const index = challenges.findIndex((c) => c.id === id);
  const challenge = index >= 0 ? challenges[index] : null;

  if (loading) return <p className="text-sm text-zinc-500">{pick("Đang tải…", "Loading…")}</p>;

  if (!challenge) {
    return (
      <div className="max-w-xl">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{pick("Không tìm thấy bài này.", "Challenge not found.")}</p>
        <Link href="/practice/sql/challenges" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          {pick("← Danh sách thử thách", "← All challenges")}
        </Link>
      </div>
    );
  }

  // Keyed so a new challenge starts with fresh state (editor, verdict, hint…).
  return (
    <Solver
      key={challenge.id}
      challenge={challenge}
      prev={challenges[index - 1] ?? null}
      next={challenges[index + 1] ?? null}
      total={challenges.length}
    />
  );
}

function Solver({
  challenge,
  prev,
  next,
  total,
}: {
  challenge: PublicChallenge;
  prev: PublicChallenge | null;
  next: PublicChallenge | null;
  total: number;
}) {
  const { pick } = useLang();
  const [solved, recordSubmission] = useSolved();
  const { tables } = useSchema(challenge.db);
  const [sql, setSql] = useState("");
  const [busy, setBusy] = useState<"run" | "submit" | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const [solution, setSolution] = useState<Solution | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const isSolved = Boolean(solved[challenge.id]);

  useEffect(() => {
    setSql(readDraft(challenge.id) ?? "");
  }, [challenge.id]);

  const edit = (value: string) => {
    setSql(value);
    writeDraft(challenge.id, value);
  };

  const run = useCallback(async () => {
    setBusy("run");

    try {
      const res = await fetch("/api/sql-playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql, db: challenge.db }),
      });

      setOutcome({ kind: "run", result: (await res.json()) as QueryResult });
    } catch (e) {
      setOutcome({
        kind: "run",
        result: { columns: [], rows: [], rowCount: 0, truncated: false, changes: null, elapsedMs: 0, error: String(e) },
      });
    } finally {
      setBusy(null);
    }
  }, [sql, challenge.db]);

  const submit = useCallback(async () => {
    setBusy("submit");

    try {
      const res = await fetch("/api/sql-challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: challenge.id, sql }),
      });
      const result = (await res.json()) as SubmitResult;

      setOutcome({ kind: "submit", result });

      // A query that didn't run isn't an attempt at the answer.
      if (result.verdict !== "error") recordSubmission(challenge.id, result.verdict === "accepted");
    } catch (e) {
      setOutcome({ kind: "submit", result: { verdict: "error", error: String(e), elapsedMs: 0 } });
    } finally {
      setBusy(null);
    }
  }, [sql, challenge.id, recordSubmission]);

  async function revealSolution() {
    if (!solution) {
      const confirmed = window.confirm(
        pick(
          "Xem lời giải? Hãy thử thêm một lần nữa trước — tự tìm ra mới nhớ lâu.",
          "Show the solution? Give it one more try first — working it out is what makes it stick."
        )
      );

      if (!confirmed) return;

      const res = await fetch(`/api/sql-challenges?id=${challenge.id}&solution=1`);
      setSolution(((await res.json()) as { solution: Solution }).solution);
    } else {
      setSolution(null);
    }
  }

  const prompt = pick(challenge.prompt.vi, challenge.prompt.en);

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-sm">
        <Link href="/practice/sql/challenges" className="text-blue-600 dark:text-blue-400 hover:underline">
          {pick("← Danh sách thử thách", "← All challenges")}
        </Link>
        <div className="flex items-center gap-2">
          {prev && (
            <Link href={`/practice/sql/challenges/${prev.id}`} className="btn-secondary text-xs px-3 py-1.5">
              {pick("← Bài trước", "← Previous")}
            </Link>
          )}
          {next && (
            <Link href={`/practice/sql/challenges/${next.id}`} className="btn-secondary text-xs px-3 py-1.5">
              {pick("Bài sau →", "Next →")}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5">
        {/* The task */}
        <div className="space-y-4 min-w-0">
          <div className="card">
            <div className="text-xs text-zinc-500 mb-1">
              {pick(`Bài ${challenge.number}/${total}`, `Challenge ${challenge.number} of ${total}`)}
            </div>
            <h1 className="text-xl font-bold flex flex-wrap items-center gap-2">
              {pick(challenge.title.vi, challenge.title.en)}
              {isSolved && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                  ✓ {pick("Đã giải", "Solved")}
                </span>
              )}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={cn("text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold", DIFFICULTY_CLASS[challenge.difficulty])}>
                {pick(DIFFICULTY_LABEL[challenge.difficulty].vi, DIFFICULTY_LABEL[challenge.difficulty].en)}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                {pick("Dữ liệu", "Data")}: {pick(DB_LABEL[challenge.db].vi, DB_LABEL[challenge.db].en)}
              </span>
              {!challenge.ordered && challenge.kind === "query" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                  {pick("Không chấm thứ tự dòng", "Row order not graded")}
                </span>
              )}
            </div>

            <RichText text={prompt} className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300" />

            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1.5">
                {pick("Bài này luyện", "This challenge practises")}
              </div>
              <div className="flex flex-wrap gap-1">
                {challenge.concepts.map((concept) => (
                  <span
                    key={concept}
                    className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button type="button" className="btn-secondary text-xs px-3 py-1.5" aria-expanded={showHint} onClick={() => setShowHint(!showHint)}>
                {showHint ? pick("Ẩn gợi ý", "Hide hint") : pick("💡 Gợi ý", "💡 Hint")}
              </button>
              <button type="button" className="btn-secondary text-xs px-3 py-1.5" aria-expanded={showTables} onClick={() => setShowTables(!showTables)}>
                {showTables ? pick("Ẩn bảng", "Hide tables") : pick("▤ Các bảng", "▤ Tables")}
              </button>
              <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={() => setShowDiagram(true)}>
                {pick("◇ Sơ đồ CSDL", "◇ Diagram")}
              </button>
              <button type="button" className="btn-secondary text-xs px-3 py-1.5" aria-expanded={Boolean(solution)} onClick={revealSolution}>
                {solution ? pick("Ẩn lời giải", "Hide solution") : pick("Xem lời giải", "Show solution")}
              </button>
            </div>

            {showHint && (
              <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3">
                <RichText text={pick(challenge.hint.vi, challenge.hint.en)} className="text-sm text-amber-900 dark:text-amber-200" />
              </div>
            )}

            {solution && (
              <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-3">
                <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-zinc-50 dark:bg-zinc-950 rounded p-3 text-zinc-800 dark:text-zinc-200">
                  {solution.sql}
                </pre>
                <RichText text={pick(solution.explanation.vi, solution.explanation.en)} />
                <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={() => edit(solution.sql)}>
                  {pick("Chép vào trình soạn", "Copy into the editor")}
                </button>
              </div>
            )}
          </div>

          {showTables && <TableList tables={tables} pick={pick} />}
        </div>

        {/* The answer */}
        <div className="space-y-4 min-w-0">
          <SqlEditor
            ref={editorRef}
            value={sql}
            onChange={edit}
            onRun={run}
            rows={10}
            pick={pick}
            placeholder={
              challenge.kind === "query"
                ? pick("-- Viết câu SELECT của bạn ở đây", "-- Write your SELECT here")
                : pick("-- Viết câu lệnh của bạn ở đây (INSERT, UPDATE, CREATE …)", "-- Write your statement here (INSERT, UPDATE, CREATE …)")
            }
            actions={
              <>
                <button className="btn-secondary text-sm" onClick={run} disabled={busy !== null}>
                  {busy === "run" ? pick("Đang chạy…", "Running…") : pick("▶ Chạy thử", "▶ Run")}
                </button>
                <button className="btn-primary text-sm" onClick={submit} disabled={busy !== null || !sql.trim()}>
                  {busy === "submit" ? pick("Đang chấm…", "Grading…") : pick("Nộp bài", "Submit")}
                </button>
              </>
            }
          />
          <p className="text-xs text-zinc-500 -mt-2">
            {pick(
              "Chạy thử để xem kết quả; Nộp bài để chấm. Mỗi lần chạy dùng một bản sao dữ liệu mới.",
              "Run to see your result; Submit to grade it. Every run uses a fresh copy of the data."
            )}
          </p>

          {outcome?.kind === "run" && <QueryResultView result={outcome.result} pick={pick} />}
          {outcome?.kind === "submit" && (
            <Verdict result={outcome.result} challenge={challenge} next={next} pick={pick} />
          )}
        </div>
      </div>

      {showDiagram && (
        <DiagramModal onClose={() => setShowDiagram(false)} pick={pick}>
          <SchemaDiagram tables={tables} pick={pick} />
        </DiagramModal>
      )}
    </div>
  );
}

function TableList({ tables, pick }: { tables: ReturnType<typeof useSchema>["tables"]; pick: Pick }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {tables.map((t) => (
        <div key={t.name} className="card p-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-sm text-blue-700 dark:text-blue-300">{t.name}</span>
            <span className="text-[11px] text-zinc-500">
              {t.rowCount.toLocaleString()} {pick("dòng", "rows")}
            </span>
          </div>
          <div className="mt-2 space-y-0.5">
            {t.columns.map((c) => {
              const fk = t.foreignKeys.find((f) => f.from === c.name);

              return (
                <div key={c.name} className="flex items-baseline justify-between gap-2 text-xs font-mono">
                  <span className="text-zinc-700 dark:text-zinc-300 min-w-0 truncate">
                    {c.name}
                    {c.pk && <span className="text-amber-600 dark:text-amber-400/80 ml-1">PK</span>}
                    {fk && (
                      <span className="text-sky-600 dark:text-sky-400 ml-1" title={`→ ${fk.table}.${fk.to}`}>
                        FK→{fk.table}
                      </span>
                    )}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-600 shrink-0">{c.type || "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function DiagramModal({ children, onClose, pick }: { children: React.ReactNode; onClose: () => void; pick: Pick }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={pick("Sơ đồ cơ sở dữ liệu", "Database diagram")}
    >
      <div className="card max-w-[min(1400px,100%)] max-h-full overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">{pick("Sơ đồ cơ sở dữ liệu", "Database diagram")}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={pick("Đóng", "Close")}
            className="p-2 -m-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Verdict({
  result,
  challenge,
  next,
  pick,
}: {
  result: SubmitResult;
  challenge: PublicChallenge;
  next: PublicChallenge | null;
  pick: Pick;
}) {
  const yours = result.yours;
  const expected = result.expected;

  if (result.verdict === "error") return <ErrorBox message={result.error ?? ""} pick={pick} />;

  const accepted = result.verdict === "accepted";
  const message = (() => {
    switch (result.verdict) {
      case "accepted":
        return pick("✓ Chính xác! Kết quả khớp với lời giải.", "✓ Accepted! Your result matches the solution.");
      case "wrong_kind":
        return challenge.kind === "query"
          ? pick("Bài này cần một câu SELECT trả về dữ liệu.", "This challenge needs a SELECT that returns rows.")
          : pick(
              "Bài này cần một câu lệnh thay đổi dữ liệu hoặc cấu trúc (INSERT, UPDATE, DELETE, CREATE …), không phải SELECT.",
              "This challenge needs a statement that changes data or structure (INSERT, UPDATE, DELETE, CREATE …), not a SELECT."
            );
      case "columns":
        return pick(
          `Sai số cột: cần ${expected?.columns.length}, kết quả của bạn có ${yours?.columns.length}.`,
          `Wrong number of columns: expected ${expected?.columns.length}, yours has ${yours?.columns.length}.`
        );
      case "row_count":
        return pick(
          `Sai số dòng: cần ${expected?.rowCount.toLocaleString()}, kết quả của bạn có ${yours?.rowCount.toLocaleString()}.`,
          `Wrong number of rows: expected ${expected?.rowCount.toLocaleString()}, yours has ${yours?.rowCount.toLocaleString()}.`
        );
      case "values":
        return result.firstDiffRow
          ? pick(
              `Đúng số dòng và số cột nhưng giá trị khác — bắt đầu từ dòng ${result.firstDiffRow}.`,
              `Right number of rows and columns, but the values differ — from row ${result.firstDiffRow}.`
            )
          : pick("Đúng số dòng và số cột nhưng giá trị khác.", "Right number of rows and columns, but the values differ.");
      case "order":
        return pick(
          "Đúng dữ liệu nhưng sai thứ tự dòng — xem lại ORDER BY.",
          "The right rows in the wrong order — check your ORDER BY."
        );
      case "concept":
        return pick(
          `Kết quả đúng, nhưng bài này luyện ${result.missing?.join(", ")} — hãy giải lại bằng cách đó.`,
          `Right result, but this challenge practises ${result.missing?.join(", ")} — solve it that way.`
        );
      default:
        return "";
    }
  })();

  const modify = challenge.kind === "modify";

  return (
    <div className="space-y-3">
      <div
        role="status"
        className={cn(
          "card text-sm font-medium",
          accepted
            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200"
            : "border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200"
        )}
      >
        <div>{message}</div>
        <div className="text-xs font-normal opacity-70 mt-1">{result.elapsedMs.toFixed(1)} ms</div>
        {accepted && next && (
          <Link href={`/practice/sql/challenges/${next.id}`} className="btn-primary text-sm inline-block mt-3">
            {pick(`Bài tiếp theo: ${next.title.vi} →`, `Next: ${next.title.en} →`)}
          </Link>
        )}
        {accepted && !next && (
          <p className="mt-2 font-normal">
            {pick("Bạn đã tới bài cuối cùng. Xuất sắc!", "That was the last challenge. Well done!")}
          </p>
        )}
      </div>

      {yours && (
        <ResultTable
          columns={yours.columns}
          rows={yours.rows}
          rowCount={yours.rowCount}
          pick={pick}
          caption={modify ? pick("Sau câu lệnh của bạn", "After your statement") : pick("Kết quả của bạn", "Your result")}
          maxHeight="max-h-[40vh]"
        />
      )}
      {!accepted && expected && (
        <ResultTable
          columns={expected.columns}
          rows={expected.rows}
          rowCount={expected.rowCount}
          pick={pick}
          caption={modify ? pick("Kết quả mong đợi", "Expected state") : pick("Kết quả mong đợi", "Expected result")}
          maxHeight="max-h-[40vh]"
        />
      )}
    </div>
  );
}
