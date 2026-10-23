"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { PlaygroundDb, QueryResult } from "@/lib/sqlPlayground";
import { QueryResultView } from "@/components/sql/ResultTable";
import { SchemaDiagram } from "@/components/sql/SchemaDiagram";
import { SqlEditor } from "@/components/sql/SqlEditor";
import { useSchema } from "@/components/sql/useSchema";

interface Example {
  vi: string;
  en: string;
  sql: string;
}

const DB_OPTIONS: {
  id: PlaygroundDb;
  icon: string;
  label: { vi: string; en: string };
  hint: { vi: string; en: string };
}[] = [
  {
    id: "words",
    icon: "Aa",
    label: { vi: "Kho từ vựng tiếng Anh", en: "English word bank" },
    hint: { vi: "Từ, phiên âm, nghĩa, lịch sử ôn tập", en: "Words, IPA, meanings, review history" },
  },
  {
    id: "fintech",
    icon: "₫",
    label: { vi: "Fintech: cho vay số & ví điện tử", en: "Fintech: digital lending & e-wallet" },
    hint: {
      vi: "Khách hàng, hồ sơ vay, khoản vay, lịch trả nợ, ví, thanh toán, checkout (dữ liệu đến 30/06/2026)",
      en: "Customers, loan applications, loans, repayments, wallets, payments, checkout (data as of 2026-06-30)",
    },
  },
];

const FINTECH_EXAMPLES: Example[] = [
  {
    vi: "Hồ sơ vay theo trạng thái",
    en: "Applications by status",
    sql: `SELECT status, reject_reason, COUNT(*) AS applications
FROM loan_applications
GROUP BY status, reject_reason
ORDER BY applications DESC;`,
  },
  {
    vi: "Tỉ lệ duyệt theo tháng",
    en: "Approval rate by month",
    sql: `SELECT strftime('%Y-%m', applied_at) AS month,
       COUNT(*) AS applications,
       SUM(status = 'approved') AS approved,
       ROUND(100.0 * SUM(status = 'approved') / COUNT(*), 1) AS approval_rate_pct
FROM loan_applications
GROUP BY month
ORDER BY month;`,
  },
  {
    vi: "Tỉ lệ thanh toán thành công theo phương thức",
    en: "Payment success rate by method",
    sql: `SELECT method,
       COUNT(*) AS attempts,
       ROUND(100.0 * SUM(status IN ('success', 'refunded')) / COUNT(*), 1) AS success_rate_pct
FROM payments
GROUP BY method
ORDER BY success_rate_pct;`,
  },
  {
    vi: "Phễu checkout",
    en: "Checkout funnel",
    sql: `SELECT event_name, COUNT(DISTINCT session_id) AS sessions
FROM checkout_events
GROUP BY event_name
ORDER BY sessions DESC;`,
  },
  {
    vi: "Nợ quá hạn theo nhóm DPD",
    en: "Overdue installments by DPD bucket",
    sql: `-- DPD = days past due, measured on the snapshot date 2026-06-30
SELECT CASE
         WHEN julianday('2026-06-30') - julianday(due_date) <= 30 THEN '1-30'
         WHEN julianday('2026-06-30') - julianday(due_date) <= 60 THEN '31-60'
         WHEN julianday('2026-06-30') - julianday(due_date) <= 90 THEN '61-90'
         ELSE '90+'
       END AS dpd_bucket,
       COUNT(*) AS installments,
       SUM(amount_due) AS amount_overdue_vnd
FROM repayment_schedule
WHERE paid_date IS NULL
  AND due_date < '2026-06-30'
GROUP BY dpd_bucket
ORDER BY MIN(julianday('2026-06-30') - julianday(due_date));`,
  },
  {
    vi: "Tìm giao dịch bị trừ tiền hai lần",
    en: "Find double charges",
    sql: `SELECT a.payment_id, b.payment_id AS duplicate_id, a.customer_id,
       a.amount, a.created_at, b.created_at AS duplicate_at
FROM payments a
JOIN payments b
  ON  b.customer_id = a.customer_id
  AND b.merchant_id = a.merchant_id
  AND b.amount      = a.amount
  AND b.payment_id  > a.payment_id
  AND a.status = 'success' AND b.status = 'success'
  AND (julianday(b.created_at) - julianday(a.created_at)) * 86400 <= 60
ORDER BY a.created_at;`,
  },
  {
    vi: "Đối soát số dư ví",
    en: "Reconcile wallet balances",
    sql: `SELECT w.wallet_id, w.balance AS stored_balance,
       COALESCE(SUM(t.amount), 0) AS ledger_balance,
       w.balance - COALESCE(SUM(t.amount), 0) AS difference
FROM wallets w
LEFT JOIN wallet_transactions t
  ON t.wallet_id = w.wallet_id AND t.status = 'success'
GROUP BY w.wallet_id
HAVING difference <> 0;`,
  },
];

const WORD_EXAMPLES: Example[] = [
  {
    vi: "Xem 20 từ đầu tiên",
    en: "First 20 words",
    sql: "SELECT word, pronunciation, meaning_vi\nFROM words\nLIMIT 20;",
  },
  {
    vi: "Đếm từ theo loại từ",
    en: "Count words by part of speech",
    sql: "SELECT p.name_en, COUNT(*) AS total\nFROM words w\nJOIN parts_of_speech p ON p.code = w.pos_code\nGROUP BY p.code\nORDER BY total DESC;",
  },
  {
    vi: "Tìm từ bắt đầu bằng 'A'",
    en: "Words starting with 'A'",
    sql: "SELECT word, meaning_en\nFROM words\nWHERE first_letter = 'A'\nORDER BY word\nLIMIT 25;",
  },
  {
    vi: "Từ dài nhất",
    en: "Longest words",
    sql: "SELECT word, length\nFROM words\nORDER BY length DESC\nLIMIT 10;",
  },
  {
    vi: "Tỉ lệ nhớ theo từ (JOIN)",
    en: "Recall rate per word (JOIN)",
    sql: "SELECT w.word,\n       COUNT(r.id)               AS reviews,\n       SUM(r.remembered)          AS remembered,\n       ROUND(100.0 * SUM(r.remembered) / COUNT(r.id), 0) AS pct\nFROM words w\nJOIN word_reviews r ON r.word_id = w.id\nGROUP BY w.id\nHAVING reviews >= 3\nORDER BY pct ASC, reviews DESC\nLIMIT 15;",
  },
];

const EXAMPLES: Record<PlaygroundDb, Example[]> = {
  words: WORD_EXAMPLES,
  fintech: FINTECH_EXAMPLES,
};

// The word bank keeps the original key so a saved query survives the upgrade.
const STORAGE_KEYS: Record<PlaygroundDb, string> = {
  words: "sql-practice-query",
  fintech: "sql-practice-query:fintech",
};
const DB_KEY = "sql-practice-db";
const VIEW_KEY = "sql-practice-view";

type View = "editor" | "diagram";

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode / blocked storage: the playground still works, it just forgets.
  }
}

export default function SqlPracticePage() {
  const { pick } = useLang();
  const [db, setDb] = useState<PlaygroundDb>("words");
  const [view, setView] = useState<View>("editor");
  const { tables: schema, error: schemaError } = useSchema(db);
  const [sql, setSql] = useState(WORD_EXAMPLES[0].sql);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // ?db=fintech (linked from the data-analysis lessons) wins over the last choice.
  // Read via window.location rather than useSearchParams to avoid a Suspense boundary.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("db");
    const initial =
      DB_OPTIONS.find((o) => o.id === fromUrl) ?? DB_OPTIONS.find((o) => o.id === readStorage(DB_KEY));

    if (initial) setDb(initial.id);

    if (readStorage(VIEW_KEY) === "diagram") setView("diagram");
  }, []);

  useEffect(() => {
    setSql(readStorage(STORAGE_KEYS[db]) ?? EXAMPLES[db][0].sql);
    setResult(null);
  }, [db]);

  function chooseView(next: View) {
    writeStorage(VIEW_KEY, next);
    setView(next);
  }

  function chooseDb(next: PlaygroundDb) {
    if (next === db) return;

    writeStorage(DB_KEY, next);
    setDb(next);

    const url = new URL(window.location.href);

    if (next === "words") url.searchParams.delete("db");
    else url.searchParams.set("db", next);

    window.history.replaceState(null, "", url);
  }

  const run = useCallback(async () => {
    setRunning(true);
    writeStorage(STORAGE_KEYS[db], sql);
    try {
      const res = await fetch("/api/sql-playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql, db }),
      });
      setResult((await res.json()) as QueryResult);
    } catch (e) {
      setResult({
        columns: [],
        rows: [],
        rowCount: 0,
        truncated: false,
        changes: null,
        elapsedMs: 0,
        error: String(e),
      });
    } finally {
      setRunning(false);
    }
  }, [sql, db]);

  function insertSnippet(text: string) {
    setSql(text);
    chooseView("editor");
    // The editor mounts again when coming back from the diagram.
    requestAnimationFrame(() => taRef.current?.focus());
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-2xl font-bold">{pick("Luyện tập SQL", "SQL Practice")}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
            {pick(
              "Viết truy vấn SQL và chạy trên một trong hai bộ dữ liệu. Mọi truy vấn chạy trên bản sao trong bộ nhớ — dữ liệu gốc không bị thay đổi.",
              "Write SQL and run it against one of two datasets. Every query runs on an in-memory copy — the stored data is never changed."
            )}
          </p>
        </div>
        <Link href="/practice/sql/challenges" className="btn-primary shrink-0 text-sm">
          {pick("◆ Thử thách SQL →", "◆ SQL challenges →")}
        </Link>
      </div>

      {/* Dataset switcher */}
      <div
        role="tablist"
        aria-label={pick("Bộ dữ liệu", "Dataset")}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5"
      >
        {DB_OPTIONS.map((o) => {
          const active = o.id === db;

          return (
            <button
              key={o.id}
              role="tab"
              aria-selected={active}
              onClick={() => chooseDb(o.id)}
              className={cn(
                "text-left rounded-xl border px-4 py-3 transition-colors",
                active
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-500/70"
                  : "border-zinc-300 dark:border-zinc-700/60 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              )}
            >
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {o.icon} {pick(o.label.vi, o.label.en)}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                {pick(o.hint.vi, o.hint.en)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Editor / diagram switch */}
      <div
        role="tablist"
        aria-label={pick("Chế độ xem", "View")}
        className="inline-flex rounded-lg border border-zinc-300 dark:border-zinc-700/60 p-0.5 mb-4 bg-white dark:bg-zinc-900"
      >
        {(
          [
            ["editor", pick("Trình soạn SQL", "SQL editor")],
            ["diagram", pick("Sơ đồ cơ sở dữ liệu", "Database diagram")],
          ] as [View, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={view === id}
            onClick={() => chooseView(id)}
            className={cn(
              "px-3 py-2 sm:py-1.5 text-sm rounded-md transition-colors",
              view === id
                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "diagram" && (
        <div className="card">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
            {pick(
              "Mỗi đường nối là một khoá ngoại: cột bên phải trỏ tới khoá của bảng bên trái — đó chính là điều kiện ON khi JOIN. Bấm tên bảng để mở SELECT trên bảng đó.",
              "Each line is a foreign key: a column on the right points at a key on the left — exactly the ON condition of a JOIN. Click a table name to open a SELECT on it."
            )}
          </p>
          {schemaError && <div className="text-xs text-red-600 dark:text-red-400 mb-2">{schemaError}</div>}
          <SchemaDiagram tables={schema} pick={pick} onTableClick={(name) => insertSnippet(`SELECT * FROM ${name} LIMIT 20;`)} />
        </div>
      )}

      <div className={cn("grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5", view === "diagram" && "hidden")}>
        {/* Editor + results */}
        <div className="space-y-4 min-w-0">
          <SqlEditor
            ref={taRef}
            value={sql}
            onChange={setSql}
            onRun={run}
            pick={pick}
            placeholder={db === "fintech" ? "SELECT * FROM loans LIMIT 10;" : "SELECT * FROM words LIMIT 10;"}
            actions={
              <button className="btn-primary" onClick={run} disabled={running}>
                {running ? pick("Đang chạy...", "Running...") : pick("▶ Chạy", "▶ Run")}
              </button>
            }
          />

          {/* Example queries */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLES[db].map((ex) => (
              <button
                key={ex.en}
                onClick={() => insertSnippet(ex.sql)}
                className="text-xs px-2.5 py-2 sm:py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700/60 transition-colors"
              >
                {pick(ex.vi, ex.en)}
              </button>
            ))}
          </div>

          {/* Result */}
          {result && <QueryResultView result={result} pick={pick} />}
        </div>

        {/* Schema side panel */}
        <aside className="space-y-3 lg:sticky lg:top-6 self-start">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {pick("Cấu trúc bảng", "Table structures")}
          </div>
          {schemaError && (
            <div className="text-xs text-red-600 dark:text-red-400 card">{schemaError}</div>
          )}
          {schema.map((t) => (
            <div key={t.name} className="card p-3">
              <button
                onClick={() => insertSnippet(`SELECT * FROM ${t.name} LIMIT 20;`)}
                className="flex items-baseline justify-between w-full text-left group py-1.5 sm:py-0"
              >
                <span className="font-mono text-sm text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200">
                  {t.name}
                </span>
                <span className="text-[11px] text-zinc-500">
                  {t.rowCount.toLocaleString()} {pick("dòng", "rows")}
                </span>
              </button>
              <div className="mt-2 space-y-0.5">
                {t.columns.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-baseline justify-between text-xs font-mono"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {c.name}
                      {c.pk && <span className="text-amber-600 dark:text-amber-400/80 ml-1">PK</span>}
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-600">{c.type || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
