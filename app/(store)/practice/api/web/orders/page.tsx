"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import { formatVnd, ORDER_STATUS_LABEL, STORE_BASE, type ListResponse, type Order, type OrderWithItems } from "@/lib/store/client";
import { useStore } from "@/components/store/StoreContext";
import { btnPrimary, card, ErrorNotice, OrderStatus, PageTitle, Spinner, useRequireLogin } from "@/components/store/ui";

// GET /orders — the same URL returns only *your* orders, because the server
// reads who you are from the Bearer token (an admin would see everyone's).

const FILTERS: (Order["status"] | "")[] = ["", "pending", "paid", "shipped", "delivered", "cancelled"];

export default function OrdersPage() {
  const { pick } = useLang();
  const allowed = useRequireLogin();
  const { api } = useStore();
  const [status, setStatus] = useState<Order["status"] | "">("");
  const [orders, setOrders] = useState<OrderWithItems[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!allowed || !api) return;

    let live = true;

    setOrders(null);
    api
      .get<ListResponse<OrderWithItems>>("/orders", { sort: "-created_at", limit: 50, status })
      .then((res) => live && setOrders(res.data))
      .catch((e) => live && setError(e));

    return () => {
      live = false;
    };
  }, [allowed, api, status]);

  if (!allowed) return <Spinner />;

  return (
    <div className="max-w-4xl mx-auto">
      <PageTitle>{pick("Đơn hàng của tôi", "My orders")}</PageTitle>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {FILTERS.map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm border whitespace-nowrap",
              status === s ? "bg-orange-600 border-orange-600 text-white" : "bg-white border-stone-300 text-stone-700 hover:border-orange-400"
            )}
          >
            {s ? pick(ORDER_STATUS_LABEL[s].vi, ORDER_STATUS_LABEL[s].en) : pick("Tất cả", "All")}
          </button>
        ))}
      </div>

      <ErrorNotice error={error} />

      {!orders && !error && <Spinner />}

      {orders && orders.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          <p>{pick("Chưa có đơn hàng nào.", "No orders yet.")}</p>
          <Link href={STORE_BASE} className={`${btnPrimary} mt-4`}>
            {pick("Mua sách ngay", "Start shopping")}
          </Link>
        </div>
      )}

      {orders && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`${STORE_BASE}/orders/${o.id}`} className={`${card} flex flex-wrap items-center gap-4 p-4 hover:border-orange-300`}>
                <div className="flex-1 min-w-[160px]">
                  <div className="font-semibold">{pick(`Đơn #${o.id}`, `Order #${o.id}`)}</div>
                  <div className="text-xs text-stone-500">
                    {new Date(o.created_at).toLocaleDateString(pick("vi-VN", "en-GB"), { dateStyle: "medium" })} ·{" "}
                    {pick(`${o.items.reduce((n, i) => n + i.quantity, 0)} cuốn`, `${o.items.reduce((n, i) => n + i.quantity, 0)} books`)}
                  </div>
                </div>
                <OrderStatus status={o.status} />
                <div className="font-bold text-orange-700 w-28 text-right">{formatVnd(o.total_amount)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
