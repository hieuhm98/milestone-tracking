"use client";

import { useEffect, useState } from "react";
import type { PlaygroundDb, TableSchema } from "@/lib/sqlPlayground";

// The schema only changes on deploy, so each database is fetched once per page load.
const cache = new Map<PlaygroundDb, Promise<{ tables: TableSchema[]; error?: string }>>();

function load(db: PlaygroundDb) {
  let pending = cache.get(db);

  if (!pending) {
    pending = fetch(`/api/sql-playground?db=${db}`)
      .then((r) => r.json())
      .catch((e) => ({ tables: [], error: String(e) }));
    cache.set(db, pending);
  }

  return pending;
}

/** Tables, columns and foreign keys of a playground database. */
export function useSchema(db: PlaygroundDb): { tables: TableSchema[]; error: string | null; loading: boolean } {
  const [state, setState] = useState<{ db: PlaygroundDb; tables: TableSchema[]; error: string | null } | null>(null);

  useEffect(() => {
    let live = true;

    load(db).then((d) => {
      if (live) setState({ db, tables: d.tables ?? [], error: d.error ?? null });
    });

    return () => {
      live = false;
    };
  }, [db]);

  const current = state?.db === db ? state : null;

  return { tables: current?.tables ?? [], error: current?.error ?? null, loading: !current };
}
