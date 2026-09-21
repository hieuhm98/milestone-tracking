# Chrome DevTools (3): Cookie, localStorage & kiểm thử end-to-end

## 1. Panel Application và ba loại bộ nhớ của trình duyệt

Ở fs-09 bạn đã soi trang web, ở fs-10 bạn đã xem các request đi lại. Mảnh ghép cuối cùng là những gì trình duyệt **giữ lại** giữa các request. Tất cả nằm trong panel **Application**.

1. Chạy cả hai server (fs-03), mở **http://localhost:5173** và đăng nhập.
2. Mở DevTools bằng **F12** hoặc **Ctrl + Shift + I** (macOS: **Cmd + Option + I**).
3. Bấm tab **Application**. Nếu không thấy, nó đang bị giấu sau mũi tên **»** cạnh các tab khác.

Thanh bên trái là một cây thư mục. Tên mục thay đổi đôi chút giữa các phiên bản Chrome, nhưng bố cục thì ổn định:

```text
Application
  Manifest, Service workers      (for installable apps; empty here)
  Storage                        usage summary + the "Clear site data" button
Storage
  Local storage
    http://localhost:5173        todo:lastEmail, todo:filter
  Session storage
    http://localhost:5173        (empty: the app does not use it)
  IndexedDB                      (empty: a database inside the browser)
  Cookies
    http://localhost:5173        token
  Cache storage, ...             (advanced; ignore for now)
Background services, Frames      (ignore for now)
```

**IndexedDB** là một cơ sở dữ liệu thật nằm ngay trong trình duyệt, dùng cho các app chạy offline như ứng dụng email trên web. App của chúng ta không dùng nên mục này trống. Có ba loại bộ nhớ quan trọng với chúng ta, mỗi loại một luật chơi:

| | Cookie | localStorage | sessionStorage |
|---|---|---|---|
| Giới hạn dung lượng thường gặp | khoảng 4 KB mỗi cookie | khoảng 5 MB mỗi origin | khoảng 5 MB mỗi origin |
| Tự động gửi lên server? | **Có**, theo mọi request khớp | Không | Không |
| JavaScript của trang đọc được? | Có, **trừ khi HttpOnly** | Có | Có |
| Thời gian sống | Đến `Expires` / `Max-Age` (hoặc khi đóng trình duyệt) | Đến khi bị xóa | Đến khi đóng **tab** |
| Phạm vi | Domain + path (**bỏ qua** port) | Origin (scheme + host + port) | Origin **và một tab** |
| Ai thường ghi | Server, bằng `Set-Cookie` | JavaScript của trang | JavaScript của trang |
| Trong app của ta | `token` (phiên đăng nhập) | `todo:lastEmail`, `todo:filter` | không dùng |

**Origin** là bộ ba scheme, host và port: `http://localhost:5173` và `http://localhost:4000` là hai origin khác nhau.

**BA được gì?** Khi yêu cầu ghi "ghi nhớ X", câu hỏi thiết kế đầu tiên là *lưu ở đâu*. Lựa chọn người dùng làm trên một máy (bộ lọc) thì để ở bộ nhớ trình duyệt; thứ gì phải đi theo người dùng sang thiết bị khác thì phải nằm trong database.

---

## 2. Soi kỹ cookie `token`

Bấm **Cookies → http://localhost:5173**. Sau khi đăng nhập bạn thấy một dòng:

| Cột | Bạn thấy gì | Ý nghĩa |
|---|---|---|
| Name | `token` | Tên đặt trong `server/src/auth-token.js` |
| Value | `eyJhbGciOiJIUzI1NiIs...` | JWT đã ký. JWT nào cũng bắt đầu bằng `eyJ` |
| Domain | `localhost` | Chỉ gửi cho host này |
| Path | `/` | Gửi cho mọi đường dẫn của site |
| Expires / Max-Age | một ngày khoảng 7 ngày sau | `maxAge: SEVEN_DAYS_MS` |
| HttpOnly | ✓ | JavaScript của trang không đọc được |
| Secure | (trống) | Chỉ bật ở production, khi chạy HTTPS |
| SameSite | `Lax` | Không gửi kèm các POST từ site khác |

Còn vài cột nữa (Size, Priority, thông tin partition) bạn có thể bỏ qua. Bấm vào dòng đó, giá trị đầy đủ hiện ở khung phía dưới.

Các cột này lấy thẳng từ object cấu hình trên server:

```js
// server/src/auth-token.js
export const COOKIE_OPTIONS = {
  httpOnly: true, // page JavaScript cannot read it, so an XSS bug cannot steal it
  sameSite: 'lax', // not sent on cross-site POSTs: basic CSRF protection
  secure: process.env.NODE_ENV === 'production', // HTTPS-only once deployed
  maxAge: SEVEN_DAYS_MS,
};
```

**Chứng minh HttpOnly hoạt động.** Mở tab **Console** và gõ:

```js
document.cookie
// ''
```

Một chuỗi rỗng (hoặc chỉ có vài cookie không liên quan, không HttpOnly, do các project localhost khác để lại): trang web không nhìn thấy `token`, dù trình duyệt vẫn gửi nó theo mọi request. DevTools thấy được vì DevTools là công cụ có đặc quyền, không phải code của trang. Đó chính là mục đích: nếu kẻ tấn công chạy được một đoạn script trên trang (lỗi **XSS**, cross-site scripting), đoạn script đó cũng không đọc được token.

**Vì sao cookie nằm dưới localhost:5173 mà không phải 4000?** Vì trình duyệt chưa bao giờ nói chuyện với port 4000. Response đăng nhập trả về từ `localhost:5173`; proxy của Vite đã lấy nó từ Express ở phía sau. Với Chrome, cả app là một site. Có một chi tiết hay gây bất ngờ: cookie bỏ qua port, nên nếu bạn mở trực tiếp `http://localhost:4000/api/auth/me` trong một tab, cookie đó vẫn được gửi. localStorage thì không như vậy, bạn sẽ thấy ở mục 4.

**BA được gì?** "Phiên đăng nhập kéo dài 7 ngày", "script không đọc được token" và "chỉ gửi qua HTTPS ở production" là ba yêu cầu phi chức năng kiểm thử được, và một dòng trong bảng này kiểm chứng cả ba.

---

## 3. Năm thí nghiệm kiểm tra luật đăng nhập

Mở sẵn tab **Network** ở một tab DevTools khác (hoặc dock riêng) để thấy bằng chứng cho từng bước. Trước mỗi thí nghiệm, đăng nhập lại nếu cần.

**Thí nghiệm 1: xóa cookie rồi thêm một to-do.**

1. Trong **Cookies**, chọn dòng `token` và nhấn **Delete** (hoặc bấm nút ✕ "Delete selected").
2. Danh sách to-do vẫn còn trên màn hình: React đang giữ nó trong bộ nhớ (state). Chưa có gì hỏi server cả.
3. Gõ "Test" và bấm **Add**.
4. Network hiện `POST /api/todos` với status **401** và response `{"error":"Please log in first."}`.
5. App quay về màn hình đăng nhập, vì `handleError` gọi `onSessionExpired()` với mọi lỗi 401. To-do không được lưu.

**Thí nghiệm 2: sửa giá trị cookie thành rác.**

1. Đăng nhập lại. Trong **Cookies**, double-click ô Value của `token`, gõ `garbage` và nhấn **Enter**.
2. Tick một to-do bất kỳ. Network hiện `PATCH /api/todos/<id>` với **401** và `{"error":"Your session has expired. Please log in again."}`.
3. Quay về màn hình đăng nhập.

Hai thông báo khác nhau đến từ hai lần kiểm tra khác nhau trong `requireAuth` (middleware, tức hàm chạy trước route): không có cookie, hoặc có cookie nhưng `verifyToken` từ chối chữ ký. Token giả mạo, bị hỏng hay hết hạn đều ra thông báo thứ hai.

**Thí nghiệm 3: refresh khi đang đăng nhập.**

1. Đăng nhập và nhấn **F5**.
2. Network hiện `GET /api/auth/me` → **200** với `{"user":{...}}`, rồi `GET /api/todos` → **200**.
3. Bạn vẫn đăng nhập. State của React bị xóa sạch khi refresh, nhưng cookie còn, và `App.jsx` hỏi server "tôi là ai?" mỗi lần tải trang. Ở môi trường dev bạn có thể thấy mỗi request hai lần: StrictMode của React cố ý chạy effect hai lần. Đó không phải bug.

**Thí nghiệm 4: đăng xuất.**

1. Bấm **Log out**. Network hiện `POST /api/auth/logout` → **204**.
2. Bấm vào request đó, xem **Response Headers**: `Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`. Một ngày trong quá khứ là cách server bảo trình duyệt xóa cookie.
3. Trong **Cookies**, `token` đã biến mất (bấm biểu tượng refresh phía trên bảng nếu bảng chưa cập nhật). Để ý rằng **Local storage vẫn giữ `todo:lastEmail`**, nên form đăng nhập được điền sẵn email.

**Thí nghiệm 5: Clear site data.**

1. Đăng nhập, chọn bộ lọc **done**, rồi bấm **Application → Storage** ở thanh bên.
2. Bấm **Clear site data** (các ô tick bên dưới cho phép chọn loại dữ liệu; giữ mặc định).
3. Refresh trang. Bạn bị đăng xuất, ô email trống và sau khi đăng nhập, bộ lọc trở về **all**. Cả cookie lẫn localStorage đều bị xóa. To-do của bạn vẫn còn, vì chúng nằm trong `todo.db` trên server chứ không ở trình duyệt.

> **Góc BA:** mỗi thí nghiệm là một acceptance criterion trá hình. "Given cookie phiên đăng nhập bị mất, when tôi thêm một to-do, then tôi được đưa về màn hình đăng nhập và không có gì được lưu." Viết unhappy path chính xác đến mức này giúp tester nghiệm thu trong hai phút, kèm ảnh chụp lỗi 401 làm bằng chứng.

---

## 4. localStorage: hai tùy chọn của app

Bấm **Local storage → http://localhost:5173**. Bạn thấy một bảng key/value:

| Key | Value | Ai ghi |
|---|---|---|
| `todo:lastEmail` | `lan@mail.com` | `AuthForm.jsx`, sau khi đăng nhập hoặc đăng ký thành công |
| `todo:filter` | `active` | `TodoPage.jsx`, mỗi lần bạn bấm một nút lọc |

`todo:filter` chưa tồn tại cho đến khi bạn bấm bộ lọc lần đầu. Hãy thử:

1. **Xem nó cập nhật.** Bấm **all**, **active**, **done** trong app. Giá trị đổi theo mỗi lần bấm (bấm biểu tượng refresh nếu bảng chậm cập nhật).
2. **Sửa bằng tay.** Double-click vào value, gõ `done`, nhấn **Enter**, rồi refresh trang. App mở ra với bộ lọc **done** được chọn: nó đọc giá trị của bạn lúc khởi động.
3. **Cố tình làm hỏng.** Đặt giá trị thành `urgent` và refresh. App hiện **all**, vì `readFilter` chỉ chấp nhận ba giá trị đã biết:

```js
// client/src/components/TodoPage.jsx
function readFilter() {
  try {
    const saved = localStorage.getItem(FILTER_KEY);

    return FILTERS.includes(saved) ? saved : 'all';
  } catch {
    return 'all';
  }
}
```

Ai sở hữu trình duyệt cũng sửa được bộ nhớ trình duyệt, nên code tốt không bao giờ tin nó mù quáng. `urgent` vẫn nằm trong storage cho đến khi bạn bấm một nút lọc, nhưng nó không còn làm hỏng màn hình được nữa.

Các thao tác tương tự chạy được từ **Console** (phải ở đúng tab của app):

```js
localStorage.getItem('todo:filter')        // 'done'
localStorage.setItem('todo:filter', 'active')
localStorage.removeItem('todo:lastEmail')
localStorage.clear()                       // removes every key for this origin
```

Giá trị luôn là **chuỗi**: `setItem('n', 5)` lưu `'5'`. Và vì localStorage tách theo origin, một key lưu ở `localhost:5173` sẽ vô hình ở `localhost:4000`, khác với cookie.

**BA được gì?** "Nhớ bộ lọc lần trước" là một yêu cầu, và localStorage là cách rẻ nhất để đáp ứng. Nhưng hãy hỏi thêm câu về quyền riêng tư: sau khi **Log out**, email cuối cùng vẫn còn trên máy dùng chung. Người dùng của bạn có chấp nhận điều đó không? Đó là một quyết định, không phải chi tiết kỹ thuật.

---

## 5. sessionStorage, và những thứ không bao giờ được lưu ở trình duyệt

**sessionStorage** có API giống hệt localStorage, nhưng dữ liệu chỉ sống cùng **tab**. App không dùng nó, nên hãy thử trong Console:

1. Ở tab app: `sessionStorage.setItem('demo', 'hello')`, rồi `sessionStorage.getItem('demo')` trả về `'hello'`.
2. Mở một **tab mới** tới `http://localhost:5173`, mở Console của tab đó và chạy `sessionStorage.getItem('demo')`. Kết quả là `null`. Giờ chạy `localStorage.getItem('todo:filter')`: cùng giá trị như ở tab đầu.
3. Đóng tab đầu tiên. sessionStorage của nó mất hẳn. (Ngoại lệ: **Duplicate tab** sẽ sao chép nó.)

Công dụng điển hình: một form nhiều bước đang điền dở, hoặc bước của một wizard không nên lan sang tab khác.

**Những thứ KHÔNG BAO GIỜ được lưu trong localStorage hay sessionStorage:**

| Không bao giờ lưu | Vì sao |
|---|---|
| Mật khẩu | Ai cầm laptop, hay bất kỳ script nào, cũng đọc được dạng chữ thường |
| Token đăng nhập của app rủi ro cao (ngân hàng, y tế, trang quản trị) | Bất kỳ script nào chạy trên trang cũng đọc và gửi đi được |
| Dữ liệu cá nhân (số CCCD, địa chỉ, dữ liệu sức khỏe) | Vẫn nằm trên máy sau khi đăng xuất, có thể vi phạm luật bảo vệ dữ liệu |
| Secret như API key | Mọi thứ trong trình duyệt người dùng đều nhìn thấy |

Nguyên tắc đằng sau bảng này: **mọi JavaScript trên trang đều đọc được cả hai loại storage**. Kể cả code của bạn, mọi thư viện bên thứ ba, widget analytics và chat, và mọi script kẻ tấn công chèn vào qua lỗi XSS. Cookie HttpOnly là nơi duy nhất script của trang không với tới, và đó chính là lý do app này giữ token ở đó, chỉ để các tùy chọn vô hại trong localStorage.

**BA được gì?** Thêm một dòng "lưu trữ dữ liệu" vào các story đụng tới dữ liệu cá nhân: "Script của trang không được đọc được session token" hoặc "Không còn dữ liệu cá nhân nào trong trình duyệt sau khi đăng xuất". Người review bảo mật tìm đúng những câu như vậy.

---

## 6. Kiểm thử với hai người dùng: quyền riêng tư và quyền sở hữu

Bug nghiêm trọng nhất một app to-do có thể mắc là cho người này xem dữ liệu của người khác. Bạn tự kiểm tra được.

1. **Người dùng A** ở cửa sổ Chrome bình thường, đăng nhập là Lan, có vài to-do.
2. Mở một **cửa sổ Ẩn danh (Incognito)** (**Ctrl + Shift + N**, macOS **Cmd + Shift + N**) và vào `http://localhost:5173`. Incognito có **hộp cookie** (cookie jar) riêng và localStorage riêng, nên bạn vào trong trạng thái chưa đăng nhập. (Một Chrome profile thứ hai cũng được; các cửa sổ Incognito dùng chung một hộp cookie với nhau.)
3. Đăng ký **người dùng B** (Minh) và thêm một to-do. Mỗi cửa sổ chỉ thấy danh sách của riêng mình.
4. Ở cửa sổ của A, mở Network, bấm `GET /api/todos` và đọc `id` của một to-do của Lan trong tab **Preview**, ví dụ `1`.
5. Ở cửa sổ của B, mở Console và thử sửa rồi xóa to-do của Lan. (Nếu Chrome không cho dán, gõ `allow pasting` rồi Enter trước; đây là cơ chế chống lừa đảo.)

```js
const res = await fetch('/api/todos/1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ done: true }),
});

console.log(res.status, await res.json());
// 404 {error: 'To-do not found.'}

(await fetch('/api/todos/1', { method: 'DELETE' })).status
// 404
```

6. Refresh cửa sổ của A: to-do của Lan không thay đổi.

Vì sao là **404** mà không phải 403? Mọi câu query đều lọc theo người dùng đang đăng nhập, ví dụ `SELECT * FROM todos WHERE id = ? AND user_id = ?`. Với Minh, to-do của Lan đơn giản là không tồn tại, nên server thậm chí không xác nhận id đó có thật.

**BA được gì?** Loại bug này (sửa bản ghi của người khác bằng cách đoán id) có tên riêng: **IDOR**, insecure direct object reference. Nó thuộc nhóm lỗi API phổ biến nhất. Luôn viết một acceptance criterion cho nó, và kiểm thử bằng hai trình duyệt, không phải một.

---

## 7. Kịch bản kiểm thử end-to-end hoàn chỉnh

Kiểm thử end-to-end (**E2E**) nghĩa là kiểm tra cả chuỗi, từ màn hình qua API xuống database, đúng như người dùng làm. Chạy kịch bản này sau một lần `npm run db:reset` sạch sẽ. Với mỗi case, chụp lại bằng chứng ở cột cuối.

| ID | Tình huống | Các bước | Kết quả mong đợi | Bằng chứng DevTools |
|---|---|---|---|---|
| E2E-01 | Đăng ký hợp lệ | Name Lan, `lan@mail.com`, mật khẩu `password123` | Danh sách "Hi, Lan", trống | `POST /api/auth/signup` 201; cookie `token` xuất hiện |
| E2E-02 | Đăng ký trùng email | Đăng ký lại với `lan@mail.com` | "This email is already registered." | 409 |
| E2E-03 | Trùng email, khác chữ hoa/thường | Đăng ký với `LAN@Mail.com` | Cùng thông báo | 409 (email được chuyển về chữ thường) |
| E2E-04 | Mật khẩu ngắn | Mật khẩu `1234567` | "Password must be at least 8 characters." | **Không** có request: form chặn lại |
| E2E-05 | Email sai định dạng | Email `lan@mail` | "Email is not valid." | 400 |
| E2E-06 | Thiếu tên | Để trống Name | "Please enter your name." | Không có request |
| E2E-07 | Đăng nhập hợp lệ | Đúng email và mật khẩu | Hiện danh sách | `POST /api/auth/login` 200 |
| E2E-08 | Sai mật khẩu | Đúng email, sai mật khẩu | "Email or password is incorrect." | 401 |
| E2E-09 | Email không tồn tại | `nobody@mail.com` | **Cùng** thông báo như E2E-08 | 401 |
| E2E-10 | Refresh vẫn giữ phiên | Đăng nhập, nhấn F5 | Vẫn đăng nhập | `GET /api/auth/me` 200 |
| E2E-11 | Cookie bị xóa | Xóa `token`, thêm một to-do | Màn hình đăng nhập, không lưu gì | 401 "Please log in first." |
| E2E-12 | Cookie hỏng hoặc hết hạn | Sửa `token` thành `garbage`, tick một to-do | Màn hình đăng nhập | 401 "Your session has expired. Please log in again." |
| E2E-13 | Đăng xuất | Bấm Log out, rồi refresh | Vẫn ở màn hình đăng nhập | 204; `Set-Cookie` với ngày 1970; không còn cookie |
| E2E-14 | Nút Back sau khi đăng xuất | Đăng xuất, nhấn Back, rồi Forward | Không hiện danh sách to-do | Không có cookie `token` |
| E2E-15 | Thêm to-do | Gõ "Buy milk", bấm Add | Hiện ở đầu danh sách, "1 left" | `POST /api/todos` 201 |
| E2E-16 | Tiêu đề rỗng | Bấm Add khi ô trống hoặc chỉ có dấu cách | "Title is required." | 400 |
| E2E-17 | Tiêu đề 200 ký tự | Dán đúng 200 ký tự | Được thêm | 201 |
| E2E-18 | Tiêu đề 201 ký tự | Dán 201 ký tự | "Title must be 200 characters or fewer." | 400 |
| E2E-19 | Tick và xóa | Tick một mục, rồi xóa một mục khác | Kiểu "đã xong"; mục biến mất; bộ đếm đúng | PATCH 200; DELETE 204 |
| E2E-20 | Bộ lọc được nhớ | Chọn **done**, refresh | **done** vẫn được chọn | `todo:filter` = `done` |
| E2E-21 | Tách biệt giữa người dùng | Mục 6, người dùng A và B | Mỗi người chỉ thấy của mình; B nhận 404 với id của A | PATCH/DELETE 404 "To-do not found." |

Mẹo giúp kịch bản lặp lại được:

- Tạo tiêu đề 200 ký tự trong Console: `'a'.repeat(200)`, rồi copy kết quả.
- Tick **Preserve log** trong Network để request không mất khi trang tải lại sau đăng nhập hay đăng xuất.
- Đặt tên ảnh chụp theo ID case (`E2E-12-network.png`). Một case fail kèm ảnh chụp đã là một bug report tốt.

**BA được gì?** Bảng này chính là một kịch bản UAT. Cột "Kết quả mong đợi" chép từ acceptance criteria, còn cột "Bằng chứng DevTools" là thứ biến câu "máy tôi chạy được mà" thành bằng chứng.

---

## 8. Tổng kết chặng đường: bạn đã xây gì và đi tiếp đâu

Qua mười một bài, bạn đã đưa một app thật từ file zip đến một lượt kiểm thử đầy đủ:

```text
 React 19 + Vite  (:5173)   screens, state, forms, localStorage
        |  /api proxy
 Express 5 (:4000)          routes, middleware, validation, JWT cookie
        |  SQL
 SQLite  (todo.db)          users, todos, one owner per to-do
```

**Giờ bạn có thể:**

- [ ] Cài Node.js và chạy một web app hai phần trên laptop của mình.
- [ ] Đọc một React component và chỉ ra state, props và lời gọi API của nó.
- [ ] Đọc một route Express và kể tên các status code nó có thể trả về.
- [ ] Giải thích mật khẩu được hash thế nào và cookie giữ bạn đăng nhập ra sao.
- [ ] Tìm bất kỳ request nào trong Network, bất kỳ cookie hay key localStorage nào trong Application.
- [ ] Viết acceptance criteria với thông báo và status code chính xác, rồi tự kiểm thử chúng.

**Ý tưởng mở rộng app, viết dưới dạng user story:**

| Ý tưởng | User story | Đụng tới đâu |
|---|---|---|
| Sửa tiêu đề ngay tại chỗ | Là người dùng, tôi muốn sửa tiêu đề to-do ngay tại chỗ để sửa lỗi chính tả mà không phải xóa đi. | Chỉ frontend: `PATCH /api/todos/:id` đã nhận `title` |
| Hạn chót | Là người dùng, tôi muốn đặt hạn chót cho to-do để thấy việc nào gấp. | Cột mới, trường API mới, giao diện, sắp xếp |
| Đặt lại mật khẩu | Là người dùng quên mật khẩu, tôi muốn đặt lại qua email để vào lại được tài khoản. | Gửi email, link dùng một lần có hạn, form mới |
| Triển khai (deploy) | Là product owner, tôi muốn app có địa chỉ HTTPS công khai để người dùng truy cập từ mọi thiết bị. | Hosting, `JWT_SECRET` thật, cờ `Secure` của cookie |

Để ý story đầu tiên rẻ hơn nhiều so với nghe qua, vì API đã hỗ trợ sẵn. Chính loại nhận định này là mục đích của khóa học.

**Đi tiếp đâu trên trang này:** track **Software Requirements**, để biến những trực giác này thành một thực hành yêu cầu bài bản; track **Business Analyst**, nhất là bài *Supporting Testing & UAT* và *Security & Privacy Thinking*; và track **Solutions Architect · DevOps**, nếu bạn muốn xem một app như thế này được đóng gói container, triển khai và giám sát ra sao.

**BA được gì?** Bạn không trở thành developer, và cũng không cần thế. Bạn là người BA đã tận mắt thấy mọi ô trong sơ đồ chạy và hỏng, nên yêu cầu bạn viết sắc hơn và các cuộc trao đổi với developer ngắn hơn.

---

## 9. Tóm tắt

Bạn đã hoàn thành bài cuối của chặng. Giờ bạn có thể:

- [ ] Điều hướng panel Application: Local storage, Session storage, IndexedDB, Cookies, Clear site data.
- [ ] So sánh cookie, localStorage và sessionStorage theo dung lượng, thời gian sống, phạm vi và ai đọc được.
- [ ] Đọc các cột của cookie `token` và chứng minh HttpOnly bằng `document.cookie`.
- [ ] Giải thích vì sao cookie nằm dưới `localhost:5173` (nhờ proxy của Vite).
- [ ] Gây ra cả hai thông báo 401 bằng cách xóa hoặc làm hỏng cookie.
- [ ] Đọc, sửa và xóa localStorage trong panel và trong Console, và giải thích vì sao `readFilter` phải kiểm tra giá trị.
- [ ] Nói được những gì không bao giờ được lưu trong bộ nhớ trình duyệt, và vì sao.
- [ ] Kiểm thử quyền riêng tư với hai người dùng ở cửa sổ thường và cửa sổ Incognito, và biết phải nhận 404 với to-do của người khác.
- [ ] Chạy một kịch bản end-to-end 21 case và thu thập bằng chứng cho từng case.

**Tiếp theo:** đây là bài cuối của chặng "Xây website từ A–Z". Hãy làm bài Final Test của IT Fundamentals, rồi tiếp tục với track Software Requirements.
