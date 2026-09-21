# Xác thực người dùng: Đăng ký, Đăng nhập & Đăng xuất

## 1. Authentication và authorization

Hai từ nghe giống nhau và bị nhầm lẫn ở hầu như mọi dự án:

| | Authentication (authN, xác thực) | Authorization (authZ, phân quyền) |
| --- | --- | --- |
| Câu hỏi | **Bạn là ai?** | **Bạn được làm gì?** |
| Trong app to-do | Đăng ký / đăng nhập bằng email + mật khẩu | Bạn chỉ xem và sửa được to-do **của chính mình** |
| Nằm ở đâu trong code | `server/src/routes/auth.js` | `WHERE user_id = ?` trong `server/src/routes/todos.js` |
| Status khi thất bại | **401 Unauthorized** (server không biết bạn là ai) | 403 Forbidden, hoặc 404 như app mẫu |

Bạn đã gặp hai khái niệm này ở bài *Bảo mật cơ bản*. Bài này mở code thật của
[todo-auth-app.zip](/downloads/todo-auth-app.zip) và đi qua từng bước đăng ký, đăng nhập, đăng xuất.

Phân quyền trong app mẫu diễn ra rất "im lặng": mọi câu query to-do đều kèm user id, nên nếu bạn hỏi
to-do của người khác thì query không tìm thấy gì và trả về `404 To-do not found.` App thậm chí không thừa
nhận là dòng dữ liệu đó tồn tại.

**BA cần gì ở đây?** Viết authN và authZ thành hai yêu cầu riêng. "User đăng nhập được" là authN;
"user chỉ thấy to-do của mình" là authZ, và nó cần acceptance criteria riêng, test riêng
(đăng nhập bằng user B, thử gọi id to-do của user A).

---

## 2. HTTP là stateless: server nhớ bạn bằng cách nào?

HTTP là **stateless** (không lưu trạng thái): mỗi request (yêu cầu gửi lên server) đến một cách độc lập,
server không nhớ request trước đó. Sau khi bạn đăng nhập, request tiếp theo (`GET /api/todos`) vẫn phải
chứng minh lại bạn là ai. Có hai cách thiết kế phổ biến.

| | Session phía server | Token (JWT) |
| --- | --- | --- |
| Trạng thái đăng nhập nằm ở đâu | Trên server (bộ nhớ, database, Redis) | Bên trong token mà trình duyệt giữ |
| Trình duyệt mang theo gì | Một ID ngẫu nhiên, không mang ý nghĩa | Một mẩu dữ liệu đã ký, đọc được |
| Đăng xuất / thu hồi | Xóa dòng session: chết ngay ở mọi nơi | Khó: token còn hiệu lực đến khi hết hạn |
| Nhiều server | Tất cả phải dùng chung kho session | Server nào có secret cũng kiểm tra được |
| Hay dùng cho | Web app truyền thống, ngân hàng | API, app mobile, demo nhỏ |

App mẫu dùng **JWT đặt bên trong một cookie HttpOnly**. Cookie là mẩu dữ liệu nhỏ trình duyệt lưu theo
từng website và tự động gửi kèm mọi request tới website đó. Server kiểm tra token bằng `JWT_SECRET`
trong file `.env`, không cần bảng session nào.

**BA cần gì ở đây?** "Đăng xuất khỏi mọi thiết bị" hay "admin đá một user ra ngay lập tức" rất dễ với
session phía server nhưng tốn công với JWT thuần. Nếu nghiệp vụ cần, hãy nói sớm.

---

## 3. Đăng ký, từng bước một

Khi bạn điền form và bấm **Sign up**, đây là toàn bộ hành trình:

```text
 Browser (React)                 Express server                      SQLite
 ---------------                 --------------                      ------
 POST /api/auth/signup
 { name, email, password } --->  trim name, trim + lowercase email
                                 invalid?  <--- 400 { error }
                                 SELECT id FROM users WHERE email=? --->
                                 exists?   <--- 409 This email is already registered.
                                 bcrypt.hashSync(password, 10)
                                 INSERT INTO users (...)         --->  new row, id 1
                                 signToken(user)  (the JWT)
          <--- 201 Created
               Set-Cookie: token=eyJ...; HttpOnly; SameSite=Lax
               { "user": { "id": 1, "name": "An", "email": "an@example.com" } }
 setUser(user) -> to-do screen
```

Phần cốt lõi của `routes/auth.js` (trích đoạn):

```js
const email = String(req.body?.email ?? '').trim().toLowerCase();

// The server validates again even though the form already did:
// anyone can skip the form and call the API directly.
if (!name) return res.status(400).json({ error: 'Name is required.' });
if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Email is not valid.' });
if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (existing) return res.status(409).json({ error: 'This email is already registered.' });

// Store a one-way hash, never the password itself.
const passwordHash = bcrypt.hashSync(password, 10);
```

Thử ngay:

1. Chạy server (`npm run dev` trong `server/`) và client (`npm run dev` trong `client/`), mở http://localhost:5173.
2. Mở DevTools (F12) → tab **Network**, bấm **Create an account**, đăng ký bằng `an@example.com`.
3. Bấm vào request `signup`: status **201**, và trong **Response Headers** có dòng `Set-Cookie`.
4. Đăng xuất, rồi đăng ký lại bằng `AN@Example.com`. Bạn nhận **409** và "This email is already registered."
   vì server đã chuyển email về chữ thường trước khi kiểm tra.

Terminal của server in một dòng cho mỗi request:

```text
POST /api/auth/signup → 201 (86 ms)
POST /api/auth/signup → 409 (0 ms)
```

Để ý: request 201 mất 86 ms còn 409 mất 0 ms. Phần chậm chính là bước hash bằng bcrypt, và trường hợp
trùng email không bao giờ đi tới bước đó.

---

## 4. Hash mật khẩu: vì sao database không bao giờ thấy mật khẩu của bạn

**Không bao giờ lưu mật khẩu.** Database có thể bị lộ, và người dùng hay dùng lại mật khẩu, nên chỉ một
lần lộ mật khẩu dạng chữ thường là mở luôn cả email và tài khoản ngân hàng của họ.

| | Mã hóa (encryption) | Băm (hashing) |
| --- | --- | --- |
| Chiều | Hai chiều: ai có key thì giải mã được | Một chiều: không có "giải băm" |
| Dùng cho | Dữ liệu cần đọc lại (file, số thẻ) | Kiểm tra mật khẩu mà không cần biết nó |

App mẫu chỉ lưu **bcrypt hash** trong cột `users.password_hash`. Một dòng thật từ lần chạy thử:

```text
$2b$10$XKAMQKDPyQSZ5kvZDbs6UOkn3Pqyw8A9nrz.YmNeonzlyKchl4Bv2
 |   |  |                     |
 |   |  22 chars: the salt    31 chars: the hash itself
 |   cost 10 = 2^10 = 1,024 rounds
 algorithm version (bcrypt)
```

- **Salt** (muối): các byte ngẫu nhiên được trộn vào trước khi băm và lưu ngay trong chuỗi hash. Hai user
  cùng mật khẩu `secret123` nhận hai hash hoàn toàn khác nhau, nên kẻ tấn công không nhận ra ai dùng chung
  mật khẩu và không dùng được bảng tra sẵn.
- **Cost 10**: bcrypt **cố tình** chậm (khoảng 70 ms ở đây). Một lần đăng nhập thì không thấy gì; kẻ tấn
  công thử hàng tỷ lần đoán thì thấy rõ. Tăng cost thêm 1 là gấp đôi khối lượng tính toán.
- **Kiểm tra**: khi đăng nhập, `bcrypt.compareSync(password, user.password_hash)` đọc salt từ chuỗi đã
  lưu, băm mật khẩu vừa gõ theo đúng cách đó rồi so sánh. `secret123` → true, `Secret123` → false.

Xem hash của chính bạn (trong `server/`, sau khi đã đăng ký; lệnh này chạy được cả trên PowerShell lẫn macOS):

```bash
node -e "const db = require('better-sqlite3')('todo.db'); console.log(db.prepare('SELECT id, email, password_hash FROM users').all())"
```

**BA cần gì ở đây?** "Quên mật khẩu → gửi mật khẩu cũ qua email" là bất khả thi theo thiết kế, và không
bao giờ nên xuất hiện trong yêu cầu. Câu chuyện đúng là "đặt lại mật khẩu" (mục 9).

---

## 5. Đăng nhập, và thông báo lỗi cố tình mơ hồ

```text
 Browser                          Express server                         SQLite
 POST /api/auth/login
 { email, password }  ------>     trim + lowercase email
                                  SELECT * FROM users WHERE email=?  --->
                                  no user?  or  bcrypt.compareSync false?
                                       <--- 401 Email or password is incorrect.
                                  signToken(user)
          <--- 200 OK, Set-Cookie: token=...  { "user": {...} }
```

```js
// Same message for "no such email" and "wrong password", so nobody can
// use the login form to find out who has an account.
if (!user || !bcrypt.compareSync(password, user.password_hash)) {
  return res.status(401).json({ error: 'Email or password is incorrect.' });
}
```

Nếu app báo "Không có tài khoản với email này", ai cũng có thể thử cả danh sách email để biết ai đang dùng
dịch vụ. Kiểu tấn công này gọi là **account enumeration** (dò tài khoản), và nó rất quan trọng với app hẹn
hò, y tế hay nhân sự, nơi chỉ riêng việc "có tài khoản" cũng là thông tin riêng tư.

Hai điểm cần nói thật mà một tester giỏi sẽ phát hiện:

- **Thời gian phản hồi.** Sai mật khẩu mất 67 ms (bcrypt có chạy), email không tồn tại chỉ 1 ms (bcrypt bị
  bỏ qua). Kẻ tấn công kiên nhẫn có thể đo được; code production so với một hash giả để hai nhánh tốn thời gian như nhau.
- **Form đăng ký vẫn để lộ.** `409 This email is already registered.` tiết lộ đúng thông tin đó.
  Sản phẩm cần riêng tư cao sẽ trả lời "Hãy kiểm tra hộp thư" trong cả hai trường hợp.

**BA cần gì ở đây?** Ghi thông báo lỗi vào acceptance criteria, đúng từng chữ, và nêu rõ thông tin nào
không bao giờ được để lộ.

---

## 6. Bên trong một JWT có gì?

JWT là ba phần mã hóa base64url nối nhau bằng dấu chấm: **header.payload.signature**.

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJzdWIiOjEsImVtYWlsIjoi... . G6SH5hjE7QtIRnRJ0so8...
{"alg":"HS256","typ":"JWT"}            {"sub":1,"email":"an@example.com",   HMAC-SHA256 of the first two
                                        "iat":1790003811,"exp":1790608611}   parts, made with JWT_SECRET
```

| Claim | Ý nghĩa | Trong app mẫu |
| --- | --- | --- |
| `sub` | subject: token nói về ai | user id |
| `email` | do `signToken` thêm vào | email của user |
| `iat` | issued at, thời điểm cấp (số giây từ 1970) | lúc đăng nhập |
| `exp` | expires at, thời điểm hết hạn | `iat` + 604.800 giây = 7 ngày (`expiresIn: '7d'`) |

Hai điều cần nhớ:

1. **Payload chỉ được encode, không được mã hóa.** Ai có token cũng đọc được (dán vào jwt.io, hoặc giải
   mã trong Console). **Không bao giờ đặt bí mật vào JWT**: không mật khẩu, không số thẻ.
2. **Không thể làm giả nếu không có `JWT_SECRET`.** Chúng tôi đã đổi `sub` từ 1 sang 2 trong một token
   sao chép rồi gọi API: `401 Your session has expired. Please log in again.` Đổi một ký tự thôi là chữ ký
   không còn khớp. Đó là lý do `.env` và secret trong đó không bao giờ được commit.

Thử ngay:

1. DevTools → **Application** → **Cookies** → `http://localhost:5173`, copy giá trị của `token`.
2. Lấy phần ở giữa (giữa hai dấu chấm), rồi chạy trong tab **Console**:

```js
// Replace the text in quotes with your own middle part
JSON.parse(atob('eyJzdWIiOjEsImVtYWlsIjoiYW5AZXhhbXBsZS5jb20iLCJpYXQiOjE3OTAwMDM4MTEsImV4cCI6MTc5MDYwODYxMX0'))
// → { sub: 1, email: 'an@example.com', iat: 1790003811, exp: 1790608611 }
```

(Nếu phần đó có ký tự `-` hoặc `_`, hãy đổi chúng thành `+` và `/` trước: đó chính là chữ "url" trong base64url.)

---

## 7. Các thuộc tính của cookie, và vì sao token không nằm trong localStorage

Header thật từ response của request đăng ký:

```http
Set-Cookie: token=eyJhbGci...; Max-Age=604800; Path=/; Expires=Mon, 28 Sep 2026 15:16:50 GMT; HttpOnly; SameSite=Lax
```

| Thuộc tính | Trong app mẫu | Chặn được gì |
| --- | --- | --- |
| `HttpOnly` | luôn bật | **XSS đánh cắp token**: JavaScript trên trang không đọc được cookie, nên script bị chèn vào không gửi token của bạn cho kẻ tấn công được |
| `Secure` | chỉ khi `NODE_ENV=production` | **Nghe lén (sniffing)**: cookie chỉ đi qua HTTPS, không bao giờ qua HTTP thường ở Wi-Fi quán cà phê. Tắt trên localhost vì localhost không có HTTPS |
| `SameSite=Lax` | luôn bật | **CSRF**: website khác không thể khiến trình duyệt của bạn POST tới API của ta kèm cookie; cookie vẫn được gửi khi bạn bấm một link bình thường dẫn tới ta |
| `Max-Age` / `Expires` | 7 ngày | Phiên bị bỏ quên: trình duyệt tự xóa cookie sau 7 ngày |
| `Path=/` | mặc định | Không chặn gì; chỉ để cookie đi kèm mọi đường dẫn, kể cả `/api` |

Tự kiểm tra HttpOnly: trong Console gõ `document.cookie`. `token` không xuất hiện, dù tab Application vẫn
hiển thị nó. Trình duyệt vẫn gửi nó trong mọi request `/api` (xem request header **Cookie** ở tab Network),
và `api.js` không hề động tới nó.

| | Cookie HttpOnly | localStorage |
| --- | --- | --- |
| JavaScript trên trang đọc được không | Không | Có, bất kỳ script nào trên trang |
| Gửi lên server | Tự động, trong mọi request | Chỉ khi code tự thêm vào (ví dụ header `Authorization`) |
| Rủi ro chính | CSRF (được SameSite giảm bớt) | XSS lấy trộm token rồi dùng ở bất cứ đâu |
| Phù hợp cho | Token đăng nhập | Tùy chọn giao diện vô hại |

App mẫu chia đúng như vậy: token nằm trong cookie, còn `localStorage` chỉ giữ `todo:lastEmail` (để điền
sẵn form đăng nhập; mật khẩu không bao giờ được lưu) và `todo:filter` (all / active / done).

---

## 8. Giữ đăng nhập, route được bảo vệ và đăng xuất

**Sau khi refresh trang**, React khởi động với `user = null`. `App.jsx` lập tức hỏi server bạn là ai:

```jsx
// On first load, ask the server "is my cookie still valid?".
// That is what keeps you logged in after a page refresh.
useEffect(() => {
  api('GET', '/auth/me')
    .then((data) => setUser(data.user))
    .catch(() => setUser(null))
    .finally(() => setChecking(false));
}, []);
```

Trong lúc chờ, màn hình hiện "Loading…". 200 → danh sách to-do; 401 → form đăng nhập.

**Route được bảo vệ**: middleware (hàm chạy chen giữa, trước khi route xử lý request) `requireAuth` chạy
trước mọi route `/api/todos` và trước `/api/auth/me`:

```js
if (!token) return res.status(401).json({ error: 'Please log in first.' });

try {
  const payload = verifyToken(token);
  req.userId = payload.sub;
} catch {
  return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
}
```

Không có cookie → `Please log in first.` Token bị sửa hoặc hết hạn → `Your session has expired. Please log
in again.` Ở frontend, `TodoPage` xử lý **mọi 401** giống nhau: `handleError` gọi `onSessionExpired()`,
`App` đặt `user` về `null`, và form đăng nhập hiện ra. Không có thông báo nào, và nội dung bạn đang gõ dở
sẽ mất.

**Đăng xuất** gọi `POST /api/auth/logout`; server trả **204** kèm một cookie đã hết hạn sẵn:

```http
Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax
```

Trình duyệt xóa cookie và `App` hiện form đăng nhập. Nhưng đây chính là cái giá của thiết kế stateless ở
mục 2: **server không giữ danh sách token nào, nên không thể hủy một token.** Trong lần chạy thử, một token
được copy trước khi đăng xuất vẫn nhận `200` từ `/api/auth/me` sau đó, và sẽ còn dùng được đến `exp` bảy
ngày sau. App thật sẽ thêm session hoặc danh sách chặn phía server, hoặc dùng access token sống ngắn
(ví dụ 15 phút) kèm refresh token mà server có thể thu hồi.

**BA cần gì ở đây?** "Sau khi đăng xuất, phiên cũ không dùng được nữa" là một yêu cầu thật với chi phí
thật. Hãy hỏi team sản phẩm cần mức nào.

---

## 9. Từ demo tới production: phần còn thiếu và acceptance criteria

App mẫu cố tình bỏ qua những thứ dưới đây. Mỗi thứ là một user story BA viết trước khi go-live:

| Phần còn thiếu | User story |
| --- | --- |
| Rate limiting / khóa tài khoản | Là product owner, tôi muốn các lần đăng nhập sai liên tiếp bị làm chậm hoặc bị khóa, để không ai đoán mật khẩu hàng loạt được. |
| Xác minh email | Là doanh nghiệp, tôi muốn tài khoản mới phải xác nhận email, để không tạo tài khoản cho địa chỉ mà người đăng ký không sở hữu. |
| Đặt lại mật khẩu | Là user quên mật khẩu, tôi muốn nhận qua email một link đặt lại dùng một lần, hết hạn nhanh, để đặt mật khẩu mới an toàn. |
| MFA | Là user coi trọng bảo mật, tôi muốn có yếu tố thứ hai (mã từ app authenticator), để chỉ lộ mật khẩu thôi thì chưa đủ. |
| Đăng nhập OAuth | Là user mới, tôi muốn "Sign in with Google", để không phải tạo thêm một mật khẩu nữa. |
| Quy tắc mật khẩu | Là doanh nghiệp, tôi muốn từ chối mật khẩu yếu hoặc đã bị lộ, để tài khoản khó bị chiếm hơn. |
| HTTPS | Là bất kỳ user nào, tôi muốn mọi trang chạy qua HTTPS, để mật khẩu và cookie của tôi không bị nghe lén. |

> **Góc BA:** Đây là một bộ acceptance criteria hoàn chỉnh cho app mẫu hiện tại, sẵn sàng giao cho QA.
>
> - **Đăng ký.** Given chưa có tài khoản `an@example.com`, when tôi đăng ký với tên "An", email đó và mật
>   khẩu từ 8 ký tự, then tôi thấy danh sách to-do (trống), response là 201, và cookie `token` được đặt với cờ HttpOnly.
> - Given email đã tồn tại (dù viết hoa hay thường), when tôi đăng ký bằng nó, then tôi thấy "This email is already registered." (409).
> - Given mật khẩu 7 ký tự, when tôi đăng ký, then tôi thấy "Password must be at least 8 characters." và không có tài khoản nào được tạo.
> - **Đăng nhập.** Given sai mật khẩu **hoặc** email không tồn tại, when tôi đăng nhập, then tôi thấy đúng
>   câu "Email or password is incorrect." (401) trong cả hai trường hợp.
> - **Phiên.** Given tôi đang đăng nhập, when tôi refresh trang, then tôi vẫn ở danh sách to-do.
> - **Đăng xuất.** Given tôi đang đăng nhập, when tôi bấm Log out, then tôi thấy form đăng nhập, cookie
>   `token` biến mất, và lần sau email của tôi được điền sẵn.

Các edge case đáng viết test riêng (kết quả đã kiểm chứng trên app mẫu):

| Trường hợp | Kết quả trong app mẫu |
| --- | --- |
| Email trùng nhưng khác hoa/thường (`AN@Example.com`) | 409, email được chuyển về chữ thường trước khi kiểm tra |
| Khoảng trắng quanh email | được cắt bỏ, vẫn chạy |
| Tên chỉ gồm khoảng trắng | 400 `Name is required.` (form báo "Please enter your name.") |
| Mật khẩu có khoảng trắng ở cuối | không bị cắt: khoảng trắng là một phần của mật khẩu |
| Mật khẩu đúng 8 ký tự | được chấp nhận (201); 7 ký tự bị từ chối |
| Phiên hết hạn khi đang thêm to-do | 401 → form đăng nhập, chữ đang gõ bị mất, không có thông báo |
| Hai tab, đăng xuất ở một tab | tab kia vẫn hiện danh sách cho tới request kế tiếp nhận 401 |
| Bấm Back sau khi đăng xuất | không hiện to-do nào; mọi request đều trả 401 |

---

## 10. Tóm tắt

Authentication trả lời "bạn là ai?", authorization trả lời "bạn được làm gì?", và hai thứ được test riêng.
App mẫu giữ trạng thái đăng nhập trong một JWT đã ký, đặt trong cookie HttpOnly, SameSite=Lax; chỉ lưu mật
khẩu dưới dạng bcrypt hash có salt; và khôi phục phiên bằng `GET /api/auth/me` mỗi lần tải trang.

Giờ bạn có thể:

- [ ] Phân biệt authentication và authorization bằng chính ví dụ trong app mẫu.
- [ ] So sánh session phía server với JWT, kể cả lý do đăng xuất không thu hồi được token stateless.
- [ ] Đọc một bcrypt hash (`$2b$10$` + salt + hash) và giải thích vì sao cùng mật khẩu lại cho hash khác nhau.
- [ ] Giải mã payload của JWT và giải thích vì sao nó đọc được nhưng không làm giả được nếu thiếu secret.
- [ ] Nói được mỗi thuộc tính cookie chặn kiểu tấn công nào, và vì sao token không nên nằm trong localStorage.
- [ ] Viết acceptance criteria và test edge case cho đăng ký, đăng nhập, đăng xuất, kể cả các tính năng production còn thiếu.

Tiếp theo: **Chrome DevTools (1): Kiểm tra giao diện với Elements & Console** (fs-09). Ba bài DevTools sẽ kiểm thử mọi thứ bạn đã xây, kể cả phần đăng nhập này, nên hãy giữ lại tài khoản test của bạn.
