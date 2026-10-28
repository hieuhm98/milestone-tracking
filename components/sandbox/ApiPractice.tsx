"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Eye, EyeOff, Loader2, RotateCcw, RotateCw } from "lucide-react";
import { useLang } from "@/context/lang";
import { API_BASE_PATH, SANDBOX_KEY_HEADER, type Operation } from "@/lib/sandbox/catalog";
import type { WorkedExample } from "@/lib/sandbox/examples";
import { cn } from "@/lib/utils";
import DatabaseTab from "./DatabaseTab";
import EndpointsTab from "./EndpointsTab";
import GuideTab from "./GuideTab";
import { useSandboxKey } from "./useSandboxKey";

function ScalarLoading() {
  const { pick } = useLang();

  return (
    <div role="status" className="card flex items-center gap-2 text-sm text-zinc-500">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {pick("Đang tải công cụ thử API…", "Loading the API client…")}
    </div>
  );
}

const ScalarPanel = dynamic(() => import("./ScalarPanel"), {
  ssr: false,
  loading: () => <ScalarLoading />,
});

type Tab = "guide" | "endpoints" | "database" | "client";

const TAB_KEY = "sandbox:tab";
interface Summary {
  resets_at: string;
  counts: Record<string, number>;
}

/** Scalar's in-page address for one operation: #tag/<tag>/<METHOD><path>. */
function scalarHash(op: Operation): string {
  return `#tag/${op.tag.toLowerCase()}/${op.method}${op.path}`;
}

function useCountdown(target: string | null): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);

    return () => clearInterval(timer);
  }, []);

  if (!target) return "";

  const minutes = Math.max(0, Math.round((new Date(target).getTime() - now) / 60_000));

  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export default function ApiPractice({
  operations,
  mistakes,
}: {
  operations: Record<string, WorkedExample>;
  mistakes: Record<string, WorkedExample>;
}) {
  const { pick, lang } = useLang();
  const [tab, setTab] = useState<Tab>("guide");
  const { key: apiKey, error: keyError, scope, retry: retryKey } = useSandboxKey();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  // The client stays mounted once opened (it holds the learner's typed token);
  // bumping this remounts it so a deep link to one operation takes effect.
  const [clientOpened, setClientOpened] = useState(false);
  const [clientRun, setClientRun] = useState(0);
  const countdown = useCountdown(summary?.resets_at ?? null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TAB_KEY);
      // "swagger" is the tab's name from before the switch to Scalar.
      const saved = (stored === "swagger" ? "client" : stored) as Tab | null;

      if (saved && ["guide", "endpoints", "database", "client"].includes(saved)) {
        setTab(saved);

        if (saved === "client") setClientOpened(true);
      }
    } catch {
      // No storage: start on the guide.
    }
  }, []);

  const choose = useCallback((next: Tab) => {
    setTab(next);

    if (next === "client") setClientOpened(true);

    try {
      window.localStorage.setItem(TAB_KEY, next);
    } catch {
      // Remembering the tab is a convenience only.
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!apiKey) return;

    try {
      const res = await fetch(`${API_BASE_PATH}/sandbox`, { headers: { [SANDBOX_KEY_HEADER]: apiKey } });

      if (res.ok) setSummary(await res.json());
    } catch {
      // The summary is informational; the rest of the page works without it.
    }
  }, [apiKey]);

  useEffect(() => {
    void refresh();
  }, [refresh, tab]);

  const reset = async () => {
    if (!apiKey) return;

    const ok = window.confirm(
      pick(
        "Đưa sandbox về dữ liệu mẫu? Mọi thứ bạn đã tạo, sửa hoặc xoá sẽ mất.",
        "Reset your sandbox to the sample data? Everything you created, changed or deleted will be lost."
      )
    );

    if (!ok) return;

    setResetting(true);
    setResetFailed(false);

    try {
      const res = await fetch(`${API_BASE_PATH}/sandbox/reset`, { method: "POST", headers: { [SANDBOX_KEY_HEADER]: apiKey } });

      if (!res.ok) setResetFailed(true);

      await refresh();
    } catch {
      setResetFailed(true);
    } finally {
      setResetting(false);
    }
  };

  const copyKey = async () => {
    if (!apiKey) return;

    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setShowKey(true);
    }
  };

  const tryInClient = (op: Operation) => {
    window.history.replaceState(null, "", scalarHash(op));
    setClientRun((n) => n + 1);
    choose("client");
    window.scrollTo({ top: 0 });
  };

  const openOperation = (id: string) => {
    choose("endpoints");

    // Wait a frame for the tab to render, then open and reveal the card.
    requestAnimationFrame(() => {
      const card = document.getElementById(`op-${id}`) as HTMLDetailsElement | null;

      if (card) {
        card.open = true;
        card.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const tabs: [Tab, string][] = [
    ["guide", pick("Bắt đầu", "Start here")],
    ["endpoints", pick("API & ví dụ", "Endpoints & examples")],
    ["database", pick("Cơ sở dữ liệu", "Database")],
    ["client", pick("Thử API (Scalar)", "Try it (Scalar)")],
  ];

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };

    if (!(event.key in keys)) return;

    event.preventDefault();

    const next = tabs[(keys[event.key] + tabs.length) % tabs.length][0];

    choose(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={cn("space-y-5", tab === "client" ? "max-w-6xl" : "max-w-5xl")}>
      <div>
        <h1 className="text-2xl font-bold">{pick("Luyện tập API", "API Practice")}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
          {pick(
            "API cửa hàng sách thật để bạn gọi thử: đọc hiểu request/response, đăng nhập lấy token, đặt hàng, thanh toán. Dữ liệu là của riêng bạn và tự làm mới mỗi ngày.",
            "A real bookstore API to call: read requests and responses, log in for a token, place orders, pay. The data is yours alone and refreshes every day."
          )}
        </p>
      </div>

      {/* The same API behind a real shop UI — the other half of the lesson. */}
      <Link
        href="/practice/api/web"
        className="card flex flex-wrap items-center gap-4 border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10 hover:border-orange-400 transition-colors"
      >
        <span className="text-3xl" aria-hidden="true">
          🛒
        </span>
        <span className="flex-1 min-w-[220px]">
          <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
            {pick("Mở cửa hàng web Hiên Sách", "Open the Hiên Sách web store")}
          </span>
          <span className="block text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            {pick(
              "Một website bán sách thật chạy trên chính API này và sandbox của bạn: đăng ký, xem sách, giỏ hàng, đặt hàng, thanh toán. Mở DevTools → Network để xem từng request trang web gửi đi.",
              "A real bookshop website running on this very API and your sandbox: sign up, browse, cart, order, pay. Open DevTools → Network to watch every request the site sends."
            )}
          </span>
        </span>
        <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">{pick("Mở cửa hàng →", "Open the store →")}</span>
      </Link>

      <section className="card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{pick("Sandbox của bạn", "Your sandbox")}</h2>
            {apiKey ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="font-mono text-sm break-all">
                  {SANDBOX_KEY_HEADER}: {showKey ? apiKey : `${apiKey.slice(0, 7)}${"•".repeat(12)}${apiKey.slice(-4)}`}
                </code>
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  aria-pressed={showKey}
                  className="inline-flex items-center gap-1 px-1 py-2 -my-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                  {showKey ? pick("Ẩn key", "Hide key") : pick("Hiện key", "Show key")}
                </button>
                <button
                  type="button"
                  onClick={copyKey}
                  className="inline-flex items-center gap-1 px-1 py-2 -my-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span aria-live="polite">{copied ? pick("Đã copy", "Copied") : pick("Copy key", "Copy key")}</span>
                </button>
              </div>
            ) : (
              keyError ? (
                <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <span>
                    {pick(`Không lấy được key (${keyError}). Hãy đăng nhập rồi thử lại.`, `Couldn't get a key (${keyError}). Sign in, then try again.`)}
                  </span>
                  <button
                    type="button"
                    onClick={retryKey}
                    className="btn-secondary text-xs inline-flex items-center gap-1.5 px-3 py-1.5"
                  >
                    <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                    {pick("Thử lại", "Retry")}
                  </button>
                </div>
              ) : (
                <p role="status" className="flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {pick("Đang tạo key…", "Creating your key…")}
                </p>
              )
            )}
            <p className="text-xs text-zinc-500">
              {scope === "browser"
                ? pick("Key gắn với trình duyệt này (bạn chưa đăng nhập).", "This key belongs to this browser (you're not signed in).")
                : pick("Key gắn với tài khoản của bạn — mở trên máy khác vẫn là sandbox này. Đừng chia sẻ key.", "This key belongs to your account — the same sandbox on every device. Don't share it.")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {countdown && (
              <div className="text-right text-xs text-zinc-500">
                <div>{pick("Tự làm mới sau", "Resets in")}</div>
                <div className="font-mono text-sm text-zinc-800 dark:text-zinc-200">{countdown}</div>
              </div>
            )}
            <button
              type="button"
              onClick={reset}
              disabled={!apiKey || resetting}
              aria-busy={resetting}
              className="btn-secondary text-sm inline-flex items-center gap-2"
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              )}
              {resetting ? pick("Đang làm mới…", "Resetting…") : pick("Về dữ liệu mẫu", "Reset to sample data")}
            </button>
          </div>
        </div>

        {resetFailed && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {pick("Chưa làm mới được sandbox. Thử lại sau giây lát.", "Couldn't reset the sandbox. Try again in a moment.")}
          </p>
        )}

        {summary && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(summary.counts).map(([table, count]) => (
              <span key={table} className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                {table} <b className="text-zinc-900 dark:text-zinc-100">{count}</b>
              </span>
            ))}
          </div>
        )}
      </section>

      <div
        role="tablist"
        aria-label={pick("Phần luyện tập API", "API practice sections")}
        className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800"
      >
        {tabs.map(([id, label], index) => (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[id] = el;
            }}
            id={`sandbox-tab-${id}`}
            role="tab"
            type="button"
            aria-selected={tab === id}
            aria-controls={`sandbox-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => choose(id)}
            onKeyDown={(e) => onTabKeyDown(e, index)}
            className={cn(
              "whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === id
                ? "border-blue-600 text-blue-700 dark:text-blue-300"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "guide" && (
        <div role="tabpanel" id="sandbox-panel-guide" aria-labelledby="sandbox-tab-guide">
          <GuideTab operations={operations} mistakes={mistakes} apiKey={apiKey} openOperation={openOperation} openClient={() => choose("client")} />
        </div>
      )}

      {tab === "endpoints" && (
        <div role="tabpanel" id="sandbox-panel-endpoints" aria-labelledby="sandbox-tab-endpoints">
          <EndpointsTab examples={operations} apiKey={apiKey} onTry={tryInClient} />
        </div>
      )}

      {tab === "database" && (
        <div role="tabpanel" id="sandbox-panel-database" aria-labelledby="sandbox-tab-database">
          <DatabaseTab />
        </div>
      )}

      {clientOpened && (
        <div
          role="tabpanel"
          id="sandbox-panel-client"
          aria-labelledby="sandbox-tab-client"
          className={tab === "client" ? "space-y-3" : "hidden"}
        >
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {pick(
              "Key sandbox đã điền sẵn. Đăng nhập bằng POST /auth/login, rồi dán access_token vào ô Bearer Token trong phần Authentication để gọi các API cần đăng nhập hoặc chỉ dành cho admin.",
              "Your sandbox key is filled in. Log in with POST /auth/login, then paste the access_token into the Bearer Token box under Authentication to call the login-only and admin-only endpoints."
            )}
          </p>
          {apiKey ? (
            <ScalarPanel key={`${lang}-${clientRun}-${apiKey}`} apiKey={apiKey} lang={lang === "en" ? "en" : "vi"} />
          ) : (
            <div role="status" className="card flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {pick("Đang chờ key sandbox…", "Waiting for your sandbox key…")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
