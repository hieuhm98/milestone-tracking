"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { DEMO_LOGINS, STORE_BASE, type ApiLogEntry } from "@/lib/store/client";
import { useStore } from "./StoreContext";

/** The frame around every store page: a "this is a practice app" bar, the shop header, the API log, a footer. */
export function StoreShell({ children }: { children: React.ReactNode }) {
  const { pick, lang, setLang } = useLang();
  const { user, cart, logout, keyError, toast, log } = useStore();
  const [logOpen, setLogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => setMenuOpen(false), [pathname]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `${STORE_BASE}?q=${encodeURIComponent(query.trim())}` : STORE_BASE);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900" style={{ colorScheme: "light" }}>
      {/* Practice bar — the only part that isn't the shop. */}
      <div className="bg-stone-900 text-stone-200 text-xs">
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            🧪{" "}
            {pick(
              "Cửa hàng mẫu cho bài Luyện tập API. Mở DevTools (F12) → tab Network, lọc Fetch/XHR để xem từng request.",
              "A practice shop for the API lessons. Open DevTools (F12) → Network, filter Fetch/XHR to watch every request."
            )}
          </span>
          <span className="flex items-center gap-3 ml-auto">
            <button type="button" onClick={() => setLogOpen(true)} className="underline hover:text-white">
              {pick(`API log (${log.length})`, `API log (${log.length})`)}
            </button>
            <Link href="/practice/api" className="underline hover:text-white">
              {pick("← Luyện tập API", "← API practice")}
            </Link>
            <button
              type="button"
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="rounded border border-stone-600 px-1.5 py-0.5 hover:bg-stone-800"
              aria-label={pick("Đổi ngôn ngữ", "Switch language")}
            >
              {lang === "vi" ? "EN" : "VI"}
            </button>
          </span>
        </div>
      </div>

      {/* Shop header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3 sm:gap-6">
          <Link href={STORE_BASE} className="flex items-center gap-2 shrink-0">
            <span className="h-9 w-9 rounded-lg bg-orange-600 text-white flex items-center justify-center font-serif text-lg font-bold">H</span>
            <span className="hidden sm:block leading-tight">
              <span className="block font-serif font-bold text-lg text-stone-900">Hiên Sách</span>
              <span className="block text-[11px] uppercase tracking-widest text-stone-400">Bookstore</span>
            </span>
          </Link>

          <form onSubmit={search} className="flex-1 min-w-0" role="search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={pick("Tìm tên sách, ISBN…", "Search titles, ISBN…")}
              aria-label={pick("Tìm sách", "Search books")}
              className="w-full rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
          </form>

          <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
            {user && (
              <Link href={`${STORE_BASE}/orders`} className="hidden md:block px-2 py-2 text-sm text-stone-600 hover:text-orange-700">
                {pick("Đơn hàng", "Orders")}
              </Link>
            )}
            <Link
              href={`${STORE_BASE}/cart`}
              className="relative p-2 rounded-lg text-stone-700 hover:bg-stone-100"
              aria-label={pick(`Giỏ hàng, ${cart?.item_count ?? 0} sản phẩm`, `Cart, ${cart?.item_count ?? 0} items`)}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9.5" cy="20" r="1.3" />
                <circle cx="17.5" cy="20" r="1.3" />
              </svg>
              {(cart?.item_count ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-orange-600 text-white text-[11px] font-bold flex items-center justify-center px-1">
                  {cart!.item_count}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-expanded={menuOpen}
                  className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-stone-100"
                >
                  <span className="h-8 w-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-semibold">
                    {user.full_name.trim().split(/\s+/).pop()?.[0]?.toUpperCase()}
                  </span>
                  <span className="hidden lg:block text-sm text-stone-700 max-w-[140px] truncate">{user.full_name}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl border border-stone-200 bg-white shadow-lg py-1 text-sm z-40">
                    <div className="px-4 py-2 text-xs text-stone-500 truncate">{user.email}</div>
                    <Link href={`${STORE_BASE}/account`} className="block px-4 py-2 hover:bg-stone-50">
                      {pick("Tài khoản của tôi", "My account")}
                    </Link>
                    <Link href={`${STORE_BASE}/orders`} className="block px-4 py-2 hover:bg-stone-50">
                      {pick("Đơn hàng của tôi", "My orders")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        router.push(STORE_BASE);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-stone-50 text-red-700"
                    >
                      {pick("Đăng xuất", "Log out")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href={`${STORE_BASE}/login`} className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                {pick("Đăng nhập", "Log in")}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {keyError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            {pick(
              `Không lấy được khoá sandbox (${keyError}). Hãy đăng nhập vào trang học rồi tải lại.`,
              `Couldn't get your sandbox key (${keyError}). Sign in to the learning site, then reload.`
            )}
          </div>
        ) : (
          children
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-4 py-6 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="font-serif font-bold text-stone-800 text-sm">Hiên Sách</div>
            <p className="mt-1">
              {pick(
                "Một cửa hàng giả lập chạy trên sandbox API riêng của bạn. Dữ liệu tự quay về mẫu ban đầu lúc 00:00 (giờ Việt Nam).",
                "A pretend shop running on your private API sandbox. The data returns to the sample set at 00:00 (Vietnam time)."
              )}
            </p>
          </div>
          <div>
            <div className="font-semibold text-stone-700">{pick("Tài khoản mẫu", "Demo accounts")}</div>
            {DEMO_LOGINS.map((d) => (
              <div key={d.email} className="font-mono mt-0.5">
                {d.email} / {d.password}
              </div>
            ))}
          </div>
        </div>
      </footer>

      {toast && (
        <div
          role="status"
          className={cn(
            "fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-2.5 text-sm shadow-lg max-w-[90vw]",
            toast.tone === "success" && "bg-emerald-600 text-white",
            toast.tone === "error" && "bg-red-600 text-white",
            toast.tone === "info" && "bg-stone-800 text-white"
          )}
        >
          {toast.text}
        </div>
      )}

      <button
        type="button"
        onClick={() => setLogOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-stone-900 text-white text-xs font-mono px-3 py-2 shadow-lg hover:bg-stone-800"
      >
        {"{ }"} API · {log.length}
      </button>

      {logOpen && <ApiLog onClose={() => setLogOpen(false)} />}
    </div>
  );
}

const METHOD_TONE: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-sky-400",
  PATCH: "text-amber-400",
  PUT: "text-amber-400",
  DELETE: "text-rose-400",
};

/** The store's own request log — for anyone without DevTools (phones), and to see bodies side by side. */
function ApiLog({ onClose }: { onClose: () => void }) {
  const { pick } = useLang();
  const { log, clearLog } = useStore();
  const [open, setOpen] = useState<number | null>(log[0]?.id ?? null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose} role="dialog" aria-modal="true" aria-label="API log">
      <div className="h-full w-full max-w-xl bg-stone-950 text-stone-200 flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
          <div>
            <div className="font-semibold">API log</div>
            <div className="text-[11px] text-stone-400">
              {pick("Các request trang này đã gửi — giống tab Network của DevTools.", "Requests this page has sent — like DevTools' Network tab.")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={clearLog} className="text-xs rounded border border-stone-700 px-2 py-1 hover:bg-stone-800">
              {pick("Xoá", "Clear")}
            </button>
            <button type="button" onClick={onClose} className="text-lg px-2" aria-label={pick("Đóng", "Close")}>
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto font-mono text-xs">
          {log.length === 0 && <p className="p-4 text-stone-500">{pick("Chưa có request nào.", "No requests yet.")}</p>}
          {log.map((entry) => (
            <LogRow key={entry.id} entry={entry} open={open === entry.id} onToggle={() => setOpen(open === entry.id ? null : entry.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LogRow({ entry, open, onToggle }: { entry: ApiLogEntry; open: boolean; onToggle: () => void }) {
  const ok = entry.status < 400;

  return (
    <div className="border-b border-stone-800">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-stone-900">
        <span className={cn("w-12 shrink-0 font-bold", METHOD_TONE[entry.method])}>{entry.method}</span>
        <span className="flex-1 min-w-0 truncate">{entry.url.replace("/api/sandbox/v1", "")}</span>
        <span className={cn("shrink-0 font-bold", ok ? "text-emerald-400" : "text-rose-400")}>{entry.status}</span>
        <span className="shrink-0 w-12 text-right text-stone-500">{entry.ms} ms</span>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2 text-[11px]">
          <div className="text-stone-400 break-all">{entry.url}</div>
          <div>
            <div className="text-stone-500 uppercase tracking-wider text-[11px] mb-0.5">Request headers</div>
            {entry.requestHeaders.map(([name, value]) => (
              <div key={name} className="break-all">
                <span className="text-sky-300">{name}</span>: {value}
              </div>
            ))}
          </div>
          {entry.requestBody !== undefined && (
            <div>
              <div className="text-stone-500 uppercase tracking-wider text-[11px] mb-0.5">Request body</div>
              <pre className="whitespace-pre-wrap break-all bg-stone-900 rounded p-2">{JSON.stringify(entry.requestBody, null, 2)}</pre>
            </div>
          )}
          <div>
            <div className="text-stone-500 uppercase tracking-wider text-[11px] mb-0.5">Response · {entry.status}</div>
            <pre className="whitespace-pre-wrap break-all bg-stone-900 rounded p-2 max-h-72 overflow-auto">
              {entry.responseBody === undefined ? "(no body)" : JSON.stringify(entry.responseBody, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
