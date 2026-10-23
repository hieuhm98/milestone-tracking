"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { TableSchema } from "@/lib/sqlPlayground";

// An entity–relationship diagram drawn from the live schema (tables, columns,
// foreign keys), so it stays right for any playground database.
//
// Layout: a table that references nothing sits in the left column; every other
// table sits one column right of the furthest-right table it references
// (customers → loan_applications → loans → repayment_schedule). Within a
// column, tables are ordered by where the tables they link to sit, which keeps
// most lines short and uncrossed. Each foreign key is a curve from the child's
// column (the "many" end, ⋔) to the parent's key (the "one" end, |).

const BOX_W = 216;
const HEADER_H = 30;
const ROW_H = 19;
const PAD_Y = 6;
const GAP_X = 64;
const GAP_Y = 28;
const MARGIN = 16;

interface Placed {
  table: TableSchema;
  x: number;
  y: number;
  h: number;
}

interface Edge {
  key: string;
  child: string;
  parent: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const rowY = (box: Placed, column: string) => {
  const index = Math.max(0, box.table.columns.findIndex((c) => c.name === column));

  return box.y + HEADER_H + PAD_Y + index * ROW_H + ROW_H / 2;
};

function layout(tables: TableSchema[]) {
  const byName = new Map(tables.map((t) => [t.name, t]));
  const parentsOf = (t: TableSchema) =>
    Array.from(new Set(t.foreignKeys.map((fk) => fk.table))).filter((p) => p !== t.name && byName.has(p));

  // Column = 1 + the furthest column of any table it references.
  const level = new Map<string, number>();
  const visiting = new Set<string>();
  const levelOf = (name: string): number => {
    if (level.has(name)) return level.get(name)!;

    if (visiting.has(name)) return 0; // a cycle: stop rather than recurse forever

    visiting.add(name);
    const parents = parentsOf(byName.get(name)!);
    const value = parents.length ? 1 + Math.max(...parents.map(levelOf)) : 0;
    visiting.delete(name);
    level.set(name, value);

    return value;
  };

  tables.forEach((t) => levelOf(t.name));

  const columns: TableSchema[][] = [];

  for (const t of [...tables].sort((a, b) => a.name.localeCompare(b.name))) {
    (columns[level.get(t.name)!] ??= []).push(t);
  }

  // Order each column by the average position of the tables it links to.
  const position = new Map<string, number>();
  const remember = () => columns.forEach((col) => col.forEach((t, i) => position.set(t.name, i)));
  const average = (names: string[]) =>
    names.length ? names.reduce((sum, n) => sum + (position.get(n) ?? 0), 0) / names.length : Infinity;

  remember();

  for (let pass = 0; pass < 2; pass++) {
    for (let c = 1; c < columns.length; c++) {
      columns[c]?.sort((a, b) => average(parentsOf(a)) - average(parentsOf(b)));
      remember();
    }

    const childrenOf = (name: string) => tables.filter((t) => parentsOf(t).includes(name)).map((t) => t.name);

    columns[0]?.sort((a, b) => average(childrenOf(a.name)) - average(childrenOf(b.name)));
    remember();
  }

  const placed = new Map<string, Placed>();
  let height = 0;

  columns.forEach((col, c) => {
    let y = MARGIN;

    for (const table of col ?? []) {
      const h = HEADER_H + PAD_Y * 2 + table.columns.length * ROW_H;
      placed.set(table.name, { table, x: MARGIN + c * (BOX_W + GAP_X), y, h });
      y += h + GAP_Y;
    }

    height = Math.max(height, y - GAP_Y + MARGIN);
  });

  const edges: Edge[] = [];

  for (const box of Array.from(placed.values())) {
    for (const fk of box.table.foreignKeys) {
      const parent = placed.get(fk.table);

      if (!parent || parent === box) continue;

      edges.push({
        key: `${box.table.name}.${fk.from}->${fk.table}.${fk.to}`,
        child: box.table.name,
        parent: fk.table,
        x1: box.x,
        y1: rowY(box, fk.from),
        x2: parent.x + BOX_W,
        y2: rowY(parent, fk.to),
      });
    }
  }

  const width = MARGIN * 2 + columns.length * BOX_W + Math.max(0, columns.length - 1) * GAP_X;

  return { boxes: Array.from(placed.values()), edges, width, height };
}

export function SchemaDiagram({
  tables,
  pick,
  onTableClick,
}: {
  tables: TableSchema[];
  pick: (vi: string, en: string) => string;
  /** Clicking a table's name (the playground opens `SELECT * FROM it`). */
  onTableClick?: (name: string) => void;
}) {
  const { boxes, edges, width, height } = useMemo(() => layout(tables), [tables]);
  const [focus, setFocus] = useState<string | null>(null);

  if (tables.length === 0) return null;

  const fkColumns = new Set(tables.flatMap((t) => t.foreignKeys.map((fk) => `${t.name}.${fk.from}`)));
  const linked = (name: string) =>
    !focus || name === focus || edges.some((e) => (e.child === focus && e.parent === name) || (e.parent === focus && e.child === name));
  const edgeOn = (e: Edge) => !focus || e.child === focus || e.parent === focus;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 mb-2">
        <span>
          <span className="font-mono text-amber-600 dark:text-amber-400">PK</span> {pick("khoá chính", "primary key")}
        </span>
        <span>
          <span className="font-mono text-sky-600 dark:text-sky-400">FK</span> {pick("khoá ngoại", "foreign key")}
        </span>
        <span>{pick("Đường nối: nhiều ⋔ — một |", "Lines: many ⋔ — one |")}</span>
        <span className="hidden sm:inline">{pick("Di chuột vào bảng để xem liên kết", "Hover a table to trace its links")}</span>
        <span className="sm:hidden">{pick("Vuốt ngang để xem hết sơ đồ", "Swipe sideways to see the whole diagram")}</span>
      </div>

      <div className="overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={pick(`Sơ đồ cơ sở dữ liệu: ${tables.length} bảng`, `Database diagram: ${tables.length} tables`)}
          className="block"
        >
          {edges.map((e) => {
            const dx = Math.max(40, (e.x1 - e.x2) / 2);
            const on = edgeOn(e);

            return (
              <g key={e.key} className={cn("transition-opacity", on ? "opacity-100" : "opacity-15")}>
                <path
                  d={`M ${e.x1} ${e.y1} C ${e.x1 - dx} ${e.y1}, ${e.x2 + dx} ${e.y2}, ${e.x2} ${e.y2}`}
                  fill="none"
                  strokeWidth={focus && on ? 2 : 1.5}
                  className="stroke-sky-500/70 dark:stroke-sky-400/60"
                />
                {/* many (child) end: crow's foot */}
                <path
                  d={`M ${e.x1 - 10} ${e.y1} L ${e.x1} ${e.y1 - 5} M ${e.x1 - 10} ${e.y1} L ${e.x1} ${e.y1} M ${e.x1 - 10} ${e.y1} L ${e.x1} ${e.y1 + 5}`}
                  strokeWidth={1.5}
                  className="stroke-sky-500/80 dark:stroke-sky-400/70"
                />
                {/* one (parent) end: a bar */}
                <path
                  d={`M ${e.x2 + 7} ${e.y2 - 5} L ${e.x2 + 7} ${e.y2 + 5}`}
                  strokeWidth={1.5}
                  className="stroke-sky-500/80 dark:stroke-sky-400/70"
                />
              </g>
            );
          })}

          {boxes.map((box) => (
            <g
              key={box.table.name}
              transform={`translate(${box.x}, ${box.y})`}
              className={cn("transition-opacity", linked(box.table.name) ? "opacity-100" : "opacity-30")}
              onMouseEnter={() => setFocus(box.table.name)}
              onMouseLeave={() => setFocus(null)}
            >
              <rect
                width={BOX_W}
                height={box.h}
                rx={8}
                strokeWidth={focus === box.table.name ? 2 : 1}
                className={cn(
                  "fill-white dark:fill-zinc-900",
                  focus === box.table.name ? "stroke-blue-500" : "stroke-zinc-300 dark:stroke-zinc-700"
                )}
              />
              <path
                d={`M 0 ${HEADER_H} H ${BOX_W}`}
                strokeWidth={1}
                className="stroke-zinc-200 dark:stroke-zinc-800"
              />
              <text
                x={12}
                y={HEADER_H / 2 + 4}
                className={cn(
                  "font-mono text-[12.5px] font-semibold fill-blue-700 dark:fill-blue-300",
                  onTableClick && "cursor-pointer"
                )}
                onClick={() => onTableClick?.(box.table.name)}
              >
                {box.table.name}
              </text>
              <text x={BOX_W - 10} y={HEADER_H / 2 + 4} textAnchor="end" className="text-[10px] fill-zinc-400 dark:fill-zinc-500">
                {box.table.rowCount.toLocaleString()}
              </text>
              {box.table.columns.map((col, i) => {
                const y = HEADER_H + PAD_Y + i * ROW_H + ROW_H / 2 + 4;
                const isFk = fkColumns.has(`${box.table.name}.${col.name}`);

                return (
                  <g key={col.name}>
                    <text x={12} y={y} className="font-mono text-[11.5px] fill-zinc-700 dark:fill-zinc-300">
                      {col.name}
                    </text>
                    {(col.pk || isFk) && (
                      <text
                        x={BOX_W - 66}
                        y={y}
                        textAnchor="end"
                        className={cn(
                          "font-mono text-[9.5px] font-semibold",
                          col.pk ? "fill-amber-600 dark:fill-amber-400" : "fill-sky-600 dark:fill-sky-400"
                        )}
                      >
                        {col.pk ? "PK" : "FK"}
                      </text>
                    )}
                    <text x={BOX_W - 10} y={y} textAnchor="end" className="font-mono text-[10.5px] fill-zinc-400 dark:fill-zinc-500">
                      {(col.type || "—").toLowerCase()}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
