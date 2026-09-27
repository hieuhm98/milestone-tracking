"use client";

// "Band 6 vs Band 9: what the examiner hears" — the four-criteria table on the
// home page. One colour per criterion, the Band 6 column tinted amber and the
// Band 9 column emerald. Cells are source English; the Vietnamese criterion
// names come from the source too, so they show in both language modes.

import { cn } from "@/lib/utils";
import type { Intro } from "@/lib/ielts/types";
import { BAND, CRITERION, type CriterionKey } from "./tokens";

/** Row order is fixed by the source, so the colours can be a plain list. */
const ROW_COLOURS: CriterionKey[] = ["fluency", "lexical", "grammar", "pronunciation"];

export default function CriteriaOverview({ criteria }: { criteria: Intro["criteria"] }) {
  const rows = criteria.rows.map((row, index) => ({
    ...row,
    colour: CRITERION[ROW_COLOURS[index % ROW_COLOURS.length]],
  }));

  return (
    <section id="criteria" className="scroll-mt-28">
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{criteria.title}</h2>
      <p className="text-sm italic text-zinc-500 dark:text-zinc-400">{criteria.titleVi}</p>

      {/* Desktop: table */}
      <div className="mt-3 hidden overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 md:block">
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="text-xs uppercase tracking-wider">
            <tr>
              <th scope="col" className="w-[24%] bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
                Criterion
              </th>
              <th scope="col" className={cn("w-[38%] bg-amber-100 px-3 py-2 dark:bg-amber-950/60", BAND.band6.label)}>
                Band 6
              </th>
              <th scope="col" className={cn("w-[38%] bg-emerald-100 px-3 py-2 dark:bg-emerald-950/60", BAND.band9.label)}>
                Band 9
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-t border-zinc-200 align-top dark:border-zinc-800">
                <th scope="row" className="px-3 py-3">
                  <span className="flex items-start gap-2">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", row.colour.bar)} aria-hidden="true" />
                    <span>
                      <span className={cn("block text-sm font-semibold", row.colour.name)}>{row.name}</span>
                      <span className="block text-xs italic text-zinc-500 dark:text-zinc-400">{row.nameVi}</span>
                    </span>
                  </span>
                </th>
                <td className="bg-amber-50/60 px-3 py-3 text-sm text-zinc-800 dark:bg-amber-950/20 dark:text-zinc-200">
                  {row.band6}
                </td>
                <td className="bg-emerald-50/60 px-3 py-3 text-sm text-zinc-800 dark:bg-emerald-950/20 dark:text-zinc-200">
                  {row.band9}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per criterion */}
      <div className="mt-3 space-y-3 md:hidden">
        {rows.map((row) => (
          <div key={row.name} className={cn("rounded-xl border p-3", row.colour.cell)}>
            <p className="flex items-center gap-2">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", row.colour.bar)} aria-hidden="true" />
              <span className={cn("text-sm font-semibold", row.colour.name)}>{row.name}</span>
            </p>
            <p className="text-xs italic text-zinc-500 dark:text-zinc-400">{row.nameVi}</p>

            <div className={cn("mt-2 rounded-lg p-2.5", BAND.band6.frame)}>
              <p className={cn("text-xs font-semibold uppercase tracking-wider", BAND.band6.label)}>Band 6</p>
              <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">{row.band6}</p>
            </div>

            <div className={cn("mt-2 rounded-lg p-2.5", BAND.band9.frame)}>
              <p className={cn("text-xs font-semibold uppercase tracking-wider", BAND.band9.label)}>Band 9</p>
              <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-100">{row.band9}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
