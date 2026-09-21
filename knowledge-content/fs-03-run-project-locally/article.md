# Cài đặt & chạy dự án trên máy (local)

## 1. "Local" là gì, và vì sao mọi thứ bắt đầu từ đó

**Local** nghĩa là "trên chính máy của mình". Khi dev nói "chạy được ở local", ý họ là app đang chạy trên laptop của họ, không phải trên một server ngoài internet.

Có hai cái tên cùng trỏ về máy của bạn:

- **localhost**: một hostname (tên máy) luôn có nghĩa là "máy này".
- **127.0.0.1**: địa chỉ IP đứng sau nó (địa chỉ *loopback*, "vòng lặp về chính mình"). Dữ liệu gửi tới đây không bao giờ rời khỏi máy.

Vậy `http://localhost:5173` đọc là "chương trình đang lắng nghe ở **port** (cổng) 5173 của máy này". Port giống một cánh cửa có đánh số: một máy chạy được nhiều server cùng lúc, mỗi server đứng sau một cửa riêng. App của chúng ta dùng hai cửa: **5173** cho frontend và **4000** cho backend.

Không ai khác mở được `localhost` của bạn. Nếu bạn gửi đồng nghiệp link `http://localhost:5173`, nó sẽ mở *máy của họ*, nơi chẳng có gì đang chạy.

Local nằm ở đâu so với các môi trường quen thuộc:

| Môi trường | Chạy ở đâu | Ai dùng | Dữ liệu |
| --- | --- | --- | --- |
| **Local** | Laptop của chính bạn | Một dev (hoặc bạn) | Giả, dùng xong bỏ |
| **Dev** | Một server dùng chung | Cả team, để ghép code | Giả |
| **Staging / UAT** | Bản sao của production | QA, BA, người dùng nghiệp vụ | Giống thật, đã ẩn danh |
| **Production** | Server thật | Khách hàng thật | Thật |

Dev luôn chạy mọi thứ ở local trước vì nó nhanh (sửa xong thấy ngay trong một giây), an toàn (làm hỏng cũng không ảnh hưởng ai) và miễn phí. Chỉ code đã chạy được ở local mới đi tiếp.

**BA được gì?** Chạy app ở local giúp bạn thử một tính năng trước khi nó lên staging, tự tái hiện một bug theo cách của mình, và hiểu dev muốn nói gì khi bảo "máy em không tái hiện được".

## 2. Cài công cụ

Bạn cần bốn thứ. Chỉ Node.js là bắt buộc.

| Công cụ | Để làm gì | Tải ở đâu |
| --- | --- | --- |
| **Node.js LTS** (22 trở lên) | Chạy backend và dev server của frontend; đi kèm **npm** | nodejs.org |
| **VS Code** | Trình soạn code có sẵn terminal | code.visualstudio.com |
| **Git** (không bắt buộc) | Tải code bằng `git clone`; trên Windows còn có thêm Git Bash | git-scm.com |
| **Chrome** | Trình duyệt có DevTools để test | google.com/chrome |

**Node.js**: chọn bản **LTS** (Long-Term Support, hỗ trợ dài hạn), bản ổn định mà các công ty dùng. Có hai cách cài:

1. **Bộ cài** (đơn giản nhất): tải bộ cài LTS ở nodejs.org rồi bấm Next với tùy chọn mặc định.
2. **Trình quản lý phiên bản** (hữu ích khi mỗi dự án cần một bản Node khác nhau): **nvm-windows** trên Windows, **nvm** trên macOS.

```bash
nvm install lts      # nvm-windows;  macOS nvm: nvm install --lts
nvm use lts          # nvm-windows;  macOS nvm: nvm use --lts
```

**Kiểm tra** trong một terminal *mới mở* (terminal mở từ trước khi cài sẽ không thấy chương trình mới):

```powershell
node -v
# v24.x.x   (any version 22 or newer is fine)
npm -v
# 11.x.x
```

Vì sao phải từ 22 trở lên? Các script của server dùng những cờ (flag) của Node (`--env-file-if-exists`, `--watch`) mà bản cũ không có.

**BA được gì?** "Chị đang dùng Node bản mấy?" thường là câu hỏi đầu tiên khi một thứ chạy được trên máy người này mà không chạy trên máy người kia. Giờ bạn đã biết cách trả lời.

## 3. Bộ kỹ năng sinh tồn với terminal

**Terminal** (còn gọi là shell hay dòng lệnh) là cửa sổ nơi bạn gõ lệnh thay vì bấm chuột. Trong VS Code, mở nó bằng **Ctrl + `** (phím backtick, cạnh số 1) hoặc menu *Terminal → New Terminal*. Terminal mở sẵn ở thư mục bạn đang mở trong VS Code.

| Việc cần làm | PowerShell (Windows) | macOS Terminal / Git Bash |
| --- | --- | --- |
| Tôi đang ở đâu? | `pwd` | `pwd` |
| Liệt kê file | `ls` hoặc `dir` | `ls` (`ls -a` hiện cả file ẩn) |
| Đi vào một thư mục | `cd server` | `cd server` |
| Lùi lên một cấp | `cd ..` | `cd ..` |
| Chép một file | `copy a b` (`cp` cũng được) | `cp a b` |

Vài thói quen giúp tiết kiệm thời gian:

- **Tab để tự hoàn thành**: gõ `cd se` rồi nhấn **Tab**, shell tự điền thành `server`. Ít gõ sai hơn.
- **Mũi tên lên**: gọi lại lệnh vừa gõ. Nhấn tiếp để lấy các lệnh cũ hơn.
- **Ctrl + C**: dừng chương trình đang chạy trong terminal này (ví dụ một server). Sau đó terminal rảnh trở lại.
- **Đường dẫn tương đối và tuyệt đối**: `cd server` là *tương đối* (relative, một thư mục nằm trong chỗ bạn đang đứng). `cd C:\projects\todo-auth-app\server` là *tuyệt đối* (absolute, địa chỉ đầy đủ tính từ gốc ổ đĩa). Trên macOS nó có dạng `/Users/lan/projects/...`; Git Bash viết `C:\projects` thành `/c/projects`.

Dùng shell nào? VS Code trên Windows mặc định dùng **PowerShell**, và mọi lệnh trong bài này đều chạy được ở đó. **Git Bash** hiểu các lệnh kiểu macOS. **Command Prompt (cmd)** đời cũ dùng `dir` và `copy`, không hiểu `ls` hay `cp`.

**BA được gì?** Phần lớn các lần "không chạy được" là do gõ lệnh sai thư mục. Cứ `pwd` trước, rồi mới làm.

## 4. Lấy code về máy

Cách A, tải file zip (không cần Git):

1. Tải [todo-auth-app.zip](/downloads/todo-auth-app.zip).
2. Chuyển nó vào một đường dẫn ngắn, không dấu cách, không dấu tiếng Việt, ví dụ `C:\projects\` (macOS: `~/projects/`). Tránh thư mục đồng bộ OneDrive hay iCloud: `node_modules` chứa hàng nghìn file nhỏ.
3. Chuột phải → **Extract All…** (macOS: nhấp đúp).
4. Kiểm tra xem có bị lồng hai thư mục kiểu `todo-auth-app\todo-auth-app\` không. Bạn cần thư mục chứa trực tiếp `client` và `server`.
5. Trong VS Code: **File → Open Folder…** rồi chọn `todo-auth-app`.

Cách B, dùng Git: nếu team đưa bạn URL của một repository (kho code), chạy `git clone <url>` trong thư mục bạn để các dự án, rồi mở thư mục mới trong VS Code.

Bạn sẽ thấy:

```text
todo-auth-app/
  README.md
  .gitignore
  client/                 # frontend: React + Vite, port 5173
    index.html
    package.json
    vite.config.js        # contains the /api proxy
    src/                  # main.jsx, App.jsx, api.js, styles.css
      components/         # AuthForm.jsx, TodoPage.jsx
  server/                 # backend: Express, port 4000
    package.json
    .env.example
    db/schema.sql
    src/                  # index.js, db.js, auth-token.js, reset-db.js
      middleware/         # requireAuth.js
      routes/             # auth.js, todos.js
```

Chưa có thư mục `node_modules` và chưa có `todo.db`. Cả hai sẽ được tạo ra trên máy bạn ở các bước sau, và đó chính là lý do chúng không bao giờ được chia sẻ.

**BA được gì?** Hai file `package.json` nghĩa là hai chương trình riêng biệt. Đó chính là việc chia frontend/backend ở các bài trước, giờ hiện ra thành thư mục.

## 5. Cấu hình backend bằng `.env`

Những thiết lập khác nhau giữa các máy (port, secret, tên file) được đặt trong **biến môi trường** (environment variable). Ở local, ta để chúng trong một file tên `.env` trong thư mục `server`. Dự án có sẵn một file mẫu (template), `.env.example`:

```bash
# Copy this file to .env and change the values.
# .env holds secrets and machine-specific settings, so never commit it.

PORT=4000
JWT_SECRET=change-me-to-a-long-random-string
DB_FILE=todo.db
```

Tạo bản sao của riêng bạn:

```powershell
# Windows PowerShell (inside the server folder)
cd server
copy .env.example .env
```

```bash
# macOS / Git Bash
cd server
cp .env.example .env
```

| Biến | Tác dụng | Nếu bạn đổi nó |
| --- | --- | --- |
| `PORT` | Port mà Express lắng nghe | Proxy của Vite vẫn trỏ tới 4000, nên phải sửa cả `client/vite.config.js` |
| `JWT_SECRET` | Khóa bí mật dùng để ký token đăng nhập nằm trong cookie `token` | Mọi phiên đăng nhập cũ mất hiệu lực: tất cả bị đăng xuất |
| `DB_FILE` | Tên file database SQLite | App khởi động với một file database mới, trống |

`.env` được đọc thế nào? Script `npm run dev` chạy `node --env-file-if-exists=.env ...`, một tính năng có sẵn từ Node 22, nên không cần thêm thư viện nào. Nếu thiếu `.env`, code dùng giá trị mặc định (port 4000 và một secret chỉ dành cho môi trường dev), nên app vẫn chạy.

Vì sao `.env` **không bao giờ được commit**: nó có thể chứa secret thật (mật khẩu database, API key), và mỗi máy có giá trị riêng. File `.gitignore` của dự án có dòng `.env`, còn `.env.example` với giá trị giả vô hại thì *được* commit để người mới biết cần những biến nào.

Hai cái bẫy: Notepad có thể lưu file thành `.env.txt` (hãy dùng lệnh copy ở trên), và Finder trên macOS ẩn các file có tên bắt đầu bằng dấu chấm (VS Code thì vẫn hiện).

**BA được gì?** Một chức năng "chỉ hỏng trên staging" thường là do thiếu hoặc sai biến môi trường, không phải bug code. Cấu hình là một phần của checklist phát hành.

## 6. Chạy backend

Terminal 1 lo backend và luôn để mở trong lúc bạn làm việc.

1. Chắc chắn bạn đang ở `server` (`pwd` kết thúc bằng `server`).
2. Cài các thư viện phụ thuộc (dependency) — chỉ lần đầu, hoặc khi `package.json` thay đổi:

   ```powershell
   npm install
   ```

   npm đọc `package.json`, tải Express, better-sqlite3 và các gói khác vào `node_modules`, rồi kết thúc bằng dòng kiểu như:

   ```text
   added 118 packages, and audited 119 packages in 3s
   found 0 vulnerabilities
   ```

   Các dòng bắt đầu bằng `npm warn` (ví dụ một gói *deprecated*, đã lỗi thời) là vô hại. Dòng bắt đầu bằng `npm error` nghĩa là cài thất bại.
3. Chạy server ở chế độ phát triển:

   ```powershell
   npm run dev
   ```

   ```text
   > todo-server@1.0.0 dev
   > node --env-file-if-exists=.env --watch src/index.js

   API running on http://localhost:4000
   ```

   Terminal lúc này như "đứng im": đúng như vậy. Server đang chạy và chờ request.
4. Trong Chrome, mở **http://localhost:4000/api/health**. Bạn sẽ thấy:

   ```json
   {"status":"ok"}
   ```

   và terminal 1 in ra `GET /api/health → 200 (5 ms)`.
5. Nhìn vào thư mục `server`: một file mới **`todo.db`** đã xuất hiện. Khi khởi động, `db.js` mở (hoặc tạo) file SQLite và chạy `db/schema.sql` để tạo bảng.

Mở thẳng **http://localhost:4000** sẽ thấy `Cannot GET /`. Điều đó bình thường: backend này chỉ trả lời các URL bắt đầu bằng `/api`. Màn hình là việc của frontend.

**BA được gì?** Endpoint health là cách nhanh nhất để hỏi "backend còn sống không?", và nhiều hệ thống thật cũng có. Đây là bước đầu tiên tốt cho mọi smoke test (test khói, kiểm tra nhanh sau khi deploy).

## 7. Chạy frontend và xem hai phần nối với nhau thế nào

Mở terminal **thứ hai** (nút **+** trong khung terminal, hoặc chia đôi) và để terminal 1 tiếp tục chạy.

1. `cd client`
2. `npm install`
3. `npm run dev`

   ```text
     VITE v7.x.x  ready in 845 ms

     ➜  Local:   http://localhost:5173/
     ➜  Network: use --host to expose
   ```

4. Ctrl + click vào link Local, hoặc gõ **http://localhost:5173** vào Chrome. Form "Log in" hiện ra.

Vì sao hai terminal và hai port? Vì đó là hai chương trình. **Vite** (terminal 2) phục vụ các file React cho trình duyệt. **Express** (terminal 1) trả lời API và nắm database. Mỗi chương trình đang chạy chiếm trọn terminal của nó.

Trình duyệt chỉ nói chuyện với 5173. **Proxy** của Vite (trong `client/vite.config.js`) chuyển tiếp mọi request bắt đầu bằng `/api` sang port 4000:

```text
 Chrome ── every request goes to http://localhost:5173
   |
   v
 [Terminal 2: Vite, port 5173] -- /, /src/App.jsx, styles.css: answered here
   |
   |  /api/... forwarded by the proxy
   v
 [Terminal 1: Express, port 4000] -- JSON answers
   |
   v
 server/todo.db (SQLite)
```

Với trình duyệt, frontend và API trông như cùng một site, nên cookie đăng nhập hoạt động ngay và không cần cấu hình CORS.

Giờ hãy nhìn terminal 1 trong lúc dùng app. Tạo tài khoản rồi thêm một to-do:

```text
GET /api/auth/me → 401 (2 ms)
GET /api/auth/me → 401 (1 ms)
POST /api/auth/signup → 201 (74 ms)
GET /api/todos → 200 (1 ms)
GET /api/todos → 200 (1 ms)
POST /api/todos → 201 (3 ms)
```

`401` đầu tiên là đúng như dự kiến: khi tải trang, app hỏi "tôi đã đăng nhập chưa?" và câu trả lời là "chưa". Một số dòng xuất hiện hai lần vì chế độ phát triển của React (StrictMode) cố ý chạy các effect lúc tải trang hai lần để bắt lỗi; ở production chúng chỉ chạy một lần.

**BA được gì?** Mỗi cú click của bạn trở thành một request nhìn thấy được, kèm status code. Đây cũng chính là danh sách bạn sẽ soi trong tab Network của DevTools.

## 8. Hot reload: sửa code, thấy ngay

Ở chế độ phát triển, cả hai server đều theo dõi file của bạn.

**Thí nghiệm với frontend:**

1. Mở `client/src/components/AuthForm.jsx` và tìm dòng tiêu đề:

   ```jsx
   <h1>{isSignup ? 'Create an account' : 'Log in'}</h1>
   ```

2. Đổi `'Log in'` thành `'Log in to My To-dos'` rồi lưu (Ctrl + S).
3. Nhìn trình duyệt: tiêu đề đổi ngay, không cần tải lại trang, và những gì bạn đã gõ trong form vẫn còn. Terminal 2 in ra một dòng như `[vite] (client) hmr update /src/components/AuthForm.jsx`. Đó là **HMR** (Hot Module Replacement, thay nóng từng module).

**Thí nghiệm với backend:**

1. Mở `server/src/index.js`, đổi câu trả lời của health thành `res.json({ status: 'ok', hello: 'BA' });` rồi lưu.
2. Terminal 1 hiện `Restarting 'src/index.js'` rồi lại `API running on http://localhost:4000`. Đó là `node --watch` khởi động lại toàn bộ server.
3. Tải lại http://localhost:4000/api/health để thấy trường mới.

Sau đó hoàn tác cả hai chỗ sửa (Ctrl + Z, rồi lưu). Để ý sự khác biệt: frontend thay một module tại chỗ, còn backend khởi động lại hoàn toàn. Dữ liệu vẫn còn sau khi khởi động lại vì nó nằm trong `todo.db`.

**BA được gì?** Những thay đổi chữ nhỏ có thể thử trực tiếp cùng dev rất rẻ: ngồi cùng nhau sửa một label nhanh hơn ba vòng gửi ảnh chụp màn hình.

## 9. Xử lý sự cố và làm sạch dữ liệu

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
| --- | --- | --- |
| `Port 4000 is already in use.` rồi `Failed running 'src/index.js'. Waiting for file changes before restarting...` (các app Node khác in ra `EADDRINUSE: address already in use`) | Một chương trình khác (thường là server cũ bạn quên tắt) đang chiếm port 4000 | Dừng nó bằng Ctrl + C ở terminal của nó, hoặc tìm và tắt (lệnh bên dưới) |
| Vite báo `Port 5173 is in use, trying another one...` và in ra `Local: http://localhost:5174/` | Một Vite cũ vẫn đang chạy | Dùng đúng URL Vite in ra, hoặc tắt bản cũ |
| Terminal 2 báo `[vite] http proxy error: /api/auth/me` kèm `ECONNREFUSED`; form hiện `Request failed (500)` | Backend chưa chạy, proxy không có ai để chuyển tiếp | Bật terminal 1 (`npm run dev` trong `server`) |
| Trang trắng trơn | Lỗi JavaScript ở frontend | Mở DevTools (F12) → **Console** và đọc dòng chữ đỏ |
| `npm : The term 'npm' is not recognized...` | Chưa cài Node, hoặc terminal được mở trước khi cài | Cài lại Node LTS, rồi đóng và mở lại terminal (hoặc VS Code) |
| `npm.ps1 cannot be loaded because running scripts is disabled on this system` | Chính sách chạy script (execution policy) của PowerShell | Chạy `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` một lần, hoặc dùng `npm.cmd` |
| `npm install` lỗi ở `better-sqlite3` (`gyp ERR!`, `prebuild-install`) | Node quá cũ hoặc một bản lạ chưa có file build sẵn | Cài Node LTS hiện hành, xóa `node_modules`, chạy lại `npm install` |
| `Cannot GET /` ở http://localhost:4000 | Bình thường: backend chỉ phục vụ `/api` | Mở http://localhost:5173 để dùng app |
| `npm error enoent Could not read package.json` | Bạn đứng sai thư mục (ví dụ `todo-auth-app` thay vì `server`) | `pwd`, rồi `cd server` hoặc `cd client` |

Tìm và tắt chương trình đang chiếm port 4000:

```powershell
# Windows: the last column is the PID (process id)
netstat -ano | findstr :4000
#   TCP    0.0.0.0:4000    0.0.0.0:0    LISTENING    30556
taskkill /PID 30556 /F
```

```bash
# macOS
lsof -i :4000
kill -9 <PID>
```

**Làm sạch dữ liệu.** Để test lại đăng ký từ đầu, chạy lệnh sau trong `server`:

```bash
npm run db:reset
# Database emptied.
```

Lệnh này xóa mọi user và to-do nhưng giữ nguyên bảng. Cách mạnh tay hơn: dừng server (Windows khóa file khi server đang chạy), xóa `todo.db`, rồi chạy lại; file được tạo mới, trống, từ `schema.sql`. Cookie `token` cũ còn trong trình duyệt giờ nhận về 401, nên app chỉ đơn giản hiện form đăng nhập.

> **Góc BA:** Một bug report mà dev xử lý được ngay phải có **các bước tái hiện** (steps to reproduce) và **thông tin môi trường** (environment). "Login bị hỏng" tốn cả ngày hỏi qua hỏi lại; mẫu dưới đây chỉ tốn năm phút:
>
> - **Môi trường:** local (http://localhost:5173) / dev / staging, kèm commit hoặc build (`git log -1 --oneline`)
> - **Trình duyệt & hệ điều hành:** Chrome 1xx, Windows 11
> - **Điều kiện ban đầu:** database trống (`npm run db:reset`), chưa có tài khoản
> - **Các bước:** 1. Mở app. 2. Bấm "Create an account". 3. Đăng ký với tên, email hợp lệ và mật khẩu 8 ký tự.
> - **Mong đợi / Thực tế:** màn hình danh sách to-do mở ra / form đứng yên và hiện `Request failed (500)`
> - **Bằng chứng:** ảnh chụp màn hình, request lỗi trong tab Network, và dòng log tương ứng ở terminal 1 hoặc 2.
>
> Chính các trường này cũng làm nên acceptance test tốt: chúng buộc bạn nêu rõ dữ liệu ban đầu và kết quả mong đợi chính xác.

## 10. Tóm tắt

Giờ bạn đã chạy được toàn bộ app trên máy của mình. Checklist:

- [ ] Tôi giải thích được localhost, 127.0.0.1 và port, và vì sao local đi trước dev, staging và production.
- [ ] Tôi đã cài Node.js LTS (22 trở lên) và kiểm tra bằng `node -v` và `npm -v`.
- [ ] Tôi di chuyển được bằng `pwd`, `ls`, `cd` và `cd ..`, và dừng chương trình bằng Ctrl + C.
- [ ] Tôi đã giải nén dự án và chỉ ra được `client`, `server` và `.env.example`.
- [ ] Tôi đã tạo `.env` từ file mẫu và biết vì sao nó không bao giờ được commit.
- [ ] Terminal 1 chạy backend ở port 4000; `/api/health` trả về `{"status":"ok"}`.
- [ ] Terminal 2 chạy frontend ở port 5173, và proxy chuyển `/api` sang 4000.
- [ ] Tôi đã thấy các dòng request hiện ra ở terminal 1 khi tôi click.
- [ ] Tôi đã thấy hot reload ở cả hai phía và đã hoàn tác chỗ sửa.
- [ ] Tôi chẩn đoán được port bị chiếm, backend chưa chạy, đứng sai thư mục, và biết cách làm sạch dữ liệu.
- [ ] Tôi viết được bug report có các bước tái hiện và thông tin môi trường.

Bài tiếp theo: **React cơ bản**, nơi ta mở code frontend mà bạn vừa chạy.
