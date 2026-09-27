"use client";

// The vocabulary table: a table from md up, cards below.
//
// Rows carry `data-vocab="{unitId}-v{index}"` rather than an id, because the
// same row exists twice in the DOM (table + card) and Phrase flashes both.
// Column headings stay English on purpose (content spec §4).

import { cn } from "@/lib/utils";
import type { VocabRow } from "@/lib/ielts/types";
import { VOCAB } from "./tokens";

interface Props {
  rows: VocabRow[];
  unitId: string;
  id?: string;
}

export default function VocabTable({ rows, unitId, id }: Props) {
  if (rows.length === 0) return null;

  return (
    <div id={id} className="scroll-mt-28">
      <h4 className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", VOCAB.term)}>Vocabulary</h4>

      {/* Desktop: table */}
      <div className={cn("hidden overflow-hidden rounded-xl md:block", VOCAB.frame)}>
        <table className="w-full table-fixed border-collapse text-left">
          <thead className={cn("text-xs uppercase tracking-wider", VOCAB.head)}>
            <tr>
              <th scope="col" className="w-[20%] px-3 py-2">Term</th>
              <th scope="col" className="w-[28%] px-3 py-2">Definition</th>
              <th scope="col" className="w-[30%] px-3 py-2">Example</th>
              <th scope="col" className="w-[22%] px-3 py-2">Vietnamese</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                data-vocab={`${unitId}-v${index}`}
                className="border-t border-cyan-200 align-top transition-colors dark:border-cyan-900"
              >
                <th scope="row" className={cn("px-3 py-3 font-semibold", VOCAB.term)}>
                  {row.term}
                </th>
                <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">{row.definition}</td>
                <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">{row.example}</td>
                <td className="px-3 py-3 italic text-zinc-600 dark:text-zinc-400">{row.vietnamese}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per term */}
      <ul className="space-y-2 md:hidden">
        {rows.map((row, index) => (
          <li
            key={index}
            data-vocab={`${unitId}-v${index}`}
            className={cn("rounded-xl p-3 transition-colors", VOCAB.frame)}
          >
            <p className={cn("font-semibold", VOCAB.term)}>{row.term}</p>
            <p className="mt-1 text-zinc-700 dark:text-zinc-300">{row.definition}</p>
            <p className="mt-1 text-zinc-700 dark:text-zinc-300">
              <span className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Example · </span>
              {row.example}
            </p>
            <p className="mt-1 italic text-zinc-600 dark:text-zinc-400">{row.vietnamese}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
