// The API sandbox's database structure — one definition shared by the
// "Database" tab on /practice/api, the OpenAPI component schemas and the
// request validator, so the three can never describe different tables.

export type Bilingual = { vi: string; en: string };

export type ColumnType = "integer" | "text" | "decimal" | "boolean" | "timestamp" | "enum";

export interface Column {
  name: string;
  type: ColumnType;
  /** Allowed values when `type` is "enum". */
  values?: readonly string[];
  pk?: boolean;
  /** Foreign key target, "table.column". */
  ref?: string;
  unique?: boolean;
  nullable?: boolean;
  /** Set by the server, never accepted in a request body. */
  readOnly?: boolean;
  example: string | number | boolean | null;
  desc: Bilingual;
}

export interface Table {
  name: TableName;
  /** Which API resource exposes the table; order_items is reached through orders. */
  resource: string;
  desc: Bilingual;
  columns: Column[];
}

export type TableName =
  | "authors"
  | "books"
  | "users"
  | "orders"
  | "order_items"
  | "payments"
  | "invoices";

export const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;
export const PAYMENT_METHODS = ["card", "bank_transfer", "e_wallet", "cash_on_delivery"] as const;
export const PAYMENT_STATUSES = ["succeeded", "failed", "refunded"] as const;
export const INVOICE_STATUSES = ["issued", "void"] as const;
export const USER_ROLES = ["customer", "admin"] as const;
export const GENRES = ["fiction", "children", "history", "science", "technology", "business", "self_help"] as const;

const id = (what: Bilingual): Column => ({
  name: "id",
  type: "integer",
  pk: true,
  readOnly: true,
  example: 1,
  desc: what,
});

const createdAt: Column = {
  name: "created_at",
  type: "timestamp",
  readOnly: true,
  example: "2026-10-15T08:30:00.000Z",
  desc: { vi: "Thời điểm tạo bản ghi (UTC, ISO 8601).", en: "When the row was created (UTC, ISO 8601)." },
};

const updatedAt: Column = {
  name: "updated_at",
  type: "timestamp",
  readOnly: true,
  example: "2026-10-15T08:30:00.000Z",
  desc: { vi: "Lần sửa gần nhất.", en: "When the row was last changed." },
};

export const TABLES: Table[] = [
  {
    name: "authors",
    resource: "/authors",
    desc: { vi: "Tác giả. Một tác giả viết nhiều sách.", en: "Writers. One author writes many books." },
    columns: [
      id({ vi: "Mã tác giả.", en: "Author id." }),
      { name: "name", type: "text", example: "Nguyễn Nhật Ánh", desc: { vi: "Tên tác giả (bắt buộc, 2–100 ký tự).", en: "Author's name (required, 2–100 characters)." } },
      { name: "country", type: "text", example: "Vietnam", desc: { vi: "Quốc gia.", en: "Country." } },
      { name: "birth_year", type: "integer", nullable: true, example: 1955, desc: { vi: "Năm sinh (có thể để trống).", en: "Year of birth (optional)." } },
      { name: "bio", type: "text", nullable: true, example: "Nhà văn viết cho tuổi mới lớn.", desc: { vi: "Tiểu sử ngắn.", en: "Short biography." } },
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "books",
    resource: "/books",
    desc: { vi: "Sách đang bán. Mỗi sách thuộc về một tác giả.", en: "Books for sale. Each book belongs to one author." },
    columns: [
      id({ vi: "Mã sách.", en: "Book id." }),
      { name: "title", type: "text", example: "Mắt biếc", desc: { vi: "Tên sách.", en: "Title." } },
      { name: "isbn", type: "text", unique: true, example: "978-604-1-00001-1", desc: { vi: "Mã ISBN — duy nhất, không hai sách trùng nhau.", en: "ISBN — unique, no two books share one." } },
      { name: "author_id", type: "integer", ref: "authors.id", example: 1, desc: { vi: "Tác giả (khoá ngoại tới authors.id).", en: "The author (foreign key to authors.id)." } },
      { name: "genre", type: "enum", values: GENRES, example: "fiction", desc: { vi: "Thể loại.", en: "Genre." } },
      { name: "price", type: "integer", example: 95000, desc: { vi: "Giá bán, đơn vị VND (số nguyên ≥ 0).", en: "Price in VND (whole number ≥ 0)." } },
      { name: "stock", type: "integer", example: 40, desc: { vi: "Số lượng còn trong kho. Đặt hàng sẽ trừ, huỷ đơn sẽ cộng lại.", en: "Copies in stock. An order subtracts, a cancellation adds back." } },
      { name: "published_year", type: "integer", nullable: true, example: 1990, desc: { vi: "Năm xuất bản.", en: "Year published." } },
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "users",
    resource: "/users",
    desc: { vi: "Khách hàng (và quản trị viên) của cửa hàng.", en: "The store's customers (and admins)." },
    columns: [
      id({ vi: "Mã người dùng.", en: "User id." }),
      { name: "full_name", type: "text", example: "Trần Thị Mai", desc: { vi: "Họ tên.", en: "Full name." } },
      { name: "email", type: "text", unique: true, example: "mai.tran@example.com", desc: { vi: "Email — duy nhất.", en: "Email — unique." } },
      { name: "phone", type: "text", nullable: true, example: "0901234567", desc: { vi: "Số điện thoại.", en: "Phone number." } },
      { name: "address", type: "text", nullable: true, example: "12 Lê Lợi, Quận 1, TP.HCM", desc: { vi: "Địa chỉ giao hàng mặc định.", en: "Default shipping address." } },
      { name: "password_hash", type: "text", readOnly: true, example: "9f86d081884c7d65…", desc: { vi: "Mật khẩu đã băm — KHÔNG BAO GIỜ trả về trong API. Gửi lên bằng trường password; server chỉ lưu bản băm.", en: "The hashed password — NEVER returned by the API. Send it as the password field; the server stores only the hash." } },
      { name: "role", type: "enum", values: USER_ROLES, example: "customer", desc: { vi: "Vai trò: customer chỉ thấy dữ liệu của mình, admin quản lý cả cửa hàng.", en: "Role: a customer sees only their own data, an admin runs the whole store." } },
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "orders",
    resource: "/orders",
    desc: { vi: "Đơn hàng của một người dùng. Các dòng sách nằm ở order_items.", en: "A user's order. Its book lines live in order_items." },
    columns: [
      id({ vi: "Mã đơn hàng.", en: "Order id." }),
      { name: "user_id", type: "integer", ref: "users.id", example: 1, desc: { vi: "Người đặt (khoá ngoại tới users.id).", en: "Who placed it (foreign key to users.id)." } },
      { name: "status", type: "enum", values: ORDER_STATUSES, readOnly: true, example: "pending", desc: { vi: "Trạng thái: pending → paid → shipped → delivered, hoặc cancelled.", en: "Status: pending → paid → shipped → delivered, or cancelled." } },
      { name: "total_amount", type: "integer", readOnly: true, example: 190000, desc: { vi: "Tổng tiền (VND) — server tự tính từ order_items, không gửi lên.", en: "Total in VND — computed by the server from order_items, never sent." } },
      { name: "shipping_address", type: "text", example: "12 Lê Lợi, Quận 1, TP.HCM", desc: { vi: "Địa chỉ giao. Bỏ trống thì lấy địa chỉ của user.", en: "Where to ship. Left out, the user's address is used." } },
      { name: "note", type: "text", nullable: true, example: "Giao giờ hành chính", desc: { vi: "Ghi chú.", en: "Note." } },
      createdAt,
      updatedAt,
    ],
  },
  {
    name: "order_items",
    resource: "/orders (items)",
    desc: {
      vi: "Bảng nối giữa orders và books: mỗi dòng là một cuốn sách trong một đơn. Không có endpoint riêng — đọc/ghi qua trường items của đơn hàng.",
      en: "The join table between orders and books: one row per book in an order. No endpoint of its own — read and written through an order's items field.",
    },
    columns: [
      id({ vi: "Mã dòng.", en: "Line id." }),
      { name: "order_id", type: "integer", ref: "orders.id", readOnly: true, example: 1, desc: { vi: "Đơn hàng chứa dòng này.", en: "The order this line belongs to." } },
      { name: "book_id", type: "integer", ref: "books.id", example: 3, desc: { vi: "Sách được mua.", en: "The book bought." } },
      { name: "quantity", type: "integer", example: 2, desc: { vi: "Số lượng (1–20).", en: "How many (1–20)." } },
      { name: "unit_price", type: "integer", readOnly: true, example: 95000, desc: { vi: "Giá tại thời điểm đặt — sao chép từ books.price, để đổi giá sách sau này không làm đổi đơn cũ.", en: "Price at order time — copied from books.price so a later price change never alters an old order." } },
      { name: "line_total", type: "integer", readOnly: true, example: 190000, desc: { vi: "quantity × unit_price.", en: "quantity × unit_price." } },
    ],
  },
  {
    name: "payments",
    resource: "/payments",
    desc: { vi: "Lần thanh toán cho một đơn. Một đơn có thể có nhiều lần (ví dụ lần đầu thất bại).", en: "A payment attempt for an order. An order can have several (say, a failed first try)." },
    columns: [
      id({ vi: "Mã thanh toán.", en: "Payment id." }),
      { name: "order_id", type: "integer", ref: "orders.id", example: 1, desc: { vi: "Đơn được thanh toán.", en: "The order being paid." } },
      { name: "amount", type: "integer", example: 190000, desc: { vi: "Số tiền — phải đúng bằng total_amount của đơn.", en: "Amount — must equal the order's total_amount." } },
      { name: "method", type: "enum", values: PAYMENT_METHODS, example: "card", desc: { vi: "Phương thức.", en: "Method." } },
      { name: "status", type: "enum", values: PAYMENT_STATUSES, readOnly: true, example: "succeeded", desc: { vi: "Kết quả: succeeded, failed, hoặc refunded sau khi hoàn tiền.", en: "Outcome: succeeded, failed, or refunded after a refund." } },
      { name: "transaction_ref", type: "text", readOnly: true, example: "TXN-20261015-0001", desc: { vi: "Mã giao dịch giả lập từ cổng thanh toán.", en: "Simulated reference from the payment gateway." } },
      { name: "paid_at", type: "timestamp", nullable: true, readOnly: true, example: "2026-10-15T08:31:00.000Z", desc: { vi: "Thời điểm thanh toán thành công (null nếu thất bại).", en: "When it succeeded (null when it failed)." } },
      createdAt,
    ],
  },
  {
    name: "invoices",
    resource: "/invoices",
    desc: {
      vi: "Hoá đơn. Chỉ đọc: hệ thống tự xuất khi một thanh toán thành công, và huỷ (void) khi hoàn tiền.",
      en: "Invoices. Read-only: the system issues one when a payment succeeds, and voids it on a refund.",
    },
    columns: [
      id({ vi: "Mã hoá đơn.", en: "Invoice id." }),
      { name: "invoice_number", type: "text", unique: true, readOnly: true, example: "INV-2026-0001", desc: { vi: "Số hoá đơn.", en: "Invoice number." } },
      { name: "order_id", type: "integer", ref: "orders.id", readOnly: true, example: 1, desc: { vi: "Đơn hàng.", en: "The order." } },
      { name: "payment_id", type: "integer", ref: "payments.id", readOnly: true, example: 1, desc: { vi: "Thanh toán đã tạo ra hoá đơn.", en: "The payment that produced it." } },
      { name: "user_id", type: "integer", ref: "users.id", readOnly: true, example: 1, desc: { vi: "Khách hàng (sao chép từ đơn để tra cứu nhanh).", en: "The customer (copied from the order for quick lookups)." } },
      { name: "amount", type: "integer", readOnly: true, example: 190000, desc: { vi: "Tổng tiền hoá đơn (VND).", en: "Invoice total (VND)." } },
      { name: "status", type: "enum", values: INVOICE_STATUSES, readOnly: true, example: "issued", desc: { vi: "issued hoặc void.", en: "issued or void." } },
      { name: "issued_at", type: "timestamp", readOnly: true, example: "2026-10-15T08:31:00.000Z", desc: { vi: "Ngày xuất.", en: "When it was issued." } },
    ],
  },
];

export const tableByName = (name: TableName): Table => TABLES.find((t) => t.name === name)!;

/** Every foreign key, as edges for the relationship list. */
export const RELATIONS = TABLES.flatMap((table) =>
  table.columns
    .filter((col) => col.ref)
    .map((col) => {
      const [toTable, toColumn] = col.ref!.split(".");

      return { from: table.name, column: col.name, to: toTable as TableName, toColumn };
    })
);
