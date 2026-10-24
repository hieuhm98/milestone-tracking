"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { formatVnd, STORE_BASE, StoreApiError, type Cart, type CartLine } from "@/lib/store/client";
import { useStore } from "@/components/store/StoreContext";
import { BookCover, btnPrimary, btnSecondary, card, PageTitle, Spinner, useRequireLogin } from "@/components/store/ui";

// The cart lives on the server: GET /cart, PATCH /cart/items/{id} to change a
// quantity, DELETE /cart/items/{id} to drop a line (204, then a fresh GET), and
// DELETE /cart to empty it.

export default function CartPage() {
  const { pick } = useLang();
  const allowed = useRequireLogin();
  const { api, cart, setCart, refreshCart, authors, notify } = useStore();
  const [loaded, setLoaded] = useState(false);
  const [busyLine, setBusyLine] = useState<number | null>(null);

  useEffect(() => {
    if (!allowed) return;

    void refreshCart().then(() => setLoaded(true));
  }, [allowed, refreshCart]);

  if (!allowed || !loaded) return <Spinner />;

  const fail = (error: unknown) =>
    notify(error instanceof StoreApiError ? error.message : pick("Có lỗi xảy ra.", "Something went wrong."), "error");

  const setQuantity = async (line: CartLine, quantity: number) => {
    if (!api || quantity < 1) return;

    setBusyLine(line.id);

    try {
      setCart(await api.patch<Cart>(`/cart/items/${line.id}`, { quantity }));
    } catch (error) {
      fail(error);
    } finally {
      setBusyLine(null);
    }
  };

  const remove = async (line: CartLine) => {
    if (!api) return;

    setBusyLine(line.id);

    try {
      await api.del(`/cart/items/${line.id}`);
      // DELETE answers 204 with no body, so ask for the cart again.
      await refreshCart();
    } catch (error) {
      fail(error);
    } finally {
      setBusyLine(null);
    }
  };

  const clear = async () => {
    if (!api || !window.confirm(pick("Bỏ mọi sách khỏi giỏ?", "Remove every book from the cart?"))) return;

    try {
      await api.del("/cart");
      await refreshCart();
    } catch (error) {
      fail(error);
    }
  };

  const items = cart?.items ?? [];
  const blocked = items.some((i) => !i.in_stock);

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="text-6xl" aria-hidden="true">
          🛒
        </div>
        <h1 className="mt-4 text-2xl font-serif font-bold">{pick("Giỏ hàng đang trống", "Your cart is empty")}</h1>
        <p className="text-stone-500 mt-1">{pick("Chọn vài cuốn sách hay nhé.", "Go find a good book.")}</p>
        <Link href={STORE_BASE} className={`${btnPrimary} mt-6`}>
          {pick("Xem sách", "Browse books")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageTitle sub={pick(`${cart!.item_count} cuốn trong giỏ`, `${cart!.item_count} books in your cart`)}>
        {pick("Giỏ hàng", "Your cart")}
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        <ul className={`${card} divide-y divide-stone-100`}>
          {items.map((line) => (
            <li key={line.id} className="flex gap-4 p-4">
              <Link href={`${STORE_BASE}/books/${line.book_id}`}>
                <BookCover title={line.book.title} genre={line.book.genre} size="sm" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`${STORE_BASE}/books/${line.book_id}`} className="font-semibold hover:text-orange-700 line-clamp-2">
                  {line.book.title}
                </Link>
                <div className="text-xs text-stone-500">{authors.get(line.book.author_id)?.name}</div>
                <div className="text-sm text-stone-600 mt-1">{formatVnd(line.book.price)}</div>
                {!line.in_stock && (
                  <div className="text-xs text-red-600 mt-1">
                    {pick(`Chỉ còn ${line.book.stock} cuốn — hãy giảm số lượng.`, `Only ${line.book.stock} left — lower the quantity.`)}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-stone-300">
                    <button
                      type="button"
                      disabled={busyLine === line.id || line.quantity <= 1}
                      onClick={() => setQuantity(line, line.quantity - 1)}
                      className="px-2.5 py-1 disabled:opacity-40"
                      aria-label={pick("Giảm", "Decrease")}
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{line.quantity}</span>
                    <button
                      type="button"
                      disabled={busyLine === line.id}
                      onClick={() => setQuantity(line, line.quantity + 1)}
                      className="px-2.5 py-1 disabled:opacity-40"
                      aria-label={pick("Tăng", "Increase")}
                    >
                      +
                    </button>
                  </div>
                  <button type="button" disabled={busyLine === line.id} onClick={() => remove(line)} className="text-sm text-stone-500 hover:text-red-600">
                    {pick("Xoá", "Remove")}
                  </button>
                </div>
              </div>
              <div className="font-semibold text-right whitespace-nowrap">{formatVnd(line.line_total)}</div>
            </li>
          ))}
        </ul>

        <aside className={`${card} p-5 lg:sticky lg:top-24`}>
          <h2 className="font-semibold">{pick("Tóm tắt đơn hàng", "Order summary")}</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">{pick("Tạm tính", "Subtotal")}</dt>
              <dd>{formatVnd(cart!.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">{pick("Phí giao hàng", "Shipping")}</dt>
              <dd className="text-emerald-700">{pick("Miễn phí", "Free")}</dd>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-bold">
              <dt>{pick("Tổng cộng", "Total")}</dt>
              <dd className="text-orange-700">{formatVnd(cart!.subtotal)}</dd>
            </div>
          </dl>
          {blocked ? (
            <p className="mt-4 text-xs text-red-600">{pick("Có sách không đủ hàng.", "Some books don't have enough stock.")}</p>
          ) : null}
          <Link
            href={`${STORE_BASE}/checkout`}
            aria-disabled={blocked}
            className={`${btnPrimary} w-full mt-4 ${blocked ? "pointer-events-none opacity-50" : ""}`}
          >
            {pick("Tiến hành đặt hàng", "Proceed to checkout")}
          </Link>
          <div className="mt-3 flex justify-between text-sm">
            <Link href={STORE_BASE} className="text-orange-700 hover:underline">
              {pick("← Mua thêm", "← Keep shopping")}
            </Link>
            <button type="button" onClick={clear} className={`${btnSecondary} !px-2 !py-1 text-xs`}>
              {pick("Xoá hết", "Empty cart")}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
