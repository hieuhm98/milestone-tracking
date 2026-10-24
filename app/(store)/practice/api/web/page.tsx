"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { formatVnd, GENRE_LABEL, STORE_BASE, type Book, type ListResponse } from "@/lib/store/client";
import { useStore } from "@/components/store/StoreContext";
import { BookCover, ErrorNotice, Spinner, useAddToCart } from "@/components/store/ui";

// The shop's front page and catalogue: GET /books with the filters, sort and
// page taken from the URL (?q=&genre=&sort=&page=&in_stock=), so every view is
// a link — and each change is one GET request in DevTools.

const PAGE_SIZE = 8;

const SORTS = [
  { value: "", vi: "Nổi bật", en: "Featured" },
  { value: "-created_at", vi: "Mới nhập", en: "Newest" },
  { value: "price", vi: "Giá thấp → cao", en: "Price: low to high" },
  { value: "-price", vi: "Giá cao → thấp", en: "Price: high to low" },
  { value: "title", vi: "Tên A → Z", en: "Title A → Z" },
  { value: "-published_year", vi: "Xuất bản gần đây", en: "Recently published" },
];

export default function StoreHomePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Catalogue />
    </Suspense>
  );
}

function Catalogue() {
  const { pick } = useLang();
  const { api, authors } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const addToCart = useAddToCart();
  const [result, setResult] = useState<ListResponse<Book> | null>(null);
  const [error, setError] = useState<unknown>(null);

  const q = params.get("q") ?? "";
  const genre = params.get("genre") ?? "";
  const sort = params.get("sort") ?? "";
  const inStock = params.get("in_stock") === "true";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const browsing = !q && !genre && !inStock && page === 1;

  useEffect(() => {
    if (!api) return;

    let live = true;

    setError(null);
    api
      .get<ListResponse<Book>>("/books", { q, genre, sort, page, limit: PAGE_SIZE, in_stock: inStock ? "true" : undefined })
      .then((res) => live && setResult(res))
      .catch((e) => live && setError(e));

    return () => {
      live = false;
    };
  }, [api, q, genre, sort, page, inStock]);

  const go = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }

    if (!("page" in changes)) next.delete("page");

    const qs = next.toString();

    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const chip = (active: boolean) =>
    cn(
      "px-3 py-1.5 rounded-full text-sm border transition-colors whitespace-nowrap",
      active ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-stone-300 text-stone-700 hover:border-orange-400"
    );

  return (
    <div>
      {browsing && (
        <section className="mb-8 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-white p-6 sm:p-10 relative overflow-hidden">
          <div className="max-w-lg relative z-10">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-100">{pick("Sách hay mỗi ngày", "Good books, every day")}</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-serif font-bold leading-tight">
              {pick("Mỗi trang sách, một hiên nhà.", "Every page, a porch to sit on.")}
            </h1>
            <p className="mt-3 text-orange-50 text-sm sm:text-base">
              {pick(
                "Giao nhanh toàn quốc · Đổi trả trong 7 ngày · Thanh toán thẻ, ví điện tử hoặc khi nhận hàng.",
                "Fast nationwide delivery · 7-day returns · Pay by card, e-wallet or on delivery."
              )}
            </p>
          </div>
          <div className="absolute -right-10 -bottom-16 text-[180px] leading-none opacity-15 font-serif select-none" aria-hidden="true">
            📚
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold">
            {q ? pick(`Kết quả cho “${q}”`, `Results for “${q}”`) : genre ? pick(GENRE_LABEL[genre as Book["genre"]]?.vi ?? genre, GENRE_LABEL[genre as Book["genre"]]?.en ?? genre) : pick("Tất cả sách", "All books")}
          </h2>
          {result && (
            <p className="text-sm text-stone-500">{pick(`${result.meta.total} cuốn`, `${result.meta.total} books`)}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={inStock} onChange={(e) => go({ in_stock: e.target.checked ? "true" : null })} className="accent-orange-600" />
            {pick("Còn hàng", "In stock")}
          </label>
          <select
            value={sort}
            onChange={(e) => go({ sort: e.target.value || null })}
            aria-label={pick("Sắp xếp", "Sort")}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {pick(s.vi, s.en)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <button type="button" className={chip(!genre)} onClick={() => go({ genre: null })}>
          {pick("Tất cả", "All")}
        </button>
        {(Object.keys(GENRE_LABEL) as Book["genre"][]).map((g) => (
          <button key={g} type="button" className={chip(genre === g)} onClick={() => go({ genre: g })}>
            {pick(GENRE_LABEL[g].vi, GENRE_LABEL[g].en)}
          </button>
        ))}
      </div>

      <ErrorNotice error={error} className="mb-4" />

      {!result && !error && <Spinner />}

      {result && result.data.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
          {pick("Không tìm thấy sách nào phù hợp.", "No books match.")}
        </div>
      )}

      {result && result.data.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {result.data.map((book) => {
            const author = authors.get(book.author_id)?.name;

            return (
              <li key={book.id} className="group flex flex-col rounded-xl bg-white border border-stone-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                <Link href={`${STORE_BASE}/books/${book.id}`} className="block">
                  <BookCover title={book.title} genre={book.genre} author={author} />
                  <h3 className="mt-3 font-semibold text-sm leading-snug line-clamp-2 group-hover:text-orange-700">{book.title}</h3>
                  <p className="text-xs text-stone-500 mt-0.5 truncate">{author ?? "…"}</p>
                </Link>
                <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                  <span className="font-bold text-orange-700">{formatVnd(book.price)}</span>
                  {book.stock === 0 && <span className="text-[11px] text-stone-500">{pick("Hết hàng", "Sold out")}</span>}
                  {book.stock > 0 && book.stock <= 5 && (
                    <span className="text-[11px] text-red-600">{pick(`Còn ${book.stock}`, `${book.stock} left`)}</span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={book.stock === 0}
                  onClick={() => void addToCart(book.id, book.title)}
                  className="mt-2 rounded-lg border border-orange-600 text-orange-700 text-sm font-medium py-2 hover:bg-orange-600 hover:text-white disabled:border-stone-300 disabled:text-stone-400 disabled:hover:bg-transparent transition-colors"
                >
                  {book.stock === 0 ? pick("Tạm hết hàng", "Out of stock") : pick("Thêm vào giỏ", "Add to cart")}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {result && result.meta.total_pages > 1 && (
        <nav className="flex items-center justify-center gap-2 mt-8" aria-label={pick("Phân trang", "Pagination")}>
          <button type="button" disabled={page <= 1} onClick={() => go({ page: String(page - 1) })} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm disabled:opacity-40">
            ←
          </button>
          {Array.from({ length: result.meta.total_pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => go({ page: n === 1 ? null : String(n) })}
              aria-current={n === page ? "page" : undefined}
              className={cn("h-9 min-w-9 rounded-lg px-3 text-sm border", n === page ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-stone-300 hover:border-orange-400")}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= result.meta.total_pages}
            onClick={() => go({ page: String(page + 1) })}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm disabled:opacity-40"
          >
            →
          </button>
        </nav>
      )}
    </div>
  );
}
