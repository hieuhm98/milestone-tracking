// Design-practice exercises for the /practice/questions page.
//
// Each exercise is an OPEN-ENDED prompt: read it, work out the answer on paper
// (draw the schema / list the routes / sketch the architecture), THEN reveal the
// model answer to check yourself. Answers are Markdown (rendered with the same
// ReactMarkdown pipeline as knowledge articles) and always explain the WHY and
// the HOW, not just the final shape.
//
// Authoring notes:
//   * Answer/prompt strings are flush-left template literals — keep content at
//     column 0. Code blocks are indented exactly 4 spaces. Avoid inline
//     backticks (they close the template literal); use **bold** for identifiers.
//   * Add more freely: push new objects onto EXERCISES with a unique id.

import { FINTECH_EXERCISES } from "./exercises-fintech";

export type ExerciseCategory = "database" | "api" | "aws" | "fintech";
export type Difficulty = "easy" | "medium" | "hard";

export interface Exercise {
  id: string;
  category: ExerciseCategory;
  difficulty: Difficulty;
  title: { vi: string; en: string };
  prompt: { vi: string; en: string };
  answer: { vi: string; en: string };
}

export const CATEGORIES: {
  id: ExerciseCategory;
  label: { vi: string; en: string };
  icon: string;
  accent: string; // tailwind text color
}[] = [
  { id: "database", label: { vi: "Thiết kế CSDL", en: "Database Design" }, icon: "▤", accent: "text-emerald-300" },
  { id: "api", label: { vi: "Thiết kế API", en: "API Routes" }, icon: "⇄", accent: "text-sky-300" },
  { id: "aws", label: { vi: "Kiến trúc AWS", en: "AWS Architecture" }, icon: "☁", accent: "text-amber-300" },
  { id: "fintech", label: { vi: "Phân tích dữ liệu Fintech", en: "Fintech Data Analysis" }, icon: "₫", accent: "text-violet-300" },
];

// ---------------------------------------------------------------------------
// DATABASE DESIGN
// ---------------------------------------------------------------------------

const dbBlog: Exercise = {
  id: "db-blog",
  category: "database",
  difficulty: "easy",
  title: { vi: "Lược đồ cho một blog đơn giản", en: "Schema for a simple blog" },
  prompt: {
    vi: "Thiết kế lược đồ CSDL quan hệ cho một blog: người dùng viết bài, mỗi bài có nhiều bình luận. Xác định bảng, khóa chính, khóa ngoại và kiểu dữ liệu. Viết câu lệnh CREATE TABLE.",
    en: "Design a relational schema for a blog: users write posts, each post has many comments. Define the tables, primary keys, foreign keys and data types, and write the CREATE TABLE statements.",
  },
  answer: {
    vi: `## Lời giải mẫu

Ba bảng: **users**, **posts**, **comments** — quan hệ 1‑nhiều (một user → nhiều posts; một post → nhiều comments).

    CREATE TABLE users (
      id         INTEGER PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE posts (
      id         INTEGER PRIMARY KEY,
      author_id  INTEGER NOT NULL REFERENCES users(id),
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      published  INTEGER NOT NULL DEFAULT 0,   -- 0/1 boolean
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE comments (
      id         INTEGER PRIMARY KEY,
      post_id    INTEGER NOT NULL REFERENCES posts(id),
      author_id  INTEGER NOT NULL REFERENCES users(id),
      body       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_posts_author ON posts(author_id);
    CREATE INDEX idx_comments_post ON comments(post_id);

**Tại sao (why)**
- Mỗi thực thể độc lập thành một bảng riêng → tránh lặp dữ liệu (chuẩn hóa). Sửa tên user một chỗ, không phải sửa trên từng bài viết.
- **author_id** / **post_id** là khóa ngoại: đảm bảo toàn vẹn tham chiếu — không thể có bình luận trỏ tới bài viết không tồn tại.
- **email UNIQUE** để không trùng tài khoản.

**Cách làm (how)**
- Đặt khóa chính đại diện (**id** tự tăng) thay vì dùng email làm khóa — email có thể đổi, khóa thì không nên đổi.
- Thêm index trên các cột khóa ngoại vì ta thường JOIN / lọc theo chúng (lấy mọi bình luận của một bài).
- **created_at** để sắp xếp theo thời gian; lưu dạng ISO text trong SQLite.`,
    en: `## Model solution

Three tables: **users**, **posts**, **comments** — one‑to‑many relationships (one user → many posts; one post → many comments).

    CREATE TABLE users (
      id         INTEGER PRIMARY KEY,
      email      TEXT NOT NULL UNIQUE,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE posts (
      id         INTEGER PRIMARY KEY,
      author_id  INTEGER NOT NULL REFERENCES users(id),
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      published  INTEGER NOT NULL DEFAULT 0,   -- 0/1 boolean
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE comments (
      id         INTEGER PRIMARY KEY,
      post_id    INTEGER NOT NULL REFERENCES posts(id),
      author_id  INTEGER NOT NULL REFERENCES users(id),
      body       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_posts_author ON posts(author_id);
    CREATE INDEX idx_comments_post ON comments(post_id);

**Why**
- Each entity gets its own table so data is not duplicated (normalization). Rename a user in one place, not on every post.
- **author_id** / **post_id** are foreign keys enforcing referential integrity — you cannot have a comment pointing at a post that does not exist.
- **email UNIQUE** prevents duplicate accounts.

**How**
- Use a surrogate primary key (auto‑increment **id**) rather than email — emails change, keys should not.
- Index the foreign‑key columns because you routinely JOIN / filter on them (fetch all comments for a post).
- **created_at** enables chronological ordering; store ISO text in SQLite.`,
  },
};

const dbManyToMany: Exercise = {
  id: "db-enrollment",
  category: "database",
  difficulty: "medium",
  title: { vi: "Quan hệ nhiều‑nhiều: sinh viên & khóa học", en: "Many‑to‑many: students & courses" },
  prompt: {
    vi: "Một sinh viên đăng ký nhiều khóa học, một khóa học có nhiều sinh viên. Mô hình hóa quan hệ nhiều‑nhiều này và cho phép lưu thêm điểm số + ngày đăng ký. Giải thích tại sao cần bảng trung gian.",
    en: "A student enrolls in many courses; a course has many students. Model this many‑to‑many relationship and allow storing a grade + enrollment date. Explain why a junction table is required.",
  },
  answer: {
    vi: `## Lời giải mẫu

CSDL quan hệ không lưu trực tiếp quan hệ nhiều‑nhiều — ta tách ra một **bảng nối (junction)** là **enrollments**.

    CREATE TABLE students (
      id   INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE courses (
      id    INTEGER PRIMARY KEY,
      code  TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL
    );

    CREATE TABLE enrollments (
      student_id  INTEGER NOT NULL REFERENCES students(id),
      course_id   INTEGER NOT NULL REFERENCES courses(id),
      enrolled_on TEXT NOT NULL DEFAULT (datetime('now')),
      grade       REAL,                    -- NULL cho tới khi có điểm
      PRIMARY KEY (student_id, course_id)  -- khóa chính ghép
    );

**Tại sao (why)**
- Nếu nhét danh sách khóa học vào một cột của bảng **students** (ví dụ "1,4,7") sẽ vi phạm dạng chuẩn 1 (1NF) — không JOIN được, không ràng buộc được, khó truy vấn "ai học khóa X".
- Bảng nối biến 1 quan hệ nhiều‑nhiều thành 2 quan hệ một‑nhiều, thứ mà CSDL quan hệ xử lý tốt.
- **Khóa chính ghép (student_id, course_id)** chặn đăng ký trùng một sinh viên vào cùng khóa 2 lần.

**Cách làm (how)**
- Thuộc tính của bản thân "việc đăng ký" (điểm, ngày) thuộc về bảng nối, không thuộc students hay courses.
- Ví dụ truy vấn — bảng điểm của một sinh viên:

      SELECT c.code, c.title, e.grade
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = 42;`,
    en: `## Model solution

A relational DB cannot store a many‑to‑many link directly — you extract a **junction table**, **enrollments**.

    CREATE TABLE students (
      id   INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE courses (
      id    INTEGER PRIMARY KEY,
      code  TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL
    );

    CREATE TABLE enrollments (
      student_id  INTEGER NOT NULL REFERENCES students(id),
      course_id   INTEGER NOT NULL REFERENCES courses(id),
      enrolled_on TEXT NOT NULL DEFAULT (datetime('now')),
      grade       REAL,                    -- NULL until graded
      PRIMARY KEY (student_id, course_id)  -- composite key
    );

**Why**
- Stuffing a course list into a **students** column (e.g. "1,4,7") breaks first normal form (1NF) — you cannot JOIN, cannot enforce constraints, and cannot answer "who takes course X".
- A junction table turns one many‑to‑many into two one‑to‑many relationships, which relational DBs handle well.
- The **composite primary key (student_id, course_id)** blocks enrolling the same student in the same course twice.

**How**
- Attributes of the enrollment itself (grade, date) live on the junction table, not on students or courses.
- Example query — a student's transcript:

      SELECT c.code, c.title, e.grade
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = 42;`,
  },
};

const dbOrders: Exercise = {
  id: "db-orders",
  category: "database",
  difficulty: "medium",
  title: { vi: "Đơn hàng thương mại điện tử", en: "E‑commerce orders" },
  prompt: {
    vi: "Thiết kế lược đồ cho đơn hàng: khách hàng, đơn hàng, sản phẩm, và các dòng sản phẩm trong đơn. Yêu cầu quan trọng: nếu giá sản phẩm thay đổi trong tương lai, các đơn cũ vẫn phải hiển thị giá tại thời điểm mua. Xử lý thế nào?",
    en: "Design a schema for orders: customers, orders, products, and the line items in an order. Key requirement: if a product's price changes later, old orders must still show the price paid at purchase time. How do you handle that?",
  },
  answer: {
    vi: `## Lời giải mẫu

    CREATE TABLE customers (
      id    INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name  TEXT NOT NULL
    );

    CREATE TABLE products (
      id    INTEGER PRIMARY KEY,
      name  TEXT NOT NULL,
      price REAL NOT NULL          -- giá HIỆN TẠI, sẽ thay đổi
    );

    CREATE TABLE orders (
      id          INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      status      TEXT NOT NULL DEFAULT 'pending',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE order_items (
      id         INTEGER PRIMARY KEY,
      order_id   INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity   INTEGER NOT NULL CHECK (quantity > 0),
      unit_price REAL NOT NULL     -- ẢNH CHỤP giá lúc mua
    );

**Tại sao (why)**
- Mấu chốt là cột **unit_price** trên **order_items**. Ta "chụp lại" (snapshot) giá tại thời điểm đặt hàng, KHÔNG JOIN sang **products.price** để lấy giá — vì giá đó sẽ đổi.
- Nếu chỉ đọc giá từ **products**, một lần tăng giá sẽ làm sai lệch mọi hóa đơn lịch sử, sai kế toán.
- **order_items** cũng chính là bảng nối nhiều‑nhiều giữa orders và products, có thêm thuộc tính (số lượng, giá).

**Cách làm (how)**
- Khi tạo đơn: copy **products.price** hiện tại vào **order_items.unit_price**.
- Tổng đơn tính từ ảnh chụp:

      SELECT o.id, SUM(oi.quantity * oi.unit_price) AS total
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id;

- Mẹo tổng quát: mọi dữ liệu "tại thời điểm giao dịch" (giá, thuế, địa chỉ giao hàng) nên được snapshot vào đơn, không tham chiếu tới bản ghi có thể thay đổi.`,
    en: `## Model solution

    CREATE TABLE customers (
      id    INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name  TEXT NOT NULL
    );

    CREATE TABLE products (
      id    INTEGER PRIMARY KEY,
      name  TEXT NOT NULL,
      price REAL NOT NULL          -- CURRENT price, will change
    );

    CREATE TABLE orders (
      id          INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      status      TEXT NOT NULL DEFAULT 'pending',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE order_items (
      id         INTEGER PRIMARY KEY,
      order_id   INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity   INTEGER NOT NULL CHECK (quantity > 0),
      unit_price REAL NOT NULL     -- SNAPSHOT of price at purchase
    );

**Why**
- The crux is the **unit_price** column on **order_items**. You snapshot the price at order time and do NOT read the live **products.price** for historical totals — that price will change.
- Reading price only from **products** means a single price rise corrupts every past invoice and your accounting.
- **order_items** is also the many‑to‑many junction between orders and products, carrying extra attributes (quantity, price).

**How**
- On order creation, copy the current **products.price** into **order_items.unit_price**.
- Compute the order total from the snapshot:

      SELECT o.id, SUM(oi.quantity * oi.unit_price) AS total
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id;

- General rule: any "as‑of‑transaction" data (price, tax, shipping address) should be snapshotted onto the order, not referenced from a mutable record.`,
  },
};

const dbAuditSoftDelete: Exercise = {
  id: "db-audit",
  category: "database",
  difficulty: "hard",
  title: { vi: "Xóa mềm, audit & chiến lược index", en: "Soft delete, audit & indexing" },
  prompt: {
    vi: "Cho một bảng **articles** đang có. Yêu cầu: (1) không xóa cứng bản ghi mà đánh dấu đã xóa; (2) ghi nhận ai sửa lần cuối và khi nào; (3) truy vấn phổ biến là 'lấy các bài chưa xóa của một tác giả, mới nhất trước'. Thêm cột và index phù hợp, giải thích đánh đổi.",
    en: "Given an existing **articles** table. Requirements: (1) never hard‑delete rows, just mark them deleted; (2) record who last edited and when; (3) the common query is 'list non‑deleted articles for an author, newest first'. Add the right columns and indexes, and discuss the trade‑offs.",
  },
  answer: {
    vi: `## Lời giải mẫu

    ALTER TABLE articles ADD COLUMN deleted_at   TEXT;             -- NULL = còn sống
    ALTER TABLE articles ADD COLUMN updated_at   TEXT;
    ALTER TABLE articles ADD COLUMN updated_by   INTEGER REFERENCES users(id);

    -- Index phủ cho truy vấn "bài chưa xóa của tác giả, mới nhất trước".
    -- SQLite: dùng partial index để chỉ lập index các dòng chưa xóa.
    CREATE INDEX idx_articles_author_live
      ON articles(author_id, created_at DESC)
      WHERE deleted_at IS NULL;

**Tại sao (why)**
- **Xóa mềm** (**deleted_at** dạng timestamp thay vì cờ boolean) vừa cho biết đã xóa vừa cho biết xóa khi nào — hữu ích cho khôi phục và audit. Mọi truy vấn "đang hoạt động" thêm điều kiện **WHERE deleted_at IS NULL**.
- **Partial index** (có mệnh đề WHERE) nhỏ hơn và nhanh hơn index thường vì bỏ qua các dòng đã xóa — đúng bằng tập ta hay truy vấn.
- Thứ tự cột index **(author_id, created_at DESC)** khớp mẫu truy vấn: lọc bằng author rồi sắp theo thời gian → CSDL đọc index theo đúng thứ tự, không cần sort lại.

**Đánh đổi (trade‑offs)**
- Index tăng tốc đọc nhưng làm chậm ghi (mỗi INSERT/UPDATE phải cập nhật index) và tốn dung lượng — chỉ thêm index cho truy vấn thật sự nóng.
- Xóa mềm khiến bảng phình to theo thời gian và bạn PHẢI nhớ thêm điều kiện lọc ở mọi nơi (dễ lộ dữ liệu đã xóa nếu quên). Cân nhắc một VIEW **active_articles** đã lọc sẵn.
- **updated_at** nên được set bởi ứng dụng hoặc trigger; SQLite không tự cập nhật cột khi UPDATE.`,
    en: `## Model solution

    ALTER TABLE articles ADD COLUMN deleted_at   TEXT;             -- NULL = alive
    ALTER TABLE articles ADD COLUMN updated_at   TEXT;
    ALTER TABLE articles ADD COLUMN updated_by   INTEGER REFERENCES users(id);

    -- Covering index for "author's live articles, newest first".
    -- SQLite: a partial index only indexes the non‑deleted rows.
    CREATE INDEX idx_articles_author_live
      ON articles(author_id, created_at DESC)
      WHERE deleted_at IS NULL;

**Why**
- **Soft delete** (a **deleted_at** timestamp rather than a boolean flag) tells you both that and when a row was deleted — useful for restore and audit. Every "live" query adds **WHERE deleted_at IS NULL**.
- A **partial index** (with a WHERE clause) is smaller and faster than a full index because it skips deleted rows — exactly the set you query.
- The column order **(author_id, created_at DESC)** matches the access pattern: filter by author, then order by time → the DB reads the index in order, no extra sort.

**Trade‑offs**
- Indexes speed reads but slow writes (every INSERT/UPDATE must maintain them) and cost space — only add them for genuinely hot queries.
- Soft delete grows the table over time and you MUST remember the filter everywhere (forget it and you leak deleted data). Consider a pre‑filtered **active_articles** VIEW.
- **updated_at** should be set by the app or a trigger; SQLite does not auto‑update columns on UPDATE.`,
  },
};

// ---------------------------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------------------------

const apiCrud: Exercise = {
  id: "api-crud",
  category: "api",
  difficulty: "easy",
  title: { vi: "REST CRUD cho tài nguyên 'posts'", en: "REST CRUD for a 'posts' resource" },
  prompt: {
    vi: "Định nghĩa đầy đủ các REST endpoint cho tài nguyên bài viết (posts): liệt kê, xem một, tạo, sửa, xóa. Nêu method HTTP, đường dẫn, và mã trạng thái trả về cho mỗi trường hợp (thành công và lỗi thường gặp).",
    en: "Define the full set of REST endpoints for a posts resource: list, read one, create, update, delete. State the HTTP method, path, and the status codes returned for each (success and common errors).",
  },
  answer: {
    vi: `## Lời giải mẫu

| Method | Đường dẫn | Ý nghĩa | Thành công | Lỗi thường gặp |
|---|---|---|---|---|
| GET | /posts | Danh sách | 200 OK | — |
| GET | /posts/:id | Xem một | 200 OK | 404 Not Found |
| POST | /posts | Tạo mới | 201 Created | 400 Bad Request, 422 |
| PUT | /posts/:id | Thay thế toàn bộ | 200 OK | 400, 404 |
| PATCH | /posts/:id | Sửa một phần | 200 OK | 400, 404 |
| DELETE | /posts/:id | Xóa | 204 No Content | 404 |

**Tại sao (why)**
- Danh từ số nhiều **/posts** làm tài nguyên; ID nằm trên đường dẫn. Method HTTP thể hiện hành động — không đặt động từ trong URL (tránh **/getPost**, **/createPost**).
- **201 Created** kèm header **Location: /posts/123** trỏ tới bản ghi mới; **204 No Content** cho DELETE vì không có body trả về.
- Phân biệt **PUT** (thay thế toàn bộ) và **PATCH** (sửa một phần) — chọn đúng theo ngữ nghĩa.

**Cách làm (how)**
- Mã lỗi có ý nghĩa: **400** cú pháp sai, **422** đúng cú pháp nhưng sai nghiệp vụ (thiếu title), **401** chưa đăng nhập, **403** không đủ quyền, **404** không tồn tại, **409** xung đột (trùng slug).
- Body lỗi thống nhất, ví dụ: **{ "error": "title is required", "field": "title" }** để client hiển thị được.
- Idempotent: GET/PUT/DELETE gọi lại nhiều lần cho cùng kết quả; POST thì không (tạo bản ghi mới mỗi lần).`,
    en: `## Model solution

| Method | Path | Meaning | Success | Common errors |
|---|---|---|---|---|
| GET | /posts | List | 200 OK | — |
| GET | /posts/:id | Read one | 200 OK | 404 Not Found |
| POST | /posts | Create | 201 Created | 400 Bad Request, 422 |
| PUT | /posts/:id | Full replace | 200 OK | 400, 404 |
| PATCH | /posts/:id | Partial update | 200 OK | 400, 404 |
| DELETE | /posts/:id | Delete | 204 No Content | 404 |

**Why**
- A plural noun **/posts** is the resource; the ID goes in the path. The HTTP method expresses the action — never put verbs in the URL (avoid **/getPost**, **/createPost**).
- **201 Created** returns a **Location: /posts/123** header pointing at the new record; **204 No Content** for DELETE because there is no body to return.
- Distinguish **PUT** (replace the whole resource) from **PATCH** (partial change) — pick by intent.

**How**
- Use meaningful error codes: **400** malformed syntax, **422** valid syntax but invalid business rule (missing title), **401** not authenticated, **403** not authorized, **404** missing, **409** conflict (duplicate slug).
- Use a consistent error body, e.g. **{ "error": "title is required", "field": "title" }** so the client can render it.
- Idempotency: GET/PUT/DELETE repeat to the same effect; POST does not (it creates a new record each call).`,
  },
};

const apiListParams: Exercise = {
  id: "api-list-params",
  category: "api",
  difficulty: "medium",
  title: { vi: "Phân trang, lọc & sắp xếp", en: "Pagination, filtering & sorting" },
  prompt: {
    vi: "Thiết kế endpoint GET /products trả về danh sách lớn. Hỗ trợ phân trang, lọc theo danh mục & khoảng giá, và sắp xếp. Thiết kế query string và định dạng phản hồi. So sánh phân trang offset và cursor.",
    en: "Design GET /products returning a large list. Support pagination, filtering by category & price range, and sorting. Design the query string and the response shape. Compare offset vs cursor pagination.",
  },
  answer: {
    vi: `## Lời giải mẫu

    GET /products?category=shoes&price_min=50&price_max=200
                 &sort=-price&page=2&limit=20

Phản hồi bọc dữ liệu kèm metadata phân trang:

    {
      "data": [ { "id": 1, "name": "...", "price": 120 } ],
      "pagination": {
        "page": 2, "limit": 20, "total": 337, "total_pages": 17
      }
    }

**Tại sao (why)**
- Lọc/sắp xếp/phân trang là tham số truy vấn (query string), không phải đường dẫn — chúng chỉ tinh chỉnh cùng một tập tài nguyên **/products**.
- Quy ước **sort=-price** (dấu trừ = giảm dần), **sort=name** (tăng dần) gọn và dễ mở rộng nhiều cột: **sort=-price,name**.
- Trả về **total** để client dựng bộ chọn trang; bọc trong **data** để sau này thêm metadata mà không phá vỡ hợp đồng.

**Offset vs Cursor (how)**
- **Offset** (**page/limit** hoặc **offset/limit**): đơn giản, nhảy trang tùy ý được, nhưng chậm khi offset lớn (DB vẫn phải quét qua) và có thể lặp/nhảy bản ghi nếu dữ liệu thay đổi giữa các trang.
- **Cursor** (**?after=<id_hoặc_token>**): trả trang tiếp dựa trên vị trí bản ghi cuối; nhanh và ổn định với dữ liệu thay đổi liên tục (feed vô hạn), nhưng không nhảy tới trang bất kỳ.
- Luôn đặt **limit** tối đa (ví dụ 100) để tránh client kéo cả bảng.
- Nhớ validate và whitelist các cột được phép sort/filter — đừng ghép thẳng vào SQL (tránh SQL injection).`,
    en: `## Model solution

    GET /products?category=shoes&price_min=50&price_max=200
                 &sort=-price&page=2&limit=20

The response wraps the data with pagination metadata:

    {
      "data": [ { "id": 1, "name": "...", "price": 120 } ],
      "pagination": {
        "page": 2, "limit": 20, "total": 337, "total_pages": 17
      }
    }

**Why**
- Filtering/sorting/pagination are query parameters, not path segments — they refine the same **/products** collection.
- The **sort=-price** convention (leading minus = descending), **sort=name** (ascending) is compact and extends to multiple keys: **sort=-price,name**.
- Return **total** so the client can build a pager; wrap rows in **data** so you can add metadata later without breaking the contract.

**Offset vs Cursor (how)**
- **Offset** (**page/limit** or **offset/limit**): simple, allows jumping to any page, but slow at large offsets (the DB still scans past them) and can duplicate/skip rows if data changes between pages.
- **Cursor** (**?after=<id_or_token>**): returns the next page relative to the last seen row; fast and stable under churn (infinite feeds), but you cannot jump to an arbitrary page.
- Always cap **limit** (e.g. 100) so a client cannot pull the whole table.
- Validate and whitelist the sortable/filterable columns — never concatenate them into SQL (avoid injection).`,
  },
};

const apiAuth: Exercise = {
  id: "api-auth",
  category: "api",
  difficulty: "medium",
  title: { vi: "Đăng nhập & làm mới token", en: "Login & token refresh" },
  prompt: {
    vi: "Thiết kế các endpoint xác thực dùng JWT: đăng nhập, làm mới token, đăng xuất. Access token nên sống bao lâu và lưu ở đâu? Vì sao cần refresh token? Nêu mã trạng thái cho từng trường hợp.",
    en: "Design the auth endpoints using JWT: login, refresh, logout. How long should the access token live and where is it stored? Why have a refresh token at all? Give the status codes for each case.",
  },
  answer: {
    vi: `## Lời giải mẫu

    POST /auth/login     { email, password }
      -> 200 { access_token, expires_in: 900 }  + refresh_token (cookie HttpOnly)
      -> 401 nếu sai thông tin

    POST /auth/refresh   (gửi kèm refresh_token cookie)
      -> 200 { access_token, expires_in: 900 }
      -> 401 nếu refresh token hết hạn/bị thu hồi

    POST /auth/logout
      -> 204  (thu hồi refresh token phía server, xóa cookie)

**Tại sao (why)**
- **Access token** sống ngắn (≈15 phút) và mang theo mỗi request qua header **Authorization: Bearer <token>**. Ngắn để nếu bị lộ thì cửa sổ tấn công nhỏ.
- **Refresh token** sống dài (ngày–tuần), chỉ dùng để lấy access token mới. Đặt trong **cookie HttpOnly + Secure + SameSite** để JavaScript không đọc được (giảm rủi ro XSS đánh cắp token).
- Không nên lưu token dài hạn trong **localStorage** — dễ bị XSS đọc mất.

**Cách làm (how)**
- **401 Unauthorized** = chưa/định danh sai (thiếu token, token hết hạn). **403 Forbidden** = đã định danh nhưng không đủ quyền.
- Đăng xuất phải thu hồi refresh token phía server (lưu danh sách hợp lệ / blacklist), vì JWT tự thân không thể "hủy" trước hạn.
- Luôn HTTPS; giới hạn số lần thử đăng nhập (rate limit) để chống dò mật khẩu; không tiết lộ "email đúng nhưng sai mật khẩu" (trả lỗi chung).`,
    en: `## Model solution

    POST /auth/login     { email, password }
      -> 200 { access_token, expires_in: 900 }  + refresh_token (HttpOnly cookie)
      -> 401 on bad credentials

    POST /auth/refresh   (sends the refresh_token cookie)
      -> 200 { access_token, expires_in: 900 }
      -> 401 if the refresh token expired/was revoked

    POST /auth/logout
      -> 204  (revoke the refresh token server‑side, clear the cookie)

**Why**
- The **access token** is short‑lived (~15 min) and sent on every request via **Authorization: Bearer <token>**. Short so a leaked token has a small attack window.
- The **refresh token** is long‑lived (days–weeks) and used only to mint new access tokens. Put it in an **HttpOnly + Secure + SameSite** cookie so JavaScript cannot read it (reduces XSS token theft).
- Do not store long‑lived tokens in **localStorage** — XSS can read it.

**How**
- **401 Unauthorized** = not/incorrectly authenticated (missing or expired token). **403 Forbidden** = authenticated but not allowed.
- Logout must revoke the refresh token server‑side (a valid‑token store / blacklist), because a JWT cannot be "un‑issued" before expiry on its own.
- Always HTTPS; rate‑limit login attempts to deter brute force; do not reveal "email correct but wrong password" (return a generic error).`,
  },
};

const apiIdempotency: Exercise = {
  id: "api-idempotency",
  category: "api",
  difficulty: "hard",
  title: { vi: "Idempotency & versioning cho API thanh toán", en: "Idempotency & versioning for a payments API" },
  prompt: {
    vi: "Thiết kế POST /payments để tính tiền thẻ khách. Vấn đề: client bị timeout và thử lại — làm sao không tính tiền hai lần? Đồng thời API sẽ thay đổi theo thời gian — versioning thế nào? Giải thích cơ chế.",
    en: "Design POST /payments to charge a customer's card. Problem: the client times out and retries — how do you avoid charging twice? Also the API will evolve — how do you version it? Explain the mechanisms.",
  },
  answer: {
    vi: `## Lời giải mẫu

    POST /v1/payments
    Idempotency-Key: 3f8c...   (UUID do client sinh cho mỗi lần thử duy nhất)
    { "amount": 5000, "currency": "usd", "source": "card_..." }

      -> 201 Created  (lần đầu: thực hiện tính tiền, lưu kết quả theo key)
      -> 200 OK       (thử lại cùng key: TRẢ VỀ kết quả cũ, KHÔNG tính lại)
      -> 409 Conflict (cùng key nhưng payload khác)

**Idempotency — tại sao & cách làm**
- Client sinh một **Idempotency-Key** duy nhất cho mỗi ý định thanh toán và gửi kèm ở mọi lần thử lại.
- Server lưu (key → response) trong một bảng có ràng buộc UNIQUE trên key. Khi key đã tồn tại, trả lại đúng response đã lưu thay vì tính tiền lần nữa.
- Nhờ đó thao tác vốn KHÔNG idempotent (POST tính tiền) trở nên an toàn khi thử lại — thiết yếu với mạng chập chờn.
- Đặt TTL cho key (ví dụ 24h) và so khớp payload để phát hiện dùng lại key sai (409).

**Versioning — tại sao & cách làm**
- Đưa version vào đường dẫn (**/v1/**) hoặc header (**Accept: application/vnd.api+json; version=1**). Đường dẫn dễ nhìn và cache; header "sạch URL" hơn.
- Version để thay đổi phá vỡ (đổi tên field, bỏ field) không làm hỏng client cũ — chúng vẫn gọi **/v1** trong khi client mới dùng **/v2**.
- Thay đổi tương thích ngược (thêm field tùy chọn) thì KHÔNG cần tăng version. Chỉ tăng khi phá vỡ hợp đồng.
- Ghi tài liệu vòng đời & thời điểm ngừng hỗ trợ (deprecation) cho version cũ.`,
    en: `## Model solution

    POST /v1/payments
    Idempotency-Key: 3f8c...   (a client‑generated UUID, unique per attempt)
    { "amount": 5000, "currency": "usd", "source": "card_..." }

      -> 201 Created  (first time: perform the charge, store the result under the key)
      -> 200 OK       (retry with same key: RETURN the stored result, do NOT re‑charge)
      -> 409 Conflict (same key but a different payload)

**Idempotency — why & how**
- The client generates a unique **Idempotency-Key** per payment intent and sends it on every retry.
- The server stores (key → response) in a table with a UNIQUE constraint on the key. When the key already exists, it returns the stored response instead of charging again.
- This makes an inherently non‑idempotent operation (a POST charge) safe to retry — essential over flaky networks.
- Give the key a TTL (e.g. 24h) and compare the payload to catch a mis‑reused key (409).

**Versioning — why & how**
- Put the version in the path (**/v1/**) or a header (**Accept: application/vnd.api+json; version=1**). Path versioning is visible and cacheable; header versioning keeps URLs clean.
- Versioning lets breaking changes (renamed/removed fields) not break old clients — they keep calling **/v1** while new clients use **/v2**.
- Backward‑compatible changes (adding an optional field) do NOT need a new version. Only bump when you break the contract.
- Document each version's lifecycle and a deprecation timeline for old versions.`,
  },
};

// ---------------------------------------------------------------------------
// AWS ARCHITECTURE
// ---------------------------------------------------------------------------

const awsStatic: Exercise = {
  id: "aws-static-site",
  category: "aws",
  difficulty: "easy",
  title: { vi: "Website tĩnh, độ sẵn sàng cao, toàn cầu", en: "Global, highly available static site" },
  prompt: {
    vi: "Bạn cần host một website tĩnh (HTML/CSS/JS) phục vụ người dùng toàn cầu với độ trễ thấp, chi phí thấp và độ sẵn sàng cao. Không có server backend. Vẽ kiến trúc AWS và giải thích vai trò từng dịch vụ.",
    en: "You must host a static website (HTML/CSS/JS) for a global audience with low latency, low cost and high availability. No backend server. Sketch the AWS architecture and explain each service's role.",
  },
  answer: {
    vi: `## Lời giải mẫu

    Người dùng → Route 53 (DNS) → CloudFront (CDN, TLS) → S3 bucket (file tĩnh)
                                        │
                                   AWS Certificate Manager (chứng chỉ HTTPS)

**Vai trò từng dịch vụ (why)**
- **S3**: lưu file tĩnh. Bền 99.999999999% (11 số 9), rẻ, tự mở rộng — không cần quản server. Đây chính là "origin".
- **CloudFront** (CDN): cache nội dung tại hàng trăm edge location gần người dùng → độ trễ thấp toàn cầu, giảm tải S3, và cung cấp HTTPS.
- **Route 53**: DNS trỏ tên miền của bạn tới CloudFront (dùng alias record cho apex domain).
- **ACM**: cấp chứng chỉ TLS miễn phí cho CloudFront để chạy HTTPS.

**Cách làm & lưu ý (how)**
- KHÔNG mở public bucket. Dùng **Origin Access Control (OAC)** để chỉ CloudFront được đọc S3; policy bucket chỉ cho phép CloudFront.
- Độ sẵn sàng cao là "miễn phí" ở đây: S3 và CloudFront là dịch vụ khu vực/toàn cầu, đã tự nhân bản đa AZ — không cần bạn tự làm HA.
- Rẻ: chỉ trả theo dung lượng lưu + băng thông; không có EC2 chạy 24/7.
- Bật versioning trên S3 để rollback; cấu hình cache TTL hợp lý và invalidation khi deploy bản mới.`,
    en: `## Model solution

    Users → Route 53 (DNS) → CloudFront (CDN, TLS) → S3 bucket (static files)
                                   │
                              AWS Certificate Manager (HTTPS cert)

**Each service's role (why)**
- **S3**: stores the static files. 99.999999999% (11 nines) durable, cheap, auto‑scaling — no servers to manage. This is the origin.
- **CloudFront** (CDN): caches content at hundreds of edge locations near users → low global latency, offloads S3, and provides HTTPS.
- **Route 53**: DNS pointing your domain at CloudFront (use an alias record for the apex domain).
- **ACM**: issues a free TLS certificate for CloudFront to serve HTTPS.

**How & caveats**
- Do NOT make the bucket public. Use **Origin Access Control (OAC)** so only CloudFront can read S3; the bucket policy allows only CloudFront.
- High availability is essentially free here: S3 and CloudFront are regional/global services already replicated across AZs — you do not build HA yourself.
- Cheap: you pay only for storage + bandwidth; no EC2 running 24/7.
- Enable S3 versioning for rollback; set sensible cache TTLs and invalidate on new deploys.`,
  },
};

const aws3Tier: Exercise = {
  id: "aws-3tier",
  category: "aws",
  difficulty: "medium",
  title: { vi: "Ứng dụng web 3 tầng, HA đa vùng khả dụng", en: "3‑tier web app, HA across AZs" },
  prompt: {
    vi: "Thiết kế một ứng dụng web động (có backend + CSDL) chịu tải biến động và không được sập khi một vùng khả dụng (AZ) gặp sự cố. Nêu các dịch vụ AWS, cách phân tầng và cách đạt tính sẵn sàng cao + co giãn.",
    en: "Design a dynamic web app (backend + database) that handles variable load and must survive an Availability Zone (AZ) failure. Name the AWS services, the tiers, and how you achieve high availability + elasticity.",
  },
  answer: {
    vi: `## Lời giải mẫu

    Route 53 → ALB (đa AZ)
                 │
        ┌────────┴────────┐        (Auto Scaling Group trải trên 2+ AZ)
      EC2 (AZ‑a)        EC2 (AZ‑b)   ← tầng ứng dụng
        └────────┬────────┘
              RDS Multi‑AZ (primary AZ‑a, standby AZ‑b)  ← tầng dữ liệu

**Ba tầng (why)**
- **Tầng web/cân bằng tải**: **Application Load Balancer** nằm ở nhiều AZ, phân phối request và health‑check, tự bỏ instance hỏng.
- **Tầng ứng dụng**: **EC2** trong **Auto Scaling Group** trải trên ≥2 AZ. ASG tự thay instance chết và tăng/giảm số lượng theo tải (CPU, số request).
- **Tầng dữ liệu**: **RDS Multi‑AZ** — một standby đồng bộ ở AZ khác; khi primary hỏng, RDS tự failover sang standby.

**Đạt HA + co giãn (how)**
- Chịu lỗi AZ: mỗi tầng có thành phần ở ≥2 AZ, nên mất 1 AZ vẫn phục vụ được.
- Co giãn: ASG scale‑out khi tải cao, scale‑in khi thấp → trả tiền theo nhu cầu; ALB tự chia tải cho instance mới.
- Đọc nhiều: thêm **RDS Read Replica** để giảm tải đọc; hoặc **ElastiCache** cache truy vấn nóng.
- Bảo mật: ALB ở public subnet; EC2 và RDS ở private subnet; Security Group chỉ mở cổng cần thiết (ALB→EC2→RDS theo chuỗi).
- Trạng thái phiên: giữ EC2 "stateless" (session ở cookie/ElastiCache/DynamoDB) để instance nào cũng phục vụ được — điều kiện để auto scaling hoạt động.`,
    en: `## Model solution

    Route 53 → ALB (multi‑AZ)
                 │
        ┌────────┴────────┐        (Auto Scaling Group spanning 2+ AZs)
      EC2 (AZ‑a)        EC2 (AZ‑b)   ← application tier
        └────────┬────────┘
              RDS Multi‑AZ (primary AZ‑a, standby AZ‑b)  ← data tier

**The three tiers (why)**
- **Load‑balancer tier**: an **Application Load Balancer** across multiple AZs, distributing requests and health‑checking, auto‑removing unhealthy instances.
- **Application tier**: **EC2** in an **Auto Scaling Group** spanning ≥2 AZs. The ASG replaces dead instances and scales the count with load (CPU, request count).
- **Data tier**: **RDS Multi‑AZ** — a synchronous standby in another AZ; if the primary fails, RDS auto‑fails over to the standby.

**Achieving HA + elasticity (how)**
- AZ fault tolerance: every tier has a component in ≥2 AZs, so losing one AZ still serves traffic.
- Elasticity: the ASG scales out under load and in when idle → pay for what you need; the ALB spreads traffic to new instances automatically.
- Read‑heavy: add an **RDS Read Replica** to offload reads, or **ElastiCache** to cache hot queries.
- Security: ALB in a public subnet; EC2 and RDS in private subnets; Security Groups open only required ports (ALB→EC2→RDS in a chain).
- Session state: keep EC2 stateless (session in a cookie/ElastiCache/DynamoDB) so any instance can serve any user — a prerequisite for auto scaling to work.`,
  },
};

const awsDecouple: Exercise = {
  id: "aws-sqs",
  category: "aws",
  difficulty: "medium",
  title: { vi: "Tách rời với hàng đợi (SQS)", en: "Decoupling with a queue (SQS)" },
  prompt: {
    vi: "Người dùng tải ảnh lên; hệ thống cần tạo thumbnail (việc nặng, tốn thời gian). Nếu xử lý đồng bộ trong request thì chậm và dễ sập khi tải cao. Thiết kế lại dùng AWS để tách rời và chịu tải đột biến.",
    en: "Users upload images; the system must generate thumbnails (heavy, slow work). Doing it synchronously in the request is slow and collapses under load spikes. Redesign it with AWS to decouple and absorb bursts.",
  },
  answer: {
    vi: `## Lời giải mẫu

    Upload API → S3 (ảnh gốc) → (event) → SQS queue → Worker (ASG/Lambda) → S3 (thumbnail)

**Tại sao tách rời (why)**
- **SQS** là bộ đệm giữa "người sản xuất" (API nhận upload) và "người tiêu thụ" (worker tạo thumbnail). API chỉ cần đẩy 1 message rồi trả về ngay → phản hồi nhanh.
- Khi có đột biến lượng upload, message dồn trong hàng đợi thay vì làm sập worker; worker xử lý theo nhịp của nó. Hàng đợi "làm phẳng" tải (load leveling).
- Nếu worker chết, message vẫn nằm trong queue (không mất việc). Xử lý xong mới xóa message.

**Cách làm & độ bền (how)**
- Worker chạy trong **Auto Scaling Group** (hoặc **Lambda**) scale theo **độ sâu hàng đợi** (số message chờ) — nhiều việc thì thêm worker.
- **Visibility timeout**: khi worker nhận message, message bị ẩn tạm; xử lý xong thì xóa. Nếu worker chết trước khi xóa, message hiện lại để worker khác làm → xử lý "ít nhất một lần", nên thao tác cần idempotent.
- **Dead‑Letter Queue (DLQ)**: message thất bại quá N lần được chuyển sang DLQ để điều tra, không kẹt vòng lặp.
- Biến thể: **SNS + SQS** (fan‑out) nếu một sự kiện cần nhiều hệ tiêu thụ; **SQS FIFO** nếu cần đúng thứ tự và không trùng.`,
    en: `## Model solution

    Upload API → S3 (original) → (event) → SQS queue → Worker (ASG/Lambda) → S3 (thumbnail)

**Why decouple (why)**
- **SQS** is a buffer between the producer (the upload API) and the consumer (the thumbnail worker). The API just enqueues one message and returns immediately → fast response.
- Under an upload spike, messages pile up in the queue instead of crushing the workers; workers drain at their own pace. The queue levels the load.
- If a worker dies, the message stays in the queue (no lost work). It is deleted only after successful processing.

**How & durability (how)**
- Run workers in an **Auto Scaling Group** (or **Lambda**) that scales on **queue depth** (number of waiting messages) — more backlog, more workers.
- **Visibility timeout**: when a worker receives a message it is temporarily hidden; on success the worker deletes it. If the worker dies before deleting, the message reappears for another worker → at‑least‑once delivery, so make processing idempotent.
- **Dead‑Letter Queue (DLQ)**: messages that fail more than N times move to a DLQ for investigation instead of looping forever.
- Variants: **SNS + SQS** (fan‑out) if one event needs several consumers; **SQS FIFO** if you need strict order and no duplicates.`,
  },
};

const awsServerless: Exercise = {
  id: "aws-serverless",
  category: "aws",
  difficulty: "hard",
  title: { vi: "REST API serverless", en: "Serverless REST API" },
  prompt: {
    vi: "Thiết kế một REST API không quản server (serverless) cho ứng dụng có lượng truy cập rất thất thường (lúc rất cao, lúc gần như 0). Nêu các dịch vụ AWS, cách co giãn về 0, và những đánh đổi (cold start, giới hạn, mô hình dữ liệu).",
    en: "Design a serverless REST API for an app with very spiky traffic (sometimes high, sometimes near zero). Name the AWS services, how it scales to zero, and the trade‑offs (cold starts, limits, data model).",
  },
  answer: {
    vi: `## Lời giải mẫu

    Client → API Gateway → Lambda (hàm cho mỗi route) → DynamoDB
                              │
                         Cognito (xác thực)   CloudWatch (log/metric)

**Tại sao serverless (why)**
- **API Gateway** nhận HTTP, định tuyến tới **Lambda**, lo throttling/xác thực/CORS.
- **Lambda** chạy code theo sự kiện, tự scale từ 0 tới hàng nghìn bản song song. Không request thì không tốn tiền → hợp với tải thất thường.
- **DynamoDB** (NoSQL) mở rộng ngang gần như vô hạn, độ trễ mili‑giây; chế độ **on‑demand** cũng scale‑to‑zero về chi phí. Kết nối kiểu HTTP hợp với Lambda (khác RDS dễ cạn connection pool).

**Đánh đổi (trade‑offs)**
- **Cold start**: lần gọi đầu sau khi hàm "ngủ" có độ trễ khởi tạo. Giảm bằng runtime nhẹ, **Provisioned Concurrency** cho route nóng, giữ hàm nhỏ.
- **Giới hạn**: Lambda có timeout tối đa (15 phút) và bộ nhớ giới hạn — việc chạy rất lâu nên đưa sang Step Functions / hàng đợi.
- **Mô hình dữ liệu DynamoDB**: phải thiết kế quanh **access pattern** (chọn partition key/sort key đúng); truy vấn linh hoạt kiểu SQL (JOIN, ad‑hoc) không phải thế mạnh của nó.
- Kết nối RDS từ Lambda cần **RDS Proxy** để gộp connection; thường DynamoDB "serverless‑native" hơn.

**Cách làm (how)**
- Một hàm cho mỗi route (hoặc một hàm định tuyến nội bộ). Phân quyền IAM tối thiểu cho mỗi hàm.
- Idempotent + xử lý lỗi rõ ràng; bật **CloudWatch** log + X‑Ray trace để quan sát.`,
    en: `## Model solution

    Client → API Gateway → Lambda (a function per route) → DynamoDB
                              │
                         Cognito (auth)   CloudWatch (logs/metrics)

**Why serverless (why)**
- **API Gateway** terminates HTTP, routes to **Lambda**, and handles throttling/auth/CORS.
- **Lambda** runs code per event and auto‑scales from 0 to thousands of concurrent executions. No requests = no cost → ideal for spiky traffic.
- **DynamoDB** (NoSQL) scales horizontally almost without limit at millisecond latency; **on‑demand** mode also scales cost to zero. Its HTTP‑style connections suit Lambda (unlike RDS, whose connection pool is easily exhausted).

**Trade‑offs**
- **Cold start**: the first call after a function idles pays init latency. Mitigate with a lightweight runtime, **Provisioned Concurrency** on hot routes, and small functions.
- **Limits**: Lambda has a max timeout (15 min) and bounded memory — very long jobs belong in Step Functions / a queue.
- **DynamoDB data model**: you must design around your **access patterns** (choose the right partition/sort keys); flexible SQL‑style querying (JOINs, ad‑hoc) is not its strength.
- Connecting Lambda to RDS needs **RDS Proxy** to pool connections; DynamoDB is usually more "serverless‑native".

**How**
- One function per route (or one internally‑routing function). Grant each function least‑privilege IAM.
- Keep handlers idempotent with clear error handling; enable **CloudWatch** logs + X‑Ray tracing for observability.`,
  },
};

export const EXERCISES: Exercise[] = [
  dbBlog,
  dbManyToMany,
  dbOrders,
  dbAuditSoftDelete,
  apiCrud,
  apiListParams,
  apiAuth,
  apiIdempotency,
  awsStatic,
  aws3Tier,
  awsDecouple,
  awsServerless,
  ...FINTECH_EXERCISES,
];
