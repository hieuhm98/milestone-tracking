"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/context/lang";
import { API_BASE_PATH, SANDBOX_KEY_HEADER, type Operation } from "@/lib/sandbox/catalog";
import type { WorkedExample } from "@/lib/sandbox/examples";
import { cn } from "@/lib/utils";
import DatabaseTab from "./DatabaseTab";
import EndpointsTab from "./EndpointsTab";
import GuideTab from "./GuideTab";
import { useSandboxKey } from "./useSandboxKey";

const ScalarPanel = dynamic(() => import("./ScalarPanel"), {
  ssr: false,
  loading: () => <div className="card text-sm text-zinc-500">Scalar…</div>,
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
  const { key: apiKey, error: keyError, scope } = useSandboxKey();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);
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

    setResetting(true);

    try {
      await fetch(`${API_BASE_PATH}/sandbox/reset`, { method: "POST", headers: { [SANDBOX_KEY_HEADER]: apiKey } });
      await refresh();
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

  return (
    <div className={cn("mx-auto space-y-5", tab === "client" ? "max-w-6xl" : "max-w-5xl")}>
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
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{pick("Sandbox của bạn", "Your sandbox")}</div>
            {apiKey ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="font-mono text-sm break-all">
                  {SANDBOX_KEY_HEADER}: {showKey ? apiKey : `${apiKey.slice(0, 7)}${"•".repeat(12)}${apiKey.slice(-4)}`}
                </code>
                <button type="button" onClick={() => setShowKey((s) => !s)} className="py-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  {showKey ? pick("Ẩn", "Hide") : pick("Hiện", "Show")}
                </button>
                <button type="button" onClick={copyKey} className="py-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  {copied ? pick("Đã copy ✓", "Copied ✓") : pick("Copy", "Copy")}
                </button>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                {keyError
                  ? pick(`Không lấy được key (${keyError}). Hãy đăng nhập rồi tải lại trang.`, `Couldn't get a key (${keyError}). Sign in, then reload.`)
                  : pick("Đang tạo key…", "Creating your key…")}
              </p>
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
            <button type="button" onClick={reset} disabled={!apiKey || resetting} className="btn-secondary text-sm disabled:opacity-50">
              {resetting ? pick("Đang làm mới…", "Resetting…") : pick("Về dữ liệu mẫu", "Reset to sample data")}
            </button>
          </div>
        </div>

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

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => choose(id)}
            className={cn(
              "whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
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
        <GuideTab operations={operations} mistakes={mistakes} apiKey={apiKey} openOperation={openOperation} openClient={() => choose("client")} />
      )}

      {tab === "endpoints" && <EndpointsTab examples={operations} apiKey={apiKey} onTry={tryInClient} />}

      {tab === "database" && <DatabaseTab />}

      {clientOpened && (
        <div className={tab === "client" ? "space-y-3" : "hidden"}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {pick(
              "Key sandbox đã điền sẵn. Đăng nhập bằng POST /auth/login, rồi dán access_token vào ô Bearer Token trong phần Authentication để gọi các API 🔑/👑.",
              "Your sandbox key is filled in. Log in with POST /auth/login, then paste the access_token into the Bearer Token box under Authentication to call 🔑/👑 endpoints."
            )}
          </p>
          {apiKey ? (
            <ScalarPanel key={`${lang}-${clientRun}-${apiKey}`} apiKey={apiKey} lang={lang === "en" ? "en" : "vi"} />
          ) : (
            <div className="card text-sm text-zinc-500">{pick("Đang chờ key sandbox…", "Waiting for your sandbox key…")}</div>
          )}
        </div>
      )}
    </div>
  );
}
