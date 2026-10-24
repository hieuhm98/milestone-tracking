"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import {
  formatVnd,
  PAYMENT_METHOD_LABEL,
  STORE_BASE,
  StoreApiError,
  type Book,
  type Invoice,
  type ListResponse,
  type OrderWithItems,
  type Payment,
} from "@/lib/store/client";
import { useStore } from "@/components/store/StoreContext";
import { BookCover, btnPrimary, btnSecondary, card, ErrorNotice, OrderStatus, Spinner, useRequireLogin } from "@/components/store/ui";

// One order: GET /orders/{id}, its payments (GET /payments?order_id=) and
// invoice (GET /invoices?order_id=), and one GET /books/{id} per book — the
// order lines only carry book_id, so a page like this fans out into several
// requests (watch them run in parallel in DevTools).
// A pending order can be paid (POST /payments) or cancelled (PATCH status).

const STEPS = ["pending", "paid", "shipped", "delivered"] as const;
const METHODS = Object.keys(PAYMENT_METHOD_LABEL) as Payment["method"][];

export default function OrderPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <OrderDetail />
    </Suspense>
  );
}

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const { pick } = useLang();
  const allowed = useRequireLogin();
  const { api, notify } = useStore();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [books, setBooks] = useState<Map<number, Book>>(new Map());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [method, setMethod] = useState<Payment["method"]>("card");
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);

  const load = useCallback(async () => {
    if (!api) return;

    try {
      const o = await api.get<OrderWithItems>(`/orders/${id}`);
      const bookIds = Array.from(new Set(o.items.map((i) => i.book_id)));
      const [list, pays, invs] = await Promise.all([
        Promise.all(bookIds.map((bookId) => api.get<Book>(`/books/${bookId}`).catch(() => null))),
        api.get<ListResponse<Payment>>("/payments", { order_id: o.id, sort: "-created_at" }),
        api.get<ListResponse<Invoice>>("/invoices", { order_id: o.id }),
      ]);

      setOrder(o);
      setBooks(new Map(list.filter((b): b is Book => b !== null).map((b) => [b.id, b])));
      setPayments(pays.data);
      setInvoice(invs.data[0] ?? null);
    } catch (e) {
      setError(e);
    }
  }, [api, id]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  if (error) {
    return (
      <div className="max-w-xl">
        <ErrorNotice error={error} />
        <Link href={`${STORE_BASE}/orders`} className="inline-block mt-4 text-sm text-orange-700 hover:underline">
          {pick("← Đơn hàng của tôi", "← My orders")}
        </Link>
      </div>
    );
  }

  if (!allowed || !order) return <Spinner />;

  const pay = async (simulateFailure = false) => {
    if (!api) return;

    setBusy("pay");

    try {
      await api.post("/payments", { order_id: order.id, amount: order.total_amount, method, ...(simulateFailure ? { simulate_failure: true } : {}) });
      notify(pick("Thanh toán thành công!", "Payment successful!"), "success");
    } catch (e) {
      notify(e instanceof StoreApiError ? e.message : pick("Thanh toán lỗi.", "Payment failed."), "error");
    } finally {
      setBusy(null);
      await load();
    }
  };

  const cancel = async () => {
    if (!api || !window.confirm(pick("Huỷ đơn hàng này?", "Cancel this order?"))) return;

    setBusy("cancel");

    try {
      await api.patch(`/orders/${order.id}`, { status: "cancelled" });
      notify(pick("Đã huỷ đơn hàng.", "Order cancelled."), "info");
    } catch (e) {
      notify(e instanceof StoreApiError ? e.message : pick("Không huỷ được.", "Couldn't cancel."), "error");
    } finally {
      setBusy(null);
      await load();
    }
  };

  const placed = params.get("placed") === "1" && order.status !== "pending";
  const paymentFailed = params.get("payment") === "failed" && order.status === "pending";
  const stepIndex = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const date = (iso: string) => new Date(iso).toLocaleString(pick("vi-VN", "en-GB"), { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="max-w-4xl mx-auto">
      {placed && (
        <div className="mb-6 rounded-2xl bg-emerald-600 text-white p-6 sm:p-8 text-center">
          <div className="text-5xl" aria-hidden="true">
            ✓
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-serif font-bold">{pick("Đặt hàng thành công!", "Order placed!")}</h1>
          <p className="mt-2 text-emerald-50">
            {pick(
              `Cảm ơn bạn. Đơn #${order.id} đã được thanh toán và sẽ sớm được giao tới bạn.`,
              `Thank you. Order #${order.id} is paid and will be on its way soon.`
            )}
          </p>
          {invoice && <p className="mt-1 text-sm text-emerald-100">{pick(`Hoá đơn ${invoice.invoice_number}`, `Invoice ${invoice.invoice_number}`)}</p>}
        </div>
      )}

      {paymentFailed && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {pick(
            "Thanh toán bị từ chối (HTTP 402). Đơn hàng vẫn được giữ ở trạng thái chờ thanh toán — bạn có thể thanh toán lại bên dưới.",
            "The payment was declined (HTTP 402). Your order is kept, awaiting payment — you can pay again below."
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <Link href={`${STORE_BASE}/orders`} className="text-sm text-orange-700 hover:underline">
            {pick("← Đơn hàng của tôi", "← My orders")}
          </Link>
          <h2 className="text-2xl font-serif font-bold mt-1">{pick(`Đơn hàng #${order.id}`, `Order #${order.id}`)}</h2>
          <div className="text-sm text-stone-500">{date(order.created_at)}</div>
        </div>
        <OrderStatus status={order.status} />
      </div>

      {order.status !== "cancelled" && (
        <ol className="mb-6 grid grid-cols-4 gap-2 text-center text-xs" aria-label={pick("Tiến trình đơn hàng", "Order progress")}>
          {STEPS.map((s, i) => (
            <li key={s}>
              <div className={cn("h-1.5 rounded-full", i <= stepIndex ? "bg-orange-500" : "bg-stone-200")} />
              <div className={cn("mt-1.5", i <= stepIndex ? "text-stone-800 font-medium" : "text-stone-400")}>
                {
                  {
                    pending: pick("Đã đặt", "Placed"),
                    paid: pick("Đã thanh toán", "Paid"),
                    shipped: pick("Đang giao", "Shipped"),
                    delivered: pick("Đã nhận", "Delivered"),
                  }[s]
                }
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 md:grid-cols-[1fr_300px] items-start">
        <ul className={`${card} divide-y divide-stone-100`}>
          {order.items.map((item) => {
            const book = books.get(item.book_id);

            return (
              <li key={item.id} className="flex gap-4 p-4">
                {book && <BookCover title={book.title} genre={book.genre} size="sm" />}
                <div className="flex-1 min-w-0">
                  <Link href={`${STORE_BASE}/books/${item.book_id}`} className="font-medium hover:text-orange-700 line-clamp-2">
                    {book?.title ?? `#${item.book_id}`}
                  </Link>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {formatVnd(item.unit_price)} × {item.quantity}
                  </div>
                </div>
                <div className="font-semibold whitespace-nowrap">{formatVnd(item.line_total)}</div>
              </li>
            );
          })}
          <li className="flex justify-between p-4 font-bold">
            <span>{pick("Tổng cộng", "Total")}</span>
            <span className="text-orange-700">{formatVnd(order.total_amount)}</span>
          </li>
        </ul>

        <aside className="space-y-4">
          <div className={`${card} p-4 text-sm`}>
            <div className="font-semibold">{pick("Giao tới", "Ship to")}</div>
            <div className="text-stone-600 mt-1">{order.shipping_address}</div>
            {order.note && <div className="text-stone-500 mt-2 italic">“{order.note}”</div>}
          </div>

          {order.status === "pending" && (
            <div className={`${card} p-4 text-sm space-y-3`}>
              <div className="font-semibold">{pick("Thanh toán đơn này", "Pay for this order")}</div>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as Payment["method"])}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
                aria-label={pick("Phương thức", "Method")}
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {pick(PAYMENT_METHOD_LABEL[m].vi, PAYMENT_METHOD_LABEL[m].en)}
                  </option>
                ))}
              </select>
              <button type="button" disabled={busy !== null} onClick={() => pay()} className={`${btnPrimary} w-full`}>
                {busy === "pay" ? pick("Đang thanh toán…", "Paying…") : pick(`Thanh toán ${formatVnd(order.total_amount)}`, `Pay ${formatVnd(order.total_amount)}`)}
              </button>
              <button type="button" disabled={busy !== null} onClick={cancel} className={`${btnSecondary} w-full`}>
                {busy === "cancel" ? pick("Đang huỷ…", "Cancelling…") : pick("Huỷ đơn hàng", "Cancel order")}
              </button>
            </div>
          )}

          {invoice && (
            <div className={`${card} p-4 text-sm`}>
              <div className="font-semibold">{pick("Hoá đơn", "Invoice")}</div>
              <div className="font-mono mt-1">{invoice.invoice_number}</div>
              <div className="text-stone-500 mt-1">
                {formatVnd(invoice.amount)} · {invoice.status === "void" ? pick("Đã huỷ", "Void") : pick("Đã xuất", "Issued")}
              </div>
            </div>
          )}

          {payments.length > 0 && (
            <div className={`${card} p-4 text-sm`}>
              <div className="font-semibold">{pick("Lịch sử thanh toán", "Payment history")}</div>
              <ul className="mt-2 space-y-2">
                {payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span className="text-stone-600">
                      {pick(PAYMENT_METHOD_LABEL[p.method].vi, PAYMENT_METHOD_LABEL[p.method].en)}
                      <span className="block text-[11px] font-mono text-stone-400">{p.transaction_ref}</span>
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        p.status === "succeeded" ? "text-emerald-700" : p.status === "failed" ? "text-red-600" : "text-stone-500"
                      )}
                    >
                      {{ succeeded: pick("Thành công", "Succeeded"), failed: pick("Bị từ chối", "Declined"), refunded: pick("Đã hoàn tiền", "Refunded") }[p.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {placed && (
        <div className="mt-8 text-center">
          <Link href={STORE_BASE} className={btnPrimary}>
            {pick("Tiếp tục mua sắm", "Continue shopping")}
          </Link>
        </div>
      )}
    </div>
  );
}
