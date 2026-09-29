// A Forming table: coloured header row in the Part colour, zebra rows, and on a
// phone it scrolls inside its own box so the page itself never scrolls sideways.

import { cn } from "@/lib/utils";
import type { Table } from "@/lib/grammar/types";
import Rich from "./text";
import { type PartTokens } from "./tokens";

interface Props {
  table: Table;
  tokens: PartTokens;
  className?: string;
}

export default function GrammarTable({ table, tokens, className }: Props) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] border-collapse text-left text-sm">
          {table.caption && (
            <caption className="caption-bottom border-t border-zinc-200 px-3 py-2 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              {table.caption}
            </caption>
          )}

          <thead>
            <tr className={tokens.head}>
              {table.columns.map((column, index) => (
                <th key={index} scope="col" className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                  <Rich text={column} />
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  "border-t border-zinc-200 align-top dark:border-zinc-800",
                  rowIndex % 2 === 1 && "bg-zinc-50 dark:bg-zinc-900/60"
                )}
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2">
                    <Rich text={cell} boldClassName={tokens.target} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
