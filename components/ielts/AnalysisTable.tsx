"use client";

// The three-criteria comparison. A real table from md up; stacked cards below
// it, so a phone never has to scroll sideways. Criterion names always show, so
// colour is never the only signal.

import { cn } from "@/lib/utils";
import type { Analysis } from "@/lib/ielts/types";
import { BAND, CRITERION } from "./tokens";

/** The three rows a question carries; Pronunciation is home-page only. */
const ROWS: { key: "fluency" | "lexical" | "grammar"; name: string }[] = [
  { key: "fluency", name: "Fluency & Coherence" },
  { key: "lexical", name: "Lexical Resource" },
  { key: "grammar", name: "Grammar (Range & Accuracy)" },
];

export default function AnalysisTable({ analysis, id }: { analysis: Analysis; id?: string }) {
  const rows = ROWS.map((row) => ({ ...row, cells: analysis[row.key] }));

  return (
    <div id={id} className="scroll-mt-28">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Band 6 vs Band 9
      </h4>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 md:block">
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="text-xs uppercase tracking-wider">
            <tr>
              <th scope="col" className="w-[22%] bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
                <span className="sr-only">Criterion</span>
              </th>
              <th
                scope="col"
                className={cn("w-[39%] bg-amber-100 px-3 py-2 dark:bg-amber-950/60", BAND.band6.label)}
              >
                Band 6
              </th>
              <th
                scope="col"
                className={cn("w-[39%] bg-emerald-100 px-3 py-2 dark:bg-emerald-950/60", BAND.band9.label)}
              >
                Band 9
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-zinc-200 align-top dark:border-zinc-800">
                <th scope="row" className="px-3 py-3">
                  <span className="flex items-start gap-2">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", CRITERION[row.key].bar)} />
                    <span className={cn("text-sm font-semibold", CRITERION[row.key].name)}>{row.name}</span>
                  </span>
                </th>
                <td className="bg-amber-50/60 px-3 py-3 text-zinc-800 dark:bg-amber-950/20 dark:text-zinc-200">
                  {row.cells.band6}
                </td>
                <td className="bg-emerald-50/60 px-3 py-3 text-zinc-800 dark:bg-emerald-950/20 dark:text-zinc-200">
                  {row.cells.band9}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per criterion */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div
            key={row.key}
            className={cn("rounded-xl border p-3", CRITERION[row.key].cell)}
          >
            <p className="flex items-center gap-2">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", CRITERION[row.key].bar)} />
              <span className={cn("text-sm font-semibold", CRITERION[row.key].name)}>{row.name}</span>
            </p>

            <div className={cn("mt-2 rounded-lg p-2.5", BAND.band6.frame)}>
              <p className={cn("text-xs font-semibold uppercase tracking-wider", BAND.band6.label)}>Band 6</p>
              <p className="mt-1 text-zinc-800 dark:text-zinc-100">{row.cells.band6}</p>
            </div>

            <div className={cn("mt-2 rounded-lg p-2.5", BAND.band9.frame)}>
              <p className={cn("text-xs font-semibold uppercase tracking-wider", BAND.band9.label)}>Band 9</p>
              <p className="mt-1 text-zinc-800 dark:text-zinc-100">{row.cells.band9}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
