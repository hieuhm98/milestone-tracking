# Database cho ứng dụng: SQL với SQLite, MySQL & PostgreSQL

## 1. Dữ liệu nằm ở đâu, và vì sao cần database

Phần lý thuyết bạn đã có từ bài *Database là gì?* và *SQL cơ bản*: bảng, dòng, khóa, `SELECT`, `JOIN`. Bài này mở database thật của app To-do ([todo-auth-app.zip](/downloads/todo-auth-app.zip)) và cho thấy backend nói chuyện với nó như thế nào.

Mọi user và mọi to-do nằm trong **một file duy nhất**: `server/todo.db`. Khi bạn tải dự án về, file này chưa tồn tại; `src/db.js` tạo ra nó ở lần đầu server khởi động.

```text
 Browser (React)        Express server (Node.js)          todo.db (SQLite)
 ───────────────        ────────────────────────          ────────────────
 fetch('/api/todos') ─► routes/todos.js
                          db.prepare('SELECT …').all() ─► users, todos tables
                        ◄─ rows ─────────────────────────
 ◄─ JSON { todos } ───
```

Sao không làm đơn giản hơn? Ba phương án nghe có vẻ hấp dẫn, và lý do từng cái thất bại:

| Phương án | Chuyện gì sẽ hỏng |
| --- | --- |
| Một mảng JavaScript trong bộ nhớ (memory) của server | Mất sạch mỗi lần restart. `npm run dev` restart server **mỗi khi bạn lưu một file**. |
| Một file `todos.json` | Hai request ghi cùng một lúc sẽ đè lên nhau (gọi là *lost update*, mất cập nhật). Không gì ngăn một to-do không có title, hay một to-do trỏ tới user không tồn tại. |
| `localStorage` của trình duyệt | Chỉ sống trong một trình duyệt trên một thiết bị. Điện thoại sẽ không thấy thứ bạn thêm trên laptop, và người dùng có thể sửa hoặc xóa nó. |

Database cho bạn bốn bảo đảm cùng lúc: dữ liệu **sống sót qua restart**, được **chia sẻ** cho mọi thiết bị gọi API, xử lý an toàn khi **nhiều người ghi cùng lúc** (concurrent write), và thực thi các **ràng buộc** (constraint, ví dụ "email phải là duy nhất") ngay cả khi code có bug. Đó là lý do app chỉ để hai tùy chọn giao diện vô hại trong `localStorage` (`todo:lastEmail`, `todo:filter`), còn mọi thứ quan trọng nằm trong `todo.db`.

**BA được gì?** Khi một story viết "người dùng thấy to-do của mình trên mọi thiết bị", câu đó chính là yêu cầu lưu trữ phía server. Giờ bạn biết dữ liệu đó nằm ở đâu.

## 2. SQLite, MySQL, PostgreSQL: chọn cái nào và vì sao

Cả ba đều là **database quan hệ** (relational database) dùng SQL. Khác biệt lớn nhất là *cách chúng chạy*.

| | SQLite | MySQL | PostgreSQL ("Postgres") |
| --- | --- | --- | --- |
| Chạy dưới dạng | Một thư viện nằm trong app + **một file** | Một process server riêng (port 3306) | Một process server riêng (port 5432) |
| Công sức cài đặt | Không có: `npm install` là xong | Cài đặt hoặc dùng Docker, tạo user và mật khẩu | Giống MySQL |
| Dùng điển hình | App di động và desktop, prototype, test, website nhỏ | Web app cổ điển, CMS như WordPress | Web app hiện đại, truy vấn phức tạp, dữ liệu JSON và bản đồ |
| Ghi đồng thời | Nhiều người đọc, **mỗi lúc chỉ một người ghi** | Nhiều người ghi cùng lúc | Nhiều người ghi cùng lúc |
| Chi phí | Miễn phí (public domain) | Bản Community miễn phí (Oracle sở hữu), hỗ trợ trả phí | Miễn phí, mã nguồn mở |
| Ai đang dùng | Mọi điện thoại Android và iPhone, các trình duyệt web | WordPress, Wikipedia, GitHub | Instagram, Reddit, nhiều startup |

Các nhà cung cấp cloud bán MySQL và Postgres dưới dạng **dịch vụ được quản lý** (managed service, ví dụ AWS RDS và Aurora), nên không ai trong team phải tự vá server database.

Khóa học dùng **SQLite** vì nó **không cần cài đặt gì**: không có server, không có mật khẩu, và cả database là một file bạn có thể mở, copy hoặc xóa. App production có nhiều người dùng thường chọn **Postgres hoặc MySQL**, vì nhiều server có thể dùng chung một database và nhiều người có thể ghi cùng lúc. Tin tốt: SQL bạn học ở đây giống nhau đến 90% ở mọi nơi (mục 7 chỉ ra phần khác).

**BA được gì?** "Dùng database nào?" là quyết định của developer, nhưng nó có hệ quả kinh doanh: chi phí license, chi phí hosting, và ai được phép chạy báo cáo trên đó.

## 3. Đọc db/schema.sql

Toàn bộ database được mô tả trong một file, `server/db/schema.sql`. `db.js` chạy file này mỗi lần khởi động; `IF NOT EXISTS` làm cho việc đó an toàn.

```sql
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS todos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL,
  done       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
```

Từng dòng một:

- `PRIMARY KEY AUTOINCREMENT`: database tự cấp `id` 1, 2, 3… và không bao giờ dùng lại một số, kể cả sau khi xóa.
- `NOT NULL`: cột bắt buộc có giá trị. Một to-do không có title sẽ bị từ chối.
- `UNIQUE` trên `email`: hai tài khoản không bao giờ trùng email. SQLite tự tạo một index cho cột này, nên việc tìm user khi đăng nhập rất nhanh.
- `DEFAULT CURRENT_TIMESTAMP`: nếu câu `INSERT` không truyền `created_at`, database tự điền thời điểm hiện tại, theo giờ **UTC** (chậm hơn giờ Việt Nam 7 tiếng).
- `REFERENCES users(id)`: một **khóa ngoại** (foreign key). Mọi to-do phải thuộc về một user có thật.
- `ON DELETE CASCADE`: khi một dòng user bị xóa, mọi to-do của user đó bị xóa theo.
- `CREATE INDEX … ON todos(user_id)`: mọi truy vấn to-do đều lọc theo `user_id`, nên index giúp database nhảy thẳng tới các dòng của một user thay vì quét cả bảng.

```text
 ┌────────────────────┐         ┌──────────────────────────┐
 │ users              │         │ todos                    │
 ├────────────────────┤         ├──────────────────────────┤
 │ id  PK             │ 1 ─── n │ id       PK              │
 │ name               │         │ user_id  FK → users.id   │
 │ email  UNIQUE      │         │ title                    │
 │ password_hash      │         │ done     0 / 1           │
 │ created_at         │         │ created_at               │
 └────────────────────┘         └──────────────────────────┘
      Một user có nhiều to-do; mỗi to-do thuộc đúng một user.
```

Hai điểm "lạ" của SQLite bạn sẽ gặp:

- SQLite không có kiểu boolean thật, nên `done` được lưu là `0` hoặc `1`. Route đổi nó lại thành `true`/`false` trước khi gửi JSON: `done: row.done === 1` trong hàm `toJson`.
- SQLite bỏ qua khóa ngoại nếu không được bật, vì thế `db.js` chạy `db.pragma('foreign_keys = ON')`.

Các ràng buộc này không phải để trang trí. Chúng tôi đã thử phá chúng trực tiếp trên database, và lần nào cũng bị từ chối:

```text
INSERT a second user with lan@example.com  → UNIQUE constraint failed: users.email
INSERT a to-do for user_id 99 (no such user) → FOREIGN KEY constraint failed
INSERT a to-do without a title             → NOT NULL constraint failed: todos.title
```

**BA được gì?** Mỗi ràng buộc là một business rule được viết bằng SQL. "Email phải là duy nhất" trong tài liệu yêu cầu trở thành `UNIQUE`; "to-do luôn có chủ" trở thành `NOT NULL REFERENCES users(id)`.

## 4. Câu SQL đứng sau mỗi API endpoint

Backend dùng package `better-sqlite3`. Cách viết luôn là `db.prepare(sql)` rồi gọi một trong ba method: **`.get()`** trả về một dòng (hoặc `undefined`), **`.all()`** trả về một mảng các dòng, **`.run()`** thực hiện một lệnh ghi và báo lại `changes` (số dòng bị ảnh hưởng) và `lastInsertRowid` (id vừa tạo).

| Endpoint | Câu SQL server chạy |
| --- | --- |
| `POST /api/auth/signup` | `SELECT id FROM users WHERE email = ?` (409 nếu tìm thấy), rồi `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)` |
| `POST /api/auth/login` | `SELECT * FROM users WHERE email = ?` |
| `POST /api/auth/logout` | không có: chỉ xóa cookie |
| `GET /api/auth/me` | `SELECT * FROM users WHERE id = ?` |
| `GET /api/todos` | `SELECT * FROM todos WHERE user_id = ? ORDER BY created_at DESC, id DESC` |
| `POST /api/todos` | `INSERT INTO todos (user_id, title) VALUES (?, ?)`, rồi đọc lại dòng vừa tạo |
| `PATCH /api/todos/:id` | `SELECT * FROM todos WHERE id = ? AND user_id = ?` (404 nếu không có), rồi `UPDATE todos SET title = ?, done = ? WHERE id = ?` |
| `DELETE /api/todos/:id` | `DELETE FROM todos WHERE id = ? AND user_id = ?` (404 nếu `changes` bằng 0) |
| `npm run db:reset` | `DELETE FROM todos; DELETE FROM users;` |

Vài chi tiết đáng để ý:

- `ORDER BY created_at DESC, id DESC`: `created_at` chỉ chính xác đến giây, nên hai to-do thêm trong cùng một giây được xếp theo `id` để phân định.
- Khi đăng ký, code không hề chèn `created_at` hay `id`; giá trị mặc định tự điền vào.

**Quyền sở hữu nằm trong SQL.** `user_id` lấy từ cookie đăng nhập (`req.userId`), không bao giờ lấy từ body của request. Mọi truy vấn to-do đều thêm `AND user_id = ?`:

```js
const findOwnTodo = (id, userId) =>
  db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(id, userId);
```

Vì vậy nếu Minh (user 2) gửi `DELETE /api/todos/1` nhắm vào to-do của Lan, câu `WHERE` khớp 0 dòng và Minh nhận **404 `To-do not found.`**, không phải 403 (quy tắc bạn đã gặp ở fs-06). Log của server xác nhận điều đó: `DELETE /api/todos/1 → 404`. API thậm chí không thừa nhận to-do số 1 tồn tại. Câu `UPDATE` trong PATCH chỉ lọc theo `id`, và điều đó vẫn an toàn vì `findOwnTodo` đã kiểm tra chủ sở hữu trước.

## 5. Parameterized query và SQL injection

Nhìn lại mọi câu truy vấn ở trên: giá trị không bao giờ được ghép thẳng vào chuỗi SQL. Chúng là các **placeholder** `?` (chỗ giữ chỗ), còn giá trị được gửi đi riêng:

```js
// Safe: the value is sent separately and can never become SQL
db.prepare('SELECT * FROM users WHERE email = ?').get(email);

// Dangerous: never do this
db.prepare("SELECT * FROM users WHERE email = '" + email + "'").get();
```

Vì sao dòng thứ hai nguy hiểm: giả sử kẻ tấn công gõ đoạn này vào ô email:

```text
' OR '1'='1
```

Phép ghép chuỗi tạo ra câu SQL này:

```sql
SELECT * FROM users WHERE email = '' OR '1'='1'
```

`'1'='1'` luôn đúng, nên `WHERE` khớp với **mọi** dòng. Chúng tôi đã chạy cả hai phiên bản trên một bản copy của database: câu ghép chuỗi trả về cả ba user (`lan@`, `minh@`, `hoa@example.com`); phiên bản dùng `?` trả về danh sách rỗng, vì nó tìm một user có email đúng nguyên văn là `' OR '1'='1`. Gửi chính đoạn text đó tới endpoint đăng nhập thật thì nhận `401 Email or password is incorrect.`

Kiểu tấn công này gọi là **SQL injection**: dữ liệu người dùng nhập vào làm thay đổi ý nghĩa của câu truy vấn. Trong một app viết ẩu, nó có thể cho ai đó đăng nhập mà không cần mật khẩu, lấy trọn bảng users, hoặc xóa dữ liệu. App mẫu an toàn vì **mọi** câu truy vấn đều dùng placeholder.

**BA được gì?** Thêm input kiểu `' OR '1'='1` vào các negative test case (ca kiểm thử tiêu cực) cho ô tìm kiếm và form đăng nhập. Kết quả mong đợi là "được xử lý như chữ bình thường", không bao giờ là "hiện ra nhiều dữ liệu hơn".

## 6. Tự mở todo.db ra xem

Khởi động app, tạo hai ba tài khoản và thêm vài to-do. Sau đó mở database.

**Cách A: DB Browser for SQLite** (công cụ giao diện miễn phí, Windows/macOS/Linux).

1. Cài từ sqlitebrowser.org, hoặc chạy `winget install DBBrowserForSQLite.DBBrowserForSQLite` trên Windows (`brew install --cask db-browser-for-sqlite` trên macOS).
2. **Open Database** → chọn `server/todo.db`. Dùng **Open Database Read Only** khi server đang chạy, để không khóa file.
3. Tab **Browse Data** hiển thị các dòng; tab **Execute SQL** chạy bất kỳ câu truy vấn nào bạn gõ.

**Cách B: dòng lệnh `sqlite3`.** Có sẵn trên macOS; trên Windows chạy `winget install SQLite.SQLite`. Gõ `sqlite3 todo.db`, rồi `.tables`, `.mode box`, câu SQL bất kỳ, và `.quit`.

**Cách C: không cần cài gì.** `better-sqlite3` đã có sẵn trong `node_modules`, nên hãy lưu đoạn helper này thành `server/peek.mjs` (file của riêng bạn, không có trong dự án mẫu):

```js
// peek.mjs: your own helper, not part of the sample. Usage: node peek.mjs "SELECT ..."
import Database from 'better-sqlite3';

const db = new Database('todo.db', { readonly: true });

console.table(db.prepare(process.argv[2]).all());
```

Các câu truy vấn để luyện tập (kết quả lấy từ một lần chạy thử với ba user: Lan, Minh và Hoa):

```powershell
node peek.mjs "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC"
```

```text
┌─────────┬────┬────────┬────────────────────┬───────────────────────┐
│ (index) │ id │ name   │ email              │ created_at            │
├─────────┼────┼────────┼────────────────────┼───────────────────────┤
│ 0       │ 3  │ 'Hoa'  │ 'hoa@example.com'  │ '2026-09-21 15:16:59' │
│ 1       │ 2  │ 'Minh' │ 'minh@example.com' │ '2026-09-21 15:16:55' │
│ 2       │ 1  │ 'Lan'  │ 'lan@example.com'  │ '2026-09-21 15:16:51' │
└─────────┴────┴────────┴────────────────────┴───────────────────────┘
```

Đếm số to-do của mỗi user. `LEFT JOIN` giữ lại Hoa, người chưa có to-do nào; một `JOIN` thường sẽ làm mất Hoa:

```powershell
node peek.mjs "SELECT u.name, COUNT(t.id) AS todos, COALESCE(SUM(t.done), 0) AS done FROM users u LEFT JOIN todos t ON t.user_id = u.id GROUP BY u.id ORDER BY todos DESC"
```

```text
┌─────────┬────────┬───────┬──────┐
│ (index) │ name   │ todos │ done │
├─────────┼────────┼───────┼──────┤
│ 0       │ 'Lan'  │ 3     │ 1    │
│ 1       │ 'Minh' │ 2     │ 1    │
│ 2       │ 'Hoa'  │ 0     │ 0    │
└─────────┴────────┴───────┴──────┘
```

Tìm các to-do đã xong và chủ của chúng:

```powershell
node peek.mjs "SELECT t.id, t.title, u.name AS owner FROM todos t JOIN users u ON u.id = t.user_id WHERE t.done = 1"
```

```text
┌─────────┬────┬──────────────────────┬────────┐
│ (index) │ id │ title                │ owner  │
├─────────┼────┼──────────────────────┼────────┤
│ 0       │ 1  │ 'Write user stories' │ 'Lan'  │
│ 1       │ 3  │ 'Buy milk'           │ 'Minh' │
└─────────┴────┴──────────────────────┴────────┘
```

Giờ hãy nhìn vào mật khẩu: `SELECT email, password_hash FROM users`. Bạn sẽ thấy giá trị kiểu `$2b$10$cMOO8.fgOWJXMXZ4redm7u4xtq79Gd.K5odN0rYjoSC5p1xg9o4Vq`: `$2b$` nghĩa là bcrypt, `10` là hệ số chi phí (cost factor), phần còn lại là salt cộng với hash. **Mật khẩu gốc không được lưu ở bất kỳ đâu**, nên ngay cả bạn, người đang cầm file, cũng không đọc được nó.

Cuối cùng, thử cascade trên một **bản copy** của file: xóa Minh bằng `DELETE FROM users WHERE email = 'minh@example.com'` rồi đếm số to-do. Trong lần chạy của chúng tôi, con số giảm từ 5 xuống 3; hai to-do của Minh biến mất cùng Minh. Trong dòng lệnh `sqlite3`, hãy chạy `PRAGMA foreign_keys = ON;` trước, nếu không cascade sẽ không xảy ra.

## 7. Chuyển sang PostgreSQL hoặc MySQL

Bạn không cần cài cái nào: Docker chạy một server database dùng-xong-bỏ chỉ với một lệnh.

```bash
# PostgreSQL 17 on port 5432 (use -p 5433:5432 if a local Postgres already uses 5432)
docker run --name todo-pg -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=todo -p 5432:5432 -d postgres:17

# MySQL 8.4 on port 3306
docker run --name todo-mysql -e MYSQL_ROOT_PASSWORD=devpass -e MYSQL_DATABASE=todo -p 3306:3306 -d mysql:8.4

# Open an SQL prompt inside each container
docker exec -it todo-pg psql -U postgres -d todo
docker exec -it todo-mysql mysql -uroot -pdevpass todo
```

Các lệnh này chạy y hệt trong PowerShell. Dừng và xóa bằng `docker rm -f todo-pg todo-mysql`.

Schema cần sửa một chút:

| Ý tưởng | SQLite (dự án mẫu) | PostgreSQL | MySQL |
| --- | --- | --- | --- |
| id tự tăng | `INTEGER PRIMARY KEY AUTOINCREMENT` | `INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY` (cách cũ: `SERIAL`) | `INT AUTO_INCREMENT PRIMARY KEY` |
| Đúng/sai | `INTEGER` 0/1 | `BOOLEAN` (`true`/`false`) | `BOOLEAN` (lưu thành `TINYINT(1)`, 0/1) |
| Ngày giờ | `TEXT` với `CURRENT_TIMESTAMP` | `TIMESTAMPTZ DEFAULT now()` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| Text duy nhất | `TEXT UNIQUE` | `TEXT UNIQUE` | `VARCHAR(255) UNIQUE` (TEXT không đặt UNIQUE được) |
| Khóa ngoại | `REFERENCES` viết ngay trong cột | `REFERENCES` viết ngay trong cột | một dòng riêng `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE` |

Sau đó đến `db.js`. Khác biệt lớn: Postgres và MySQL là **server riêng, được gọi qua mạng**, nên mọi truy vấn đều bất đồng bộ (asynchronous) và các route handler phải thành `async`. Hai phiên bản dưới đây **chỉ để minh họa, không có trong dự án mẫu**:

```js
// db.js with PostgreSQL (illustrative, NOT in the sample): npm install pg
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export default pool;

// In routes/todos.js: placeholders are $1, $2… and every call is awaited
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC, id DESC',
    [req.userId]
  );

  res.json({ todos: rows.map(toJson) });
});
```

```js
// db.js with MySQL (illustrative, NOT in the sample): npm install mysql2
import mysql from 'mysql2/promise';

const pool = mysql.createPool(process.env.DATABASE_URL);

export default pool;

// In routes/todos.js: placeholders stay ?, results come back as [rows, fields]
const [rows] = await pool.query('SELECT * FROM todos WHERE user_id = ?', [req.userId]);
```

Một **Pool** giữ sẵn vài kết nối (connection) đang mở và dùng lại chúng, vì mở một kết nối mạng mới cho mỗi request thì chậm. `DATABASE_URL` sẽ nằm trong `.env`, ví dụ `postgres://postgres:devpass@localhost:5432/todo`. Với Postgres, `done` là boolean thật, nên `toJson` không cần `=== 1` nữa.

## 8. ORM, query builder và migration

Dự án mẫu cố ý viết SQL thuần để bạn nhìn thấy nó. Nhiều team dùng thư viện thay thế. Một **ORM** (Object-Relational Mapper) như **Prisma** hay **Sequelize** cho developer viết `prisma.todo.findMany({ where: { userId } })` và tự sinh ra câu SQL. Một **query builder** như **Knex** hay **Drizzle** gần với SQL hơn nhưng dựng câu lệnh bằng code. Tất cả đều dùng placeholder bên dưới và giúp việc đổi database dễ hơn. Khi developer nói "nó nằm trong Prisma schema", file đó chính là phiên bản `schema.sql` của họ.

**Migration** giải quyết một vấn đề khác: schema thay đổi theo thời gian. Giả sử v2 thêm ngày hết hạn (due date). `CREATE TABLE IF NOT EXISTS` bỏ qua bảng vì bảng đã tồn tại, nên cột mới sẽ không bao giờ xuất hiện trong `todo.db` đang có của bất kỳ ai. Dự án thật giữ các file thay đổi được đánh số:

```text
migrations/
  001_create_users_and_todos.sql
  002_add_due_date_to_todos.sql      -- ALTER TABLE todos ADD COLUMN due_date TEXT;
```

Một công cụ migration (Prisma Migrate, Knex, Flyway, Liquibase) ghi nhớ mỗi database đã chạy những file nào và chỉ áp dụng các file mới, giống hệt nhau trên laptop, trên staging và trên production.

**BA được gì?** Một field mới trong story không phải "chỉ là một field". Nó là một migration: các dòng cũ nhận giá trị gì? Field đó có bắt buộc với cả các to-do cũ không? Hãy ghi điều đó vào acceptance criteria.

## 9. Góc BA: yêu cầu dữ liệu và data dictionary

> **Góc BA:** Mỗi cột trong `schema.sql` trả lời một câu hỏi về yêu cầu, và mỗi rule còn thiếu là một câu hỏi lẽ ra bạn phải hỏi. Hãy ghi câu trả lời vào một **data dictionary** (từ điển dữ liệu: bảng mô tả từng field) trước khi bắt đầu phát triển, và test từng rule sau đó.

Data dictionary của app này, dựng lên từ việc đọc schema **và** code của route:

| Field | Kiểu | Bắt buộc | Rule | Được thực thi ở đâu |
| --- | --- | --- | --- | --- |
| `users.name` | text | có | cắt khoảng trắng, không rỗng; **không có độ dài tối đa** | route + `NOT NULL` |
| `users.email` | text | có | đúng định dạng, lưu chữ thường, duy nhất | route + `UNIQUE` |
| `users.password_hash` | text | có | mật khẩu ≥ 8 ký tự, chỉ lưu dưới dạng hash bcrypt | route |
| `todos.title` | text | có | cắt khoảng trắng, 1–200 ký tự | route (`MAX_TITLE`) + `NOT NULL` |
| `todos.done` | 0/1 | có | mặc định là chưa xong | `DEFAULT 0` |
| `todos.user_id` | số | có | user đang đăng nhập, không bao giờ lấy từ body của request | route + khóa ngoại |
| `created_at` (cả hai bảng) | text | tự động | database tự điền, theo giờ UTC | `DEFAULT CURRENT_TIMESTAMP` |

Những câu hỏi bảng này gợi ra, mà BA nên biến thành yêu cầu:

- **Độ dài field:** tên không có giới hạn. Một cái tên dài 5.000 ký tự có chấp nhận được không? Chắc là không.
- **Tính duy nhất:** `Lan@Example.com` có phải cùng tài khoản với `lan@example.com` không? Ở đây là có, vì route chuyển email thành chữ thường trước khi lưu.
- **Xóa dữ liệu:** app chưa có tính năng "xóa tài khoản của tôi". Khi tính năng đó ra đời, `ON DELETE CASCADE` nghĩa là to-do của user cũng biến mất. Đó là một **business rule**, không phải chi tiết kỹ thuật: có sản phẩm bắt buộc giữ dữ liệu (hóa đơn, audit log), có sản phẩm bắt buộc xóa (luật bảo vệ dữ liệu cá nhân như GDPR).
- **Múi giờ:** timestamp đang là UTC. Màn hình có cần hiển thị giờ địa phương không?

Mỗi câu trả lời trở thành một acceptance criterion, ví dụ: *Given một user có 3 to-do, when tài khoản bị xóa, then user đó và cả 3 to-do đều bị xóa.*

## 10. Tóm tắt

Bạn đã mở database thật phía sau app và lần theo dữ liệu từ API tới bảng. Giờ bạn có thể:

- [ ] Giải thích vì sao app lưu bền vững (persist) dữ liệu trong database thay vì bộ nhớ, file JSON hay local storage của trình duyệt.
- [ ] So sánh SQLite, MySQL và PostgreSQL, và lý giải vì sao dùng SQLite để học còn Postgres/MySQL cho production.
- [ ] Đọc file schema và gọi tên từng ràng buộc: khóa chính, NOT NULL, UNIQUE, giá trị mặc định, khóa ngoại, cascade, index.
- [ ] Ghép mỗi API endpoint với câu SQL nó chạy, kể cả bộ lọc quyền sở hữu theo user id.
- [ ] Giải thích SQL injection và vì sao placeholder ngăn được nó.
- [ ] Xem bên trong file database bằng DB Browser hoặc một script, và viết truy vấn JOIN và GROUP BY.
- [ ] Mô tả những gì thay đổi khi chuyển sang Postgres hoặc MySQL, và ORM cùng migration dùng để làm gì.
- [ ] Biến một schema thành data dictionary và rút ra business rule từ đó.

Thói quen nên giữ: mỗi khi một yêu cầu nhắc tới dữ liệu, hãy hỏi dữ liệu đó được lưu ở đâu, rule nào bảo vệ nó, và chuyện gì xảy ra với nó khi các bản ghi liên quan bị xóa.

Bài tiếp theo: **fs-08** mở phần code xác thực: băm mật khẩu, JWT và cookie đăng nhập.
