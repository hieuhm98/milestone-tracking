# Xây website từ A–Z: Tổng quan dự án To-do

## 1. Vì sao BA nên tự xây một app, một lần

Bạn đã biết các từ: frontend, backend, API, JSON, database, SQL. Chuỗi mười một bài này biến những từ đó thành thứ bạn đã **tận mắt thấy chạy**. Chúng ta sẽ cùng tải về, chạy, đọc và kiểm thử một web app nhỏ nhưng thật: danh sách việc cần làm (to-do) có đăng ký và đăng nhập.

**Bạn sẽ nhận được gì:**

- Một mô hình trong đầu đáng tin cậy. Khi dev nói "API trả về 401" hay "cái đó lưu trong cookie", bạn biết họ đang nói về ô nào trong sơ đồ.
- Yêu cầu tốt hơn. Khi đã tận mắt thấy server từ chối một mật khẩu sai, bạn sẽ viết acceptance criteria cho cả các luồng lỗi (unhappy path).
- Tự tin khi kiểm thử. Với Chrome DevTools, bạn sẽ xem request, đọc status code, nhìn vào cookie và `localStorage` thay vì chỉ nói "nó không chạy".
- Chung ngôn ngữ với team, nên các buổi ước lượng và bàn trade-off ngắn hơn.

**Bạn sẽ KHÔNG trở thành:** một developer. Bạn sẽ không học thiết kế hệ thống từ trang giấy trắng, tối ưu hiệu năng hay đưa lên production. App được cố tình làm nhỏ để mỗi file đều đọc hết trong một lần ngồi. Mục tiêu là "hiểu chuyện", không phải đổi nghề.

---

## 2. Chúng ta xây gì: tính năng và màn hình

App tên là **My To-dos**. Nó chỉ có hai màn hình, và React quyết định hiển thị màn hình nào.

```text
+-------------------------------+      +------------------------------------+
|  Log in                       |      |  Hi, Lan                [Log out]  |
|  Email    [lan@mail.com   ]   | ---> |  [What needs doing?     ] [Add]    |
|  Password [********       ]   |      |  (all) (active) (done)    1 left   |
|  [ Log in ]                   |      |  [ ] Buy milk            Delete    |
|  New here? Create an account  |      |  [x] Call the bank       Delete    |
+-------------------------------+      +------------------------------------+
```

| Tính năng | Người dùng làm gì | Phía sau xảy ra gì |
|---|---|---|
| Đăng ký | Nhập tên, email, mật khẩu (từ 8 ký tự) | Tài khoản được lưu, người dùng được đăng nhập luôn |
| Đăng nhập | Nhập email và mật khẩu | Server gắn một cookie đăng nhập |
| Thêm to-do | Gõ tiêu đề, bấm **Add** | Mục mới xuất hiện ở đầu danh sách |
| Tick / bỏ tick | Bấm vào checkbox | Mục được đánh dấu xong (done) hoặc chưa xong (active) |
| Xóa | Bấm **Delete** | Mục biến mất hẳn |
| Lọc | Bấm **all**, **active** hoặc **done** | Danh sách được lọc; lựa chọn được ghi nhớ |
| Đăng xuất | Bấm **Log out** | Cookie bị xóa, quay về màn hình đăng nhập |
| Vẫn đăng nhập sau khi tải lại | Tải lại trang (F5) | App hỏi server "tôi là ai?" và khôi phục phiên đăng nhập (session) |

Một tiện ích nhỏ: form đăng nhập tự điền sẵn **email gần nhất** bạn đã gõ. Mật khẩu thì không bao giờ được ghi nhớ.

**BA được gì?** Bảng này chính là phát biểu phạm vi (scope). Mọi thứ nằm ngoài nó (quên mật khẩu, xác minh email, chia sẻ danh sách) là ngoài phạm vi, và nói rõ điều đó ra cũng là việc của BA.

---

## 3. Yêu cầu, viết theo cách của BA

Trước khi có code, BA viết user story kèm acceptance criteria kiểm thử được. Dưới đây là những story mà app này đáp ứng. Mọi thông báo trong ngoặc kép là đúng nguyên văn chữ app hiển thị (bằng tiếng Anh).

**US-1 Đăng ký.** Là một khách mới, tôi muốn tạo tài khoản để to-do của tôi là của riêng tôi.

- Given tôi đang ở form đăng ký, when tôi gửi tên, email hợp lệ và mật khẩu từ 8 ký tự, then tài khoản được tạo và tôi thấy danh sách to-do (đang trống) của mình.
- Given email đã được đăng ký, when tôi gửi form, then tôi thấy "This email is already registered." và không có tài khoản thứ hai nào được tạo.
- Given mật khẩu của tôi ít hơn 8 ký tự, when tôi gửi form, then tôi thấy "Password must be at least 8 characters."

**US-2 Đăng nhập.** Là người đã có tài khoản, tôi muốn đăng nhập để xem to-do của mình.

- Given email và mật khẩu đúng, when tôi bấm **Log in**, then tôi thấy "Hi, Lan" (tên tôi) và danh sách của tôi.
- Given mật khẩu sai **hoặc** email không tồn tại, when tôi bấm **Log in**, then tôi thấy "Email or password is incorrect." (cùng một thông báo cho cả hai trường hợp, để không ai dò được email nào đã có tài khoản).

**US-3 Quản lý to-do.** Là người đã đăng nhập, tôi muốn thêm, tick và xóa to-do để theo dõi công việc.

- Given tôi đã gõ "Buy milk", when tôi bấm **Add**, then "Buy milk" xuất hiện ở đầu danh sách, trạng thái chưa xong.
- Given ô tiêu đề trống hoặc chỉ có khoảng trắng, when tôi bấm **Add**, then tôi thấy "Title is required." và không có gì được thêm.
- Given đã có một mục, when tôi tick nó, then nó hiển thị là đã xong và bộ đếm "left" giảm đi một.

**US-4 Riêng tư.** Là người dùng, tôi muốn to-do của mình vô hình với người khác để dữ liệu là của riêng tôi.

- Given Lan và Minh đều có to-do, when Minh đăng nhập, then Minh chỉ thấy to-do của mình.
- Given Minh biết id một to-do của Lan, when Minh thử sửa hoặc xóa nó qua API, then Minh nhận "To-do not found." và không có gì thay đổi.

**US-5 Phiên đăng nhập.** Là người dùng, tôi muốn vẫn đăng nhập sau khi tải lại trang và có thể đăng xuất.

- Given tôi đang đăng nhập, when tôi tải lại trang, then tôi vẫn thấy danh sách mà không phải gõ lại mật khẩu.
- Given tôi bấm **Log out**, when màn hình đăng nhập hiện ra và tôi tải lại trang, then tôi vẫn ở trạng thái đã đăng xuất.

> **Góc BA:** để ý rằng một nửa số tiêu chí là luồng lỗi. Ở bài fs-10 bạn sẽ kiểm chứng từng cái trong tab Network: 409 khi email trùng, 401 khi sai mật khẩu, 400 khi tiêu đề trống, 404 khi đụng vào to-do của người khác. Một tiêu chí gắn được với một status code là tiêu chí mà tester kiểm được mà không cần tranh cãi.

---

## 4. Kiến trúc: phần nào chạy ở đâu

App có ba phần, và trên laptop của bạn chúng chạy thành **hai chương trình cộng một file**.

```text
  Trình duyệt của bạn (Chrome)
  hiển thị app React, giữ cookie "token" và localStorage
        |
        |  http://localhost:5173        (mọi request đều tới đây, kể cả /api)
        v
  Vite dev server  :5173   (Terminal 2, thư mục client/)
    - phục vụ index.html và code React
    - proxy: mọi đường dẫn bắt đầu bằng /api  --->  http://localhost:4000
        |
        v
  Express API server  :4000   (Terminal 1, thư mục server/)
    - middleware: đọc JSON body, cookie, ghi log request, requireAuth
    - route: /api/auth/*, /api/todos/*
        |
        |  SQL qua better-sqlite3 (cùng một process, không qua mạng)
        v
  File database SQLite  server/todo.db
    - bảng: users, todos
```

Ba ý cần nhớ:

1. **Trình duyệt chỉ nói chuyện với cổng 5173.** **Proxy** (bộ chuyển tiếp) của Vite lặng lẽ chuyển các lời gọi `/api` sang Express. Với trình duyệt, frontend và API trông như một site duy nhất, nên cookie đăng nhập được gửi tự động và không cần cấu hình gọi chéo site (CORS).
2. **React chạy trong trình duyệt; Express chạy trên server.** Khi phát triển, "server" chính là laptop của bạn, nhưng cách chia vẫn giống hệt production.
3. **SQLite không phải là một server.** Nó là một thư viện nằm trong process Express, đọc và ghi vào đúng một file.

**BA được gì?** Khi có bug, câu hỏi đầu tiên là "ô nào?". Sai nhãn chữ là bug frontend; sai status code là bug backend; mất dữ liệu sau khi khởi động lại thì nghi database.

---

## 5. Bộ công nghệ, và lý do chọn từng món

| Tầng | Chọn | Vì sao hợp với khóa này | Lựa chọn thay thế phổ biến |
|---|---|---|---|
| Thư viện frontend | **React 19** (với **Vite 7** làm dev server) | Kỹ năng frontend được tuyển nhiều nhất; component (khối giao diện) nhỏ dễ đọc | Vue, Angular, Svelte, HTML + JS thuần |
| Framework backend | **Express 5** chạy trên **Node.js 22+** | Cùng ngôn ngữ (JavaScript) với frontend; một route chỉ vài dòng | NestJS, Fastify, Python FastAPI, Java Spring Boot, .NET |
| Database | **SQLite** qua `better-sqlite3` | Một file, không cần cài đặt, vẫn là SQL thật | MySQL, PostgreSQL (server riêng) |
| Trình quản lý package | **npm** (yarn cũng được) | Có sẵn khi cài Node.js | yarn, pnpm |
| Công cụ kiểm thử | **Chrome DevTools** | Có sẵn trong mọi trình duyệt; cho thấy thứ thật sự đã đi qua mạng | Postman, Insomnia, curl |

Vài thư viện nhỏ trên server, mỗi cái một việc: `bcryptjs` biến mật khẩu thành **hash** một chiều (không đảo ngược được), `jsonwebtoken` tạo token đăng nhập có chữ ký (một **JWT**), và `cookie-parser` đọc cookie ở mỗi request.

**SQLite vs MySQL vs PostgreSQL**

| | SQLite | MySQL | PostgreSQL |
|---|---|---|---|
| Chạy dưới dạng | Một file bên trong app, không cần cài | Một server riêng | Một server riêng |
| Hợp nhất với | Học tập, prototype, app di động, công cụ nhỏ | Web app cổ điển, dịch vụ hosting | Truy vấn phức tạp, ràng buộc dữ liệu chặt |
| Nhiều người cùng ghi một lúc | Hạn chế | Tốt | Rất tốt |

Câu SQL gần như giống nhau ở cả ba. Chuyển đổi chủ yếu là sửa `server/src/db.js` và ký hiệu placeholder trong câu truy vấn (bài fs-07): một thay đổi nhỏ nhưng vẫn phải test lại.

**BA được gì?** Mọi lựa chọn đều là **trade-off** (đánh đổi). SQLite hoàn hảo ở đây nhưng sai hoàn toàn cho một ngân hàng. Khi team đề xuất một bộ công nghệ, hãy hỏi chi phí để dựng, để vận hành và để thay đổi sau này.

---

## 6. Một request từ đầu đến cuối: bấm "Add"

Đây là trái tim của cả khóa học. Lan gõ "Buy milk" và bấm **Add**. Đây là mọi thứ xảy ra, theo thứ tự:

1. **Submit form.** React gọi `addTodo` (hàm xử lý `onSubmit` của form). `event.preventDefault()` chặn trình duyệt tải lại cả trang.
2. **Fetch.** `api('POST', '/todos', { title: newTitle })` gửi `POST /api/todos` tới `localhost:5173` với JSON body `{"title":"Buy milk"}`. Trình duyệt **tự đính kèm cookie `token`**; code của chúng ta không bao giờ chạm vào nó.
3. **Proxy.** Vite thấy đường dẫn bắt đầu bằng `/api` nên chuyển request sang Express ở cổng 4000.
4. **Middleware.** Middleware là các hàm nhỏ mà mọi request đi qua theo thứ tự. Express đọc JSON body và cookie, rồi `requireAuth` kiểm tra token. Không có cookie hoặc cookie hỏng thì trả **401**, và route không bao giờ chạy.
5. **Validate.** Route (hàm xử lý cho một cặp URL + method) cắt khoảng trắng hai đầu tiêu đề. Rỗng thì trả **400** "Title is required."; dài quá 200 ký tự cũng là 400.
6. **INSERT.** `INSERT INTO todos (user_id, title) VALUES (?, ?)` ghi một dòng vào `todo.db`, gắn với user id của Lan.
7. **Response.** Server trả **201 Created** kèm mục mới dưới dạng JSON.
8. **Cập nhật state.** React đặt to-do mới lên đầu danh sách của nó (`setTodos`) và xóa trắng ô nhập. State là dữ liệu mà component đang giữ.
9. **Re-render.** React vẽ lại đúng phần thay đổi: "Buy milk" hiện ở đầu và bộ đếm "left" tăng thêm một.

Nửa frontend, đúng như trong dự án (nửa backend nằm ở bài fs-06):

```jsx
// client/src/components/TodoPage.jsx
async function addTodo(event) {
  event.preventDefault();
  setError('');

  try {
    const data = await api('POST', '/todos', { title: newTitle });
    setTodos([data.todo, ...todos]);
    setNewTitle('');
  } catch (err) {
    handleError(err);
  }
}
```

Thứ đi qua mạng, và dòng mà terminal backend in ra:

```http
POST /api/todos HTTP/1.1
Host: localhost:5173
Content-Type: application/json
Cookie: token=eyJhbGciOiJIUzI1NiIs...

{"title":"Buy milk"}

HTTP/1.1 201 Created
Content-Type: application/json

{"todo":{"id":1,"title":"Buy milk","done":false,"createdAt":"2026-09-21 08:30:00"}}
```

```text
POST /api/todos → 201 (4 ms)
```

**BA được gì?** Mỗi bước đánh số là một chỗ có thể hỏng, và mỗi chỗ có triệu chứng riêng. Bạn sẽ gặp lại danh sách này ở fs-05 (bước 1–2, 8–9), fs-06 (bước 4–7) và fs-10 (xem tất cả chạy trực tiếp).

---

## 7. Thư mục dự án, có chú thích

```text
todo-auth-app/
├── README.md                  cách chạy, bảng API, bảng lưu trữ
├── .gitignore                 giữ node_modules, .env và *.db ngoài Git
├── client/                    FRONTEND (React + Vite), cổng 5173
│   ├── index.html             trang HTML duy nhất; React lấp đầy <div id="root">
│   ├── vite.config.js         cổng dev server + proxy /api
│   ├── package.json           dependency và script của client
│   └── src/
│       ├── main.jsx           điểm bắt đầu: gắn <App /> vào trang
│       ├── App.jsx            chọn màn hình: form đăng nhập hay danh sách to-do
│       ├── api.js             hàm DUY NHẤT gọi sang backend
│       ├── styles.css         giao diện
│       └── components/
│           ├── AuthForm.jsx   form đăng nhập / đăng ký
│           └── TodoPage.jsx   thêm, tick, xóa, lọc, đăng xuất
└── server/                    BACKEND (Express), cổng 4000
    ├── package.json           script: dev, start, db:reset
    ├── .env.example           mẫu cấu hình (PORT, JWT_SECRET, DB_FILE)
    ├── db/schema.sql          hai bảng: users, todos
    ├── todo.db                file database (tạo ra ở lần chạy đầu)
    └── src/
        ├── index.js           tạo app, middleware, gắn các route
        ├── db.js              mở todo.db và chạy schema.sql
        ├── auth-token.js      tạo/kiểm tra JWT, tùy chọn cookie
        ├── reset-db.js        xóa sạch các bảng (npm run db:reset)
        ├── middleware/
        │   └── requireAuth.js không có cookie hợp lệ → 401
        └── routes/
            ├── auth.js        signup, login, logout, me
            └── todos.js       liệt kê, thêm, sửa, xóa to-do
```

Quy tắc dễ nhớ: **mọi thứ trong `client/` rốt cuộc đều nằm trong trình duyệt**, nên tuyệt đối không chứa bí mật. Vì thế secret của JWT nằm trong `server/.env`, một file không bao giờ được commit.

**BA được gì?** "Sửa một dòng trong `todos.js`" là thay đổi backend: phải test lại API, không chỉ màn hình.

---

## 8. API contract và dữ liệu nằm ở đâu

Frontend và backend thống nhất một **hợp đồng** (contract): URL nào, method nào, gửi gì vào, nhận gì ra. Mọi thứ dưới `/api/todos` đều cần cookie đăng nhập.

| Method | Path | Body | Thành công | Lỗi |
|---|---|---|---|---|
| POST | `/api/auth/signup` | `{ name, email, password }` | 201 `{user}` | 400 không hợp lệ, 409 email đã dùng |
| POST | `/api/auth/login` | `{ email, password }` | 200 `{user}` | 401 sai email/mật khẩu |
| POST | `/api/auth/logout` | không có | 204 | không có |
| GET | `/api/auth/me` | không có | 200 `{user}` | 401 chưa đăng nhập |
| GET | `/api/todos` | không có | 200 `{todos}` | 401 |
| POST | `/api/todos` | `{ title }` | 201 `{todo}` | 400, 401 |
| PATCH | `/api/todos/:id` | `{ title?, done? }` | 200 `{todo}` | 400, 401, 404 |
| DELETE | `/api/todos/:id` | không có | 204 | 401, 404 |

Và từng loại dữ liệu được lưu ở đâu:

| Cái gì | Ở đâu | Vì sao ở đó |
|---|---|---|
| Người dùng và to-do | File SQLite `server/todo.db` | Phải còn sau khi khởi động lại, dùng chung giữa các thiết bị |
| Mật khẩu | Chỉ dưới dạng **hash** bcrypt trong `users.password_hash` | Lộ database cũng không được lộ mật khẩu |
| Phiên đăng nhập (một JWT) | Cookie `token`, **HttpOnly**, SameSite=Lax, 7 ngày | JavaScript trên trang không đọc hay đánh cắp được |
| Email gõ gần nhất, bộ lọc danh sách | `localStorage`, key `todo:lastEmail`, `todo:filter` | Tùy chọn giao diện vô hại, chỉ cho trình duyệt này |

Mỗi dòng của bảng thứ hai là một quyết định có lý do: token trong `localStorage` có thể bị bất kỳ script độc hại nào chèn vào trang lấy mất, còn lưu bộ lọc vào database thì quá mức cần thiết.

**BA được gì?** Contract cho phép frontend và backend làm song song; bảng lưu trữ trả lời những câu hỏi về quyền riêng tư mà stakeholder luôn hỏi.

---

## 9. Lộ trình khóa học và mã nguồn

| Bài | Bạn làm gì | BA được gì |
|---|---|---|
| **fs-01** Tổng quan dự án (bài này) | Hiểu app, yêu cầu và hình dạng của nó | Tấm bản đồ cho mọi bài sau |
| **fs-02** Node.js, npm & yarn | Node là gì, `package.json` để làm gì | Hiểu "dependency" và "script" |
| **fs-03** Cài và chạy dự án trên máy | Chạy cả hai server, tạo tài khoản đầu tiên | Tự tin vì có app chạy thật trên laptop |
| **fs-04** React cơ bản | Component, props, state | Vì sao màn hình đổi mà không tải lại trang |
| **fs-05** Form trong React & gọi API | Form, `fetch`, thông báo lỗi | Validate phía client nằm ở đâu |
| **fs-06** Backend với Express | Route, middleware, status code | Vì sao server phải kiểm tra lại mọi thứ |
| **fs-07** Database SQL (SQLite/MySQL/Postgres) | Bảng, truy vấn, đổi database | Quy tắc dữ liệu trở thành ràng buộc ra sao |
| **fs-08** Xác thực: đăng ký, đăng nhập, đăng xuất | Hash, JWT, cookie | Cách viết acceptance criteria về bảo mật |
| **fs-09** DevTools: Elements & Console | Soi trang, đọc lỗi | Báo bug có bằng chứng |
| **fs-10** DevTools: Network (test API) | Xem request và status code | Test API không cần công cụ khác |
| **fs-11** DevTools: Application & test end-to-end | Cookie, `localStorage`, một lượt test trọn vẹn | Tự chạy một lượt kiểm tra kiểu UAT |

**Lấy mã nguồn:** tải [todo-auth-app.zip](/downloads/todo-auth-app.zip) và giải nén vào chỗ dễ tìm, ví dụ Desktop. Đừng vội chạy; bài fs-02 giải thích các công cụ, còn fs-03 hướng dẫn cài đặt từng bước trên Windows (và macOS).

---

## 10. Tóm tắt

Giờ bạn đã có tấm bản đồ của dự án. Bạn có thể:

- Giải thích vì sao BA nên tự xây một app một lần, và mục tiêu **không** phải là gì.
- Liệt kê các tính năng và hai màn hình của app.
- Viết user story với tiêu chí Given/When/Then, gồm cả luồng lỗi (email trùng, mật khẩu ngắn, sai mật khẩu, tiêu đề trống, to-do của người khác).
- Vẽ kiến trúc: trình duyệt → Vite ở :5173 → proxy → Express ở :4000 → `todo.db`.
- Giải thích lý do chọn từng công nghệ và kể tên một lựa chọn thay thế.
- Đi qua chín bước khi bấm **Add**, từ `onSubmit` đến re-render.
- Tìm được file frontend và backend trong cây thư mục.
- Đọc API contract và nói được từng loại dữ liệu nằm ở đâu, vì sao.

**Bài tiếp theo:** fs-02 giới thiệu Node.js, npm và yarn, những công cụ cài đặt và chạy mọi thứ trong dự án này.
