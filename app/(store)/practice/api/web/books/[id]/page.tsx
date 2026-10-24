"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLang } from "@/context/lang";
import { formatVnd, STORE_BASE, type Author, type Book, type ListResponse } from "@/lib/store/client";
import { useStore } from "@/components/store/StoreContext";
import { BookCover, btnPrimary, ErrorNotice, GenreTag, Spinner, useAddToCart } from "@/components/store/ui";

// One book: GET /books/{id}, then its author (GET /authors/{id}) and more of
// their books (GET /authors/{id}/books) — three requests, the second and
// third depending on the first, as a real product page often does.

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const { pick } = useLang();
  const { api } = useStore();
  const addToCart = useAddToCart();
  const [book, setBook] = useState<Book | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [more, setMore] = useState<Book[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!api) return;

    let live = true;

    setBook(null);
    setError(null);

    (async () => {
      try {
        const b = await api.get<Book>(`/books/${id}`);

        if (!live) return;

        setBook(b);

        const [a, list] = await Promise.all([
          api.get<Author>(`/authors/${b.author_id}`),
          api.get<ListResponse<Book>>(`/authors/${b.author_id}/books`, { limit: 5 }),
        ]);

        if (!live) return;

        setAuthor(a);
        setMore(list.data.filter((x) => x.id !== b.id).slice(0, 4));
      } catch (e) {
        if (live) setError(e);
      }
    })();

    return () => {
      live = false;
    };
  }, [api, id]);

  if (error) {
    return (
      <div className="max-w-xl">
        <ErrorNotice error={error} />
        <Link href={STORE_BASE} className="inline-block mt-4 text-sm text-orange-700 hover:underline">
          {pick("← Về trang sách", "← Back to the books")}
        </Link>
      </div>
    );
  }

  if (!book) return <Spinner />;

  const max = Math.min(book.stock, 20);

  const add = async () => {
    setAdding(true);
    await addToCart(book.id, book.title, quantity);
    setAdding(false);
  };

  return (
    <div>
      <nav className="text-sm text-stone-500 mb-4" aria-label="Breadcrumb">
        <Link href={STORE_BASE} className="hover:text-orange-700">
          {pick("Sách", "Books")}
        </Link>{" "}
        / <span className="text-stone-700">{book.title}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <div className="flex justify-center md:block">
          <BookCover title={book.title} genre={book.genre} author={author?.name} size="lg" />
        </div>

        <div>
          <GenreTag genre={book.genre} />
          <h1 className="mt-2 text-3xl font-serif font-bold leading-tight">{book.title}</h1>
          <p className="mt-1 text-stone-600">
            {pick("Tác giả", "By")} <span className="font-medium text-stone-800">{author?.name ?? "…"}</span>
          </p>

          <div className="mt-5 text-3xl font-bold text-orange-700">{formatVnd(book.price)}</div>
          <p className={book.stock > 5 ? "text-sm text-emerald-700 mt-1" : "text-sm text-red-600 mt-1"}>
            {book.stock === 0
              ? pick("Tạm hết hàng", "Out of stock")
              : book.stock <= 5
                ? pick(`Chỉ còn ${book.stock} cuốn`, `Only ${book.stock} left`)
                : pick("Còn hàng", "In stock")}
          </p>

          {book.stock > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-lg border border-stone-300 bg-white">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 text-lg" aria-label={pick("Giảm", "Decrease")}>
                  −
                </button>
                <span className="w-10 text-center font-medium" aria-live="polite">
                  {quantity}
                </span>
                <button type="button" onClick={() => setQuantity(Math.min(max, quantity + 1))} className="px-3 py-2 text-lg" aria-label={pick("Tăng", "Increase")}>
                  +
                </button>
              </div>
              <button type="button" onClick={add} disabled={adding} className={btnPrimary}>
                {adding ? pick("Đang thêm…", "Adding…") : pick("Thêm vào giỏ hàng", "Add to cart")}
              </button>
            </div>
          )}

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm max-w-md">
            <dt className="text-stone-500">ISBN</dt>
            <dd className="font-mono">{book.isbn}</dd>
            <dt className="text-stone-500">{pick("Năm xuất bản", "Published")}</dt>
            <dd>{book.published_year ?? "—"}</dd>
            <dt className="text-stone-500">{pick("Quốc gia tác giả", "Author's country")}</dt>
            <dd>{author?.country ?? "—"}</dd>
          </dl>

          {author?.bio && (
            <div className="mt-6 rounded-xl bg-white border border-stone-200 p-4 text-sm text-stone-700">
              <div className="font-semibold mb-1">{pick("Về tác giả", "About the author")}</div>
              {author.bio}
            </div>
          )}
        </div>
      </div>

      {more.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-serif font-bold mb-4">{pick(`Sách khác của ${author?.name}`, `More by ${author?.name}`)}</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {more.map((b) => (
              <li key={b.id}>
                <Link href={`${STORE_BASE}/books/${b.id}`} className="block rounded-xl bg-white border border-stone-200 p-3 hover:shadow-md transition-shadow">
                  <BookCover title={b.title} genre={b.genre} author={author?.name} />
                  <div className="mt-2 text-sm font-semibold line-clamp-2">{b.title}</div>
                  <div className="text-sm text-orange-700 font-bold mt-1">{formatVnd(b.price)}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
