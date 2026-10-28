"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useLang } from "@/context/lang";
import { API_BASE_PATH, SANDBOX_KEY_HEADER } from "@/lib/sandbox/catalog";
import type { WorkedExample } from "@/lib/sandbox/examples";
import { cn } from "@/lib/utils";

/** The site's origin, filled in after mount so server and client render the same HTML first. */
export function useOrigin(): { origin: string; host: string } {
  const [value, setValue] = useState({ origin: "https://your-site", host: "your-site" });

  useEffect(() => {
    setValue({ origin: window.location.origin, host: window.location.host });
  }, []);

  return value;
}

export const METHOD_STYLE: Record<string, string> = {
  GET: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
  POST: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  PUT: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  PATCH: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
  DELETE: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
};

export function MethodBadge({ method, className }: { method: string; className?: string }) {
  return (
    <span className={cn("inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide", METHOD_STYLE[method], className)}>
      {method}
    </span>
  );
}

export function statusTone(status: number): string {
  if (status < 300) return "text-emerald-700 dark:text-emerald-400";

  if (status < 500) return "text-amber-700 dark:text-amber-400";

  return "text-rose-700 dark:text-rose-400";
}

/** Long values (tokens, keys) are shortened on screen; the full value is in the title. */
function shorten(value: string): string {
  if (value.startsWith("Bearer ") && value.length > 40) return `${value.slice(0, 31)}…`;

  return value.length > 48 ? `${value.slice(0, 45)}…` : value;
}

const HEADER_HELP: Record<string, { vi: string; en: string }> = {
  [SANDBOX_KEY_HEADER]: { vi: "Key riêng của bạn — chọn sandbox nào.", en: "Your personal key — picks the sandbox." },
  Authorization: { vi: "Token đăng nhập: Bearer + dấu cách + access_token.", en: "Login token: Bearer, a space, then the access_token." },
  "Content-Type": { vi: "Body là JSON.", en: "The body is JSON." },
  Location: { vi: "Địa chỉ của bản ghi vừa tạo.", en: "Where the new row lives." },
  "WWW-Authenticate": { vi: "Gợi ý cách xác thực.", en: "How to authenticate." },
  Allow: { vi: "Các method hợp lệ ở URL này.", en: "Methods this URL accepts." },
};

/** The URL, coloured by part: base, path, path-parameter values, query string. */
export function ColoredUrl({ url, pathParams }: { url: string; pathParams: Record<string, string> }) {
  const [path, query] = url.split("?");
  const rest = path.slice(API_BASE_PATH.length) || "/";
  const values = new Set(Object.values(pathParams));
  const segments = rest.split("/").slice(1);

  return (
    <code className="font-mono text-[13px] break-all">
      <span className="text-zinc-500 dark:text-zinc-400">{API_BASE_PATH}</span>
      {rest === "/" ? (
        <span className="text-blue-700 dark:text-blue-300">/</span>
      ) : (
        segments.map((seg, i) => (
          <span key={i}>
            <span className="text-blue-700 dark:text-blue-300">/</span>
            <span className={values.has(seg) ? "rounded bg-amber-100 px-0.5 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" : "text-blue-700 dark:text-blue-300"}>
              {seg}
            </span>
          </span>
        ))
      )}
      {query && <span className="text-violet-700 dark:text-violet-300">?{query}</span>}
    </code>
  );
}

function Rows({ rows }: { rows: [string, React.ReactNode, React.ReactNode?][] }) {
  return (
    <table className="w-full text-xs">
      <tbody>
        {rows.map(([name, value, help]) => (
          <tr key={name} className="border-t border-zinc-100 dark:border-zinc-800 first:border-t-0 align-top">
            <td className="py-1 pr-3 font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{name}</td>
            <td className="py-1 pr-3 font-mono text-zinc-900 dark:text-zinc-100 break-all">{value}</td>
            {help !== undefined && <td className="py-1 text-zinc-500 hidden sm:table-cell">{help}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Part({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
        {hint && <span className="text-[11px] text-zinc-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function JsonBlock({ value, className }: { value: unknown; className?: string }) {
  return (
    // Focusable so keyboard users can scroll a long body.
    <pre tabIndex={0} className={cn("max-h-80 overflow-auto rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 font-mono text-xs leading-relaxed text-zinc-800 dark:text-zinc-200", className)}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function curlFor(example: WorkedExample, apiKey: string | null): string {
  const { request } = example;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const lines = [`curl -X ${request.method} "${origin}${request.url}"`];

  for (const [name, value] of request.headers) {
    if (name === SANDBOX_KEY_HEADER) {
      lines.push(`  -H "${name}: ${apiKey ?? "<your-sandbox-key>"}"`);
    } else if (name === "Authorization") {
      lines.push(`  -H "Authorization: Bearer $TOKEN"`);
    } else {
      lines.push(`  -H "${name}: ${value}"`);
    }
  }

  if (request.body !== undefined) lines.push(`  -d '${JSON.stringify(request.body)}'`);

  return lines.join(" \\\n");
}

/** One worked example laid out as its parts: method, URL, params, headers, body → status, headers, body. */
export default function ExampleView({ example, apiKey }: { example: WorkedExample; apiKey: string | null }) {
  const { pick } = useLang();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const { request, response } = example;
  const pathParams = Object.entries(request.pathParams);
  const query = Object.entries(request.query);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(curlFor(example, apiKey));
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">→ {pick("Request (bạn gửi)", "Request (you send)")}</span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 px-1 py-2 -my-2 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
          >
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            <span aria-live="polite">
              {copied
                ? pick("Đã copy", "Copied")
                : copyFailed
                  ? pick("Không copy được — thử lại", "Couldn't copy — try again")
                  : pick("Copy lệnh curl", "Copy as curl")}
            </span>
          </button>
        </div>

        <Part label="Method + URL">
          <div className="flex flex-wrap items-center gap-2">
            <MethodBadge method={request.method} />
            <ColoredUrl url={request.url} pathParams={request.pathParams} />
          </div>
        </Part>

        {pathParams.length > 0 && (
          <Part label="Path params" hint={pick("nằm trong đường dẫn", "inside the path")}>
            <Rows rows={pathParams.map(([k, v]) => [k, v])} />
          </Part>
        )}

        {query.length > 0 && (
          <Part label="Query params" hint={pick("sau dấu ?", "after the ?")}>
            <Rows rows={query.map(([k, v]) => [k, v])} />
          </Part>
        )}

        <Part label="Headers">
          <Rows
            rows={request.headers.map(([name, value]) => [
              name,
              <span key={name} title={value}>{name === SANDBOX_KEY_HEADER && apiKey ? shorten(apiKey) : shorten(value)}</span>,
              HEADER_HELP[name] ? pick(HEADER_HELP[name].vi, HEADER_HELP[name].en) : "",
            ])}
          />
          {example.loggedInAs && (
            <p className="text-[11px] text-zinc-500">
              {pick(
                `Token mẫu của ${example.loggedInAs}, lấy từ POST /auth/login. Token chỉ dùng được trong sandbox đã cấp nó — hãy tự đăng nhập để lấy token của bạn.`,
                `A sample token for ${example.loggedInAs} from POST /auth/login. A token only works in the sandbox that issued it — log in yourself to get yours.`
              )}
            </p>
          )}
        </Part>

        <Part label="Body (JSON)">
          {request.body === undefined ? (
            <p className="text-xs text-zinc-500">{pick("Không có body — GET/DELETE thường không gửi body.", "No body — GET and DELETE usually send none.")}</p>
          ) : (
            <JsonBlock value={request.body} />
          )}
        </Part>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 space-y-3 min-w-0">
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">← {pick("Response (server trả về)", "Response (server returns)")}</span>

        <Part label="Status">
          <div className={cn("font-mono text-sm font-semibold", statusTone(response.status))}>
            {response.status} {response.statusText}
          </div>
        </Part>

        {response.headers.length > 0 && (
          <Part label="Headers">
            <Rows
              rows={response.headers.map(([name, value]) => [
                name,
                <span key={name} title={value}>{shorten(value)}</span>,
                HEADER_HELP[name] ? pick(HEADER_HELP[name].vi, HEADER_HELP[name].en) : "",
              ])}
            />
          </Part>
        )}

        <Part label="Body (JSON)">
          {response.body === undefined ? (
            <p className="text-xs text-zinc-500">{pick("204 không có body.", "204 has no body.")}</p>
          ) : (
            <JsonBlock value={response.body} />
          )}
        </Part>
      </div>
    </div>
  );
}
