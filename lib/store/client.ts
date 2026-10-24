// The web store's API client (/practice/api/web). It calls the bookstore
// practice API exactly the way a real single-page app calls its backend: plain
// fetch() requests with an API key header and a Bearer token, so every request
// shows up in the browser's DevTools → Network tab.

import type { Author, Book, Invoice, Order, OrderItem, Payment, User } from "@/lib/sandbox/types";

export const API_BASE = "/api/sandbox/v1";
export const STORE_BASE = "/practice/api/web";

export type PublicUser = Omit<User, "password_hash">;
export type { Author, Book, Invoice, Order, OrderItem, Payment };

export interface ListResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}

export interface CartLine {
  id: number;
  book_id: number;
  quantity: number;
  added_at: string;
  updated_at: string;
  book: Pick<Book, "id" | "title" | "author_id" | "genre" | "price" | "stock">;
  line_total: number;
  in_stock: boolean;
}

export interface Cart {
  items: CartLine[];
  item_count: number;
  subtotal: number;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface LoginResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  user: PublicUser;
}

/** An error response from the API: `{ error: { code, message, details } }`. */
export class StoreApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
  }
}

/** One request, as the store's built-in "API log" shows it. */
export interface ApiLogEntry {
  id: number;
  at: string;
  method: string;
  url: string;
  status: number;
  ms: number;
  requestHeaders: [string, string][];
  requestBody?: unknown;
  responseBody?: unknown;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

let logId = 0;

export function createApi({
  key,
  getToken,
  onLog,
}: {
  key: string;
  getToken: () => string | null;
  onLog: (entry: ApiLogEntry) => void;
}) {
  async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const params = new URLSearchParams();

    for (const [name, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null && value !== "") params.set(name, String(value));
    }

    const qs = params.toString();
    const url = `${API_BASE}${path}${qs ? `?${qs}` : ""}`;
    const headers: Record<string, string> = { "X-Sandbox-Key": key };
    const token = getToken();

    if (token) headers.Authorization = `Bearer ${token}`;

    if (options.body !== undefined) headers["Content-Type"] = "application/json";

    const started = performance.now();
    const res = await fetch(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
    const text = await res.text();
    let body: unknown;

    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = text;
    }

    onLog({
      id: ++logId,
      at: new Date().toISOString(),
      method,
      url,
      status: res.status,
      ms: Math.round(performance.now() - started),
      // The log shows the token shortened; DevTools shows it in full.
      requestHeaders: Object.entries(headers).map(([name, value]) => [
        name,
        name === "Authorization" ? `${value.slice(0, 18)}…${value.slice(-6)}` : name === "X-Sandbox-Key" ? `${value.slice(0, 7)}…` : value,
      ]),
      requestBody: options.body,
      responseBody: body,
    });

    if (!res.ok) {
      const error = (body as { error?: { code?: string; message?: string; details?: unknown } } | undefined)?.error;

      throw new StoreApiError(res.status, error?.code ?? `http_${res.status}`, error?.message ?? res.statusText, error?.details);
    }

    return body as T;
  }

  return {
    request,
    get: <T>(path: string, query?: RequestOptions["query"]) => request<T>("GET", path, { query }),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
    patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, { body }),
    del: (path: string) => request<void>("DELETE", path),
  };
}

export type StoreApi = ReturnType<typeof createApi>;

export const GENRE_LABEL: Record<Book["genre"], { vi: string; en: string }> = {
  fiction: { vi: "Văn học", en: "Fiction" },
  children: { vi: "Thiếu nhi", en: "Children" },
  history: { vi: "Lịch sử", en: "History" },
  science: { vi: "Khoa học", en: "Science" },
  technology: { vi: "Công nghệ", en: "Technology" },
  business: { vi: "Kinh doanh", en: "Business" },
  self_help: { vi: "Kỹ năng sống", en: "Self-help" },
};

export const ORDER_STATUS_LABEL: Record<Order["status"], { vi: string; en: string }> = {
  pending: { vi: "Chờ thanh toán", en: "Awaiting payment" },
  paid: { vi: "Đã thanh toán", en: "Paid" },
  shipped: { vi: "Đang giao", en: "Shipped" },
  delivered: { vi: "Đã giao", en: "Delivered" },
  cancelled: { vi: "Đã huỷ", en: "Cancelled" },
};

export const PAYMENT_METHOD_LABEL: Record<Payment["method"], { vi: string; en: string }> = {
  card: { vi: "Thẻ ngân hàng / Visa", en: "Card / Visa" },
  bank_transfer: { vi: "Chuyển khoản", en: "Bank transfer" },
  e_wallet: { vi: "Ví điện tử", en: "E-wallet" },
  cash_on_delivery: { vi: "Thanh toán khi nhận hàng (COD)", en: "Cash on delivery" },
};

/** Only follow a `?next=` back into the store — never to another site (no open redirect). */
export function safeNext(next: string | null): string {
  return next && next.startsWith(`${STORE_BASE}`) && !next.startsWith("//") ? next : STORE_BASE;
}

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

/** Demo logins from the seed data (also listed on /practice/api). */
export const DEMO_LOGINS = [
  { email: "mai.tran@example.com", password: "Customer@123", name: "Trần Thị Mai" },
  { email: "nam.le@example.com", password: "Customer@123", name: "Lê Văn Nam" },
];
