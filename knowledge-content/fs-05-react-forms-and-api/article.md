# React: Form & gọi API tới Backend

## 1. Form trong React: controlled input

Bài này đi theo một lần đăng nhập, từ bàn phím tới server rồi quay về, dùng các file trong [todo-auth-app.zip](/downloads/todo-auth-app.zip): `AuthForm.jsx`, `api.js`, `App.jsx` và `TodoPage.jsx` trong `client/src/`.

Trong HTML thuần, một `<input>` tự nhớ chữ bên trong nó. Trong React, ta thường để **state** (dữ liệu component đang giữ) nắm chữ đó, còn ô input chỉ hiển thị. Cách này gọi là **controlled input** (input được điều khiển). Ô email trong `AuthForm.jsx`:

```jsx
const [email, setEmail] = useState(readLastEmail);

<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
```

- `value={email}` (state → màn hình): ô luôn hiển thị đúng thứ đang có trong state.
- `onChange` (màn hình → state): mỗi phím gõ sẽ chép chữ mới vào state, React vẽ lại, và ô hiện chữ đó.

Lợi ích: chữ hiện tại luôn nằm trong một biến bình thường, sẵn sàng để kiểm tra, gửi đi hoặc điền sẵn. `useState(readLastEmail)` khởi tạo ô bằng email đã lưu trong `localStorage` với key `todo:lastEmail`. Chỉ email được nhớ, không bao giờ nhớ mật khẩu.

**BA được gì?** Vì mọi field đều nằm trong state, việc hiện thông báo ngay khi vi phạm quy tắc hay điền sẵn một field rất rẻ. Một yêu cầu như "nhớ email lần trước" chỉ tốn vài dòng code.

---

## 2. Submit: preventDefault và validation phía client

Form có một handler (hàm xử lý) duy nhất: `<form className="card" onSubmit={handleSubmit} noValidate>`. Nhấn Enter hoặc bấm nút submit đều kích hoạt nó:

```jsx
async function handleSubmit(event) {
  event.preventDefault(); // stop the browser's default full-page form submit
  setError('');

  // Quick checks in the browser give instant feedback.
  // The server checks again: this is for convenience, not security.
  if (isSignup && !name.trim()) return setError('Please enter your name.');
  if (isSignup && password.length < 8) return setError('Password must be at least 8 characters.');
```

**Vì sao cần `preventDefault()`?** Mặc định, trình duyệt submit form bằng cách tải **cả một trang mới**, làm mất sạch mọi thứ trong bộ nhớ, kể cả state của React. `preventDefault()` hủy hành vi đó, và JavaScript gửi dữ liệu "ngầm" ở nền.

**Vì sao có `noValidate`?** Nó tắt các bong bóng kiểm tra có sẵn của trình duyệt (cho `type="email"`), để mọi thông báo đều do app hiển thị, cùng một phong cách.

Hai dòng `if` là **validation phía client** (kiểm tra dữ liệu ngay trên trình duyệt): phản hồi tức thì, không cần gọi server. Nhưng comment nói thẳng: *tiện lợi, không phải bảo mật*. Ai cũng có thể bỏ qua form và gọi API trực tiếp, nên server kiểm tra lại mọi quy tắc và trả `400` kèm `Name is required.`, `Email is not valid.` hoặc `Password must be at least 8 characters.`

Thử ngay (cả hai server đang chạy, như bài fs-03):

1. Mở http://localhost:5173, nhấn **F12** và chọn tab **Console**.
2. Dán đoạn sau rồi nhấn Enter. Nó bỏ qua form và gửi tên rỗng:

```js
fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: '', email: 'test@example.com', password: '123' }),
}).then((r) => r.json()).then(console.log);
```

3. Console in ra `{error: 'Name is required.'}` và terminal của backend ghi:

```text
POST /api/auth/signup → 400 (2 ms)
```

**BA được gì?** Viết mỗi quy tắc validation một lần dưới dạng business rule và ghi chú rằng server bắt buộc phải kiểm tra. Tester kiểm cả hai: thông báo trên form, và mã `400` khi gọi API trực tiếp.

---

## 3. Nói chuyện với backend bằng fetch

`fetch` là hàm có sẵn của trình duyệt để gửi một HTTP request (yêu cầu). Với đăng nhập, nó gửi method `POST`, URL `/api/auth/login`, header `Content-Type: application/json` (báo cho server biết body là JSON) và body tạo bằng `JSON.stringify({ email, password })`. Kết quả trả về là một đối tượng response (phản hồi):

- `response.status`: con số, ví dụ `200` hoặc `401`.
- `response.ok`: `true` với 200–299, ngược lại là `false`.
- `response.json()`: đọc body và đổi chuỗi JSON trở lại thành object.

Chú ý: `fetch` **không** coi `401` hay `500` là thất bại. Nó chỉ thất bại khi không có câu trả lời nào cả. Kiểm tra `response.ok` là việc của bạn. Sample làm việc này đúng một lần, trong `client/src/api.js`, và mọi component đều gọi hàm trợ giúp này:

```js
export async function api(method, path, body) {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 No Content has no body to read.
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error ?? `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}
```

1. `` `/api${path}` `` thêm tiền tố: `api('POST', '/auth/login', …)` sẽ gọi `/api/auth/login`.
2. Header JSON và `JSON.stringify` chỉ được thêm khi có body. Request `GET` không gửi cả hai.
3. Logout và delete trả `204 No Content`, không có body, nên bỏ qua `.json()`.
4. `.catch(() => null)`: body không phải JSON thì `data = null` thay vì làm app crash.
5. Mọi status ngoài 2xx đều biến thành một `Error` được throw (ném ra). Message của nó là chính câu chữ của server (ví dụ `Email or password is incorrect.`) hoặc, nếu server không gửi, là `Request failed (500)`.
6. `error.status` mang theo con số, để màn hình xử lý `401` theo cách riêng.
7. Khi thành công, nơi gọi nhận được object, ví dụ `{ user }` hoặc `{ todos }`.

Nếu ai đó quên header `Content-Type` thì sao? `express.json()` phía server chỉ đọc body được gắn nhãn JSON, nên body coi như rỗng và signup trả `400 Name is required.` dù người dùng đã gõ tên.

**BA được gì?** Mọi lỗi người dùng thấy hoặc là nguyên văn câu chữ của server, hoặc là `Request failed (N)`. Khi review câu chữ thông báo lỗi, hãy trao đổi với team backend: câu chữ nằm ở đó.

---

## 4. async/await, try/catch/finally và cờ submitting

Một request cần thời gian: vài mili giây ở máy local, có khi vài giây trên mạng điện thoại. `async`/`await` cho phép chờ câu trả lời mà không làm đơ trang. `await api(...)` chỉ tạm dừng hàm này; trình duyệt vẫn cuộn và vẽ lại bình thường. Phần còn lại của `handleSubmit`:

```jsx
setSubmitting(true);

try {
  const path = isSignup ? '/auth/signup' : '/auth/login';
  const body = isSignup ? { name, email, password } : { email, password };
  const data = await api('POST', path, body);

  // Remember the email (NOT the password) to pre-fill the form next time.
  localStorage.setItem(LAST_EMAIL_KEY, email);
  onLoggedIn(data.user);
} catch (err) {
  setError(err.message);
} finally {
  setSubmitting(false);
}
```

| Khối | Chạy khi | Ở đây nó… |
| --- | --- | --- |
| `try` | đầu tiên | gửi request; nếu thành công thì lưu email và báo cho `App` ai vừa đăng nhập |
| `catch` | có gì đó trong `try` bị throw | hiện thông báo, ví dụ `Email or password is incorrect.` |
| `finally` | luôn luôn, cuối cùng | tắt cờ `submitting` |

Cờ (flag) `submitting` điều khiển nút bấm: `<button type="submit" disabled={submitting}>`, hiện chữ "Please wait…" trong lúc request đang chạy. Nhờ vậy người dùng biết app đang xử lý, và tránh được **submit hai lần**. Nếu không có `finally`, một request lỗi sẽ để nút bị khóa mãi mãi.

Không phải form nào cũng có chốt chặn này. Nút **Add** trong `TodoPage.jsx` không bao giờ bị disable, nên double-click nhanh có thể tạo cùng một to-do hai lần.

**BA được gì?** "Nút bị disable khi đang submit" và "double-click không tạo bản ghi trùng" là acceptance criteria kiểm thử được, cho mọi form tạo dữ liệu: đơn hàng, thanh toán, đăng ký.

---

## 5. Tải dữ liệu ở lần render đầu: useEffect(…, [])

Có dữ liệu phải tải **ngay khi một màn hình xuất hiện**. Công cụ của React cho việc này là `useEffect`; với danh sách rỗng `[]` làm tham số thứ hai, nó chạy một lần khi component xuất hiện lần đầu. `App.jsx` hỏi "cookie của tôi còn hợp lệ không?":

```jsx
useEffect(() => {
  api('GET', '/auth/me')
    .then((data) => setUser(data.user))
    .catch(() => setUser(null))
    .finally(() => setChecking(false));
}, []);
```

`.then / .catch / .finally` là đúng ba ý của `try / catch / finally`, chỉ viết thành chuỗi. Trình duyệt gửi cookie `token`, server trả `200 {user}` hoặc `401`, và `App` hiện trang to-do hoặc form đăng nhập. Trong lúc chờ, trang hiện `Loading…`. Đó là lý do bạn vẫn đăng nhập sau khi refresh. `TodoPage.jsx` làm tương tự với `api('GET', '/todos')`.

**Lưu ý về StrictMode.** `main.jsx` bọc app trong `<StrictMode>`. Ở môi trường development, React cố ý chạy mỗi effect hai lần để lộ ra lỗi dọn dẹp (cleanup). Trong DevTools → **Network** bạn sẽ thấy **hai** request `me` (và hai request `todos` sau khi đăng nhập), terminal cũng vậy:

```text
GET /api/auth/me → 200 (3 ms)
GET /api/auth/me → 200 (1 ms)
```

Điều này là bình thường khi development và không xảy ra ở bản build production. Đây không phải bug.

**BA được gì?** "Người dùng thấy gì trong lúc tải?" là một câu hỏi yêu cầu. Hãy yêu cầu trạng thái loading, trạng thái rỗng ("Nothing here yet.") và trạng thái lỗi cho mọi màn hình có tải dữ liệu.

---

## 6. Các trạng thái UI của một request và xử lý lỗi theo status

Mọi request đều đưa màn hình qua cùng một vòng đời:

```text
 idle ──► loading ──┬──► success  (show the data)
                    └──► error    (show a message, or go back to login)

 click "Log in" ─► button disabled, "Please wait…" ─► 200: to-do page
                                                   ─► 401: "Email or password is incorrect."
                                                   ─► no network: "Failed to fetch"
```

Mỗi trạng thái là một mẩu state: `submitting` hoặc `loading`, `error` cho thông báo, và chính dữ liệu (`user`, `todos`) cho success. `TodoPage.jsx` xử lý lỗi **theo status** trong một hàm:

```jsx
// A 401 means the cookie is missing or expired: send the user back to login.
function handleError(err) {
  if (err.status === 401) return onSessionExpired();

  setError(err.message);
}
```

| Status | Ý nghĩa | Người dùng thấy |
| --- | --- | --- |
| `401` | Chưa đăng nhập hoặc phiên hết hạn | Form đăng nhập (`onSessionExpired` đặt `user` về `null` trong `App`) |
| `400` | Dữ liệu không hợp lệ, ví dụ tiêu đề rỗng | `Title is required.` |
| `404` | Không có to-do đó cho user này | `To-do not found.` |
| không có | Server hoặc mạng không truy cập được | Chính `fetch` throw lỗi, ví dụ `Failed to fetch` |

Đây là lý do `api.js` gắn `error.status`: màn hình cần con số để chọn giữa "hiện câu chữ" và "về trang đăng nhập".

**BA được gì?** Viết một acceptance criterion cho mỗi status. "Phiên hết hạn khi đang xem danh sách → người dùng về form đăng nhập" là kịch bản tester hay bỏ sót.

---

## 7. Same origin, CORS và Vite proxy

`api.js` gọi `/api/...`, chứ không gọi `http://localhost:4000/api/...`. Đó là chủ ý.

Một **origin** (nguồn gốc) gồm scheme + host + port. `http://localhost:5173` và `http://localhost:4000` khác port, nên là hai origin khác nhau. Mặc định trình duyệt không cho một trang đọc response từ origin khác; điều này ngăn một website bạn ghé vào đọc dữ liệu từ một site khác nơi bạn đang đăng nhập. Server có thể cho phép bằng các header **CORS** (Cross-Origin Resource Sharing), ví dụ `Access-Control-Allow-Origin`. Nếu thiếu, Console sẽ hiện lỗi mà bạn sẽ gặp trong dự án thật:

```text
Access to fetch at 'http://localhost:4000/api/todos' from origin 'http://localhost:5173'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
on the requested resource.
```

Cookie còn thêm một rào cản: `fetch` sang origin khác không gửi cookie, trừ khi code đặt `credentials: 'include'` và server trả `Access-Control-Allow-Credentials: true`.

Sample tránh toàn bộ chuyện này bằng proxy trong `client/vite.config.js`:

```js
proxy: {
  '/api': 'http://localhost:4000',
},
```

```text
 Browser ──► http://localhost:5173/api/todos ──► Vite (5173) ──forwards──► Express (4000)
```

Trình duyệt chỉ nói chuyện với port 5173, còn Vite chuyển tiếp mọi thứ dưới `/api` sang Express. Với trình duyệt, đó là một origin: không có kiểm tra CORS, và cookie `token` được gửi tự động. Trong tab Network, URL hiện port 5173 dù Express mới là bên trả lời. Nếu Express đang tắt, terminal của Vite in lỗi proxy có chữ `ECONNREFUSED` và app hiện `Request failed (…)`.

**BA được gì?** "Lỗi CORS" nghĩa là trình duyệt chặn một lời gọi giữa hai origin. Cách sửa là cấu hình (header CORS hoặc proxy), không phải logic nghiệp vụ. Ở production, cách thường gặp là phục vụ frontend và API dưới cùng một domain; hãy xác nhận điều này trong yêu cầu triển khai.

---

## 8. Optimistic và pessimistic update

Khi người dùng tick một to-do, có hai cách cập nhật màn hình:

| Kiểu | Cách làm | Cảm giác | Rủi ro |
| --- | --- | --- | --- |
| **Pessimistic** (bi quan, sample dùng) | Chờ server, rồi mới cập nhật | Trễ một chút | Thấp: màn hình không bao giờ hiện thứ server đã từ chối |
| **Optimistic** (lạc quan) | Cập nhật ngay, hoàn tác nếu request lỗi | Tức thì | Màn hình có thể "nói dối" trong chốc lát; cần code rollback |

Trong `toggleTodo`, danh sách chỉ thay đổi sau khi `PATCH` thành công, dùng chính to-do mà server gửi về:

```jsx
const data = await api('PATCH', `/todos/${todo.id}`, { done: !todo.done });
setTodos(todos.map((t) => (t.id === todo.id ? data.todo : t)));
```

Vì checkbox là controlled (`checked={todo.done}`), nó không được tick cho tới khi có câu trả lời. Ở máy local bạn không nhận ra; trên mạng chậm thì có. Một phiên bản optimistic (bản phác thảo, **không** có trong sample):

```jsx
async function toggleTodoOptimistic(todo) {
  const before = todos;

  setTodos(todos.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));

  try {
    await api('PATCH', `/todos/${todo.id}`, { done: !todo.done });
  } catch (err) {
    setTodos(before); // undo the change on screen
    handleError(err);
  }
}
```

Chọn kiểu nào là quyết định sản phẩm: optimistic cho thao tác rẻ, đảo ngược được (một lượt like, một checkbox), pessimistic cho mọi thứ dính tới tiền, tồn kho hay giá trị pháp lý.

**BA được gì?** Hãy ghi rõ trong yêu cầu. "Checkbox đổi ngay và quay lại kèm thông báo lỗi nếu lưu thất bại" là một user story khác hẳn "checkbox đổi sau khi đã lưu".

---

## 9. Góc BA: acceptance criteria cho form và API contract

> **Góc BA:** form giấu nhiều lỗi vì ngoài happy path còn rất nhiều nhánh khác. Dùng danh sách dưới đây làm acceptance criteria và kiểm từng mục trong tab Network.

1. **Validation:** Given đang ở chế độ đăng ký, when tên để trống, then hiện "Please enter your name." và **không có request** nào được gửi.
2. **Quy tắc phía server:** Given gọi API trực tiếp với mật khẩu 5 ký tự, then server trả `400` kèm `Password must be at least 8 characters.`
3. **Đang submit:** When người dùng bấm "Sign up", nút bị disable và hiện "Please wait…" cho tới khi có câu trả lời.
4. **Double-click:** Double-click chỉ tạo đúng **một** `POST /api/auth/signup`.
5. **Email trùng:** Given email đã tồn tại, then `409` và `This email is already registered.`
6. **Mất mạng:** Given backend đang tắt, when người dùng submit, then hiện thông báo lỗi, nút bấm được lại và dữ liệu đã gõ vẫn còn.
7. **Quyền riêng tư:** Sau khi đăng nhập, email được điền sẵn lần sau; mật khẩu không bao giờ được lưu.

**API contract là cái bắt tay giữa FE và BE.** Bảng trong `README.md` của sample (method, path, body, success, errors) chính là một contract (hợp đồng). Frontend hứa gửi `{ email, password }` dạng JSON; backend hứa trả `200 {user}` hoặc `401` kèm message `error`. Chừng nào hai bên giữ lời, họ có thể xây và test độc lập. Việc của bạn là làm contract đầy đủ trước khi code: field bắt buộc và giới hạn, status và body khi thành công, mọi status lỗi, route có cần cookie đăng nhập không, và câu chữ chính xác của từng thông báo, vì những chuỗi đó sẽ hiện lên màn hình.

---

## 10. Tóm tắt

Bạn đã đi theo một lần đăng nhập từ bàn phím tới server và quay về. Những ý này áp dụng cho hầu hết mọi web app bạn sẽ làm.

- Controlled input giữ mọi field trong state qua `value` và `onChange`.
- `preventDefault()` chặn việc submit tải lại cả trang, để dữ liệu được gửi ở nền.
- Validation phía client chỉ để tiện; server kiểm tra lại mọi quy tắc vì ai cũng có thể gọi API trực tiếp.
- `api.js` gửi JSON, bỏ qua body với `204`, và biến mọi status ngoài 2xx thành lỗi mang theo status và message của server.
- `async`/`await` chờ mà không làm đơ trang, và `finally` luôn tắt cờ `submitting`.
- `useEffect(…, [])` tải dữ liệu khi màn hình xuất hiện; khi development, StrictMode chạy nó hai lần.
- `401` đưa người dùng về đăng nhập; các lỗi khác hiện message của server.
- Vite proxy biến frontend và API thành một origin, nên không có vấn đề CORS và cookie được gửi tự động.

Checklist, giờ bạn có thể:

- [ ] Giải thích controlled input và vì sao form gọi `preventDefault()`.
- [ ] Chứng minh từ Console rằng server kiểm tra lại validation.
- [ ] Đoán trước message mà `api.js` tạo ra cho bất kỳ status nào.
- [ ] Giải thích các request trùng bạn thấy khi development.
- [ ] Nhận ra lỗi CORS và giải thích proxy xử lý nó thế nào.
- [ ] Viết acceptance criteria bao phủ loading, lỗi, mất mạng và double-click.

**Tiếp theo:** fs-06 sang phía bên kia và xây backend Express trả lời các request này.
