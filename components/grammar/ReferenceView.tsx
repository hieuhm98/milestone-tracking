"use client";

// A reference page: an intro, our own tables, and optional notes underneath.
// `searchable` turns on the filter box the irregular-verb list needs — it
// narrows the rows of every table, matching any cell.

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useLang } from "@/context/lang";
import type { ReferencePage, Table } from "@/lib/grammar/types";
import GrammarTable from "./GrammarTable";
import Rich, { plain } from "./text";
import { partTokens } from "./tokens";

export default function ReferenceView({ page }: { page: ReferencePage }) {
  const { t, pick } = useLang();
  const [query, setQuery] = useState("");
  const tokens = partTokens("A");

  const needle = query.trim().toLowerCase();

  const tables = useMemo<Table[]>(() => {
    if (!page.searchable || !needle) return page.tables;

    return page.tables.map((table) => ({
      ...table,
      rows: table.rows.filter((row) => row.some((cell) => plain(cell).toLowerCase().includes(needle))),
    }));
  }, [page, needle]);

  const shown = tables.reduce((count, table) => count + table.rows.length, 0);
  const all = page.tables.reduce((count, table) => count + table.rows.length, 0);

  return (
    <div className="max-w-4xl space-y-6 pb-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          {t("grammar.home.reference")}
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{page.title}</h1>

        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          <Rich text={page.intro} />
        </p>
      </header>

      {page.searchable && (
        <div className="space-y-1">
          <label className="relative block">
            <span className="sr-only">{t("grammar.reference.search")}</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("grammar.reference.search")}
              data-testid="reference-search"
              className="input pl-9"
            />
          </label>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {shown} / {all} {pick("dòng", "rows")}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {tables.map((table, index) => (
          <GrammarTable key={index} table={table} tokens={tokens} />
        ))}
      </div>

      {page.notes && page.notes.length > 0 && (
        <ul className="space-y-2">
          {page.notes.map((note, index) => (
            <li key={index} className="text-sm text-zinc-700 dark:text-zinc-300">
              <Rich text={note} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
