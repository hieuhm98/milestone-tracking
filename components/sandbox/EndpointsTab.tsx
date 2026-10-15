"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/context/lang";
import { OPERATIONS, TAGS, type Access, type Operation } from "@/lib/sandbox/catalog";
import type { WorkedExample } from "@/lib/sandbox/examples";
import { cn } from "@/lib/utils";
import ExampleView, { MethodBadge, statusTone } from "./ExampleView";

export function AccessBadge({ access }: { access: Access }) {
  const { pick } = useLang();
  const style = {
    public: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    user: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
    admin: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  }[access];
  const label = {
    public: pick("🔓 Công khai", "🔓 Public"),
    user: pick("🔑 Cần đăng nhập", "🔑 Login"),
    admin: pick("👑 Chỉ admin", "👑 Admin"),
  }[access];

  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", style)}>{label}</span>;
}

function OperationCard({ op, example, apiKey, onTry }: { op: Operation; example: WorkedExample; apiKey: string | null; onTry: (op: Operation) => void }) {
  const { pick } = useLang();

  return (
    <details id={`op-${op.id}`} className="card p-0 sm:p-0 group scroll-mt-20">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
        <MethodBadge method={op.method} className="w-14 text-center shrink-0" />
        <code className="font-mono text-sm text-zinc-900 dark:text-zinc-100 truncate">{op.path}</code>
        <span className="hidden md:inline text-sm text-zinc-500 truncate">— {pick(op.summary.vi, op.summary.en)}</span>
        <span className="ml-auto shrink-0"><AccessBadge access={op.access} /></span>
        <span className="text-zinc-400 transition-transform group-open:rotate-90 shrink-0" aria-hidden>›</span>
      </summary>

      <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 px-4 pb-4 pt-3 sm:px-5">
        <div>
          <h3 className="font-semibold md:hidden">{pick(op.summary.vi, op.summary.en)}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{pick(op.purpose.vi, op.purpose.en)}</p>
        </div>

        {op.params && op.params.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-zinc-500">
                  <th className="py-1 pr-3 font-medium">{pick("Tham số", "Parameter")}</th>
                  <th className="py-1 pr-3 font-medium">{pick("Ở đâu", "In")}</th>
                  <th className="py-1 font-medium">{pick("Ý nghĩa", "Meaning")}</th>
                </tr>
              </thead>
              <tbody>
                {op.params.map((p) => (
                  <tr key={`${p.in}-${p.name}`} className="border-t border-zinc-100 dark:border-zinc-800 align-top">
                    <td className="py-1.5 pr-3 font-mono whitespace-nowrap">
                      {p.name}
                      {p.in === "path" && <span className="text-rose-600">*</span>}
                    </td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      <span className={p.in === "path" ? "text-amber-700 dark:text-amber-300" : "text-violet-700 dark:text-violet-300"}>{p.in}</span>
                      <span className="text-zinc-400"> · {p.type}</span>
                    </td>
                    <td className="py-1.5 text-zinc-600 dark:text-zinc-400">
                      {pick(p.desc.vi, p.desc.en)}
                      {p.enum && <span className="block font-mono text-[11px] text-zinc-500">{p.enum.join(" | ")}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{pick("Ví dụ chạy thật trên dữ liệu mẫu", "Worked example on the sample data")}</h4>
          <ExampleView example={example} apiKey={apiKey} />
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-zinc-500">{pick("Có thể trả về:", "Can return:")}</span>
          {op.responses.map((r) => (
            <span key={r.status} title={pick(r.desc.vi, r.desc.en)} className={cn("font-mono", statusTone(r.status))}>
              {r.status}
            </span>
          ))}
          <button type="button" onClick={() => onTry(op)} className="ml-auto btn-secondary text-xs px-3 py-1.5">
            {pick("Thử trong Swagger →", "Try it in Swagger →")}
          </button>
        </div>
      </div>
    </details>
  );
}

export default function EndpointsTab({
  examples,
  apiKey,
  onTry,
}: {
  examples: Record<string, WorkedExample>;
  apiKey: string | null;
  onTry: (op: Operation) => void;
}) {
  const { pick } = useLang();
  const [filter, setFilter] = useState("");

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();

    return TAGS.map((tag) => ({
      tag,
      ops: OPERATIONS.filter(
        (op) =>
          op.tag === tag.name &&
          (!q || `${op.method} ${op.path} ${op.summary.vi} ${op.summary.en}`.toLowerCase().includes(q))
      ),
    })).filter((g) => g.ops.length > 0);
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={pick("Lọc: books, POST, thanh toán…", "Filter: books, POST, payment…")}
          className="input max-w-xs text-sm"
          aria-label={pick("Lọc API", "Filter endpoints")}
        />
        <span className="text-xs text-zinc-500">
          {pick(`${OPERATIONS.length} API · bấm vào một dòng để xem ví dụ`, `${OPERATIONS.length} endpoints · click a row for its example`)}
        </span>
      </div>

      {groups.map(({ tag, ops }) => (
        <section key={tag.name} className="space-y-2">
          <div>
            <h2 className="text-lg font-semibold">{tag.name}</h2>
            <p className="text-sm text-zinc-500">{pick(tag.desc.vi, tag.desc.en)}</p>
          </div>
          <div className="space-y-2">
            {ops.map((op) => (
              <OperationCard key={op.id} op={op} example={examples[op.id]} apiKey={apiKey} onTry={onTry} />
            ))}
          </div>
        </section>
      ))}

      {groups.length === 0 && <p className="text-sm text-zinc-500">{pick("Không có API nào khớp.", "No endpoint matches.")}</p>}
    </div>
  );
}
