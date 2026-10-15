import "server-only";
import { API_BASE_PATH, DEMO_ACCOUNTS, OPERATIONS, SANDBOX_KEY_HEADER, TAGS, type Operation } from "./catalog";
import { API_VERSION, MAX_ROWS } from "./engine";
import { workedExamples } from "./examples";
import { ORDER_STATUSES, PAYMENT_METHODS, TABLES, USER_ROLES, type Bilingual, type Column, type TableName } from "./schema";

// The OpenAPI 3.0 document Swagger UI renders, built from the catalogue, the
// table definitions and the worked examples — in Vietnamese or English.

type Lang = "vi" | "en";
type Schema = Record<string, unknown>;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

function columnSchema(col: Column, lang: Lang): Schema {
  const base: Schema =
    col.type === "integer" ? { type: "integer" }
      : col.type === "timestamp" ? { type: "string", format: "date-time" }
        : col.type === "enum" ? { type: "string", enum: col.values }
          : { type: "string" };

  return {
    ...base,
    description: col.desc[lang] + (col.ref ? ` → ${col.ref}` : ""),
    example: col.example,
    ...(col.nullable ? { nullable: true } : {}),
    ...(col.readOnly ? { readOnly: true } : {}),
  };
}

function tableSchema(name: TableName, lang: Lang, extra: Record<string, Schema> = {}): Schema {
  const table = TABLES.find((t) => t.name === name)!;
  const columns = table.columns.filter((c) => c.name !== "password_hash");

  return {
    type: "object",
    description: table.desc[lang],
    properties: { ...Object.fromEntries(columns.map((c) => [c.name, columnSchema(c, lang)])), ...extra },
  };
}

/** An input schema: the writable columns of a table, minus read-only ones, plus any extras. */
function inputSchema(name: TableName, lang: Lang, fields: string[], required: string[], extra: Record<string, Schema> = {}): Schema {
  const table = TABLES.find((t) => t.name === name)!;
  const properties: Record<string, Schema> = {};

  for (const field of fields) {
    const col = table.columns.find((c) => c.name === field);

    if (col) {
      const { readOnly: _ro, ...schema } = columnSchema(col, lang);

      void _ro;
      properties[field] = schema;
    }
  }

  return { type: "object", additionalProperties: false, ...(required.length ? { required } : {}), properties: { ...properties, ...extra } };
}

const t = (b: Bilingual, lang: Lang) => b[lang];

function components(lang: Lang) {
  const L = (vi: string, en: string) => (lang === "vi" ? vi : en);
  const password = (required: boolean): Schema => ({
    type: "string",
    format: "password",
    minLength: 8,
    maxLength: 72,
    writeOnly: true,
    description: required ? L("Mật khẩu, 8–72 ký tự.", "Password, 8–72 characters.") : L("Chỉ gửi khi muốn đổi mật khẩu.", "Send only to change the password."),
  });

  const listOf = (item: string): Schema => ({
    type: "object",
    properties: { data: { type: "array", items: ref(item) }, meta: ref("ListMeta") },
  });

  const schemas: Record<string, Schema> = {
    Author: tableSchema("authors", lang),
    Book: tableSchema("books", lang),
    User: tableSchema("users", lang),
    OrderItem: tableSchema("order_items", lang),
    Order: tableSchema("orders", lang, { items: { type: "array", items: ref("OrderItem") } }),
    Payment: tableSchema("payments", lang, { invoice_id: { type: "integer", nullable: true, readOnly: true, description: L("Hoá đơn sinh ra từ thanh toán này.", "The invoice this payment produced.") } }),
    Invoice: tableSchema("invoices", lang),
    AuthorList: listOf("Author"),
    BookList: listOf("Book"),
    UserList: listOf("User"),
    OrderList: listOf("Order"),
    PaymentList: listOf("Payment"),
    InvoiceList: listOf("Invoice"),
    ListMeta: {
      type: "object",
      properties: {
        page: { type: "integer", example: 1 },
        limit: { type: "integer", example: 10 },
        total: { type: "integer", example: 14, description: L("Tổng số dòng khớp bộ lọc.", "Rows matching the filters in total.") },
        total_pages: { type: "integer", example: 2 },
      },
    },
    Error: {
      type: "object",
      properties: {
        error: {
          type: "object",
          required: ["code", "message"],
          properties: {
            code: { type: "string", example: "validation_failed", description: L("Mã lỗi cố định — code của bạn nên dựa vào trường này.", "A stable error code — your code should branch on this.") },
            message: { type: "string", description: L("Mô tả cho con người đọc.", "A human-readable explanation.") },
            details: { description: L("Thông tin thêm, ví dụ danh sách trường sai.", "Extra information, e.g. the list of bad fields.") },
          },
        },
      },
    },
    LoginInput: {
      type: "object",
      required: ["email", "password"],
      properties: { email: { type: "string", example: "mai.tran@example.com" }, password: { type: "string", format: "password", example: "Customer@123" } },
    },
    LoginResponse: {
      type: "object",
      properties: {
        access_token: { type: "string", description: L("JWT — dán vào nút Authorize (bearerAuth).", "A JWT — paste it into Authorize (bearerAuth).") },
        token_type: { type: "string", example: "Bearer" },
        expires_in: { type: "integer", example: 3600, description: L("Số giây token còn hiệu lực.", "Seconds until the token expires.") },
        user: ref("User"),
      },
    },
    AuthorInput: inputSchema("authors", lang, ["name", "country", "birth_year", "bio"], ["name", "country"]),
    AuthorPatch: inputSchema("authors", lang, ["name", "country", "birth_year", "bio"], []),
    BookInput: inputSchema("books", lang, ["title", "isbn", "author_id", "genre", "price", "stock", "published_year"], ["title", "isbn", "author_id", "genre", "price"]),
    BookPatch: inputSchema("books", lang, ["title", "isbn", "author_id", "genre", "price", "stock", "published_year"], []),
    RegisterInput: inputSchema("users", lang, ["full_name", "email", "phone", "address"], ["full_name", "email", "password"], { password: password(true) }),
    UserInput: { ...inputSchema("users", lang, ["full_name", "email", "phone", "address"], ["full_name", "email"], { role: { type: "string", enum: USER_ROLES, default: "customer", description: L("Chỉ admin được đặt.", "Only an admin may set it.") }, password: password(false) }) },
    UserPatch: inputSchema("users", lang, ["full_name", "email", "phone", "address"], [], { role: { type: "string", enum: USER_ROLES, description: L("Chỉ admin được đổi.", "Only an admin may change it.") }, password: password(false) }),
    OrderInput: {
      type: "object",
      additionalProperties: false,
      required: ["items"],
      properties: {
        items: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          items: {
            type: "object",
            required: ["book_id", "quantity"],
            properties: { book_id: { type: "integer", example: 3 }, quantity: { type: "integer", minimum: 1, maximum: 20, example: 1 } },
          },
        },
        shipping_address: { type: "string", description: L("Bỏ trống thì dùng địa chỉ trong hồ sơ.", "Left out, your profile address is used.") },
        note: { type: "string", nullable: true },
      },
    },
    OrderPatch: {
      type: "object",
      additionalProperties: false,
      properties: {
        status: { type: "string", enum: ORDER_STATUSES, description: L("pending→cancelled (khách), paid→shipped→delivered (admin).", "pending→cancelled (customer), paid→shipped→delivered (admin).") },
        shipping_address: { type: "string", description: L("Chỉ đổi được khi pending.", "Only while pending.") },
        note: { type: "string", nullable: true },
      },
    },
    PaymentInput: {
      type: "object",
      additionalProperties: false,
      required: ["order_id", "amount", "method"],
      properties: {
        order_id: { type: "integer", example: 4 },
        amount: { type: "integer", example: 258000, description: L("Phải bằng total_amount của đơn.", "Must equal the order's total_amount.") },
        method: { type: "string", enum: PAYMENT_METHODS },
        simulate_failure: { type: "boolean", default: false, description: L("true = giả lập thẻ bị từ chối (402).", "true = fake a declined card (402).") },
      },
    },
  };

  return {
    schemas,
    securitySchemes: {
      sandboxKey: {
        type: "apiKey",
        in: "header",
        name: SANDBOX_KEY_HEADER,
        description: L("Key riêng của bạn — chọn sandbox nào. Trang /practice/api đã điền sẵn.", "Your personal key — picks which sandbox. /practice/api fills it in for you."),
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: L("access_token lấy từ POST /auth/login. Chỉ dán token, Swagger tự thêm chữ Bearer.", "The access_token from POST /auth/login. Paste only the token — Swagger adds the word Bearer."),
      },
    },
  };
}

/** Which component a successful response uses. */
const SUCCESS_SCHEMA: Record<string, string | null> = {
  getApiInfo: null, getSandbox: null, resetSandbox: null,
  login: "LoginResponse", register: "User", me: "User",
  listAuthors: "AuthorList", createAuthor: "Author", getAuthor: "Author", replaceAuthor: "Author", updateAuthor: "Author", deleteAuthor: null, listAuthorBooks: "BookList",
  listBooks: "BookList", createBook: "Book", getBook: "Book", replaceBook: "Book", updateBook: "Book", deleteBook: null,
  listUsers: "UserList", createUser: "User", getUser: "User", replaceUser: "User", updateUser: "User", deleteUser: null, listUserOrders: "OrderList",
  listOrders: "OrderList", createOrder: "Order", getOrder: "Order", updateOrder: "Order",
  listPayments: "PaymentList", createPayment: "Payment", getPayment: "Payment", refundPayment: null,
  listInvoices: "InvoiceList", getInvoice: "Invoice",
};

function accessLine(op: Operation, lang: Lang): string {
  if (op.access === "public") return lang === "vi" ? "🔓 **Công khai** — chỉ cần X-Sandbox-Key." : "🔓 **Public** — only X-Sandbox-Key needed.";

  if (op.access === "user") return lang === "vi" ? "🔑 **Cần đăng nhập** — thêm `Authorization: Bearer <token>`." : "🔑 **Login required** — add `Authorization: Bearer <token>`.";

  return lang === "vi" ? "👑 **Chỉ admin** — token của tài khoản admin." : "👑 **Admin only** — a token from an admin account.";
}

function operation(op: Operation, lang: Lang) {
  const worked = workedExamples().operations[op.id];
  const responses: Record<string, unknown> = {};

  for (const r of op.responses) {
    const success = r.status < 300;
    const schemaName = success ? SUCCESS_SCHEMA[op.id] : "Error";
    const isExample = worked.response.status === r.status && worked.response.body !== undefined;
    const content =
      r.status === 204 ? undefined
        : { "application/json": { ...(schemaName ? { schema: ref(schemaName) } : {}), ...(isExample ? { example: worked.response.body } : {}) } };

    responses[String(r.status)] = { description: t(r.desc, lang), ...(content ? { content } : {}) };
  }

  return {
    operationId: op.id,
    tags: [op.tag],
    summary: t(op.summary, lang),
    description: `${t(op.purpose, lang)}\n\n${accessLine(op, lang)}`,
    ...(op.access === "public" ? {} : { security: [{ sandboxKey: [], bearerAuth: [] }] }),
    parameters: (op.params ?? []).map((p) => ({
      name: p.name,
      in: p.in,
      required: p.in === "path" ? true : Boolean(p.required),
      description: t(p.desc, lang),
      schema: { type: p.type, ...(p.enum ? { enum: p.enum } : {}), ...(p.in === "path" && p.example !== undefined ? { default: p.example } : {}) },
    })),
    ...(op.bodySchema
      ? { requestBody: { required: true, content: { "application/json": { schema: ref(op.bodySchema), example: op.example.body } } } }
      : {}),
    responses,
  };
}

export function buildOpenApi(lang: Lang) {
  const L = (vi: string, en: string) => (lang === "vi" ? vi : en);
  const accounts = DEMO_ACCOUNTS.map((a) => `- \`${a.email}\` / \`${a.password}\` — ${a.role}`).join("\n");
  const paths: Record<string, Record<string, unknown>> = {};

  for (const op of OPERATIONS) {
    paths[op.path] ??= {};
    paths[op.path][op.method.toLowerCase()] = operation(op, lang);
  }

  return {
    openapi: "3.0.3",
    info: {
      title: L("Bookstore API — sân tập", "Bookstore practice API"),
      version: API_VERSION,
      description: L(
        `Mỗi người có một sandbox riêng, tự quay về dữ liệu mẫu lúc 00:00 giờ Việt Nam. Tối đa ${MAX_ROWS} dòng mỗi bảng.\n\n**Bắt đầu:** gọi \`POST /auth/login\` với một tài khoản bên dưới, copy \`access_token\`, bấm **Authorize** và dán vào ô **bearerAuth**.\n\n${accounts}`,
        `Everyone gets a private sandbox that returns to the sample data at 00:00 Vietnam time. At most ${MAX_ROWS} rows per table.\n\n**Start:** call \`POST /auth/login\` with an account below, copy the \`access_token\`, click **Authorize** and paste it into **bearerAuth**.\n\n${accounts}`
      ),
    },
    servers: [{ url: API_BASE_PATH, description: L("Sandbox của bạn", "Your sandbox") }],
    security: [{ sandboxKey: [] }],
    tags: TAGS.map((tag) => ({ name: tag.name, description: t(tag.desc, lang) })),
    paths,
    components: components(lang),
  };
}
