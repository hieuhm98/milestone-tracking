# Backend với Express: Route, Middleware & REST API

## 1. Việc của backend: phần duy nhất đáng tin

Trong app To-do, frontend React chạy trong trình duyệt của người dùng, và người dùng có toàn quyền với trình duyệt đó. Họ có thể mở DevTools, sửa trang, tắt kiểm tra form, hoặc bỏ qua trang web và gửi request (yêu cầu HTTP) bằng một công cụ như `curl`. Vì vậy mọi thứ frontend "kiểm tra" chỉ là tiện ích cho người dùng ngay thẳng.

**Backend** (server Express trong thư mục `server/`) chạy trên một máy người dùng không chạm tới được. Vì thế đó là nơi duy nhất có thể tin tưởng để:

- **Validate** (kiểm tra hợp lệ) dữ liệu vào: title bắt buộc và tối đa 200 ký tự, email phải giống email, mật khẩu ít nhất 8 ký tự.
- **Bảo đảm quyền sở hữu**: user A không bao giờ đọc, sửa hay xóa được to-do của user B.
- **Nói chuyện với database**: chỉ server giữ file `todo.db` và câu SQL. Trình duyệt không bao giờ thấy chúng.
- **Giữ bí mật**: JWT secret và các mật khẩu đã băm (hash) nằm yên trên server.

```text
 Browser (untrusted)                  Server (trusted)                  Database
 ┌──────────────────┐   HTTP + JSON   ┌───────────────────────┐   SQL   ┌──────────┐
 │ React form       │ ──────────────► │ Express               │ ──────► │ todo.db  │
 │ "title required" │                 │ validates AGAIN,      │         │ users    │
 │ (nice to have)   │ ◄────────────── │ checks the cookie,    │ ◄────── │ todos    │
 └──────────────────┘   status + JSON │ filters by user_id    │         └──────────┘
                                      └───────────────────────┘
```

**BA được gì?** Mọi business rule bạn viết ("title không được rỗng", "user chỉ thấy item của mình") phải được backend thực thi. Một rule chỉ nằm ở giao diện thì chỉ là lời gợi ý, không phải rule. Khi viết acceptance criteria, hãy hỏi: "API có kiểm tra điều này không?"

---

## 2. Server Express nhỏ nhất, rồi đến server thật

**Express** là một thư viện Node.js nhỏ để xây web server. Một server hoàn chỉnh chỉ cần năm dòng:

```js
import express from 'express';

const app = express();
app.get('/hello', (req, res) => res.json({ message: 'Hello from Express' }));
app.listen(3000, () => console.log('Listening on http://localhost:3000'));
```

Chạy bằng `node hello.js`, mở `http://localhost:3000/hello`, bạn nhận được `{"message":"Hello from Express"}`. URL nào khác sẽ nhận trang 404 mặc định của Express.

- `express()` tạo ra ứng dụng.
- `app.get(path, handler)` nghĩa là: "khi có request **GET** tới **path** này, hãy chạy hàm này".
- `app.listen(port)` bắt đầu lắng nghe request trên một **port** (cổng), một "cánh cửa" có đánh số trên máy. Mỗi port chỉ một chương trình được dùng tại một thời điểm, nên app To-do dùng **4000** cho API và **5173** cho frontend Vite. Nếu bạn khởi động server hai lần, bản thứ hai không mở được cửa: Node báo lỗi `EADDRINUSE` ("address already in use" – địa chỉ đã được dùng), và server To-do đổi nó thành thông báo `Port 4000 is already in use.` rồi dừng.

File thật `server/src/index.js` có cùng hình dạng, chỉ thêm vài bước. Đây là bản rút gọn:

```js
const app = express();
const PORT = process.env.PORT ?? 4000;

// Middleware: small functions every request passes through, in order.
app.use(express.json()); // turns a JSON request body into req.body
app.use(cookieParser()); // turns the Cookie header into req.cookies
app.use((req, res, next) => { /* the request logger, see section 5 */ });

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);

// ... the 404 catch-all and the error handler, see section 5

app.listen(PORT, (err) => {
  // Express 5 reports a failed start here instead of crashing, so check for it.
  if (err?.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other server (Ctrl + C in its terminal) or set PORT in .env.`);
    process.exit(1);
  }

  if (err) throw err;

  console.log(`API running on http://localhost:${PORT}`);
});
```

`process.env.PORT ?? 4000` nghĩa là "dùng `PORT` trong file `.env` (hoặc biến môi trường) nếu có, không thì dùng 4000". Chạy `npm run dev` trong `server/` và bạn sẽ thấy:

```text
API running on http://localhost:4000
```

`npm run dev` dùng `node --watch`, nên mỗi lần bạn lưu file, server tự khởi động lại.

---

## 3. Route: method + path → handler

Một **route** là một quy tắc: một **method** HTTP cộng một **path** (đường dẫn), gắn với một hàm **handler** (hàm xử lý). Handler nhận hai object:

- `req` (**request**): mọi thứ client gửi lên.
- `res` (**response**): các công cụ để trả lời.

Những phần của `req` mà app này dùng:

| Thuộc tính | Lấy từ đâu | Ví dụ |
| --- | --- | --- |
| `req.body` | Body JSON (do `express.json()` điền vào) | `{ "title": "Buy milk" }` → `req.body.title` |
| `req.params` | Chỗ giữ `:name` trong path | `/api/todos/5` khớp với `/:id` → `req.params.id` là `"5"` |
| `req.cookies` | Header `Cookie` (do `cookieParser()` điền vào) | `req.cookies.token` |
| `req.method`, `req.originalUrl` | Dòng đầu của request | `PATCH`, `/api/todos/5` |

Và các cách trả lời:

| Code | Ý nghĩa |
| --- | --- |
| `res.json({ todos })` | Status 200 kèm body JSON |
| `res.status(201).json({ todo })` | Đặt status code trước, rồi gửi JSON |
| `res.status(204).end()` | "Xong, không có gì gửi lại" (không có body) |
| `res.cookie(...)`, `res.clearCookie(...)` | Đặt hoặc xóa cookie (dùng khi login và logout) |

Đây là route thật tạo một to-do, trong `server/src/routes/todos.js`:

```js
router.post('/', (req, res) => {
  const title = String(req.body?.title ?? '').trim();

  if (!title) return res.status(400).json({ error: 'Title is required.' });
  if (title.length > MAX_TITLE) return res.status(400).json({ error: `Title must be ${MAX_TITLE} characters or fewer.` });

  const result = db.prepare('INSERT INTO todos (user_id, title) VALUES (?, ?)').run(req.userId, title);
  const todo = findOwnTodo(result.lastInsertRowid, req.userId);

  return res.status(201).json({ todo: toJson(todo) });
});
```

Đọc từ trên xuống: lấy title từ body, từ chối nếu rỗng hoặc quá dài, insert, đọc lại, trả lời **201 Created**. Dấu `?.` trong `req.body?.title` quan trọng: ở Express 5, `req.body` là `undefined` khi request không có body JSON, và `?.` tránh bị crash. Mỗi handler phải gửi **đúng một** response; `return res.status(400)...` dừng hàm lại để nó không trả lời hai lần.

**BA được gì?** Một dòng trong API spec của bạn ("POST /api/todos tạo một to-do") là một route trong code. Nếu một yêu cầu không có dòng nào trong spec, nó không có route, và sẽ không ai build nó.

---

## 4. Router và mount

Để mọi route trong `index.js` sẽ rất rối. Express cho phép gom route vào một **Router** (một app thu nhỏ) rồi **mount** (gắn) nó dưới một tiền tố:

```js
// server/src/index.js
app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);
```

Bên trong `routes/todos.js`, path rất ngắn (`'/'`, `'/:id'`) vì tiền tố `/api/todos` đã được thêm khi mount. URL đầy đủ = **tiền tố + path của route**:

| URL đầy đủ | Định nghĩa ở | Dòng trong file đó |
| --- | --- | --- |
| `GET /api/health` | `src/index.js` | `app.get('/api/health', ...)` |
| `POST /api/auth/signup` | `src/routes/auth.js` | `router.post('/signup', ...)` |
| `POST /api/auth/login` | `src/routes/auth.js` | `router.post('/login', ...)` |
| `POST /api/auth/logout` | `src/routes/auth.js` | `router.post('/logout', ...)` |
| `GET /api/auth/me` | `src/routes/auth.js` | `router.get('/me', requireAuth, ...)` |
| `GET /api/todos` | `src/routes/todos.js` | `router.get('/', ...)` |
| `POST /api/todos` | `src/routes/todos.js` | `router.post('/', ...)` |
| `PATCH /api/todos/:id` | `src/routes/todos.js` | `router.patch('/:id', ...)` |
| `DELETE /api/todos/:id` | `src/routes/todos.js` | `router.delete('/:id', ...)` |

Bảng này cũng là bản đồ để debug: khi tester báo "PATCH /api/todos/7 trả về 404", developer biết ngay phải mở `routes/todos.js` và xem `router.patch('/:id')`. Bạn có thể dựng bảng tương tự cho bất kỳ dự án nào bằng cách hỏi team mỗi endpoint nằm ở đâu.

---

## 5. Middleware: đường ống mà mọi request đi qua

**Middleware** là một hàm `(req, res, next)` chạy trước route handler. Nó có thể đọc hoặc bổ sung vào `req`, trả lời sớm (và chặn request lại), hoặc gọi `next()` để chuyển request sang hàm kế tiếp. `app.use(...)` thêm một middleware vào đường ống, và chúng chạy **theo đúng thứ tự được thêm vào**. Hãy hình dung đó là một chuỗi trạm kiểm soát: mỗi trạm có thể xem xét request, gắn thêm thông tin vào nó, hoặc từ chối nó.

```text
 request: POST /api/todos  {"title":"Buy milk"}  Cookie: token=...
    │
    ▼
 express.json()      body text  ──►  req.body = { title: "Buy milk" }
    │ next()
    ▼
 cookieParser()      Cookie header  ──►  req.cookies = { token: "eyJ..." }
    │ next()
    ▼
 logger              remembers the start time, prints a line when the response is sent
    │ next()
    ▼
 requireAuth         no token?  ──►  401 {"error":"Please log in first."}   (stops here)
    │ next()         valid token  ──►  req.userId = 1
    ▼
 route handler       validate, INSERT, res.status(201).json({ todo })
    │
    ▼
 response: 201 Created   →   log: POST /api/todos → 201 (9 ms)
```

`requireAuth` (trong `src/middleware/requireAuth.js`) là người gác cổng. `routes/todos.js` áp nó cho mọi route to-do bằng một dòng `router.use(requireAuth);`, còn `auth.js` chỉ dùng nó cho `/me`. Nếu không có cookie hợp lệ, nó tự trả 401 và route **không bao giờ chạy**.

**Thứ tự rất quan trọng.** Ba hệ quả thật trong dự án này:

1. `cookieParser()` phải đứng trước `requireAuth`. Thiếu nó, `req.cookies` sẽ là `undefined`, việc đọc token sẽ ném lỗi, và mọi request cần đăng nhập đều hỏng với lỗi 500.
2. Logger được thêm **sau** `express.json()`. Nếu body của request không phải JSON hợp lệ, `express.json()` báo lỗi trước, logger không kịp chạy, nên request đó **không** xuất hiện trong log. Đáng nhớ khi "log không hiện gì cả".
3. Hai handler đặc biệt nằm ở **cuối**, sau mọi route:

```js
// Any /api URL we did not define.
app.use('/api', (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// Anything that throws ends up here.
app.use((err, req, res, next) => {
  const status = err.status ?? 500;

  if (status >= 500) console.error(err);

  res.status(status).json({ error: err.expose ? err.message : 'Something went wrong on the server.' });
});
```

**404 catch-all** (bắt mọi URL còn lại) chỉ chạy khi không route nào phía trên trả lời. **Error handler** được Express nhận ra nhờ có bốn tham số `(err, req, res, next)`. Lỗi do client (như JSON hỏng) giữ nguyên status 4xx và thông báo; một bug thật trở thành 500 với thông báo chung chung, còn chi tiết được in ra console của server, không đưa cho người dùng.

**BA được gì?** Câu "Chỉ user đã đăng nhập mới được..." trong yêu cầu thường trở thành một middleware, áp một lần cho cả nhóm route. Rẻ hơn và an toàn hơn việc kiểm tra ở từng màn hình.

---

## 6. Thiết kế REST API cho to-do

**REST** là một phong cách thiết kế HTTP API: URL đặt tên cho **resource** (tài nguyên, danh từ), còn **method** HTTP nói cần làm gì với nó (động từ). App To-do có hai resource: phiên đăng nhập (`/api/auth/...`) và to-do (`/api/todos`, một item ở `/api/todos/:id`).

Contract (hợp đồng API) đầy đủ, lấy từ README của dự án:

| Method | Path | Body | Thành công | Lỗi |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/signup` | `{ name, email, password }` | 201 `{user}` | 400 không hợp lệ, 409 email đã có |
| POST | `/api/auth/login` | `{ email, password }` | 200 `{user}` | 401 sai email/mật khẩu |
| POST | `/api/auth/logout` | không có | 204 | không có |
| GET | `/api/auth/me` | không có | 200 `{user}` | 401 chưa đăng nhập |
| GET | `/api/todos` | không có | 200 `{todos}` | 401 |
| POST | `/api/todos` | `{ title }` | 201 `{todo}` | 400, 401 |
| PATCH | `/api/todos/:id` | `{ title?, done? }` | 200 `{todo}` | 400, 401, 404 |
| DELETE | `/api/todos/:id` | không có | 204 | 401, 404 |

Các status code được dùng, và lý do:

| Code | Tên | Dùng khi |
| --- | --- | --- |
| 200 | OK | Đọc hoặc cập nhật thành công và có body trả về |
| 201 | Created | Tạo mới thành công (đăng ký, to-do mới) |
| 204 | No Content | Thành công và không có gì để trả (logout, xóa) |
| 400 | Bad Request | Dữ liệu vào vi phạm rule (title rỗng, mật khẩu ngắn, JSON hỏng) |
| 401 | Unauthorized | Chưa đăng nhập, cookie sai/hết hạn, sai email hoặc mật khẩu |
| 404 | Not Found | Không có route này, hoặc không có to-do này **đối với user này** |
| 409 | Conflict | Request xung đột với dữ liệu đã có: email đã được đăng ký |
| 500 | Internal Server Error | Bug phía server; không bao giờ là lỗi của người dùng |

**PATCH hay PUT.** `PUT` nghĩa là "thay toàn bộ resource bằng thứ tôi gửi", nên client phải gửi đủ mọi field. `PATCH` nghĩa là "chỉ đổi những field tôi gửi". Tick vào checkbox chỉ gửi `{ "done": true }`; đổi tên chỉ gửi `{ "title": "..." }`. Handler giữ giá trị cũ cho field nào không được gửi. App này hoàn toàn không có route `PUT`, nên `PUT /api/todos/1` rơi vào catch-all: `404 {"error":"No route for PUT /api/todos/1"}`.

---

## 7. Validate phía server, quyền sở hữu và một dạng lỗi duy nhất

**Validation** được làm lại ở server dù form đã kiểm tra, vì như comment trong `auth.js` viết: "anyone can skip the form and call the API directly" (ai cũng có thể bỏ qua form và gọi thẳng API). Các rule trong app:

| Field | Rule | Lỗi (400 trừ khi ghi khác) |
| --- | --- | --- |
| `title` | Bắt buộc, sau khi cắt khoảng trắng | `Title is required.` |
| `title` | Tối đa 200 ký tự | `Title must be 200 characters or fewer.` |
| `name` | Bắt buộc | `Name is required.` |
| `email` | Có dạng `a@b.c` | `Email is not valid.` |
| `password` | Ít nhất 8 ký tự | `Password must be at least 8 characters.` |
| `email` | Chưa được đăng ký | `This email is already registered.` (409) |

**Quyền sở hữu.** Mọi câu query to-do đều kèm id của user đang đăng nhập, mà `requireAuth` đã gắn vào `req.userId`:

```js
const findOwnTodo = (id, userId) =>
  db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(id, userId);
```

Giả sử Bình đang đăng nhập và đoán rằng to-do số 1 tồn tại (nó thuộc về An). `PATCH /api/todos/1` không tìm thấy dòng nào khớp **cả** `id = 1` **và** `user_id` của Bình, nên câu trả lời là `404 {"error":"To-do not found."}`. Bình không biết thêm được gì.

**Vì sao 404 chứ không phải 403 Forbidden?** 403 sẽ nói "to-do này có tồn tại, nhưng không phải của bạn". Như vậy là lộ thông tin: kẻ tấn công có thể đếm có bao nhiêu to-do, hoặc xác nhận một id là có thật. Trả 404 khiến "của người khác" và "không tồn tại" trông y hệt nhau. Nhìn từ phía Bình, to-do của An đúng là không tồn tại. (403 là lựa chọn đúng khi người dùng được phép biết thứ đó tồn tại nhưng thiếu quyền, ví dụ người chỉ có quyền xem cố sửa một tài liệu được chia sẻ.)

**Một dạng lỗi duy nhất.** Mọi lỗi trong API này, dù đến từ validation, `requireAuth`, 404 catch-all hay error handler, đều có cùng một body:

```json
{ "error": "Title is required." }
```

Sự nhất quán này có lợi hai lần. Frontend chỉ cần một dòng để hiển thị mọi lỗi: `api.js` đọc `data?.error` rồi ném nó ra, và trang hiển thị đúng dòng chữ đó. Tester và BA có thể viết một mẫu kiểm tra cho mọi negative test: "status là X và `error` là Y".

---

## 8. Test API không cần giao diện

Bạn không cần app React để test backend. Khi server đang chạy (`npm run dev` trong `server/`), mở terminal thứ hai. Trên macOS, Linux hoặc **Git Bash** trên Windows, dùng `curl`. Cờ `-i` hiện dòng status và các header; một số header đã được lược bớt bên dưới.

1. Kiểm tra server còn sống:

   ```bash
   curl -i http://localhost:4000/api/health
   ```

   ```http
   HTTP/1.1 200 OK
   Content-Type: application/json; charset=utf-8

   {"status":"ok"}
   ```

2. Đăng ký và **lưu cookie** vào file bằng `-c cookies.txt`:

   ```bash
   curl -i -X POST http://localhost:4000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"name":"An","email":"an@example.com","password":"secret123"}' \
     -c cookies.txt
   ```

   ```http
   HTTP/1.1 201 Created
   Set-Cookie: token=eyJhbGciOi...; Max-Age=604800; Path=/; Expires=...; HttpOnly; SameSite=Lax
   Content-Type: application/json; charset=utf-8

   {"user":{"id":1,"name":"An","email":"an@example.com"}}
   ```

   Chạy lại đúng lệnh đó, bạn nhận `409 Conflict` với `{"error":"This email is already registered."}`.

3. Thử lấy danh sách to-do **không có** cookie, rồi tạo một to-do **có gửi** cookie bằng `-b cookies.txt`:

   ```bash
   curl -i http://localhost:4000/api/todos
   # HTTP/1.1 401 Unauthorized
   # {"error":"Please log in first."}

   curl -i -X POST http://localhost:4000/api/todos \
     -H "Content-Type: application/json" \
     -d '{"title":"Buy milk"}' \
     -b cookies.txt
   # HTTP/1.1 201 Created
   # {"todo":{"id":1,"title":"Buy milk","done":false,"createdAt":"2026-09-21 15:16:36"}}
   ```

4. Thử các trường hợp lỗi: `-d '{"title":"   "}'` cho `400 {"error":"Title is required."}`, `PATCH /api/todos/99` cho `404 {"error":"To-do not found."}`, còn `DELETE /api/todos/1` cho `204 No Content` với body rỗng.

**Windows PowerShell.** Trong Windows PowerShell 5.1, `curl` là tên gọi tắt (alias) của một lệnh khác, và việc đặt dấu nháy cho JSON khi gọi `curl.exe` rất dễ sai. Công cụ có sẵn là `Invoke-RestMethod`; `-SessionVariable` giữ cookie lại, còn `-WebSession` gửi cookie đi:

```powershell
Invoke-RestMethod http://localhost:4000/api/health

$body = @{ name = "An"; email = "an@example.com"; password = "secret123" } | ConvertTo-Json
$r = Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/auth/signup `
  -ContentType "application/json" -Body $body -SessionVariable s
$r.user

$t = Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/todos `
  -ContentType "application/json" -Body '{"title":"Buy milk"}' -WebSession $s
$t.todo
```

```text
status
------
ok

id name email
-- ---- -----
 1 An   an@example.com

id title     done createdAt
-- -----     ---- ---------
 1 Buy milk False 2026-09-21 15:16:36
```

Khi status là lỗi, `Invoke-RestMethod` sẽ ném exception. Để xem code và thông báo:

```powershell
try { Invoke-RestMethod http://localhost:4000/api/todos }
catch { $_.Exception.Response.StatusCode.value__; $_.ErrorDetails.Message }
# 401
# {"error":"Please log in first."}
```

**Đọc log của server.** Trong lúc đó, terminal của server in một dòng cho mỗi request, nhờ middleware logger:

```text
GET /api/health → 200 (6 ms)
POST /api/auth/signup → 201 (89 ms)
POST /api/auth/signup → 409 (2 ms)
GET /api/todos → 401 (1 ms)
POST /api/todos → 201 (9 ms)
PATCH /api/todos/99 → 404 (1 ms)
DELETE /api/todos/1 → 204 (5 ms)
```

Mỗi dòng gồm method, URL, status code và thời gian server xử lý. Đăng ký chậm là có chủ đích: băm mật khẩu bằng bcrypt được thiết kế để tốn thời gian. Khi giao diện "không phản ứng gì", log này cho bạn biết ngay request có tới server không và server đã trả lời gì. Quan sát cùng luồng dữ liệu đó từ phía trình duyệt được trình bày trong các bài DevTools: tab **Network** ở **fs-10** (và **Console** ở fs-09).

---

## 9. Góc BA: đặc tả và review một API contract

> **Góc BA:** "Trả status code nào?" là câu hỏi về yêu cầu, không phải chi tiết code. Email trùng là 400 hay 409, item của người khác là 403 hay 404, sẽ quyết định frontend hiển thị gì, tester kiểm tra gì và kẻ tấn công biết được gì. Hãy chốt nó trong spec, cùng với team, trước khi ai đó viết route.

Khi viết hoặc review một API spec, kiểm tra từng endpoint:

- **Method và path**: danh từ ở path, động từ ở method (`POST /api/todos`, không phải `POST /api/createTodo`).
- **Field của request**: tên, kiểu, bắt buộc hay tùy chọn (`title?` ở dòng PATCH nghĩa là tùy chọn).
- **Rule validation**: giới hạn chính xác ("≤ 200 ký tự sau khi cắt khoảng trắng"), không phải "độ dài hợp lý".
- **Thành công**: status code và dạng body (`201 { todo }`).
- **Mọi lỗi**: status code, khi nào xảy ra, và **đúng câu thông báo** người dùng sẽ thấy.
- **Ai được gọi**: công khai hay chỉ user đã đăng nhập, và được chạm vào dữ liệu của ai.

Mỗi dòng chuyển thẳng thành acceptance criteria và test case:

```text
Given I am logged in
When I send POST /api/todos with a title of 201 characters
Then the response is 400
And the body is {"error":"Title must be 200 characters or fewer."}
And no to-do is created
```

Những lỗ hổng thường gặp khi review: thiếu thông báo lỗi, hoặc câu chữ trong spec khác trong thiết kế; giới hạn chỉ kiểm tra ở UI mà không ở API; thiếu trường hợp item thuộc về user khác; và body lỗi mỗi endpoint một kiểu.

---

## 10. Tóm tắt

- Backend là phần duy nhất đáng tin: nó validate, bảo đảm quyền sở hữu, nói chuyện với database và giữ bí mật.
- Một app Express gồm `express()`, vài middleware `app.use(...)`, các route (method + path → handler), và `app.listen(PORT)`.
- Handler đọc `req.body`, `req.params`, `req.cookies` và trả lời bằng `res.status(...).json(...)` hoặc `res.status(204).end()`.
- Router gom nhóm route; `app.use('/api/todos', todoRoutes)` thêm tiền tố.
- Các hàm middleware chạy lần lượt, mỗi hàm chuyển request đi tiếp hoặc trả lời sớm; người gác cổng đăng nhập chặn request chưa xác thực bằng 401, còn 404 catch-all và error handler đứng cuối.
- API dùng các status code 200, 201, 204, 400, 401, 404, 409 và 500 có chủ đích, PATCH để cập nhật một phần, 404 cho item của người khác, và một dạng lỗi nhất quán.

Giờ bạn có thể:

- [ ] Khởi động server và đọc dòng `API running on http://localhost:4000`.
- [ ] Tìm ra file định nghĩa bất kỳ URL nào của app.
- [ ] Test đăng ký, 401, tạo mới, 400 và 404 bằng `curl` hoặc `Invoke-RestMethod`.
- [ ] Đọc một dòng log như `POST /api/todos → 201 (9 ms)`.
- [ ] Review một API contract về field, rule, status code và thông báo.

**Tiếp theo:** fs-07 mở database phía sau các route này: bảng, câu SQL, và chuyển từ SQLite sang MySQL hoặc Postgres.
