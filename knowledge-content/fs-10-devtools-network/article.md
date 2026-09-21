# Chrome DevTools (2): Kiểm thử API với tab Network

## 1. Tab Network ghi lại những gì?

Màn hình cho bạn biết app *hiển thị* gì. Tab **Network** cho bạn biết app đã *làm* gì: mọi **request** (yêu cầu) mà trang gửi đi và mọi **response** (phản hồi) nhận về, từ chính trang HTML, các file script, hình ảnh cho đến các lời gọi API mà code React của chúng ta thực hiện bằng `fetch`.

Quy tắc quan trọng nhất: **DevTools chỉ ghi lại khi nó đang mở.** Request xảy ra trước khi bạn mở panel sẽ không còn dấu vết. Vì vậy hãy mở tab Network *trước khi* bấm, hoặc tải lại trang để ghi lại mọi thứ từ đầu.

1. Chạy backend và frontend như trong fs-03 (hai terminal, mỗi terminal chạy `npm run dev`).
2. Mở **http://localhost:5173** bằng Chrome.
3. Bấm **F12** hoặc **Ctrl + Shift + I** (macOS: **Cmd + Option + I**) rồi chọn tab **Network**. Nếu không thấy, hãy tìm sau mũi tên `>>`.
4. Bấm **F5** (macOS: **Cmd + R**) để tải lại trang khi panel đang mở.

Bạn sẽ thấy hàng chục dòng: ở chế độ dev, Vite phục vụ từng file nguồn (`main.jsx`, `App.jsx`, `api.js`, bản thân React) như một request riêng. Thanh trạng thái ở dưới cùng tóm tắt lại, ví dụ `42 requests | 1.1 MB transferred`.

Có hai nút trên thanh công cụ cần biết ngay từ ngày đầu: nút tròn **record** (đỏ nghĩa là đang ghi) và **Clear** (hình tròn có gạch chéo) để xóa danh sách, giúp thao tác tiếp theo dễ đọc hơn.

**BA được gì?** "Bấm nút không có gì xảy ra" là một nhận xét. "Bấm Add không gửi request nào" hoặc "có gửi request nhưng nhận về 500" là bằng chứng, chỉ cho team biết chính xác phải xem ở đâu.

---

## 2. Lọc riêng lời gọi API và đọc các cột

Phần lớn các dòng là file, không phải lời gọi API. Phía trên danh sách có một hàng bộ lọc theo loại: **All, Fetch/XHR, Doc, CSS, JS, Font, Img, Media, Manifest, Socket (WS), Wasm, Other** (danh sách cụ thể khác nhau tùy phiên bản). Bấm **Fetch/XHR** thì chỉ còn các lời gọi do JavaScript tạo ra. Trong app của chúng ta, đó là mọi thứ dưới `/api`.

Ô text bên cạnh giúp lọc hẹp hơn nữa. Gõ `api` để khớp theo URL, hoặc dùng bộ lọc thuộc tính như `method:POST` hay `status-code:401`. Thêm dấu trừ phía trước (`-status-code:200`) để ẩn các dòng khớp.

| Cột | Cho bạn biết gì | Ví dụ trong app |
|---|---|---|
| **Name** | Phần cuối của URL; rê chuột để xem URL đầy đủ | `me`, `todos`, `login`, `5` (cho `/api/todos/5`) |
| **Status** | HTTP status code, hoặc lý do không có code | `200`, `401`, `(failed)` |
| **Type** | Loại request | `fetch` cho mọi lời gọi API |
| **Initiator** | Đoạn code hoặc file nào khởi tạo request | `api.js:6` |
| **Size** | Số byte đã truyền, tính cả header | vài trăm byte |
| **Time** | Tổng thời gian từ lúc bắt đầu đến byte cuối | thường vài ms khi chạy local |
| **Waterfall** | Thanh ngang cho thấy request chạy lúc nào và mất bao lâu | thanh dài là request chậm |

Cột **Method** (GET, POST, PATCH, DELETE) mặc định bị ẩn. Chuột phải vào tiêu đề cột bất kỳ và tick **Method**. Giờ thì `todos` với GET (tải danh sách) và `todos` với POST (thêm mới) không còn gây nhầm lẫn nữa.

**BA được gì?** Khi bật Fetch/XHR và cột Method, tab Network trở thành bản "live" của API contract trong fs-01: mỗi dòng là một lần gọi endpoint, theo đúng thứ tự người dùng thao tác.

---

## 3. Soi một request: Headers, Payload, Response, Timing

Đăng nhập khi tab Network đang mở, rồi bấm vào dòng `login`. Một khung chi tiết mở ra với nhiều tab.

**Headers → General** là dòng tóm tắt:

```http
Request URL: http://localhost:5173/api/auth/login
Request Method: POST
Status Code: 200 OK
Referrer Policy: strict-origin-when-cross-origin
```

Để ý cổng: **5173**, không phải 4000. Trình duyệt chỉ nói chuyện với Vite; **proxy** chuyển tiếp `/api` sang Express là vô hình khi nhìn từ đây.

**Response Headers** (trích) cho thấy server gửi về những gì. Khi đăng nhập hoặc đăng ký thành công, bạn sẽ thấy cookie được đặt:

```http
X-Powered-By: Express
Set-Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Max-Age=604800; Path=/; Expires=Mon, 28 Sep 2026 09:15:02 GMT; HttpOnly; SameSite=Lax
Content-Type: application/json; charset=utf-8
```

**Request Headers** cho thấy trình duyệt đã gửi gì. Bấm vào một request sau đó như `todos`, bạn sẽ thấy trình duyệt tự động gắn cookie đó. Code của chúng ta không hề đụng tới nó:

```http
GET /api/todos HTTP/1.1
Host: localhost:5173
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Cookie được lưu ở đâu và `HttpOnly` có ý nghĩa thực tế ra sao là chủ đề của fs-11.

Các tab còn lại:

- **Payload**: phần body bạn đã gửi, được hiển thị dạng đã parse (**view source** để xem JSON gốc). Với login: `{"email":"lan@mail.com","password":"secret123"}`. Request GET và DELETE không có body nên không có tab này.
- **Preview**: JSON của response dạng cây có thể mở rộng. **Response**: cùng body đó dạng text thô. Một response `204` hiển thị "no response data available", và điều đó là đúng.
- **Timing**: các giai đoạn như *Queueing*, *Request sent*, *Waiting for server response* và *Content Download*. Login và sign-up chờ lâu hơn hẳn các lời gọi khác, vì băm (hash) mật khẩu bằng bcrypt được thiết kế để chậm có chủ đích.

**BA được gì?** Mỗi tab trả lời một câu hỏi trong bug report: *ta đã gửi gì* (Payload), *nhận về gì* (Status, Preview), *mất bao lâu* (Timing).

---

## 4. Toàn bộ app, từng request một

Đây là chính xác lưu lượng bạn sẽ thấy khi bật bộ lọc **Fetch/XHR**. Các body là chuỗi thật trong code server.

| Hành động của người dùng | Request | Status mong đợi | Body mong đợi |
|---|---|---|---|
| Mở app, chưa đăng nhập | `GET /api/auth/me` | **401** | `{"error":"Please log in first."}` |
| Mở app, đã đăng nhập | `GET /api/auth/me` | 200 | `{"user":{"id":1,"name":"Lan","email":"lan@mail.com"}}` |
| Đăng ký (email mới) | `POST /api/auth/signup` | 201 + `Set-Cookie` | `{"user":{...}}` |
| Đăng ký lại (trùng email) | `POST /api/auth/signup` | 409 | `{"error":"This email is already registered."}` |
| Đăng nhập, sai mật khẩu | `POST /api/auth/login` | 401 | `{"error":"Email or password is incorrect."}` |
| Đăng nhập đúng | `POST /api/auth/login` | 200 + `Set-Cookie` | `{"user":{...}}` |
| Danh sách tải sau khi đăng nhập | `GET /api/todos` | 200 | `{"todos":[...]}` |
| Thêm "Buy milk" | `POST /api/todos` | 201 | `{"todo":{"id":1,"title":"Buy milk","done":false,"createdAt":"..."}}` |
| Bấm Add khi ô trống | `POST /api/todos` | 400 | `{"error":"Title is required."}` |
| Tick checkbox | `PATCH /api/todos/1` | 200 | `{"todo":{...,"done":true,...}}` |
| Xóa | `DELETE /api/todos/1` | 204 | (rỗng) |
| Đăng xuất | `POST /api/auth/logout` | 204 + `Set-Cookie` xóa `token` | (rỗng) |
| Bấm một chip lọc | không có | không có | chỉ lưu trong `localStorage` |

Tự mình đi qua luồng này:

1. Đăng xuất nếu cần, mở tab Network, lọc **Fetch/XHR**, thêm cột **Method**.
2. Tải lại trang. Đăng ký, thêm hai to-do, tick một cái, xóa một cái, đăng xuất.
3. So từng dòng với bảng. Để terminal backend trong tầm mắt: nó in một dòng cho mỗi request, ví dụ `POST /api/todos → 201 (3 ms)`.

**Hai điều trông giống bug nhưng không phải bug:**

- **Các GET đầu tiên xuất hiện hai lần.** `main.jsx` bọc app trong React `<StrictMode>`; ở chế độ dev, nó cố ý chạy mỗi effect hai lần để lộ ra lỗi tiềm ẩn. Vì vậy bạn thấy hai dòng `me` khi tải trang và hai dòng `todos` sau khi đăng nhập. Bản build production chỉ gửi mỗi request một lần.
- **Lỗi 401 màu đỏ trong Console khi chưa đăng nhập.** Hai lời gọi `GET /api/auth/me → 401` cũng hiện trong Console dưới dạng `Failed to load resource: the server responded with a status of 401 (Unauthorized)`. Chrome ghi log mọi response 4xx/5xx theo cách đó. Ở đây 401 là câu trả lời đã được thiết kế cho câu hỏi "tôi đã đăng nhập chưa?", và app hiển thị form đăng nhập là đúng. Đừng báo bug.

**BA được gì?** Bảng này *chính là* một test script. Dán nó vào test plan, thêm cột "Thực tế", và bạn có bộ acceptance test ở mức API mà tester nào cũng chạy được.

---

## 5. Đọc status code, và bug này của ai?

| Nhóm | Ý nghĩa | Trong app này | Thường giao cho |
|---|---|---|---|
| **2xx** | Thành công | 200 OK, 201 Created, 204 No Content | Không ai, trừ khi body sai |
| **3xx** | Chuyển hướng / dùng cache | 304 cho file tĩnh, không bao giờ cho API của ta | Hiếm khi là bug |
| **4xx** | Request sai hoặc không được phép | 400 dữ liệu không hợp lệ, 401 chưa đăng nhập, 404 không tìm thấy, 409 xung đột | Thường là hành vi đúng. Chỉ là bug khi một request *hợp lệ* nhận về nó (khi đó hãy kiểm tra payload) |
| **5xx** | Server bị lỗi | 500 `Something went wrong on the server.` | Backend, gần như luôn luôn |

Một số giá trị ở cột Status không phải là HTTP code: `(failed)`, `(canceled)` hoặc `(blocked:devtools)` nghĩa là không có response nào về cả.

Một cái bẫy về môi trường: nếu terminal Express bị tắt, proxy của Vite không kết nối được cổng 4000 và trình duyệt nhận về **500 với body rỗng**. Form hiển thị `Request failed (500)` và terminal Vite ghi log lỗi proxy kèm `ECONNREFUSED`. Đó là "backend chưa chạy", không phải bug trong code.

**Bug của frontend hay backend?** Hãy lần theo request:

```text
Did a request appear in Network when you acted?
 +- No  -> FRONTEND: the click never reached api()
 +- Yes -> Are the method, URL and Payload what the contract says?
           +- No  -> FRONTEND: it sends the wrong thing
           +- Yes -> Are the status and body what the contract says?
                     +- No  -> BACKEND: right question, wrong answer
                     +- Yes -> Does the screen show that answer correctly?
                               +- No  -> FRONTEND: right answer, wrong display
                               +- Yes -> Not a code bug: re-check the requirement
```

Tóm lại: không có request, hoặc gửi sai dữ liệu → **FE**. Gửi đúng nhưng nhận về sai → **BE**. Nhận về đúng nhưng màn hình hiển thị sai → **FE**. Mọi thứ đều đúng hợp đồng → xem lại chính requirement.

**BA được gì?** Sơ đồ này xóa bỏ phần lớn màn "FE bảo lỗi BE, BE bảo lỗi FE". Đính kèm request, status và body, ticket sẽ đến đúng bàn ngay lần đầu.

---

## 6. Cố ý tạo ra các trạng thái lỗi để kiểm thử

Trên một laptop nhanh, trạng thái loading lóe lên rồi biến mất, còn lỗi mạng thì không bao giờ xảy ra. Thanh công cụ Network cho phép bạn tự tạo ra chúng:

| Công cụ | Tác dụng |
|---|---|
| **Preserve log** | Giữ lại các dòng khi trang tải lại hoặc chuyển trang, để bạn thấy điều gì đã xảy ra *trước* khi reload |
| **Disable cache** | Khi DevTools đang mở, luôn tải file mới (hữu ích sau khi sửa code) |
| Menu **Throttling** | Giả lập mạng chậm: *Fast 4G*, *Slow 4G*, *3G* (phiên bản cũ: *Fast 3G*, *Slow 3G*), cùng **Offline** và cấu hình tùy chỉnh |
| **Request blocking** | Chuột phải một dòng → **Block request URL**, để giả lập đúng endpoint đó bị sập |

**Mạng chậm.** Chọn **3G**, rồi:

1. Đăng nhập: nút hiển thị `Please wait…` và bị vô hiệu hóa, nên không thể gửi hai lần.
2. Tải lại trang: `Loading…` xuất hiện trong lúc `GET /api/auth/me` đang chạy, rồi `Loading…` lại hiện trong danh sách khi `GET /api/todos` đang tải.
3. Gõ một tiêu đề và bấm **Add** hai lần thật nhanh. Nút Add *không* bị vô hiệu hóa khi đang lưu, nên bạn có hai dòng `POST /api/todos` và hai to-do giống hệt nhau. Đây là một phát hiện thật: thiếu requirement ("Nút Add bị vô hiệu hóa trong lúc lưu").

**Offline.** Tải danh sách, rồi chọn **Offline** và bấm **Add**. Dòng request hiện `(failed)` kèm `net::ERR_INTERNET_DISCONNECTED`, và app hiển thị nguyên văn thông báo của trình duyệt `Failed to fetch` bằng chữ đỏ. Về kỹ thuật thì đúng, nhưng vô nghĩa với người dùng, và đó chính là loại thông báo BA nên đặc tả. Console có thể hiện thêm cảnh báo của Vite rằng mất kết nối tới dev server; bỏ qua nó.

**Một endpoint bị sập.** Chuột phải dòng `todos` → **Block request URL**, rồi tải lại trang. Một tab trong drawer mở ra, liệt kê pattern bị chặn (tên là *Network request blocking*, hoặc *Request conditions* ở các phiên bản mới nhất). Dòng request hiện `(blocked:devtools)`, và app hiển thị `Failed to fetch` *và cả* `Nothing here yet.`: một lỗi cộng với một trạng thái rỗng gây hiểu lầm. Giờ hãy chặn `me` thay vào đó và tải lại: form đăng nhập xuất hiện dù cookie của bạn vẫn hợp lệ, tức là sự cố trông giống như bị đăng xuất. Dùng pattern như `*/api/*` để "đánh sập" toàn bộ API.

Khi xong, đặt Throttling về **No throttling** và gỡ các quy tắc chặn. Chrome hiện một biểu tượng cảnh báo trên tab Network khi một trong hai đang bật.

**BA được gì?** Trạng thái loading, rỗng, lỗi và offline là một phần của requirement. Giờ bạn có thể kiểm thử từng cái trong vài phút, thay vì chờ một ngày Wi-Fi chập chờn.

---

## 7. Tự gọi API từ Console

Giao diện chỉ gửi những gì nó cho phép. Server phải tự bảo vệ trước mọi thứ, vì bất kỳ ai cũng có thể bỏ qua form. Console giúp bạn chứng minh điều đó.

**Replay.** Chuột phải một dòng API: Chrome có thể có mục **Replay XHR**, gửi lại y hệt request đó. Replay `POST /api/todos` sẽ tạo thêm một to-do giống hệt.

**Copy rồi sửa.** Chuột phải → **Copy** → **Copy as fetch**. Dán vào **Console**, sửa phần `body`, nhấn Enter, và xem một dòng mới xuất hiện trong Network. Chrome không có sẵn chức năng "Edit and Resend" (Firefox thì có); copy rồi sửa chính là cách tương đương trên Chrome. Lần đầu dán, Chrome có thể chặn lại bằng cảnh báo self-XSS và yêu cầu bạn gõ `allow pasting`. Chỉ làm vậy với code bạn hiểu.

Một hàm trợ giúp nhỏ sẽ dễ dùng lại hơn. Dán đoạn này một lần vào Console trên `localhost:5173`. Trình duyệt tự gửi cookie của bạn, giống hệt `api.js`:

```js
// Test helper: call our API and print status + body.
async function call(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json();

  console.log(res.status, data);
}
```

Sau đó chạy từng phép kiểm tra (Console cho phép dùng `await` ở cấp ngoài cùng):

```js
await call('POST', '/todos', { title: '' });
// 400 {error: 'Title is required.'}
await call('POST', '/todos', { title: 'x'.repeat(201) });
// 400 {error: 'Title must be 200 characters or fewer.'}
await call('PATCH', '/todos/99999', { done: true });
// 404 {error: 'To-do not found.'}
await call('POST', '/auth/signup', { name: 'Test', email: 'test@mail.com', password: '123' });
// 400 {error: 'Password must be at least 8 characters.'}
```

Phép cuối là loại quan trọng nhất: **validation mà giao diện che đi.** Form chặn mật khẩu ngắn trước khi gửi bất kỳ request nào, nên khi dùng bình thường bạn không bao giờ thấy quy tắc của server. Gọi thẳng API chứng minh server cũng thực thi quy tắc đó. Thử thêm `'x'.repeat(200)` (201, giá trị biên), một email không có `@` (`Email is not valid.`), và sau khi đăng xuất, `await call('GET', '/todos')` (`401 {error: 'Please log in first.'}`).

Với dữ liệu của người dùng khác: đăng ký tài khoản thứ hai trong cửa sổ Incognito, thêm một to-do, ghi lại id từ tab Response, rồi `PATCH` id đó từ tài khoản thứ nhất: mong đợi `404 To-do not found.`, không bao giờ là 200.

**cURL.** **Copy as cURL (bash)** chạy được trong Terminal của macOS. Trên Windows, dùng **Copy as cURL (cmd)** trong Command Prompt: trong Windows PowerShell 5.1, lệnh `curl` trơn là alias của `Invoke-WebRequest`. Lệnh được copy chứa cookie `token` của bạn, nên hãy đối xử với nó như mật khẩu.

**BA được gì?** Mỗi quy tắc server trong requirement ("title tối đa 200 ký tự", "mật khẩu từ 8 ký tự") đều xứng đáng có một phép kiểm tra bỏ qua giao diện. Đó là cách bắt được một quy tắc chỉ tồn tại trong form.

---

## 8. Soi nhanh về bảo mật và file HAR

Tester không cần là chuyên gia bảo mật để kiểm tra vài điều mà người dùng nào cũng thấy được:

1. **Không có bí mật trong response.** Mở Preview của `signup`, `login` và `me`: object user chỉ có `id`, `name` và `email`. Nhấn **Ctrl + F** (macOS: **Cmd + F**) khi đang ở panel Network để tìm `password_hash` trong mọi request và response. Mong đợi: không có kết quả nào.
2. **Cùng một thông báo cho email không tồn tại và sai mật khẩu.** Thử cả hai. Cả hai phải trả về `401` với `Email or password is incorrect.`, để không ai dùng form để dò xem ai có tài khoản. Quan sát nâng cao: tab Timing có thể cho thấy trường hợp email không tồn tại trả về nhanh hơn, vì bước kiểm tra mật khẩu (chậm) bị bỏ qua. Đó là một kẽ hở tinh vi đáng báo cho dev.
3. **Token chỉ đi trong cookie.** Nó xuất hiện trong `Set-Cookie` kèm `HttpOnly`, không bao giờ nằm trong body response hay URL.
4. **Sau khi đăng xuất, API từ chối.** Đăng xuất, rồi `await call('GET', '/todos')` phải trả về 401.

Mật khẩu hiện rõ trong tab Payload. Điều đó bình thường: trình duyệt của chính bạn biết bạn đã gõ gì, và trên site thật HTTPS sẽ mã hóa nó trên đường truyền.

**File HAR.** File HAR (HTTP Archive) là toàn bộ bản ghi được lưu dưới dạng JSON, dev có thể nạp vào DevTools của họ để thấy chính xác những gì bạn đã thấy.

1. Xóa danh sách, tick **Preserve log**, tái hiện bug với ít bước nhất có thể.
2. Bấm mũi tên tải xuống **Export HAR** trên thanh công cụ Network (hoặc chuột phải vào danh sách → *Save all as HAR*).
3. Đính kèm file `.har` vào ticket cùng các bước. Dev kéo thả nó vào panel Network của họ để thấy chính xác những gì bạn thấy.

**Cảnh báo:** file HAR chứa mọi thứ, gồm cả cookie, token, mật khẩu đã gõ và dữ liệu cá nhân. Các bản Chrome gần đây mặc định export HAR đã được *làm sạch* (sanitized), bỏ đi các header `Cookie`, `Set-Cookie` và `Authorization`, nhưng body của request vẫn còn nguyên bên trong. Hãy ghi bằng tài khoản test, mở file bằng trình soạn thảo văn bản, tìm `password` và `token`, và không bao giờ chia sẻ công khai HAR từ phiên làm việc của khách hàng thật.

**BA được gì?** Những lần soi này biến các yêu cầu bảo mật như "không bao giờ lộ password hash" và "không tiết lộ email nào đã đăng ký" thành các phép kiểm tra chạy trong hai phút.

---

## 9. Góc BA: checklist kiểm thử API cho app này

> **Góc BA:** hãy viết acceptance criteria nêu rõ **status code** và **thông báo chính xác**, chứ không chỉ "hiển thị lỗi". "Given title rỗng, then API trả về 400 với `Title is required.` và danh sách không đổi" thì ai cũng kiểm tra được trong tab Network, và không thể cãi nhau về nó.

| # | Kiểm tra | Cách làm | Mong đợi |
|---|---|---|---|
| 1 | Kiểm tra phiên khi tải trang, chưa đăng nhập | Tải lại | `GET /api/auth/me` 401 (hai lần ở dev), hiện form đăng nhập |
| 2 | Đăng ký | Gửi một tài khoản mới | 201, `Set-Cookie: token=…; HttpOnly; SameSite=Lax` |
| 3 | Trùng email | Đăng ký lại | 409 `This email is already registered.` |
| 4 | Mật khẩu ngắn, bỏ qua UI | Console `call('POST', '/auth/signup', …)` | 400 `Password must be at least 8 characters.` |
| 5 | Sai mật khẩu và email không tồn tại | Đăng nhập theo cả hai cách | Cả hai 401 `Email or password is incorrect.` |
| 6 | Không lộ password hash | Tìm `password_hash` trong Network | Không có kết quả |
| 7 | Thêm mới, quy tắc title | Rỗng, 200 và 201 ký tự | 400, 201, 400 |
| 8 | Tick và xóa | Bấm checkbox, Delete | PATCH 200 `done: true`; DELETE 204 |
| 9 | To-do của người khác | PATCH id của user khác | 404 `To-do not found.` |
| 10 | Được bảo vệ sau khi đăng xuất | Đăng xuất, rồi `GET /api/todos` | 401 `Please log in first.` |
| 11 | Mạng chậm | Throttle về 3G, đăng nhập và thêm | Có chữ loading; không gửi trùng |
| 12 | Endpoint sập / offline | Chặn `todos`, hoặc bật Offline | Thông báo lỗi rõ ràng, không có danh sách rỗng gây hiểu lầm |

Dòng 11 và 12 hiện đang fail: đó chính là mục đích. Chúng trở thành các user story mới.

Một bug report tốt dựa trên tab Network có **các bước**, **mong đợi** (từ bảng này), **thực tế** (method, URL, status, body) và **bằng chứng** (ảnh chụp dòng request hoặc một HAR đã làm sạch). Checklist này dùng lại được: thay endpoint và thông báo, nó phù hợp với bất kỳ web app nào.

---

## 10. Tóm tắt

Tab Network biến câu "nó không chạy" thành bằng chứng: request nào đã được gửi, nó mang theo gì, nhận về gì, và mất bao lâu. Giờ bạn có thể:

- [ ] Mở tab Network trước khi thao tác (hoặc tải lại trang) và lọc **Fetch/XHR** với cột **Method**.
- [ ] Soi một request: General, Request và Response headers (`Cookie`, `Set-Cookie`), Payload, Preview, Timing.
- [ ] Dự đoán mọi request và status code trong app to-do, và nhận ra các request trùng do StrictMode cùng lỗi 401 khi tải trang là bình thường.
- [ ] Đọc 2xx/4xx/5xx và quyết định bug thuộc về frontend hay backend.
- [ ] Tái hiện trạng thái loading, offline và sự cố bằng throttling, chế độ Offline và request blocking.
- [ ] Gọi API từ Console để kiểm chứng validation phía server mà giao diện che đi.
- [ ] Soi nhanh về bảo mật, và export HAR đã làm sạch mà không làm lộ thông tin đăng nhập.
- [ ] Biến tất cả những điều này thành acceptance criteria với status code và thông báo chính xác.

**Tiếp theo:** fs-11 mở panel Application để xem bên trong cookie `token` và `localStorage`, rồi chạy một bài kiểm thử end-to-end đầy đủ cho app.
