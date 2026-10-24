// Every endpoint of the bookstore API, described once. The /practice/api guide,
// its worked examples and the OpenAPI spec Scalar renders are all built from
// this list; workedExamples() (lib/sandbox/examples.ts) fails the build if it
// drifts from the engine's routes or their access levels.

import type { Bilingual } from "./schema";

export type Access = "public" | "user" | "admin";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Param {
  name: string;
  in: "path" | "query";
  type: "integer" | "string" | "boolean";
  required?: boolean;
  enum?: readonly string[];
  example?: string | number | boolean;
  desc: Bilingual;
}

/** Who sends the worked example: nobody logged in, Mai (a customer), or the admin. */
export type Actor = null | "customer" | "admin";

export interface ExampleCall {
  as: Actor;
  method: HttpMethod;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}

export interface Operation {
  id: string;
  tag: Tag;
  method: HttpMethod;
  path: string;
  access: Access;
  summary: Bilingual;
  purpose: Bilingual;
  params?: Param[];
  /** OpenAPI component name of the JSON body. */
  bodySchema?: string;
  bodyNote?: Bilingual;
  responses: { status: number; desc: Bilingual }[];
  example: ExampleCall;
  /** Calls run before the example (on the same fresh data), e.g. create something to delete. */
  setup?: ExampleCall[];
}

export type Tag = "Start" | "Auth" | "Authors" | "Books" | "Users" | "Cart" | "Orders" | "Payments" | "Invoices";

export const TAGS: { name: Tag; desc: Bilingual }[] = [
  { name: "Start", desc: { vi: "Thông tin API và sandbox của bạn.", en: "API info and your sandbox." } },
  { name: "Auth", desc: { vi: "Đăng nhập lấy token, đăng ký tài khoản khách hàng.", en: "Log in for a token, register a customer account." } },
  { name: "Authors", desc: { vi: "Tác giả — ai cũng đọc được, chỉ admin được sửa.", en: "Authors — anyone can read, only admins change them." } },
  { name: "Books", desc: { vi: "Danh mục sách — ai cũng đọc được, chỉ admin được sửa.", en: "The catalogue — anyone can read, only admins change it." } },
  { name: "Users", desc: { vi: "Tài khoản. Khách xem/sửa hồ sơ của mình; admin quản lý tất cả.", en: "Accounts. Customers see and edit their own; admins manage everyone." } },
  { name: "Cart", desc: { vi: "Giỏ hàng của người đang đăng nhập — mỗi người một giỏ, lưu trên server.", en: "The logged-in user's shopping cart — one per user, kept on the server." } },
  { name: "Orders", desc: { vi: "Đơn hàng — cần đăng nhập. Khách chỉ thấy đơn của mình.", en: "Orders — login required. Customers see only their own." } },
  { name: "Payments", desc: { vi: "Thanh toán đơn hàng (giả lập). Thành công thì tự xuất hoá đơn.", en: "Paying for orders (simulated). Success issues an invoice automatically." } },
  { name: "Invoices", desc: { vi: "Hoá đơn — chỉ đọc, hệ thống tự tạo.", en: "Invoices — read-only, created by the system." } },
];

// ------------------------------------------------------------------ shared params

const idParam = (what: Bilingual, example = 1): Param => ({ name: "id", in: "path", type: "integer", required: true, example, desc: what });

const listParams = (sortable: string, search: Bilingual): Param[] => [
  { name: "page", in: "query", type: "integer", example: 1, desc: { vi: "Trang thứ mấy (mặc định 1).", en: "Which page (default 1)." } },
  { name: "limit", in: "query", type: "integer", example: 10, desc: { vi: "Số dòng mỗi trang, 1–100 (mặc định 10).", en: "Rows per page, 1–100 (default 10)." } },
  { name: "q", in: "query", type: "string", desc: search },
  { name: "sort", in: "query", type: "string", desc: { vi: `Sắp xếp theo: ${sortable}. Thêm dấu - phía trước để giảm dần, ví dụ -price.`, en: `Sort by: ${sortable}. Prefix with - for descending, e.g. -price.` } },
];

const R = {
  ok: { status: 200, desc: { vi: "Thành công.", en: "Success." } },
  created: { status: 201, desc: { vi: "Đã tạo. Header Location chỉ tới bản ghi mới.", en: "Created. The Location header points at the new row." } },
  noContent: { status: 204, desc: { vi: "Đã xoá — không có body.", en: "Deleted — no body." } },
  bad: { status: 400, desc: { vi: "Body/tham số sai (xem error.details).", en: "Bad body or parameters (see error.details)." } },
  unauth: { status: 401, desc: { vi: "Thiếu hoặc sai token đăng nhập.", en: "Missing or invalid login token." } },
  forbidden: { status: 403, desc: { vi: "Đã đăng nhập nhưng không có quyền.", en: "Logged in, but not allowed." } },
  notFound: { status: 404, desc: { vi: "Không tìm thấy id.", en: "No row with that id." } },
  conflict: { status: 409, desc: { vi: "Xung đột với dữ liệu hiện có.", en: "Conflicts with the current data." } },
  rule: { status: 422, desc: { vi: "Hợp lệ về dạng nhưng vi phạm quy tắc nghiệp vụ.", en: "Well-formed, but breaks a business rule." } },
};

// ------------------------------------------------------------------ operations

const newAuthor = { name: "Nguyễn Ngọc Tư", country: "Vietnam", birth_year: 1976, bio: "Nhà văn Nam Bộ." };
const newBook = { title: "Cánh đồng bất tận", isbn: "978-604-1-00099-9", author_id: 1, genre: "fiction", price: 89000, stock: 20, published_year: 2005 };

export const OPERATIONS: Operation[] = [
  // ---------------------------------------------------------------- Start
  {
    id: "getApiInfo", tag: "Start", method: "GET", path: "/", access: "public",
    summary: { vi: "Thông tin API", en: "API info" },
    purpose: { vi: "Điểm bắt đầu: tên, phiên bản, danh sách tài nguyên và giờ sandbox được làm mới. Gọi thử để kiểm tra key của bạn hoạt động.", en: "The starting point: name, version, the resource list and when your sandbox resets. Call it to check your key works." },
    responses: [R.ok],
    example: { as: null, method: "GET", path: "/" },
  },
  {
    id: "getSandbox", tag: "Start", method: "GET", path: "/sandbox", access: "public",
    summary: { vi: "Sandbox của tôi", en: "My sandbox" },
    purpose: { vi: "Đếm số dòng trong từng bảng của sandbox của bạn — dùng để thấy dữ liệu thay đổi sau mỗi lần POST/DELETE.", en: "Row counts for each table in your sandbox — watch them change after each POST or DELETE." },
    responses: [R.ok],
    example: { as: null, method: "GET", path: "/sandbox" },
  },
  {
    id: "resetSandbox", tag: "Start", method: "POST", path: "/sandbox/reset", access: "public",
    summary: { vi: "Đưa sandbox về dữ liệu mặc định", en: "Reset my sandbox" },
    purpose: { vi: "Xoá mọi thứ bạn đã tạo và nạp lại dữ liệu mẫu. Việc này cũng tự diễn ra lúc 00:00 (giờ Việt Nam) mỗi ngày.", en: "Throw away everything you created and reload the sample data. This also happens by itself at 00:00 Vietnam time every day." },
    responses: [R.ok],
    example: { as: null, method: "POST", path: "/sandbox/reset" },
  },

  // ---------------------------------------------------------------- Auth
  {
    id: "login", tag: "Auth", method: "POST", path: "/auth/login", access: "public",
    summary: { vi: "Đăng nhập — lấy access token", en: "Log in — get an access token" },
    purpose: {
      vi: "Gửi email + mật khẩu, nhận về access_token (một JWT, hết hạn sau 1 giờ). Các API cần đăng nhập đọc token này từ header Authorization: Bearer <token>. Sai email hay sai mật khẩu đều trả cùng một thông báo, để kẻ xấu không dò được email nào tồn tại.",
      en: "Send an email and password, get back an access_token (a JWT that expires in 1 hour). Endpoints that need a login read it from the header Authorization: Bearer <token>. A wrong email and a wrong password give the same message, so nobody can probe which emails exist.",
    },
    bodySchema: "LoginInput",
    responses: [R.ok, R.bad, { status: 401, desc: { vi: "Sai email hoặc mật khẩu.", en: "Wrong email or password." } }],
    example: { as: null, method: "POST", path: "/auth/login", body: { email: "mai.tran@example.com", password: "Customer@123" } },
  },
  {
    id: "register", tag: "Auth", method: "POST", path: "/auth/register", access: "public",
    summary: { vi: "Đăng ký tài khoản khách hàng", en: "Register a customer account" },
    purpose: { vi: "Tạo tài khoản mới với vai trò customer. Mật khẩu chỉ được lưu dưới dạng băm và không bao giờ được trả về. Sau đó gọi /auth/login để lấy token.", en: "Create a new account with the customer role. The password is stored only as a hash and never returned. Then call /auth/login for a token." },
    bodySchema: "RegisterInput",
    responses: [R.created, R.bad, { status: 409, desc: { vi: "Email đã được dùng.", en: "Email already taken." } }],
    example: { as: null, method: "POST", path: "/auth/register", body: { full_name: "Hoàng Gia Bảo", email: "bao.hoang@example.com", password: "MatKhau@2026", phone: "0987654321", address: "99 Nguyễn Huệ, Quận 1, TP.HCM" } },
  },
  {
    id: "me", tag: "Auth", method: "GET", path: "/auth/me", access: "user",
    summary: { vi: "Tôi là ai? (theo token)", en: "Who am I? (from the token)" },
    purpose: { vi: "Trả về người dùng nằm trong token. Cách nhanh nhất để kiểm tra bạn đã gắn header Authorization đúng chưa.", en: "Returns the user inside the token. The quickest way to check your Authorization header is right." },
    responses: [R.ok, R.unauth],
    example: { as: "customer", method: "GET", path: "/auth/me" },
  },

  // ---------------------------------------------------------------- Authors
  {
    id: "listAuthors", tag: "Authors", method: "GET", path: "/authors", access: "public",
    summary: { vi: "Danh sách tác giả", en: "List authors" },
    purpose: { vi: "Đọc danh sách có phân trang. Mọi API danh sách đều trả { data: [...], meta: { page, limit, total, total_pages } }.", en: "A paginated read. Every list endpoint returns { data: [...], meta: { page, limit, total, total_pages } }." },
    params: listParams("id, name, birth_year, created_at", { vi: "Tìm theo tên hoặc quốc gia.", en: "Search name or country." }),
    responses: [R.ok, R.bad],
    example: { as: null, method: "GET", path: "/authors", query: { q: "viet", sort: "-birth_year", limit: "2" } },
  },
  {
    id: "createAuthor", tag: "Authors", method: "POST", path: "/authors", access: "admin",
    summary: { vi: "Thêm tác giả", en: "Create an author" },
    purpose: { vi: "POST tạo bản ghi mới. Server tự gán id, created_at, updated_at — gửi các trường đó lên sẽ bị báo lỗi read-only.", en: "POST creates a new row. The server assigns id, created_at and updated_at — sending them is rejected as read-only." },
    bodySchema: "AuthorInput",
    responses: [R.created, R.bad, R.unauth, R.forbidden],
    example: { as: "admin", method: "POST", path: "/authors", body: newAuthor },
  },
  {
    id: "getAuthor", tag: "Authors", method: "GET", path: "/authors/{id}", access: "public",
    summary: { vi: "Xem một tác giả", en: "Get one author" },
    purpose: { vi: "{id} là path parameter — một phần của URL xác định đúng bản ghi cần lấy.", en: "{id} is a path parameter — part of the URL that names exactly which row you want." },
    params: [idParam({ vi: "Mã tác giả.", en: "Author id." }, 3)],
    responses: [R.ok, R.notFound],
    example: { as: null, method: "GET", path: "/authors/3" },
  },
  {
    id: "replaceAuthor", tag: "Authors", method: "PUT", path: "/authors/{id}", access: "admin",
    summary: { vi: "Thay toàn bộ tác giả (PUT)", en: "Replace an author (PUT)" },
    purpose: { vi: "PUT gửi lại TOÀN BỘ bản ghi. Trường tuỳ chọn nào bị bỏ trống sẽ bị đặt về null — khác với PATCH.", en: "PUT sends the WHOLE row again. Any optional field you leave out is reset to null — unlike PATCH." },
    params: [idParam({ vi: "Mã tác giả.", en: "Author id." }, 3)],
    bodySchema: "AuthorInput",
    responses: [R.ok, R.bad, R.unauth, R.forbidden, R.notFound],
    example: { as: "admin", method: "PUT", path: "/authors/3", body: { name: "Haruki Murakami", country: "Japan", birth_year: 1949 } },
  },
  {
    id: "updateAuthor", tag: "Authors", method: "PATCH", path: "/authors/{id}", access: "admin",
    summary: { vi: "Sửa một phần tác giả (PATCH)", en: "Update part of an author (PATCH)" },
    purpose: { vi: "PATCH chỉ gửi những trường muốn đổi; các trường khác giữ nguyên.", en: "PATCH sends only the fields to change; the rest stay as they are." },
    params: [idParam({ vi: "Mã tác giả.", en: "Author id." }, 3)],
    bodySchema: "AuthorPatch",
    responses: [R.ok, R.bad, R.unauth, R.forbidden, R.notFound],
    example: { as: "admin", method: "PATCH", path: "/authors/3", body: { bio: "Tiểu thuyết gia Nhật Bản." } },
  },
  {
    id: "deleteAuthor", tag: "Authors", method: "DELETE", path: "/authors/{id}", access: "admin",
    summary: { vi: "Xoá tác giả", en: "Delete an author" },
    purpose: { vi: "Chỉ xoá được tác giả chưa có sách — nếu không sẽ nhận 409, vì books.author_id đang trỏ tới (ràng buộc khoá ngoại).", en: "Only an author with no books can go — otherwise 409, because books.author_id still points at them (a foreign-key constraint)." },
    params: [idParam({ vi: "Mã tác giả.", en: "Author id." }, 9)],
    responses: [R.noContent, R.unauth, R.forbidden, R.notFound, R.conflict],
    setup: [{ as: "admin", method: "POST", path: "/authors", body: newAuthor }],
    example: { as: "admin", method: "DELETE", path: "/authors/9" },
  },
  {
    id: "listAuthorBooks", tag: "Authors", method: "GET", path: "/authors/{id}/books", access: "public",
    summary: { vi: "Sách của một tác giả", en: "An author's books" },
    purpose: { vi: "Tài nguyên lồng nhau (nested resource): URL thể hiện quan hệ một-nhiều authors → books.", en: "A nested resource: the URL itself shows the one-to-many authors → books relation." },
    params: [idParam({ vi: "Mã tác giả.", en: "Author id." }), ...listParams("id, title, price, stock, published_year, created_at", { vi: "Tìm theo tên sách hoặc ISBN.", en: "Search title or ISBN." })],
    responses: [R.ok, R.notFound],
    example: { as: null, method: "GET", path: "/authors/1/books", query: { sort: "price" } },
  },

  // ---------------------------------------------------------------- Books
  {
    id: "listBooks", tag: "Books", method: "GET", path: "/books", access: "public",
    summary: { vi: "Danh sách sách (lọc, tìm, sắp xếp)", en: "List books (filter, search, sort)" },
    purpose: { vi: "Query parameters đứng sau dấu ? và nối nhau bằng &. Chúng không đổi tài nguyên, chỉ lọc/sắp xếp/phân trang kết quả.", en: "Query parameters come after ? and are joined with &. They don't change the resource — they filter, sort and page the result." },
    params: [
      ...listParams("id, title, price, stock, published_year, created_at", { vi: "Tìm theo tên sách hoặc ISBN.", en: "Search title or ISBN." }),
      { name: "author_id", in: "query", type: "integer", desc: { vi: "Chỉ sách của tác giả này.", en: "Only this author's books." } },
      { name: "genre", in: "query", type: "string", enum: ["fiction", "children", "history", "science", "technology", "business", "self_help"], desc: { vi: "Thể loại.", en: "Genre." } },
      { name: "min_price", in: "query", type: "integer", desc: { vi: "Giá tối thiểu (VND).", en: "Minimum price (VND)." } },
      { name: "max_price", in: "query", type: "integer", desc: { vi: "Giá tối đa (VND).", en: "Maximum price (VND)." } },
      { name: "in_stock", in: "query", type: "boolean", desc: { vi: "true = còn hàng, false = hết hàng.", en: "true = in stock, false = sold out." } },
    ],
    responses: [R.ok, R.bad],
    example: { as: null, method: "GET", path: "/books", query: { genre: "technology", sort: "-price", limit: "2" } },
  },
  {
    id: "createBook", tag: "Books", method: "POST", path: "/books", access: "admin",
    summary: { vi: "Thêm sách", en: "Create a book" },
    purpose: { vi: "author_id phải trỏ tới một tác giả có thật (nếu không: 422), và ISBN không được trùng (nếu trùng: 409).", en: "author_id must point at a real author (otherwise 422), and the ISBN must be unique (otherwise 409)." },
    bodySchema: "BookInput",
    responses: [R.created, R.bad, R.unauth, R.forbidden, { status: 409, desc: { vi: "ISBN đã tồn tại.", en: "ISBN already exists." } }, { status: 422, desc: { vi: "author_id không tồn tại.", en: "author_id does not exist." } }],
    example: { as: "admin", method: "POST", path: "/books", body: newBook },
  },
  {
    id: "getBook", tag: "Books", method: "GET", path: "/books/{id}", access: "public",
    summary: { vi: "Xem một cuốn sách", en: "Get one book" },
    purpose: { vi: "Đọc một bản ghi theo id. Thử id không tồn tại (ví dụ 999) để thấy 404.", en: "Read one row by id. Try an id that doesn't exist (say 999) to see a 404." },
    params: [idParam({ vi: "Mã sách.", en: "Book id." }, 11)],
    responses: [R.ok, R.notFound],
    example: { as: null, method: "GET", path: "/books/11" },
  },
  {
    id: "replaceBook", tag: "Books", method: "PUT", path: "/books/{id}", access: "admin",
    summary: { vi: "Thay toàn bộ sách (PUT)", en: "Replace a book (PUT)" },
    purpose: { vi: "Gửi đủ mọi trường bắt buộc. Bỏ stock thì stock về 0, bỏ published_year thì về null.", en: "Send every required field. Leave out stock and it becomes 0; leave out published_year and it becomes null." },
    params: [idParam({ vi: "Mã sách.", en: "Book id." }, 11)],
    bodySchema: "BookInput",
    responses: [R.ok, R.bad, R.unauth, R.forbidden, R.notFound, R.conflict, R.rule],
    example: { as: "admin", method: "PUT", path: "/books/11", body: { title: "Clean Code (2nd edition)", isbn: "978-604-1-00011-0", author_id: 6, genre: "technology", price: 480000, stock: 10, published_year: 2025 } },
  },
  {
    id: "updateBook", tag: "Books", method: "PATCH", path: "/books/{id}", access: "admin",
    summary: { vi: "Đổi giá / tồn kho (PATCH)", en: "Change price or stock (PATCH)" },
    purpose: { vi: "Việc thường gặp nhất: đổi một hai trường. Đơn hàng cũ không đổi theo vì order_items lưu unit_price riêng.", en: "The everyday case: change one or two fields. Old orders don't change, because order_items keeps its own unit_price." },
    params: [idParam({ vi: "Mã sách.", en: "Book id." }, 1)],
    bodySchema: "BookPatch",
    responses: [R.ok, R.bad, R.unauth, R.forbidden, R.notFound],
    example: { as: "admin", method: "PATCH", path: "/books/1", body: { price: 99000, stock: 45 } },
  },
  {
    id: "deleteBook", tag: "Books", method: "DELETE", path: "/books/{id}", access: "admin",
    summary: { vi: "Xoá sách", en: "Delete a book" },
    purpose: { vi: "Sách đã nằm trong đơn hàng thì không xoá được (409) — lịch sử đơn phải còn nguyên. Hãy đặt stock = 0.", en: "A book that appears in an order can't be deleted (409) — order history must stay intact. Set stock to 0 instead." },
    params: [idParam({ vi: "Mã sách.", en: "Book id." }, 15)],
    responses: [R.noContent, R.unauth, R.forbidden, R.notFound, R.conflict],
    setup: [{ as: "admin", method: "POST", path: "/books", body: newBook }],
    example: { as: "admin", method: "DELETE", path: "/books/15" },
  },

  // ---------------------------------------------------------------- Users
  {
    id: "listUsers", tag: "Users", method: "GET", path: "/users", access: "admin",
    summary: { vi: "Danh sách người dùng (admin)", en: "List users (admin)" },
    purpose: { vi: "Chỉ admin. Gọi bằng token của khách hàng sẽ nhận 403 — đã xác thực (biết bạn là ai) nhưng không được phân quyền.", en: "Admins only. A customer's token gets 403 — authenticated (we know who you are) but not authorised." },
    params: [
      ...listParams("id, full_name, email, created_at", { vi: "Tìm theo tên, email, điện thoại.", en: "Search name, email or phone." }),
      { name: "role", in: "query", type: "string", enum: ["customer", "admin"], desc: { vi: "Lọc theo vai trò.", en: "Filter by role." } },
    ],
    responses: [R.ok, R.unauth, R.forbidden],
    example: { as: "admin", method: "GET", path: "/users", query: { role: "customer", limit: "2" } },
  },
  {
    id: "createUser", tag: "Users", method: "POST", path: "/users", access: "admin",
    summary: { vi: "Tạo người dùng (admin)", en: "Create a user (admin)" },
    purpose: { vi: "Giống /auth/register nhưng admin được chọn role.", en: "Like /auth/register, but an admin may choose the role." },
    bodySchema: "UserInput",
    responses: [R.created, R.bad, R.unauth, R.forbidden, R.conflict],
    example: { as: "admin", method: "POST", path: "/users", body: { full_name: "Store Staff", email: "staff@bookstore.example", password: "Staff@2026", role: "admin" } },
  },
  {
    id: "getUser", tag: "Users", method: "GET", path: "/users/{id}", access: "user",
    summary: { vi: "Xem hồ sơ người dùng", en: "Get a user" },
    purpose: { vi: "Khách hàng chỉ xem được chính mình (Mai là id 1); id khác → 403. Admin xem được tất cả. Không bao giờ có password_hash trong kết quả.", en: "A customer can only see themselves (Mai is id 1); any other id → 403. Admins see everyone. password_hash is never in the result." },
    params: [idParam({ vi: "Mã người dùng.", en: "User id." })],
    responses: [R.ok, R.unauth, R.forbidden, R.notFound],
    example: { as: "customer", method: "GET", path: "/users/1" },
  },
  {
    id: "replaceUser", tag: "Users", method: "PUT", path: "/users/{id}", access: "user",
    summary: { vi: "Thay toàn bộ hồ sơ (PUT)", en: "Replace a profile (PUT)" },
    purpose: { vi: "Thay cả hồ sơ. Ngoại lệ an toàn: password chỉ đổi khi bạn gửi lên. Khách hàng không được tự đổi role.", en: "Replaces the whole profile. One safe exception: the password changes only if you send one. Customers can't change their own role." },
    params: [idParam({ vi: "Mã người dùng.", en: "User id." })],
    bodySchema: "UserInput",
    responses: [R.ok, R.bad, R.unauth, R.forbidden, R.notFound, R.conflict],
    example: { as: "customer", method: "PUT", path: "/users/1", body: { full_name: "Trần Thị Mai", email: "mai.tran@example.com", phone: "0901234567", address: "20 Nguyễn Trãi, Quận 5, TP.HCM" } },
  },
  {
    id: "updateUser", tag: "Users", method: "PATCH", path: "/users/{id}", access: "user",
    summary: { vi: "Sửa một phần hồ sơ (PATCH)", en: "Update part of a profile (PATCH)" },
    purpose: { vi: "Đổi số điện thoại, địa chỉ hoặc mật khẩu. Gửi role khi là khách hàng → 403.", en: "Change phone, address or password. Sending role as a customer → 403." },
    params: [idParam({ vi: "Mã người dùng.", en: "User id." })],
    bodySchema: "UserPatch",
    responses: [R.ok, R.bad, R.unauth, R.forbidden, R.notFound, R.conflict],
    example: { as: "customer", method: "PATCH", path: "/users/1", body: { phone: "0909999888" } },
  },
  {
    id: "deleteUser", tag: "Users", method: "DELETE", path: "/users/{id}", access: "admin",
    summary: { vi: "Xoá người dùng (admin)", en: "Delete a user (admin)" },
    purpose: { vi: "Người đã có đơn hàng thì không xoá được (409) — dữ liệu kế toán phải giữ lại.", en: "Someone with orders can't be deleted (409) — accounting records must be kept." },
    params: [idParam({ vi: "Mã người dùng.", en: "User id." }, 6)],
    responses: [R.noContent, R.unauth, R.forbidden, R.notFound, R.conflict],
    setup: [{ as: null, method: "POST", path: "/auth/register", body: { full_name: "Tài khoản thử", email: "test.user@example.com", password: "Test@2026" } }],
    example: { as: "admin", method: "DELETE", path: "/users/6" },
  },
  {
    id: "listUserOrders", tag: "Users", method: "GET", path: "/users/{id}/orders", access: "user",
    summary: { vi: "Đơn hàng của một người dùng", en: "A user's orders" },
    purpose: { vi: "Quan hệ một-nhiều users → orders, đọc qua URL lồng nhau.", en: "The one-to-many users → orders relation, read through a nested URL." },
    params: [
      idParam({ vi: "Mã người dùng.", en: "User id." }),
      ...listParams("id, total_amount, created_at, updated_at", { vi: "Tìm trong địa chỉ hoặc ghi chú.", en: "Search address or note." }),
      { name: "status", in: "query", type: "string", enum: ["pending", "paid", "shipped", "delivered", "cancelled"], desc: { vi: "Lọc theo trạng thái.", en: "Filter by status." } },
    ],
    responses: [R.ok, R.unauth, R.forbidden, R.notFound],
    example: { as: "customer", method: "GET", path: "/users/1/orders" },
  },

  // ---------------------------------------------------------------- Cart
  {
    id: "getCart", tag: "Cart", method: "GET", path: "/cart", access: "user",
    summary: { vi: "Xem giỏ hàng", en: "Get the cart" },
    purpose: {
      vi: "Không có id trong URL: \"giỏ của tôi\" được xác định bằng token. Mỗi dòng kèm thông tin sách, giá hiện tại, line_total và in_stock; cuối cùng là item_count và subtotal. Giỏ không giữ hàng — in_stock: false nghĩa là đã có người mua hết trước.",
      en: "No id in the URL: \"my cart\" is identified by the token. Each line comes with the book, its current price, line_total and in_stock, then item_count and subtotal. A cart doesn't reserve stock — in_stock: false means someone else bought the copies first.",
    },
    responses: [R.ok, R.unauth],
    example: { as: "customer", method: "GET", path: "/cart" },
  },
  {
    id: "addCartItem", tag: "Cart", method: "POST", path: "/cart/items", access: "user",
    summary: { vi: "Thêm sách vào giỏ", en: "Add a book to the cart" },
    purpose: {
      vi: "Sách chưa có trong giỏ → tạo dòng mới, 201. Sách đã có → cộng dồn số lượng vào dòng cũ, 200 — cùng một request, hai mã khác nhau tuỳ dữ liệu. Không đủ hàng hoặc quá 20 cuốn → 422. Trả về cả giỏ.",
      en: "A book not yet in the cart → a new line, 201. A book already there → its quantity goes up, 200 — the same request, two different codes depending on the data. Not enough stock, or more than 20 copies → 422. Returns the whole cart.",
    },
    bodySchema: "CartItemInput",
    responses: [R.created, R.ok, R.bad, R.unauth, { status: 422, desc: { vi: "Sách không tồn tại, hết hàng hoặc vượt giới hạn.", en: "Unknown book, out of stock, or over the limit." } }],
    example: { as: "customer", method: "POST", path: "/cart/items", body: { book_id: 9, quantity: 1 } },
  },
  {
    id: "updateCartItem", tag: "Cart", method: "PATCH", path: "/cart/items/{id}", access: "user",
    summary: { vi: "Đổi số lượng", en: "Change the quantity" },
    purpose: {
      vi: "Đặt số lượng mới (không phải cộng thêm). Muốn bỏ một dòng thì dùng DELETE, không gửi quantity: 0 (→ 400). Dòng trong giỏ người khác → 403.",
      en: "Sets the new quantity (it doesn't add). To drop a line use DELETE — quantity: 0 is a 400. A line in someone else's cart → 403.",
    },
    params: [idParam({ vi: "Mã dòng giỏ hàng (id trong GET /cart, không phải book_id).", en: "Cart line id (the id from GET /cart, not the book_id)." })],
    bodySchema: "CartItemPatch",
    responses: [R.ok, R.bad, R.unauth, R.forbidden, R.notFound, { status: 422, desc: { vi: "Không đủ hàng.", en: "Not enough stock." } }],
    example: { as: "customer", method: "PATCH", path: "/cart/items/1", body: { quantity: 2 } },
  },
  {
    id: "removeCartItem", tag: "Cart", method: "DELETE", path: "/cart/items/{id}", access: "user",
    summary: { vi: "Bỏ một dòng khỏi giỏ", en: "Remove a line" },
    purpose: { vi: "204, không có body. Giỏ hàng không phải lịch sử nên xoá thật — khác với đơn hàng chỉ được huỷ.", en: "204, no body. A cart isn't history, so the row is really deleted — unlike an order, which can only be cancelled." },
    params: [idParam({ vi: "Mã dòng giỏ hàng.", en: "Cart line id." })],
    responses: [R.noContent, R.unauth, R.forbidden, R.notFound],
    example: { as: "customer", method: "DELETE", path: "/cart/items/1" },
  },
  {
    id: "clearCart", tag: "Cart", method: "DELETE", path: "/cart", access: "user",
    summary: { vi: "Làm trống giỏ", en: "Empty the cart" },
    purpose: {
      vi: "Xoá mọi dòng trong giỏ của bạn. Cửa hàng web gọi nó ngay sau khi POST /orders thành công — đặt hàng không tự động làm trống giỏ, client phải tự gọi.",
      en: "Deletes every line in your cart. The web store calls it right after POST /orders succeeds — placing an order doesn't empty the cart by itself; the client has to.",
    },
    responses: [R.noContent, R.unauth],
    example: { as: "customer", method: "DELETE", path: "/cart" },
  },

  // ---------------------------------------------------------------- Orders
  {
    id: "listOrders", tag: "Orders", method: "GET", path: "/orders", access: "user",
    summary: { vi: "Danh sách đơn hàng", en: "List orders" },
    purpose: { vi: "Cùng một URL nhưng kết quả tuỳ người gọi: khách thấy đơn của mình, admin thấy mọi đơn. Server quyết định dựa trên token, không dựa trên tham số bạn gửi.", en: "Same URL, different result per caller: a customer sees their own orders, an admin sees all. The server decides from the token, not from anything you send." },
    params: [
      ...listParams("id, total_amount, created_at, updated_at", { vi: "Tìm trong địa chỉ hoặc ghi chú.", en: "Search address or note." }),
      { name: "status", in: "query", type: "string", enum: ["pending", "paid", "shipped", "delivered", "cancelled"], desc: { vi: "Lọc theo trạng thái.", en: "Filter by status." } },
      { name: "user_id", in: "query", type: "integer", desc: { vi: "Lọc theo người dùng (hữu ích với admin).", en: "Filter by user (useful for admins)." } },
    ],
    responses: [R.ok, R.unauth],
    example: { as: "customer", method: "GET", path: "/orders" },
  },
  {
    id: "createOrder", tag: "Orders", method: "POST", path: "/orders", access: "user",
    summary: { vi: "Đặt hàng", en: "Place an order" },
    purpose: {
      vi: "Không gửi user_id — đơn thuộc về người trong token. Không gửi giá — server lấy books.price, tính total_amount, trừ tồn kho. Đơn mới luôn ở trạng thái pending chờ thanh toán.",
      en: "Don't send user_id — the order belongs to whoever is in the token. Don't send prices — the server reads books.price, computes total_amount and takes the copies out of stock. A new order is always pending until paid.",
    },
    bodySchema: "OrderInput",
    responses: [R.created, R.bad, R.unauth, { status: 422, desc: { vi: "Sách không tồn tại hoặc không đủ hàng.", en: "Unknown book or not enough stock." } }],
    example: { as: "customer", method: "POST", path: "/orders", body: { items: [{ book_id: 3, quantity: 1 }, { book_id: 14, quantity: 2 }], note: "Giao buổi tối" } },
  },
  {
    id: "getOrder", tag: "Orders", method: "GET", path: "/orders/{id}", access: "user",
    summary: { vi: "Xem một đơn hàng", en: "Get one order" },
    purpose: { vi: "Trả về đơn kèm items (các dòng order_items). Đơn của người khác → 403.", en: "Returns the order with its items (the order_items rows). Someone else's order → 403." },
    params: [idParam({ vi: "Mã đơn hàng.", en: "Order id." })],
    responses: [R.ok, R.unauth, R.forbidden, R.notFound],
    example: { as: "customer", method: "GET", path: "/orders/1" },
  },
  {
    id: "updateOrder", tag: "Orders", method: "PATCH", path: "/orders/{id}", access: "user",
    summary: { vi: "Đổi trạng thái / huỷ đơn", en: "Change status / cancel" },
    purpose: {
      vi: "Trạng thái là một máy trạng thái: pending → cancelled (khách tự huỷ, hoàn lại tồn kho), paid → shipped → delivered (chỉ admin). Bước sai → 409. Đơn đã thanh toán muốn huỷ phải hoàn tiền.",
      en: "Status is a state machine: pending → cancelled (the customer may cancel; stock comes back), paid → shipped → delivered (admins only). A wrong step → 409. A paid order is cancelled by refunding it.",
    },
    params: [idParam({ vi: "Mã đơn hàng.", en: "Order id." }, 4)],
    bodySchema: "OrderPatch",
    responses: [R.ok, R.bad, R.unauth, R.forbidden, R.notFound, { status: 409, desc: { vi: "Chuyển trạng thái không hợp lệ.", en: "Invalid status transition." } }],
    example: { as: "customer", method: "PATCH", path: "/orders/4", body: { status: "cancelled" } },
  },

  // ---------------------------------------------------------------- Payments
  {
    id: "listPayments", tag: "Payments", method: "GET", path: "/payments", access: "user",
    summary: { vi: "Danh sách thanh toán", en: "List payments" },
    purpose: { vi: "Mọi lần thanh toán, kể cả lần thất bại. Khách thấy của mình, admin thấy tất cả.", en: "Every payment attempt, failed ones included. Customers see their own, admins see all." },
    params: [
      ...listParams("id, amount, created_at", { vi: "Tìm theo mã giao dịch.", en: "Search the transaction reference." }),
      { name: "order_id", in: "query", type: "integer", desc: { vi: "Thanh toán của một đơn.", en: "Payments for one order." } },
      { name: "status", in: "query", type: "string", enum: ["succeeded", "failed", "refunded"], desc: { vi: "Lọc theo kết quả.", en: "Filter by outcome." } },
      { name: "method", in: "query", type: "string", enum: ["card", "bank_transfer", "e_wallet", "cash_on_delivery"], desc: { vi: "Lọc theo phương thức.", en: "Filter by method." } },
    ],
    responses: [R.ok, R.unauth],
    example: { as: "admin", method: "GET", path: "/payments", query: { order_id: "3" } },
  },
  {
    id: "createPayment", tag: "Payments", method: "POST", path: "/payments", access: "user",
    summary: { vi: "Thanh toán một đơn", en: "Pay for an order" },
    purpose: {
      vi: "amount phải bằng đúng total_amount (sai → 422). Thành công: đơn chuyển paid và hệ thống tự xuất hoá đơn (có trong response). Gửi \"simulate_failure\": true để giả lập thẻ bị từ chối → 402.",
      en: "amount must equal total_amount exactly (otherwise 422). On success the order becomes paid and an invoice is issued automatically (it's in the response). Send \"simulate_failure\": true to fake a declined card → 402.",
    },
    bodySchema: "PaymentInput",
    responses: [R.created, { status: 402, desc: { vi: "Thanh toán bị từ chối (giả lập).", en: "Payment declined (simulated)." } }, R.bad, R.unauth, R.forbidden, { status: 409, desc: { vi: "Đơn không ở trạng thái pending.", en: "Order is not pending." } }, { status: 422, desc: { vi: "Sai số tiền hoặc đơn không tồn tại.", en: "Wrong amount or unknown order." } }],
    example: { as: "customer", method: "POST", path: "/payments", body: { order_id: 4, amount: 258000, method: "e_wallet" } },
  },
  {
    id: "getPayment", tag: "Payments", method: "GET", path: "/payments/{id}", access: "user",
    summary: { vi: "Xem một thanh toán", en: "Get one payment" },
    purpose: { vi: "Kèm invoice_id nếu thanh toán đã tạo hoá đơn.", en: "Includes invoice_id when the payment produced an invoice." },
    params: [idParam({ vi: "Mã thanh toán.", en: "Payment id." })],
    responses: [R.ok, R.unauth, R.forbidden, R.notFound],
    example: { as: "customer", method: "GET", path: "/payments/1" },
  },
  {
    id: "refundPayment", tag: "Payments", method: "POST", path: "/payments/{id}/refund", access: "admin",
    summary: { vi: "Hoàn tiền (admin)", en: "Refund (admin)" },
    purpose: { vi: "Một hành động (action) chứ không phải sửa trường: thanh toán → refunded, đơn → cancelled, hoá đơn → void, tồn kho được cộng lại — tất cả trong một request. Chỉ được khi đơn chưa giao.", en: "An action, not a field edit: payment → refunded, order → cancelled, invoice → void, stock restored — all in one request. Only before the order ships." },
    params: [idParam({ vi: "Mã thanh toán.", en: "Payment id." }, 2)],
    responses: [R.ok, R.unauth, R.forbidden, R.notFound, R.conflict],
    example: { as: "admin", method: "POST", path: "/payments/2/refund" },
  },

  // ---------------------------------------------------------------- Invoices
  {
    id: "listInvoices", tag: "Invoices", method: "GET", path: "/invoices", access: "user",
    summary: { vi: "Danh sách hoá đơn", en: "List invoices" },
    purpose: { vi: "Hoá đơn chỉ có GET: không ai được tạo/sửa tay, chúng sinh ra từ thanh toán.", en: "Invoices are GET-only: nobody creates or edits them by hand; they come from payments." },
    params: [
      ...listParams("id, amount, issued_at", { vi: "Tìm theo số hoá đơn.", en: "Search the invoice number." }),
      { name: "status", in: "query", type: "string", enum: ["issued", "void"], desc: { vi: "Lọc theo trạng thái.", en: "Filter by status." } },
      { name: "order_id", in: "query", type: "integer", desc: { vi: "Hoá đơn của một đơn.", en: "Invoices for one order." } },
      { name: "user_id", in: "query", type: "integer", desc: { vi: "Hoá đơn của một người (admin).", en: "Invoices for one user (admin)." } },
    ],
    responses: [R.ok, R.unauth],
    example: { as: "customer", method: "GET", path: "/invoices" },
  },
  {
    id: "getInvoice", tag: "Invoices", method: "GET", path: "/invoices/{id}", access: "user",
    summary: { vi: "Xem một hoá đơn", en: "Get one invoice" },
    purpose: { vi: "Hoá đơn của người khác → 403.", en: "Someone else's invoice → 403." },
    params: [idParam({ vi: "Mã hoá đơn.", en: "Invoice id." })],
    responses: [R.ok, R.unauth, R.forbidden, R.notFound],
    example: { as: "customer", method: "GET", path: "/invoices/1" },
  },
];

/** Deliberate mistakes, run like the examples, so the guide can show real error responses. */
export const MISTAKES: { id: string; title: Bilingual; lesson: Bilingual; call: ExampleCall; omitToken?: boolean; rawAuthorization?: string }[] = [
  {
    id: "no-token",
    title: { vi: "Quên header Authorization", en: "Forgetting the Authorization header" },
    lesson: { vi: "401 Unauthorized: server không biết bạn là ai. Header WWW-Authenticate gợi ý cách xác thực.", en: "401 Unauthorized: the server doesn't know who you are. The WWW-Authenticate header says how to authenticate." },
    call: { as: null, method: "GET", path: "/orders" },
  },
  {
    id: "no-bearer",
    title: { vi: "Thiếu chữ Bearer", en: "Leaving out the word Bearer" },
    lesson: { vi: "Header phải là “Bearer” + dấu cách + token. Chỉ dán token thôi là sai định dạng.", en: "The header is “Bearer”, a space, then the token. Pasting the bare token is the wrong format." },
    call: { as: null, method: "GET", path: "/auth/me" },
    rawAuthorization: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…",
  },
  {
    id: "forbidden",
    title: { vi: "Khách hàng gọi API của admin", en: "A customer calling an admin endpoint" },
    lesson: { vi: "403 Forbidden khác 401: token hợp lệ, server biết bạn là Mai, nhưng Mai không có quyền.", en: "403 Forbidden is not 401: the token is valid and the server knows you're Mai — Mai just isn't allowed." },
    call: { as: "customer", method: "GET", path: "/users" },
  },
  {
    id: "validation",
    title: { vi: "Body sai kiểu dữ liệu", en: "A body with the wrong types" },
    lesson: { vi: "400 kèm details liệt kê từng trường sai — đọc details trước khi đoán.", en: "400 with details listing each bad field — read the details before guessing." },
    call: { as: "admin", method: "POST", path: "/books", body: { title: "", price: "89000", genre: "novel", id: 99 } },
  },
  {
    id: "stock",
    title: { vi: "Đặt sách đã hết hàng", en: "Ordering a sold-out book" },
    lesson: { vi: "422: JSON đúng dạng nhưng vi phạm quy tắc nghiệp vụ (Kafka bên bờ biển còn 0 cuốn).", en: "422: the JSON is well-formed but breaks a business rule (Kafka on the Shore has 0 copies)." },
    call: { as: "customer", method: "POST", path: "/orders", body: { items: [{ book_id: 6, quantity: 1 }] } },
  },
  {
    id: "transition",
    title: { vi: "Nhảy cóc trạng thái đơn", en: "Skipping an order status" },
    lesson: { vi: "409 Conflict: đơn 4 đang pending nên không thể chuyển thẳng sang delivered.", en: "409 Conflict: order 4 is pending, so it can't jump straight to delivered." },
    call: { as: "admin", method: "PATCH", path: "/orders/4", body: { status: "delivered" } },
  },
  {
    id: "not-found",
    title: { vi: "Id không tồn tại", en: "An id that doesn't exist" },
    lesson: { vi: "404 Not Found: URL đúng dạng nhưng không có sách số 999.", en: "404 Not Found: the URL is well-formed but there is no book 999." },
    call: { as: null, method: "GET", path: "/books/999" },
  },
  {
    id: "method",
    title: { vi: "Sai method", en: "The wrong method" },
    lesson: { vi: "405: đường dẫn có tồn tại, nhưng hoá đơn không cho DELETE. Header Allow liệt kê method hợp lệ.", en: "405: the path exists, but invoices can't be DELETEd. The Allow header lists the valid methods." },
    call: { as: "admin", method: "DELETE", path: "/invoices/1" },
  },
];

/** Seed accounts learners log in with — the passwords are public on purpose. */
export const DEMO_ACCOUNTS = [
  { email: "mai.tran@example.com", password: "Customer@123", role: "customer", name: "Trần Thị Mai", id: 1 },
  { email: "nam.le@example.com", password: "Customer@123", role: "customer", name: "Lê Văn Nam", id: 2 },
  { email: "admin@bookstore.example", password: "Admin@123", role: "admin", name: "Bookstore Admin", id: 5 },
] as const;

export const API_BASE_PATH = "/api/sandbox/v1";
export const SANDBOX_KEY_HEADER = "X-Sandbox-Key";
