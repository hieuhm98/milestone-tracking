"use client";

import { useLang } from "@/context/lang";
import { RELATIONS, TABLES, type Column, type Table, type TableName } from "@/lib/sandbox/schema";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------ diagram

const BOX_W = 210;
const HEAD_H = 28;
const ROW_H = 18;

/** Hand-placed so every foreign key runs to a neighbour without crossing a box. */
const POSITION: Record<TableName, { x: number; y: number }> = {
  authors: { x: 20, y: 20 },
  books: { x: 300, y: 20 },
  order_items: { x: 580, y: 20 },
  users: { x: 20, y: 280 },
  orders: { x: 300, y: 280 },
  payments: { x: 580, y: 280 },
  invoices: { x: 300, y: 530 },
};

const HEAD_FILL: Record<TableName, string> = {
  authors: "fill-emerald-600",
  books: "fill-blue-600",
  order_items: "fill-slate-500",
  users: "fill-violet-600",
  orders: "fill-amber-600",
  payments: "fill-rose-600",
  invoices: "fill-cyan-700",
};

const rowY = (table: TableName, column: string) => {
  const t = TABLES.find((x) => x.name === table)!;
  const i = t.columns.findIndex((c) => c.name === column);

  return POSITION[table].y + HEAD_H + i * ROW_H + ROW_H / 2 + 4;
};

const boxHeight = (t: Table) => HEAD_H + t.columns.length * ROW_H + 8;

function edgePath(from: TableName, column: string, to: TableName) {
  const a = POSITION[from];
  const b = POSITION[to];
  const y1 = rowY(from, column);
  const y2 = rowY(to, "id");

  if (a.x === b.x) {
    // Same column: leave and enter on the left, bowing out around the boxes.
    const x = a.x;

    return { d: `M ${x} ${y1} C ${x - 45} ${y1}, ${x - 45} ${y2}, ${x} ${y2}`, n: { x: x - 12, y: y1 - 4 }, one: { x: x - 10, y: y2 - 4 } };
  }

  const rightward = b.x > a.x;
  const x1 = rightward ? a.x + BOX_W : a.x;
  const x2 = rightward ? b.x : b.x + BOX_W;
  const mid = (x1 + x2) / 2;

  return {
    d: `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`,
    n: { x: x1 + (rightward ? 4 : -12), y: y1 - 4 },
    one: { x: x2 + (rightward ? -10 : 4), y: y2 - 4 },
  };
}

function marker(col: Column): string {
  if (col.pk) return "PK";

  if (col.ref) return "FK";

  if (col.unique) return "UQ";

  return "";
}

function Diagram() {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <svg viewBox="0 0 810 740" className="min-w-[640px] w-full h-auto" role="img" aria-label="Entity relationship diagram">
        {RELATIONS.map((rel) => {
          const p = edgePath(rel.from, rel.column, rel.to);

          return (
            <g key={`${rel.from}.${rel.column}`} className="text-zinc-400 dark:text-zinc-500">
              <path d={p.d} fill="none" className="stroke-zinc-400 dark:stroke-zinc-500" strokeWidth={1.5} />
              <text x={p.n.x} y={p.n.y} className="fill-zinc-500 dark:fill-zinc-400" fontSize={10} fontWeight={700}>N</text>
              <text x={p.one.x} y={p.one.y} className="fill-zinc-500 dark:fill-zinc-400" fontSize={10} fontWeight={700}>1</text>
            </g>
          );
        })}

        {TABLES.map((table) => {
          const { x, y } = POSITION[table.name];

          return (
            <g key={table.name}>
              <rect x={x} y={y} width={BOX_W} height={boxHeight(table)} rx={8} className="fill-white dark:fill-zinc-900 stroke-zinc-300 dark:stroke-zinc-700" strokeWidth={1} />
              <path d={`M ${x} ${y + 8} a 8 8 0 0 1 8 -8 h ${BOX_W - 16} a 8 8 0 0 1 8 8 v ${HEAD_H - 8} h ${-BOX_W} z`} className={HEAD_FILL[table.name]} />
              <text x={x + 10} y={y + 19} fill="white" fontSize={13} fontWeight={700} fontFamily="ui-monospace, monospace">{table.name}</text>
              {table.columns.map((col, i) => {
                const cy = y + HEAD_H + i * ROW_H + 15;
                const tag = marker(col);

                return (
                  <g key={col.name}>
                    <text x={x + 10} y={cy} fontSize={10} fontWeight={700} fontFamily="ui-monospace, monospace" className={tag === "PK" ? "fill-amber-600" : tag === "FK" ? "fill-blue-600 dark:fill-blue-400" : "fill-violet-600 dark:fill-violet-400"}>{tag}</text>
                    <text x={x + 32} y={cy} fontSize={11} fontFamily="ui-monospace, monospace" className="fill-zinc-800 dark:fill-zinc-200">{col.name}</text>
                    <text x={x + BOX_W - 10} y={cy} fontSize={10} textAnchor="end" fontFamily="ui-monospace, monospace" className="fill-zinc-400">{col.type}{col.nullable ? "?" : ""}</text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ------------------------------------------------------------------ tab

const NOTES: { vi: string; en: string }[] = [
  {
    vi: "**PK (khoá chính)** — cột id xác định duy nhất một dòng. Đây chính là {id} trong URL như /books/{id}.",
    en: "**PK (primary key)** — the id column identifies exactly one row. It's the {id} in URLs like /books/{id}.",
  },
  {
    vi: "**FK (khoá ngoại)** — cột trỏ tới id của bảng khác, ví dụ books.author_id → authors.id. Vì vậy POST /books với author_id không tồn tại bị 422, và xoá tác giả còn sách bị 409.",
    en: "**FK (foreign key)** — a column pointing at another table's id, e.g. books.author_id → authors.id. That's why POST /books with an unknown author_id gets 422, and deleting an author who still has books gets 409.",
  },
  {
    vi: "**N–1** — mỗi đường nối đọc là “nhiều … thuộc về một …”: nhiều sách thuộc một tác giả, nhiều đơn thuộc một người dùng.",
    en: "**N–1** — read each line as “many … belong to one …”: many books to one author, many orders to one user.",
  },
  {
    vi: "**order_items là bảng nối** giữa orders và books (quan hệ nhiều–nhiều: một đơn nhiều sách, một sách trong nhiều đơn). API không có /order_items; bạn đọc/ghi nó qua trường items của đơn hàng.",
    en: "**order_items is a join table** between orders and books (many-to-many: one order has many books, one book is in many orders). There's no /order_items endpoint; you read and write it through an order's items field.",
  },
  {
    vi: "**unit_price được sao chép** từ books.price lúc đặt hàng — đổi giá sách sau đó không làm thay đổi đơn cũ. Đây là dữ liệu lịch sử, không phải trùng lặp.",
    en: "**unit_price is copied** from books.price at order time — a later price change never alters an old order. That's history, not duplication.",
  },
  {
    vi: "**invoices.user_id là phi chuẩn hoá có chủ đích** — có thể suy ra qua orders, nhưng lưu sẵn giúp GET /invoices?user_id= nhanh hơn.",
    en: "**invoices.user_id is deliberate denormalisation** — derivable through orders, but stored so GET /invoices?user_id= is quick.",
  },
  {
    vi: "**password_hash không bao giờ rời server.** API nhận trường password, lưu bản băm, và không trả nó trong bất kỳ response nào — so sánh cột trong bảng users với JSON bạn nhận được.",
    en: "**password_hash never leaves the server.** The API accepts a password field, stores a hash, and returns it in no response — compare the users table with the JSON you get back.",
  },
];

function Md({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);

  return <>{parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="text-zinc-900 dark:text-zinc-100">{part}</strong> : part))}</>;
}

export default function DatabaseTab() {
  const { pick } = useLang();

  return (
    <div className="space-y-6">
      <section className="card space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{pick("Sơ đồ quan hệ (ERD)", "Entity relationship diagram")}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {pick(
              "7 bảng phía sau API. Mỗi API là một cửa sổ nhìn vào các bảng này — hiểu bảng thì hiểu vì sao API trả lỗi.",
              "The 7 tables behind the API. Every endpoint is a window onto them — understand the tables and the API's errors make sense."
            )}
          </p>
        </div>
        <Diagram />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span><b className="text-amber-600">PK</b> {pick("khoá chính", "primary key")}</span>
          <span><b className="text-blue-600 dark:text-blue-400">FK</b> {pick("khoá ngoại", "foreign key")}</span>
          <span><b className="text-violet-600 dark:text-violet-400">UQ</b> {pick("duy nhất", "unique")}</span>
          <span><b>?</b> {pick("có thể null", "nullable")}</span>
          <span><b>N — 1</b> {pick("nhiều thuộc về một", "many belong to one")}</span>
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="text-lg font-semibold">{pick("Đọc sơ đồ thế nào", "How to read it")}</h2>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 list-disc pl-5">
          {NOTES.map((note, i) => (
            <li key={i}><Md text={pick(note.vi, note.en)} /></li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {TABLES.map((table) => (
          <section key={table.name} className="card space-y-2 min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-mono font-semibold">{table.name}</h3>
              <span className="text-xs text-zinc-500 font-mono">API: {table.resource}</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{pick(table.desc.vi, table.desc.en)}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-zinc-500">
                    <th className="py-1 pr-3 font-medium">{pick("Cột", "Column")}</th>
                    <th className="py-1 pr-3 font-medium">{pick("Kiểu", "Type")}</th>
                    <th className="py-1 font-medium">{pick("Ý nghĩa", "Meaning")}</th>
                  </tr>
                </thead>
                <tbody>
                  {table.columns.map((col) => (
                    <tr key={col.name} className="border-t border-zinc-100 dark:border-zinc-800 align-top">
                      <td className="py-1.5 pr-3 font-mono whitespace-nowrap">
                        {col.name}
                        {marker(col) && <span className={cn("ml-1.5 text-[10px] font-bold", col.pk ? "text-amber-600" : col.ref ? "text-blue-600 dark:text-blue-400" : "text-violet-600 dark:text-violet-400")}>{marker(col)}</span>}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-zinc-500 whitespace-nowrap">
                        {col.type === "enum" ? `enum` : col.type}
                        {col.nullable ? "?" : ""}
                        {col.readOnly && <span className="block text-[10px] text-zinc-400">read-only</span>}
                      </td>
                      <td className="py-1.5 text-zinc-600 dark:text-zinc-400">
                        {pick(col.desc.vi, col.desc.en)}
                        {col.values && <span className="block font-mono text-[11px] text-zinc-500 mt-0.5">{col.values.join(" | ")}</span>}
                        {col.ref && <span className="block font-mono text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">→ {col.ref}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
