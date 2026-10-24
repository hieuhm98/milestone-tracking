"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { GENRE_LABEL, ORDER_STATUS_LABEL, STORE_BASE, StoreApiError, type Book, type Order } from "@/lib/store/client";
import { useStore } from "./StoreContext";

// Small building blocks shared by the web store's pages. The store has its own
// light, warm look (it plays a real shop), so these use plain colours rather
// than the app's dark: variants.

const COVER_TONES: Record<Book["genre"], string> = {
  fiction: "from-rose-500 to-orange-400",
  children: "from-amber-400 to-lime-400",
  history: "from-stone-600 to-amber-700",
  science: "from-sky-500 to-indigo-500",
  technology: "from-slate-700 to-cyan-600",
  business: "from-emerald-600 to-teal-500",
  self_help: "from-violet-500 to-fuchsia-400",
};

/** A drawn cover — the API has no images, and a real shop always shows one. */
export function BookCover({
  title,
  genre,
  author,
  size = "md",
}: {
  title: string;
  genre: Book["genre"];
  author?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "relative rounded-md bg-gradient-to-br text-white shadow-md overflow-hidden flex flex-col justify-between shrink-0",
        COVER_TONES[genre] ?? "from-zinc-500 to-zinc-700",
        size === "sm" && "w-12 h-16 p-1",
        size === "md" && "w-full aspect-[3/4] p-3",
        size === "lg" && "w-full max-w-[260px] aspect-[3/4] p-5"
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-y-0 left-0 w-2 bg-black/15" />
      {size !== "sm" && (
        <>
          <div className={cn("font-serif font-bold leading-tight drop-shadow-sm", size === "lg" ? "text-2xl" : "text-sm sm:text-base")}>
            {title}
          </div>
          {author && <div className={cn("opacity-90", size === "lg" ? "text-sm" : "text-[11px]")}>{author}</div>}
        </>
      )}
    </div>
  );
}

export function GenreTag({ genre }: { genre: Book["genre"] }) {
  const { pick } = useLang();
  const label = GENRE_LABEL[genre];

  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
      {label ? pick(label.vi, label.en) : genre}
    </span>
  );
}

const STATUS_TONE: Record<Order["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-sky-100 text-sky-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-stone-200 text-stone-600",
};

export function OrderStatus({ status }: { status: Order["status"] }) {
  const { pick } = useLang();

  return (
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", STATUS_TONE[status])}>
      {pick(ORDER_STATUS_LABEL[status].vi, ORDER_STATUS_LABEL[status].en)}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-stone-500 py-8 justify-center" role="status">
      <span className="h-4 w-4 rounded-full border-2 border-stone-300 border-t-orange-500 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

/** An API error, shown the way a shop would — plus the status and code, since this shop is for learning. */
export function ErrorNotice({ error, className }: { error: unknown; className?: string }) {
  const { pick } = useLang();

  if (!error) return null;

  const api = error instanceof StoreApiError ? error : null;
  const details = api?.details;

  return (
    <div className={cn("rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800", className)} role="alert">
      <div>{api ? api.message : pick("Không kết nối được tới máy chủ.", "Couldn't reach the server.")}</div>
      {api && (
        <div className="mt-1 font-mono text-[11px] text-red-600">
          HTTP {api.status} · {api.code}
          {Array.isArray(details) && details.length > 0 && <> · {JSON.stringify(details)}</>}
        </div>
      )}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900">{children}</h1>
      {sub && <p className="text-sm text-stone-500 mt-1">{sub}</p>}
    </div>
  );
}

/** Pages that need a shop login send the visitor to it, then back here. */
export function useRequireLogin(): boolean {
  const { user, ready } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) router.replace(`${STORE_BASE}/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, router, pathname]);

  return ready && Boolean(user);
}

export const card = "rounded-xl border border-stone-200 bg-white shadow-sm";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition-colors";
export const input =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";

/**
 * POST /cart/items, then show the new cart. Not logged in → the login page,
 * then back. Returns whether the book was added.
 */
export function useAddToCart() {
  const { api, user, setCart, notify } = useStore();
  const { pick } = useLang();
  const router = useRouter();
  const pathname = usePathname();

  return async (bookId: number, title: string, quantity = 1): Promise<boolean> => {
    if (!user || !api) {
      router.push(`${STORE_BASE}/login?next=${encodeURIComponent(pathname)}`);

      return false;
    }

    try {
      setCart(await api.post("/cart/items", { book_id: bookId, quantity }));
      notify(pick(`Đã thêm “${title}” vào giỏ.`, `Added “${title}” to your cart.`), "success");

      return true;
    } catch (error) {
      notify(error instanceof StoreApiError ? error.message : pick("Không thêm được vào giỏ.", "Couldn't add to cart."), "error");

      return false;
    }
  };
}
