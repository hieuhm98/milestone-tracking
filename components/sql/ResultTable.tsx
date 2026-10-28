"use client";

import { cn } from "@/lib/utils";
import type { QueryResult } from "@/lib/sqlPlayground";

type Pick = (vi: string, en: string) => string;

/** A grid of rows, with a caption line. Used by the playground and the challenges. */
export function ResultTable({
  columns,
  rows,
  rowCount,
  pick,
  caption,
  right,
  capped = false,
  maxHeight = "max-h-[60vh]",
}: {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  pick: Pick;
  caption?: string;
  right?: string;
  /** rowCount is a floor: the server stopped counting. */
  capped?: boolean;
  maxHeight?: string;
}) {
  const shown = rows.length < rowCount ? pick(` · hiển thị ${rows.length}`, ` · showing ${rows.length}`) : "";

  return (
    // `!p-0`: `.card` is unlayered CSS, so a plain `p-0` utility loses to its padding.
    <div className="card !p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
        <span className="min-w-0">
          {caption && <span className="font-semibold text-zinc-700 dark:text-zinc-300">{caption} · </span>}
          {rowCount.toLocaleString()}
          {capped ? "+" : ""} {pick("dòng", "rows")}
          {shown}
        </span>
        {right && <span className="shrink-0">{right}</span>}
      </div>
      {columns.length > 0 && (
        <div className={cn("overflow-auto", maxHeight)}>
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-zinc-900">
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={i}
                    className="text-left font-semibold text-zinc-700 dark:text-zinc-300 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 whitespace-nowrap"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-zinc-200 dark:hover:bg-zinc-800/40">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={cn(
                        "px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800/60 font-mono text-xs align-top",
                        cell === null ? "text-zinc-500 dark:text-zinc-400 italic" : "text-zinc-800 dark:text-zinc-200"
                      )}
                    >
                      {cell === null ? "NULL" : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ErrorBox({ message, pick }: { message: string; pick: Pick }) {
  return (
    <div className="card border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20">
      <div className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
        {pick("Lỗi", "Error")}
      </div>
      <pre className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono">{message}</pre>
    </div>
  );
}

/** What one playground run produced: an error, a row count for a change, or rows. */
export function QueryResultView({ result, pick }: { result: QueryResult; pick: Pick }) {
  if (result.error) return <ErrorBox message={result.error} pick={pick} />;

  // Non-SELECT statement (INSERT/UPDATE/CREATE/...)
  if (result.columns.length === 0) {
    return (
      <div className="card text-sm text-zinc-700 dark:text-zinc-300">
        {result.changes !== null
          ? pick(
              `Thực thi thành công · ${result.changes} dòng bị ảnh hưởng`,
              `Statement executed · ${result.changes} row(s) affected`
            )
          : pick("Thực thi thành công.", "Statement executed.")}
        <span className="text-zinc-500 dark:text-zinc-400 ml-2">({result.elapsedMs.toFixed(1)} ms)</span>
      </div>
    );
  }

  return (
    <ResultTable
      columns={result.columns}
      rows={result.rows}
      rowCount={result.rowCount}
      capped={result.capped}
      pick={pick}
      right={`${result.elapsedMs.toFixed(1)} ms`}
    />
  );
}
