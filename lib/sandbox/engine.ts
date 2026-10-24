// The bookstore API itself: a request and one learner's sandbox in, a response
// and the (possibly changed) sandbox out. Storage lives outside — the route in
// app/api/sandbox/v1 loads and saves the data around this function.
//
// Status codes are chosen to teach the difference between them:
//   400 the request is malformed or a field fails its rule
//   401 no valid login token (missing, wrong, expired)
//   403 logged in, but this user may not do this
//   404 the resource in the URL does not exist
//   405 the path exists but not with this method
//   409 the request conflicts with current state (duplicate, wrong status, still referenced)
//   422 well-formed but breaks a business rule (unknown reference, no stock, wrong amount)
//   402 the (simulated) payment was declined

import "server-only";
import { hashPassword, signToken, TOKEN_TTL_SECONDS, verifyToken } from "./auth";
import { GENRES, ORDER_STATUSES, PAYMENT_METHODS, USER_ROLES, type TableName } from "./schema";
import { seedData } from "./seed";
import type { Author, Book, CartItem, Invoice, Order, OrderItem, Payment, SandboxData, User } from "./types";

export const API_VERSION = "1.0.0";
/** Rows per table a sandbox may hold, so one learner cannot grow a row without bound. */
export const MAX_ROWS = 200;
const MAX_ITEMS_PER_ORDER = 10;
/** The most copies of one book a cart line (and an order line) may hold. */
const MAX_QUANTITY = 20;
const BASE = "/api/sandbox/v1";

export interface SandboxRequest {
  method: string;
  /** Path segments after /api/sandbox/v1, e.g. ["books", "3"]. */
  path: string[];
  query: URLSearchParams;
  /** Parsed JSON body, `undefined` when there was none. */
  body: unknown;
  /** The raw Authorization header, if any. */
  authorization: string | null;
  /** Which sandbox this is — login tokens are bound to it. */
  owner: string;
  now: Date;
  /** The sandbox day (YYYY-MM-DD, Vietnam time) and when it resets, for the info endpoints. */
  day: string;
  resetsAt: string;
}

export interface SandboxResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface SandboxResult {
  response: SandboxResponse;
  data: SandboxData;
  changed: boolean;
}

// ------------------------------------------------------------------ errors

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly headers?: Record<string, string>
  ) {
    super(message);
  }
}

const notFound = (what: string, id: number) => new ApiError(404, "not_found", `${what} ${id} does not exist.`);

const forbidden = (message: string) => new ApiError(403, "forbidden", message);

const unauthorized = (code: string, message: string) =>
  new ApiError(401, code, message, undefined, { "WWW-Authenticate": `Bearer realm="bookstore", error="${code}"` });

// ------------------------------------------------------------------ validation

type Rule =
  | { type: "string"; required?: boolean; nullable?: boolean; min?: number; max: number; pattern?: RegExp; hint?: string; fallback?: string | null }
  | { type: "integer"; required?: boolean; nullable?: boolean; min: number; max: number; fallback?: number | null }
  | { type: "enum"; required?: boolean; values: readonly string[]; fallback?: string }
  | { type: "boolean"; required?: boolean; fallback?: boolean };

type Rules = Record<string, Rule>;
type Mode = "create" | "replace" | "patch";
type Issue = { field: string; issue: string };

const READ_ONLY = new Set(["id", "created_at", "updated_at", "password_hash", "status", "total_amount", "user_id"]);

function asObject(body: unknown): Record<string, unknown> {
  if (body === undefined) throw new ApiError(400, "body_required", "This request needs a JSON body (and the header Content-Type: application/json).");

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ApiError(400, "invalid_body", "The body must be a JSON object, e.g. {\"name\": \"…\"}.");
  }

  return body as Record<string, unknown>;
}

function checkField(rule: Rule, value: unknown): string | null {
  if (value === null) {
    return "nullable" in rule && rule.nullable ? null : "must not be null";
  }

  switch (rule.type) {
    case "string": {
      if (typeof value !== "string") return "must be a string";

      const text = value.trim();

      if (text.length < (rule.min ?? 0)) return rule.min === 1 ? "must not be empty" : `must be at least ${rule.min} characters`;

      if (text.length > rule.max) return `must be at most ${rule.max} characters`;

      if (rule.pattern && !rule.pattern.test(text)) return rule.hint ?? "has the wrong format";

      return null;
    }

    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) return "must be a whole number";

      if (value < rule.min || value > rule.max) return `must be between ${rule.min} and ${rule.max}`;

      return null;

    case "enum":
      return typeof value === "string" && rule.values.includes(value) ? null : `must be one of: ${rule.values.join(", ")}`;

    case "boolean":
      return typeof value === "boolean" ? null : "must be true or false";
  }
}

/**
 * Check a body against its rules. `create` fills defaults, `replace` (PUT) is a
 * full replacement — a missing optional field is reset, not kept — and `patch`
 * changes only what was sent.
 */
function validate(body: unknown, rules: Rules, mode: Mode): Record<string, unknown> {
  const input = asObject(body);
  const issues: Issue[] = [];
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(input)) {
    if (!(key in rules)) {
      issues.push({ field: key, issue: READ_ONLY.has(key) ? "is read-only — the server sets it" : "is not a known field" });
    }
  }

  for (const [field, rule] of Object.entries(rules)) {
    if (!(field in input) || input[field] === undefined) {
      if (mode === "patch") continue;

      if (rule.required) {
        issues.push({ field, issue: "is required" });
      } else if ("fallback" in rule && rule.fallback !== undefined) {
        out[field] = rule.fallback;
      }

      continue;
    }

    const problem = checkField(rule, input[field]);

    if (problem) {
      issues.push({ field, issue: problem });
    } else {
      out[field] = typeof input[field] === "string" ? (input[field] as string).trim() : input[field];
    }
  }

  if (mode === "patch" && issues.length === 0 && Object.keys(out).length === 0) {
    throw new ApiError(400, "empty_patch", "Send at least one field to change.");
  }

  if (issues.length > 0) {
    throw new ApiError(400, "validation_failed", "Some fields are invalid.", issues);
  }

  return out;
}

const thisYear = (now: Date) => now.getUTCFullYear();

const authorRules = (now: Date): Rules => ({
  name: { type: "string", required: true, min: 2, max: 100 },
  country: { type: "string", required: true, min: 2, max: 60 },
  birth_year: { type: "integer", nullable: true, min: 1000, max: thisYear(now), fallback: null },
  bio: { type: "string", nullable: true, max: 1000, fallback: null },
});

const bookRules = (now: Date): Rules => ({
  title: { type: "string", required: true, min: 1, max: 200 },
  isbn: { type: "string", required: true, max: 17, pattern: /^[0-9][0-9-]{8,15}[0-9Xx]$/, hint: "must look like an ISBN, e.g. 978-604-1-00099-9" },
  author_id: { type: "integer", required: true, min: 1, max: 1_000_000 },
  genre: { type: "enum", required: true, values: GENRES },
  price: { type: "integer", required: true, min: 0, max: 100_000_000 },
  stock: { type: "integer", min: 0, max: 100_000, fallback: 0 },
  published_year: { type: "integer", nullable: true, min: 1000, max: thisYear(now) + 1, fallback: null },
});

const PASSWORD: Rule = { type: "string", min: 8, max: 72 };

const userRules: Rules = {
  full_name: { type: "string", required: true, min: 2, max: 100 },
  email: { type: "string", required: true, max: 120, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, hint: "must be an email address" },
  phone: { type: "string", nullable: true, max: 20, pattern: /^\+?[0-9][0-9 ]{7,18}$/, hint: "must be digits, optionally starting with +", fallback: null },
  address: { type: "string", nullable: true, max: 300, fallback: null },
  role: { type: "enum", values: USER_ROLES, fallback: "customer" },
  // PUT keeps the current password unless a new one is sent — a full replace
  // that silently wiped the password would lock the user out.
  password: PASSWORD,
};

// ------------------------------------------------------------------ lists

type Filter<T> = { parse: "integer" | "boolean" | "string"; values?: readonly string[]; test: (row: T, value: never) => boolean };

interface ListSpec<T> {
  search: (keyof T)[];
  sortable: (keyof T)[];
  filters?: Record<string, Filter<T>>;
}

function parseIntParam(name: string, raw: string, min: number, max: number): number {
  const value = Number(raw);

  if (!/^\d+$/.test(raw) || value < min || value > max) {
    throw new ApiError(400, "invalid_query", `Query parameter "${name}" must be a whole number from ${min} to ${max}.`);
  }

  return value;
}

const LIST_PARAMS = ["page", "limit", "q", "sort"];

function list<T extends { id: number }, V = T>(rows: T[], query: URLSearchParams, spec: ListSpec<T>, view?: (row: T) => V): SandboxResponse {
  for (const key of Array.from(query.keys())) {
    if (!LIST_PARAMS.includes(key) && !spec.filters?.[key]) {
      const known = [...LIST_PARAMS, ...Object.keys(spec.filters ?? {})].join(", ");

      throw new ApiError(400, "invalid_query", `Unknown query parameter "${key}". Supported: ${known}.`);
    }
  }

  const page = query.has("page") ? parseIntParam("page", query.get("page")!, 1, 10_000) : 1;
  const limit = query.has("limit") ? parseIntParam("limit", query.get("limit")!, 1, 100) : 10;
  let result = rows.slice();

  for (const [name, filter] of Object.entries(spec.filters ?? {})) {
    const raw = query.get(name);

    if (raw === null) continue;

    let value: unknown = raw;

    if (filter.parse === "integer") {
      value = parseIntParam(name, raw, 0, 100_000_000);
    } else if (filter.parse === "boolean") {
      if (raw !== "true" && raw !== "false") throw new ApiError(400, "invalid_query", `Query parameter "${name}" must be true or false.`);

      value = raw === "true";
    } else if (filter.values && !filter.values.includes(raw)) {
      throw new ApiError(400, "invalid_query", `Query parameter "${name}" must be one of: ${filter.values.join(", ")}.`);
    }

    result = result.filter((row) => filter.test(row, value as never));
  }

  const q = query.get("q")?.trim().toLowerCase();

  if (q) {
    result = result.filter((row) => spec.search.some((field) => String(row[field] ?? "").toLowerCase().includes(q)));
  }

  const sort = query.get("sort");

  if (sort) {
    const desc = sort.startsWith("-");
    const field = (desc ? sort.slice(1) : sort) as keyof T;

    if (!spec.sortable.includes(field)) {
      throw new ApiError(400, "invalid_query", `Cannot sort by "${String(field)}". Sortable: ${spec.sortable.join(", ")} (prefix with - for descending).`);
    }

    result.sort((a, b) => {
      const x = a[field];
      const y = b[field];
      const order = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));

      return desc ? -order : order;
    });
  }

  const total = result.length;
  const pageRows = result.slice((page - 1) * limit, page * limit);

  return {
    status: 200,
    body: {
      data: view ? pageRows.map(view) : pageRows,
      meta: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
    },
  };
}

const authorList: ListSpec<Author> = { search: ["name", "country"], sortable: ["id", "name", "birth_year", "created_at"] };

const bookList: ListSpec<Book> = {
  search: ["title", "isbn"],
  sortable: ["id", "title", "price", "stock", "published_year", "created_at"],
  filters: {
    author_id: { parse: "integer", test: (b, v: number) => b.author_id === v },
    genre: { parse: "string", values: GENRES, test: (b, v: string) => b.genre === v },
    min_price: { parse: "integer", test: (b, v: number) => b.price >= v },
    max_price: { parse: "integer", test: (b, v: number) => b.price <= v },
    in_stock: { parse: "boolean", test: (b, v: boolean) => (b.stock > 0) === v },
  },
};

const userList: ListSpec<User> = {
  search: ["full_name", "email", "phone"],
  sortable: ["id", "full_name", "email", "created_at"],
  filters: { role: { parse: "string", values: USER_ROLES, test: (u, v: string) => u.role === v } },
};

const orderList: ListSpec<Order> = {
  search: ["shipping_address", "note"],
  sortable: ["id", "total_amount", "created_at", "updated_at"],
  filters: {
    user_id: { parse: "integer", test: (o, v: number) => o.user_id === v },
    status: { parse: "string", values: ORDER_STATUSES, test: (o, v: string) => o.status === v },
  },
};

const paymentList: ListSpec<Payment> = {
  search: ["transaction_ref"],
  sortable: ["id", "amount", "created_at"],
  filters: {
    order_id: { parse: "integer", test: (p, v: number) => p.order_id === v },
    status: { parse: "string", values: ["succeeded", "failed", "refunded"], test: (p, v: string) => p.status === v },
    method: { parse: "string", values: PAYMENT_METHODS, test: (p, v: string) => p.method === v },
  },
};

const invoiceList: ListSpec<Invoice> = {
  search: ["invoice_number"],
  sortable: ["id", "amount", "issued_at"],
  filters: {
    user_id: { parse: "integer", test: (i, v: number) => i.user_id === v },
    order_id: { parse: "integer", test: (i, v: number) => i.order_id === v },
    status: { parse: "string", values: ["issued", "void"], test: (i, v: string) => i.status === v },
  },
};

// ------------------------------------------------------------------ helpers

function nextId(data: SandboxData, table: TableName): number {
  if (data[table].length >= MAX_ROWS) {
    throw new ApiError(403, "sandbox_limit_reached", `Your sandbox holds at most ${MAX_ROWS} ${table}. Delete some, or POST /sandbox/reset.`);
  }

  data.seq[table] += 1;

  return data.seq[table];
}

function find<T extends { id: number }>(rows: T[], id: number, what: string): T {
  const row = rows.find((r) => r.id === id);

  if (!row) throw notFound(what, id);

  return row;
}

const created = (body: unknown, location: string): SandboxResponse => ({ status: 201, body, headers: { Location: `${BASE}${location}` } });

/** What the API shows of a user — the password hash never leaves the server. */
function userView(user: User) {
  const { password_hash: _hidden, ...rest } = user;

  void _hidden;

  return rest;
}

function orderView(data: SandboxData, order: Order) {
  return { ...order, items: data.order_items.filter((item) => item.order_id === order.id) };
}

function paymentView(data: SandboxData, payment: Payment) {
  return { ...payment, invoice_id: data.invoices.find((inv) => inv.payment_id === payment.id)?.id ?? null };
}

function restoreStock(data: SandboxData, orderId: number) {
  for (const item of data.order_items.filter((i) => i.order_id === orderId)) {
    const book = data.books.find((b) => b.id === item.book_id);

    if (book) book.stock += item.quantity;
  }
}

const compactDate = (iso: string) => iso.slice(0, 10).replace(/-/g, "");

const isAdmin = (me: User | null) => me?.role === "admin";

/** A customer may only touch their own rows; an admin may touch anyone's. */
function assertOwn(me: User, userId: number, what: string) {
  if (!isAdmin(me) && me.id !== userId) {
    throw forbidden(`This ${what} belongs to another user. Customers can only see their own; log in as an admin to see everyone's.`);
  }
}

const ownerOfOrder = (data: SandboxData, orderId: number) => data.orders.find((o) => o.id === orderId)?.user_id ?? -1;

// ------------------------------------------------------------------ handlers

type Ctx = { data: SandboxData; req: SandboxRequest; id: number; now: string; me: User | null };
type Handler = (ctx: Ctx) => SandboxResponse;

function issueToken(req: SandboxRequest, user: User) {
  const iat = Math.floor(req.now.getTime() / 1000);
  const token = signToken({ sub: String(user.id), email: user.email, role: user.role, sbx: req.owner, iat, exp: iat + TOKEN_TTL_SECONDS });

  return { access_token: token, token_type: "Bearer", expires_in: TOKEN_TTL_SECONDS, user: userView(user) };
}

const auth = {
  login: ({ data, req }: Ctx): SandboxResponse => {
    const input = validate(req.body, { email: { type: "string", required: true, min: 3, max: 120 }, password: { type: "string", required: true, min: 1, max: 72 } }, "create");
    const user = data.users.find((u) => u.email === String(input.email).toLowerCase());

    // One message for both cases, so the API never reveals which emails exist.
    if (!user || user.password_hash !== hashPassword(user.id, String(input.password))) {
      throw new ApiError(401, "invalid_credentials", "Email or password is incorrect.");
    }

    return { status: 200, body: issueToken(req, user) };
  },
  register: ({ data, req, now }: Ctx) => {
    const { role: _role, ...rules } = userRules;

    void _role;

    const input = validate(req.body, { ...rules, password: { ...PASSWORD, required: true } }, "create");

    checkEmail(data, input);

    const { password, ...fields } = input;
    const id = nextId(data, "users");
    const user = { id, ...fields, role: "customer", password_hash: hashPassword(id, String(password)), created_at: now, updated_at: now } as User;

    data.users.push(user);

    return created(userView(user), `/users/${user.id}`);
  },
  me: ({ me }: Ctx) => ({ status: 200, body: userView(me!) }),
};

const authors = {
  list: ({ data, req }: Ctx) => list(data.authors, req.query, authorList),
  get: ({ data, id }: Ctx) => ({ status: 200, body: find(data.authors, id, "Author") }),
  books: ({ data, req, id }: Ctx) => {
    find(data.authors, id, "Author");

    return list(data.books.filter((b) => b.author_id === id), req.query, bookList);
  },
  create: ({ data, req, now }: Ctx) => {
    const input = validate(req.body, authorRules(req.now), "create");
    const author = { id: nextId(data, "authors"), ...input, created_at: now, updated_at: now } as Author;

    data.authors.push(author);

    return created(author, `/authors/${author.id}`);
  },
  update: (mode: Mode) => ({ data, req, id, now }: Ctx) => {
    const author = find(data.authors, id, "Author");

    Object.assign(author, validate(req.body, authorRules(req.now), mode), { updated_at: now });

    return { status: 200, body: author };
  },
  remove: ({ data, id }: Ctx) => {
    find(data.authors, id, "Author");

    const books = data.books.filter((b) => b.author_id === id);

    if (books.length > 0) {
      throw new ApiError(409, "author_has_books", `Author ${id} still has ${books.length} book(s). Delete or reassign them first.`, { book_ids: books.map((b) => b.id) });
    }

    data.authors = data.authors.filter((a) => a.id !== id);

    return { status: 204 };
  },
};

function checkBook(data: SandboxData, input: Record<string, unknown>, selfId?: number) {
  if (typeof input.author_id === "number" && !data.authors.some((a) => a.id === input.author_id)) {
    throw new ApiError(422, "author_not_found", `author_id ${input.author_id} does not match any author. Create the author first.`);
  }

  if (typeof input.isbn === "string" && data.books.some((b) => b.isbn === input.isbn && b.id !== selfId)) {
    throw new ApiError(409, "isbn_taken", `Another book already has ISBN ${input.isbn}.`);
  }
}

const books = {
  list: ({ data, req }: Ctx) => list(data.books, req.query, bookList),
  get: ({ data, id }: Ctx) => ({ status: 200, body: find(data.books, id, "Book") }),
  create: ({ data, req, now }: Ctx) => {
    const input = validate(req.body, bookRules(req.now), "create");

    checkBook(data, input);

    const book = { id: nextId(data, "books"), ...input, created_at: now, updated_at: now } as Book;

    data.books.push(book);

    return created(book, `/books/${book.id}`);
  },
  update: (mode: Mode) => ({ data, req, id, now }: Ctx) => {
    const book = find(data.books, id, "Book");
    const input = validate(req.body, bookRules(req.now), mode);

    checkBook(data, input, id);
    Object.assign(book, input, { updated_at: now });

    return { status: 200, body: book };
  },
  remove: ({ data, id }: Ctx) => {
    find(data.books, id, "Book");

    const orders = Array.from(new Set(data.order_items.filter((i) => i.book_id === id).map((i) => i.order_id)));

    if (orders.length > 0) {
      throw new ApiError(409, "book_in_orders", `Book ${id} appears in ${orders.length} order(s); order history must stay intact. Set its stock to 0 instead.`, { order_ids: orders });
    }

    data.books = data.books.filter((b) => b.id !== id);
    // Carts are live state, not history: a deleted book simply leaves them.
    data.cart_items = data.cart_items.filter((c) => c.book_id !== id);

    return { status: 204 };
  },
};

function checkEmail(data: SandboxData, input: Record<string, unknown>, selfId?: number) {
  if (typeof input.email !== "string") return;

  input.email = input.email.toLowerCase();

  if (data.users.some((u) => u.email === input.email && u.id !== selfId)) {
    throw new ApiError(409, "email_taken", `A user with email ${input.email} already exists.`);
  }
}

const users = {
  list: ({ data, req }: Ctx) => list(data.users, req.query, userList, userView),
  get: ({ data, id, me }: Ctx) => {
    const user = find(data.users, id, "User");

    assertOwn(me!, user.id, "profile");

    return { status: 200, body: userView(user) };
  },
  orders: ({ data, req, id, me }: Ctx) => {
    find(data.users, id, "User");
    assertOwn(me!, id, "order history");

    return list(data.orders.filter((o) => o.user_id === id), req.query, orderList, (o) => orderView(data, o));
  },
  create: ({ data, req, now }: Ctx) => {
    const input = validate(req.body, { ...userRules, password: { ...PASSWORD, required: true } }, "create");

    checkEmail(data, input);

    const { password, ...fields } = input;
    const id = nextId(data, "users");
    const user = { id, ...fields, password_hash: hashPassword(id, String(password)), created_at: now, updated_at: now } as User;

    data.users.push(user);

    return created(userView(user), `/users/${user.id}`);
  },
  update: (mode: Mode) => ({ data, req, id, now, me }: Ctx) => {
    const user = find(data.users, id, "User");

    assertOwn(me!, user.id, "profile");

    const input = validate(req.body, userRules, mode);

    // PUT fills role with its default, so only an explicit change counts.
    if (!isAdmin(me) && input.role !== undefined && input.role !== user.role) {
      throw forbidden("Only an admin can change a user's role.");
    }

    checkEmail(data, input, id);

    const { password, ...fields } = input;

    Object.assign(user, fields, { updated_at: now });

    if (typeof password === "string") user.password_hash = hashPassword(user.id, password);

    return { status: 200, body: userView(user) };
  },
  remove: ({ data, id }: Ctx) => {
    find(data.users, id, "User");

    const orders = data.orders.filter((o) => o.user_id === id);

    if (orders.length > 0) {
      throw new ApiError(409, "user_has_orders", `User ${id} has ${orders.length} order(s), which must be kept for accounting.`, { order_ids: orders.map((o) => o.id) });
    }

    data.users = data.users.filter((u) => u.id !== id);
    data.cart_items = data.cart_items.filter((c) => c.user_id !== id);

    return { status: 204 };
  },
};

/** Allowed status moves. Paid orders are cancelled through a refund, never directly. */
const TRANSITIONS: Record<Order["status"], Order["status"][]> = {
  pending: ["cancelled"],
  paid: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const orders = {
  list: ({ data, req, me }: Ctx) => {
    const visible = isAdmin(me) ? data.orders : data.orders.filter((o) => o.user_id === me!.id);

    return list(visible, req.query, orderList, (o) => orderView(data, o));
  },
  get: ({ data, id, me }: Ctx) => {
    const order = find(data.orders, id, "Order");

    assertOwn(me!, order.user_id, "order");

    return { status: 200, body: orderView(data, order) };
  },
  create: ({ data, req, now, me }: Ctx) => {
    const input = asObject(req.body);
    const issues: Issue[] = [];

    for (const key of Object.keys(input)) {
      if (!["items", "shipping_address", "note"].includes(key)) {
        const issue = key === "user_id"
          ? "is not accepted — the order belongs to the user in your Bearer token"
          : READ_ONLY.has(key) ? "is read-only — the server sets it" : "is not a known field";

        issues.push({ field: key, issue });
      }
    }

    const head = validate(
      { shipping_address: input.shipping_address, note: input.note },
      { shipping_address: { type: "string", min: 5, max: 300 }, note: { type: "string", nullable: true, max: 300, fallback: null } },
      "create"
    );

    const items = input.items;

    if (!Array.isArray(items) || items.length === 0) {
      issues.push({ field: "items", issue: "must be a non-empty array of { book_id, quantity }" });
    } else if (items.length > MAX_ITEMS_PER_ORDER) {
      issues.push({ field: "items", issue: `may hold at most ${MAX_ITEMS_PER_ORDER} lines` });
    } else {
      items.forEach((item, i) => {
        if (typeof item !== "object" || item === null) {
          issues.push({ field: `items[${i}]`, issue: "must be an object" });

          return;
        }

        const line = item as Record<string, unknown>;

        if (typeof line.book_id !== "number" || !Number.isInteger(line.book_id) || line.book_id < 1) {
          issues.push({ field: `items[${i}].book_id`, issue: "must be a book id" });
        }

        if (typeof line.quantity !== "number" || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY) {
          issues.push({ field: `items[${i}].quantity`, issue: `must be a whole number from 1 to ${MAX_QUANTITY}` });
        }
      });
    }

    if (issues.length > 0) throw new ApiError(400, "validation_failed", "Some fields are invalid.", issues);

    const user = me!;
    const address = (head.shipping_address as string | undefined) ?? user.address;

    if (!address) {
      throw new ApiError(400, "validation_failed", "Some fields are invalid.", [{ field: "shipping_address", issue: "is required — your profile has no saved address" }]);
    }

    // The same book twice becomes one line with the quantities added up.
    const wanted = new Map<number, number>();

    for (const line of items as { book_id: number; quantity: number }[]) {
      wanted.set(line.book_id, (wanted.get(line.book_id) ?? 0) + line.quantity);
    }

    const shortages: { book_id: number; requested: number; in_stock: number }[] = [];

    for (const [bookId, quantity] of Array.from(wanted)) {
      const book = data.books.find((b) => b.id === bookId);

      if (!book) throw new ApiError(422, "book_not_found", `book_id ${bookId} does not match any book.`);

      if (book.stock < quantity) shortages.push({ book_id: bookId, requested: quantity, in_stock: book.stock });
    }

    if (shortages.length > 0) {
      throw new ApiError(422, "insufficient_stock", "Not enough copies in stock for some books.", shortages);
    }

    const orderId = nextId(data, "orders");
    let total = 0;

    for (const [bookId, quantity] of Array.from(wanted)) {
      const book = data.books.find((b) => b.id === bookId)!;
      const item: OrderItem = {
        id: nextId(data, "order_items"),
        order_id: orderId,
        book_id: bookId,
        quantity,
        unit_price: book.price,
        line_total: book.price * quantity,
      };

      book.stock -= quantity;
      total += item.line_total;
      data.order_items.push(item);
    }

    const order: Order = {
      id: orderId,
      user_id: user.id,
      status: "pending",
      total_amount: total,
      shipping_address: address,
      note: (head.note as string | null) ?? null,
      created_at: now,
      updated_at: now,
    };

    data.orders.push(order);

    return created(orderView(data, order), `/orders/${order.id}`);
  },
  patch: ({ data, req, id, now, me }: Ctx) => {
    const order = find(data.orders, id, "Order");

    assertOwn(me!, order.user_id, "order");

    const input = validate(
      req.body,
      {
        status: { type: "enum", values: ORDER_STATUSES },
        shipping_address: { type: "string", min: 5, max: 300 },
        note: { type: "string", nullable: true, max: 300 },
      },
      "patch"
    );

    if ("shipping_address" in input && order.status !== "pending") {
      throw new ApiError(409, "order_locked", `The address can only change while the order is pending (it is ${order.status}).`);
    }

    const next = input.status as Order["status"] | undefined;

    if (next && next !== order.status) {
      if (!TRANSITIONS[order.status].includes(next)) {
        const hint = order.status === "paid" && next === "cancelled" ? " A paid order is cancelled by refunding its payment: POST /payments/{id}/refund." : "";

        throw new ApiError(409, "invalid_status_transition", `An order cannot go from ${order.status} to ${next}.${hint}`, {
          from: order.status,
          allowed: TRANSITIONS[order.status],
        });
      }

      if ((next === "shipped" || next === "delivered") && !isAdmin(me)) {
        throw forbidden(`Only an admin (the store) can mark an order ${next}.`);
      }

      if (next === "cancelled") restoreStock(data, order.id);

      order.status = next;
    }

    if ("shipping_address" in input) order.shipping_address = input.shipping_address as string;

    if ("note" in input) order.note = input.note as string | null;

    order.updated_at = now;

    return { status: 200, body: orderView(data, order) };
  },
};

const payments = {
  list: ({ data, req, me }: Ctx) => {
    const visible = isAdmin(me) ? data.payments : data.payments.filter((p) => ownerOfOrder(data, p.order_id) === me!.id);

    return list(visible, req.query, paymentList, (p) => paymentView(data, p));
  },
  get: ({ data, id, me }: Ctx) => {
    const payment = find(data.payments, id, "Payment");

    assertOwn(me!, ownerOfOrder(data, payment.order_id), "payment");

    return { status: 200, body: paymentView(data, payment) };
  },
  create: ({ data, req, now, me }: Ctx): SandboxResponse => {
    const input = validate(
      req.body,
      {
        order_id: { type: "integer", required: true, min: 1, max: 1_000_000 },
        amount: { type: "integer", required: true, min: 1, max: 1_000_000_000 },
        method: { type: "enum", required: true, values: PAYMENT_METHODS },
        simulate_failure: { type: "boolean", fallback: false },
      },
      "create"
    );

    const order = data.orders.find((o) => o.id === input.order_id);

    if (!order) throw new ApiError(422, "order_not_found", `order_id ${input.order_id} does not match any order.`);

    assertOwn(me!, order.user_id, "order");

    if (order.status !== "pending") {
      throw new ApiError(409, "order_not_payable", `Order ${order.id} is ${order.status}; only a pending order can be paid.`);
    }

    if (input.amount !== order.total_amount) {
      throw new ApiError(422, "amount_mismatch", `amount must equal the order total (${order.total_amount}).`, { expected: order.total_amount, received: input.amount });
    }

    const id = nextId(data, "payments");
    const failed = input.simulate_failure === true;
    const payment: Payment = {
      id,
      order_id: order.id,
      amount: order.total_amount,
      method: input.method as Payment["method"],
      status: failed ? "failed" : "succeeded",
      transaction_ref: `TXN-${compactDate(now)}-${String(id).padStart(4, "0")}`,
      paid_at: failed ? null : now,
      created_at: now,
    };

    data.payments.push(payment);

    // A declined payment is still recorded — the attempt happened — but the order stays pending.
    if (failed) {
      return {
        status: 402,
        body: { error: { code: "payment_declined", message: "The (simulated) payment was declined. The order is still pending — try again.", details: { payment: paymentView(data, payment) } } },
      };
    }

    const invoiceId = nextId(data, "invoices");
    const invoice: Invoice = {
      id: invoiceId,
      invoice_number: `INV-${now.slice(0, 4)}-${String(invoiceId).padStart(4, "0")}`,
      order_id: order.id,
      payment_id: payment.id,
      user_id: order.user_id,
      amount: payment.amount,
      status: "issued",
      issued_at: now,
    };

    data.invoices.push(invoice);
    order.status = "paid";
    order.updated_at = now;

    return created({ ...paymentView(data, payment), invoice }, `/payments/${payment.id}`);
  },
  refund: ({ data, id, now }: Ctx) => {
    const payment = find(data.payments, id, "Payment");

    if (payment.status !== "succeeded") {
      throw new ApiError(409, "not_refundable", `Payment ${id} is ${payment.status}; only a succeeded payment can be refunded.`);
    }

    const order = find(data.orders, payment.order_id, "Order");

    if (order.status !== "paid") {
      throw new ApiError(409, "not_refundable", `Order ${order.id} is already ${order.status}; refunds are only possible before shipping.`);
    }

    payment.status = "refunded";
    order.status = "cancelled";
    order.updated_at = now;
    restoreStock(data, order.id);

    const invoice = data.invoices.find((inv) => inv.payment_id === payment.id);

    if (invoice) invoice.status = "void";

    return { status: 200, body: { payment: paymentView(data, payment), order: orderView(data, order), invoice: invoice ?? null } };
  },
};

/** The caller's cart, with each book's current price and stock joined in. */
function cartView(data: SandboxData, userId: number) {
  const items = data.cart_items
    .filter((c) => c.user_id === userId)
    .map((c) => {
      const book = data.books.find((b) => b.id === c.book_id)!;

      return {
        ...c,
        book: { id: book.id, title: book.title, author_id: book.author_id, genre: book.genre, price: book.price, stock: book.stock },
        line_total: book.price * c.quantity,
        // The cart doesn't reserve stock: someone else may buy the last copies first.
        in_stock: book.stock >= c.quantity,
      };
    });

  return {
    items,
    item_count: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: items.reduce((sum, i) => sum + i.line_total, 0),
  };
}

function cartLine(data: SandboxData, id: number, me: User): CartItem {
  const line = find(data.cart_items, id, "Cart item");

  if (line.user_id !== me.id) throw forbidden("This cart item is in someone else's cart. Every user — admins included — only has their own cart.");

  return line;
}

function checkStock(book: Book, quantity: number) {
  if (book.stock < quantity) {
    throw new ApiError(422, "insufficient_stock", `Only ${book.stock} cop${book.stock === 1 ? "y" : "ies"} of "${book.title}" in stock.`, { book_id: book.id, requested: quantity, in_stock: book.stock });
  }
}

const cart = {
  get: ({ data, me }: Ctx) => ({ status: 200, body: cartView(data, me!.id) }),
  add: ({ data, req, now, me }: Ctx): SandboxResponse => {
    const input = validate(
      req.body,
      {
        book_id: { type: "integer", required: true, min: 1, max: 1_000_000 },
        quantity: { type: "integer", min: 1, max: MAX_QUANTITY, fallback: 1 },
      },
      "create"
    );
    const book = data.books.find((b) => b.id === input.book_id);

    if (!book) throw new ApiError(422, "book_not_found", `book_id ${input.book_id} does not match any book.`);

    const existing = data.cart_items.find((c) => c.user_id === me!.id && c.book_id === book.id);
    const quantity = (existing?.quantity ?? 0) + (input.quantity as number);

    if (quantity > MAX_QUANTITY) {
      throw new ApiError(422, "quantity_limit", `A cart line holds at most ${MAX_QUANTITY} copies (you'd have ${quantity}).`, { book_id: book.id, max: MAX_QUANTITY });
    }

    checkStock(book, quantity);

    // The same book again adds to its line rather than making a second one.
    if (existing) {
      existing.quantity = quantity;
      existing.updated_at = now;

      return { status: 200, body: cartView(data, me!.id), headers: { Location: `${BASE}/cart/items/${existing.id}` } };
    }

    const line: CartItem = { id: nextId(data, "cart_items"), user_id: me!.id, book_id: book.id, quantity, added_at: now, updated_at: now };

    data.cart_items.push(line);

    return created(cartView(data, me!.id), `/cart/items/${line.id}`);
  },
  update: ({ data, req, id, now, me }: Ctx) => {
    const line = cartLine(data, id, me!);
    const input = validate(req.body, { quantity: { type: "integer", required: true, min: 1, max: MAX_QUANTITY } }, "create");

    checkStock(data.books.find((b) => b.id === line.book_id)!, input.quantity as number);
    line.quantity = input.quantity as number;
    line.updated_at = now;

    return { status: 200, body: cartView(data, me!.id) };
  },
  removeItem: ({ data, id, me }: Ctx) => {
    cartLine(data, id, me!);
    data.cart_items = data.cart_items.filter((c) => c.id !== id);

    return { status: 204 };
  },
  clear: ({ data, me }: Ctx) => {
    data.cart_items = data.cart_items.filter((c) => c.user_id !== me!.id);

    return { status: 204 };
  },
};

const invoices = {
  list: ({ data, req, me }: Ctx) => list(isAdmin(me) ? data.invoices : data.invoices.filter((i) => i.user_id === me!.id), req.query, invoiceList),
  get: ({ data, id, me }: Ctx) => {
    const invoice = find(data.invoices, id, "Invoice");

    assertOwn(me!, invoice.user_id, "invoice");

    return { status: 200, body: invoice };
  },
};

function info({ req }: Ctx): SandboxResponse {
  return {
    status: 200,
    body: {
      name: "Bookstore practice API",
      version: API_VERSION,
      sandbox_day: req.day,
      resets_at: req.resetsAt,
      docs: "/practice/api",
      openapi: "/api/sandbox/openapi.json",
      resources: ["/auth", "/authors", "/books", "/users", "/cart", "/orders", "/payments", "/invoices", "/sandbox"],
    },
  };
}

function sandboxSummary({ data, req }: Ctx): SandboxResponse {
  const tables: TableName[] = ["authors", "books", "users", "cart_items", "orders", "order_items", "payments", "invoices"];

  return {
    status: 200,
    body: {
      sandbox_day: req.day,
      resets_at: req.resetsAt,
      max_rows_per_table: MAX_ROWS,
      counts: Object.fromEntries(tables.map((t) => [t, data[t].length])),
    },
  };
}

// ------------------------------------------------------------------ routing

/** Who may call a route: anyone, any logged-in user, or an admin. */
export type Access = "public" | "user" | "admin";

interface Route {
  method: string;
  pattern: string;
  access: Access;
  handler: Handler;
  /** Marks a route that changes data, so the caller knows to save. */
  writes?: boolean;
  reset?: boolean;
}

const ROUTES: Route[] = [
  { method: "GET", pattern: "", access: "public", handler: info },
  { method: "GET", pattern: "sandbox", access: "public", handler: sandboxSummary },
  { method: "POST", pattern: "sandbox/reset", access: "public", handler: () => ({ status: 200 }), writes: true, reset: true },

  { method: "POST", pattern: "auth/login", access: "public", handler: auth.login },
  { method: "POST", pattern: "auth/register", access: "public", handler: auth.register, writes: true },
  { method: "GET", pattern: "auth/me", access: "user", handler: auth.me },

  { method: "GET", pattern: "authors", access: "public", handler: authors.list },
  { method: "POST", pattern: "authors", access: "admin", handler: authors.create, writes: true },
  { method: "GET", pattern: "authors/:id", access: "public", handler: authors.get },
  { method: "PUT", pattern: "authors/:id", access: "admin", handler: authors.update("replace"), writes: true },
  { method: "PATCH", pattern: "authors/:id", access: "admin", handler: authors.update("patch"), writes: true },
  { method: "DELETE", pattern: "authors/:id", access: "admin", handler: authors.remove, writes: true },
  { method: "GET", pattern: "authors/:id/books", access: "public", handler: authors.books },

  { method: "GET", pattern: "books", access: "public", handler: books.list },
  { method: "POST", pattern: "books", access: "admin", handler: books.create, writes: true },
  { method: "GET", pattern: "books/:id", access: "public", handler: books.get },
  { method: "PUT", pattern: "books/:id", access: "admin", handler: books.update("replace"), writes: true },
  { method: "PATCH", pattern: "books/:id", access: "admin", handler: books.update("patch"), writes: true },
  { method: "DELETE", pattern: "books/:id", access: "admin", handler: books.remove, writes: true },

  { method: "GET", pattern: "users", access: "admin", handler: users.list },
  { method: "POST", pattern: "users", access: "admin", handler: users.create, writes: true },
  { method: "GET", pattern: "users/:id", access: "user", handler: users.get },
  { method: "PUT", pattern: "users/:id", access: "user", handler: users.update("replace"), writes: true },
  { method: "PATCH", pattern: "users/:id", access: "user", handler: users.update("patch"), writes: true },
  { method: "DELETE", pattern: "users/:id", access: "admin", handler: users.remove, writes: true },
  { method: "GET", pattern: "users/:id/orders", access: "user", handler: users.orders },

  { method: "GET", pattern: "cart", access: "user", handler: cart.get },
  { method: "DELETE", pattern: "cart", access: "user", handler: cart.clear, writes: true },
  { method: "POST", pattern: "cart/items", access: "user", handler: cart.add, writes: true },
  { method: "PATCH", pattern: "cart/items/:id", access: "user", handler: cart.update, writes: true },
  { method: "DELETE", pattern: "cart/items/:id", access: "user", handler: cart.removeItem, writes: true },

  { method: "GET", pattern: "orders", access: "user", handler: orders.list },
  { method: "POST", pattern: "orders", access: "user", handler: orders.create, writes: true },
  { method: "GET", pattern: "orders/:id", access: "user", handler: orders.get },
  { method: "PATCH", pattern: "orders/:id", access: "user", handler: orders.patch, writes: true },

  { method: "GET", pattern: "payments", access: "user", handler: payments.list },
  { method: "POST", pattern: "payments", access: "user", handler: payments.create, writes: true },
  { method: "GET", pattern: "payments/:id", access: "user", handler: payments.get },
  { method: "POST", pattern: "payments/:id/refund", access: "admin", handler: payments.refund, writes: true },

  { method: "GET", pattern: "invoices", access: "user", handler: invoices.list },
  { method: "GET", pattern: "invoices/:id", access: "user", handler: invoices.get },
];

/** "METHOD /path/{id}" → access level, for the docs and the OpenAPI spec. */
export const ROUTE_ACCESS: Record<string, Access> = Object.fromEntries(
  ROUTES.map((r) => [`${r.method} /${r.pattern.replace(":id", "{id}")}`, r.access])
);

function matches(pattern: string, path: string[]): { ok: boolean; id?: string } {
  const parts = pattern === "" ? [] : pattern.split("/");

  if (parts.length !== path.length) return { ok: false };

  let id: string | undefined;

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === ":id") {
      id = path[i];
    } else if (parts[i] !== path[i]) {
      return { ok: false };
    }
  }

  return { ok: true, id };
}

/** Does this request change data? The route decides, so a GET never triggers a save. */
export function isWrite(method: string, path: string[]): boolean {
  const clean = path.filter(Boolean);

  return ROUTES.some((r) => r.writes && r.method === method && matches(r.pattern, clean).ok);
}

/** Resolve the Bearer token to a user of this sandbox. */
function authenticate(data: SandboxData, req: SandboxRequest): User {
  const header = req.authorization?.trim();

  if (!header) {
    throw unauthorized("unauthorized", "This endpoint needs a login token. Call POST /auth/login, then send the header  Authorization: Bearer <access_token>.");
  }

  const [scheme, token] = header.split(/\s+/, 2);

  if (scheme.toLowerCase() !== "bearer" || !token) {
    throw unauthorized("invalid_auth_scheme", "The Authorization header must look like  Bearer <access_token>  (the word Bearer, a space, then the token).");
  }

  const check = verifyToken(token, Math.floor(req.now.getTime() / 1000));

  if (!check.ok) {
    throw check.reason === "expired"
      ? unauthorized("token_expired", "Your token has expired (tokens last 1 hour). Log in again.")
      : unauthorized("invalid_token", "The token is not valid — it may be cut off, edited, or copied wrongly.");
  }

  if (check.claims.sbx !== req.owner) {
    throw unauthorized("invalid_token", "This token was issued in a different sandbox. Log in again in yours.");
  }

  const user = data.users.find((u) => String(u.id) === check.claims.sub);

  if (!user) throw unauthorized("invalid_token", "The user in this token no longer exists.");

  return user;
}

const errorBody = (code: string, message: string, details?: unknown) => ({ error: { code, message, ...(details === undefined ? {} : { details }) } });

/**
 * Run one request. The stored sandbox is never mutated — handlers work on a
 * copy, so a request that fails halfway leaves the data exactly as it was.
 */
export function handleSandboxRequest(stored: SandboxData, req: SandboxRequest): SandboxResult {
  const path = req.path.filter(Boolean);
  const candidates = ROUTES.filter((r) => matches(r.pattern, path).ok);
  const fail = (status: number, body: unknown, headers?: Record<string, string>): SandboxResult => ({ response: { status, body, headers }, data: stored, changed: false });

  if (candidates.length === 0) {
    return fail(404, errorBody("route_not_found", `No endpoint at /${path.join("/")}. See GET / for the resource list.`));
  }

  const method = req.method === "HEAD" ? "GET" : req.method;
  const route = candidates.find((r) => r.method === method);

  if (!route) {
    const allow = candidates.map((r) => r.method).join(", ");

    return fail(405, errorBody("method_not_allowed", `${req.method} is not supported here. Allowed: ${allow}.`), { Allow: allow });
  }

  if (route.reset) {
    return {
      response: { status: 200, body: { message: "Your sandbox is back to the default dataset.", sandbox_day: req.day, resets_at: req.resetsAt } },
      data: seedData(),
      changed: true,
    };
  }

  const rawId = matches(route.pattern, path).id;
  let id = 0;

  if (rawId !== undefined) {
    id = Number(rawId);

    if (!/^\d+$/.test(rawId) || id < 1) {
      return fail(400, errorBody("invalid_id", `"${rawId}" is not a valid id — ids are positive whole numbers.`));
    }
  }

  const data = structuredClone(stored);

  try {
    let me: User | null = null;

    if (route.access !== "public") {
      me = authenticate(data, req);

      if (route.access === "admin" && me.role !== "admin") {
        throw forbidden(`You are logged in as ${me.email} (role: ${me.role}), but this endpoint is for admins only.`);
      }
    }

    const response = route.handler({ data, req, id, now: req.now.toISOString(), me });

    // A declined payment is still written: the failed attempt is part of the record.
    const changed = Boolean(route.writes) && (response.status < 400 || response.status === 402);

    return { response, data: changed ? data : stored, changed };
  } catch (error) {
    if (error instanceof ApiError) return fail(error.status, errorBody(error.code, error.message, error.details), error.headers);

    throw error;
  }
}
