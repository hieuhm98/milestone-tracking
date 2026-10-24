"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/context/lang";
import {
  type Cart,
  formatVnd,
  PAYMENT_METHOD_LABEL,
  STORE_BASE,
  StoreApiError,
  type OrderWithItems,
  type Payment,
  type PublicUser,
} from "@/lib/store/client";
import { useStore } from "@/components/store/StoreContext";
import { BookCover, btnPrimary, card, ErrorNotice, input, PageTitle, Spinner, useRequireLogin } from "@/components/store/ui";

// Checkout is three requests in a row — the flow to watch in DevTools:
//   1. POST /orders     items from the cart → a pending order (stock is taken)
//   2. DELETE /cart     the order holds the items now; the client empties the cart
//   3. POST /payments   amount = order.total_amount. 201 → paid + invoice;
//                       402 (simulated decline) → the order stays pending and
//                       can be paid again from its page.

type Step = "idle" | "order" | "cart" | "payment";

const METHODS = Object.keys(PAYMENT_METHOD_LABEL) as Payment["method"][];

export default function CheckoutPage() {
  const { pick } = useLang();
  const allowed = useRequireLogin();
  const { api, cart, refreshCart, setCart, authors, notify } = useStore();
  const router = useRouter();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<Payment["method"]>("card");
  const [decline, setDecline] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<unknown>(null);
  // What was ordered, kept while the cart is emptied and the payment runs.
  const [frozen, setFrozen] = useState<Cart | null>(null);

  useEffect(() => {
    if (!allowed || !api) return;

    void refreshCart();
    api
      .get<PublicUser>("/auth/me")
      .then((user) => {
        setMe(user);
        setAddress((current) => current || user.address || "");
      })
      .catch(setError);
  }, [allowed, api, refreshCart]);

  if (!allowed || !cart || !me) return error ? <ErrorNotice error={error} /> : <Spinner />;

  if (cart.items.length === 0 && step === "idle") {
    return (
      <div className="text-center py-12">
        <p className="text-stone-600">{pick("Giỏ hàng trống — chưa có gì để đặt.", "Your cart is empty — nothing to order.")}</p>
        <Link href={STORE_BASE} className={`${btnPrimary} mt-4`}>
          {pick("Xem sách", "Browse books")}
        </Link>
      </div>
    );
  }

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!api) return;

    setError(null);
    setFrozen(cart);

    let order: OrderWithItems;

    try {
      setStep("order");
      order = await api.post<OrderWithItems>("/orders", {
        items: cart.items.map((i) => ({ book_id: i.book_id, quantity: i.quantity })),
        shipping_address: address.trim(),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
    } catch (err) {
      setStep("idle");
      setError(err);

      return;
    }

    // From here the order exists, so whatever happens next we go to its page.
    try {
      setStep("cart");
      await api.del("/cart");
      setCart({ items: [], item_count: 0, subtotal: 0 });
    } catch {
      // A cart that failed to empty is a nuisance, not a failed order.
    }

    try {
      setStep("payment");
      await api.post("/payments", { order_id: order.id, amount: order.total_amount, method, ...(decline ? { simulate_failure: true } : {}) });
      router.push(`${STORE_BASE}/orders/${order.id}?placed=1`);
    } catch (err) {
      const declined = err instanceof StoreApiError && err.status === 402;

      notify(
        declined
          ? pick("Thanh toán bị từ chối — đơn hàng vẫn được giữ, bạn có thể thanh toán lại.", "Payment declined — your order is saved, you can pay again.")
          : pick("Đã tạo đơn nhưng thanh toán lỗi — hãy thử lại trong trang đơn hàng.", "Order created, but payment failed — retry from the order page."),
        "error"
      );
      router.push(`${STORE_BASE}/orders/${order.id}?payment=failed`);
    }
  };

  const busy = step !== "idle";
  const shown = (busy && frozen) || cart;
  const stepLabel: Record<Step, string> = {
    idle: pick("Đặt hàng", "Place order"),
    order: pick("Đang tạo đơn… (POST /orders)", "Creating order… (POST /orders)"),
    cart: pick("Đang dọn giỏ… (DELETE /cart)", "Emptying cart… (DELETE /cart)"),
    payment: pick("Đang thanh toán… (POST /payments)", "Paying… (POST /payments)"),
  };

  return (
    <div>
      <PageTitle>{pick("Thanh toán", "Checkout")}</PageTitle>

      <form onSubmit={placeOrder} className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <div className="space-y-6">
          <section className={`${card} p-5`}>
            <h2 className="font-semibold">{pick("1. Giao hàng", "1. Delivery")}</h2>
            <div className="mt-3 text-sm text-stone-600">
              {me.full_name}
              {me.phone ? ` · ${me.phone}` : ""}
            </div>
            <label className="block mt-4">
              <span className="text-sm font-medium text-stone-700">{pick("Địa chỉ nhận hàng", "Shipping address")}</span>
              <input required minLength={5} value={address} onChange={(e) => setAddress(e.target.value)} className={`${input} mt-1`} autoComplete="street-address" />
            </label>
            <label className="block mt-4">
              <span className="text-sm font-medium text-stone-700">{pick("Ghi chú cho shop (không bắt buộc)", "Note for the shop (optional)")}</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className={`${input} mt-1`} placeholder={pick("Ví dụ: giao giờ hành chính", "e.g. deliver during office hours")} />
            </label>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="font-semibold">{pick("2. Phương thức thanh toán", "2. Payment method")}</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {METHODS.map((m) => (
                <label
                  key={m}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm cursor-pointer ${method === m ? "border-orange-500 bg-orange-50" : "border-stone-300 bg-white"}`}
                >
                  <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="accent-orange-600" />
                  {pick(PAYMENT_METHOD_LABEL[m].vi, PAYMENT_METHOD_LABEL[m].en)}
                </label>
              ))}
            </div>
            <label className="mt-4 flex items-start gap-2 rounded-lg bg-stone-100 px-3 py-2.5 text-xs text-stone-600">
              <input type="checkbox" checked={decline} onChange={(e) => setDecline(e.target.checked)} className="mt-0.5 accent-orange-600" />
              <span>
                🧪{" "}
                {pick(
                  "Giả lập thanh toán bị từ chối — gửi \"simulate_failure\": true, API trả 402 và đơn vẫn ở trạng thái chờ thanh toán.",
                  "Simulate a declined payment — sends \"simulate_failure\": true; the API answers 402 and the order stays awaiting payment."
                )}
              </span>
            </label>
          </section>
        </div>

        <aside className={`${card} p-5 lg:sticky lg:top-24`}>
          <h2 className="font-semibold">{pick("Đơn hàng của bạn", "Your order")}</h2>
          <ul className="mt-3 space-y-3 max-h-72 overflow-auto">
            {shown.items.map((line) => (
              <li key={line.id} className="flex gap-3 text-sm">
                <BookCover title={line.book.title} genre={line.book.genre} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium line-clamp-2">{line.book.title}</div>
                  <div className="text-xs text-stone-500">
                    {authors.get(line.book.author_id)?.name} · ×{line.quantity}
                  </div>
                </div>
                <div className="whitespace-nowrap">{formatVnd(line.line_total)}</div>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-stone-200 pt-3 flex justify-between font-bold">
            <span>{pick("Tổng cộng", "Total")}</span>
            <span className="text-orange-700">{formatVnd(shown.subtotal)}</span>
          </div>

          <ErrorNotice error={error} className="mt-4" />

          <button type="submit" disabled={busy || shown.items.length === 0} className={`${btnPrimary} w-full mt-4`}>
            {stepLabel[step]}
          </button>
          <p className="mt-2 text-[11px] text-stone-500 text-center">
            {pick("Giá và tổng tiền do server tính lại — client không gửi giá.", "The server recomputes prices and the total — the client never sends them.")}
          </p>
        </aside>
      </form>
    </div>
  );
}
