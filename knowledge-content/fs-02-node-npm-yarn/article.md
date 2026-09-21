# Node.js, npm & yarn: Quản lý thư viện

## 1. Node.js là gì và vì sao bạn cần nó

JavaScript sinh ra bên trong trình duyệt. **Node.js** lấy chính "động cơ" JavaScript mà Chrome dùng (V8) và cho nó chạy **bên ngoài trình duyệt**, ngay trên máy tính của bạn hoặc trên server. Nhờ Node.js, JavaScript có thể đọc file, mở cổng mạng (port) và nói chuyện với database, tức là làm đúng những việc của một backend.

Trong dự án mẫu [todo-auth-app.zip](/downloads/todo-auth-app.zip), Node.js được dùng **hai lần**:

```text
 todo-auth-app/
 ├── server/   Express API on :4000   → Node.js RUNS the backend itself
 └── client/   React + Vite on :5173  → Node.js runs the TOOLS (Vite dev server, build)
                                        the React code itself finally runs in the browser
```

Vì vậy, kể cả một dự án "chỉ có frontend" cũng cần Node.js trên máy developer: dev server, công cụ đóng gói (bundler) và công cụ chạy test đều là chương trình Node.

**Phiên bản.** Node.js ra phiên bản lớn (major) mới đều đặn. Những bản được gắn nhãn **LTS** (Long-Term Support, hỗ trợ dài hạn; đến nay là các số chẵn như 20, 22, 24) được vá lỗi và vá bảo mật trong khoảng ba năm, nên các công ty thống nhất dùng chúng. Luôn cài bản có nhãn **LTS** trên nodejs.org. Dự án mẫu cần **Node.js 22 trở lên**.

Kiểm tra máy bạn đang có gì (PowerShell, Terminal trên macOS và Linux đều dùng cùng lệnh):

```bash
node -v
# v22.21.1
npm -v
# 10.9.4
```

Số cao hơn cũng không sao. **npm** (Node Package Manager, trình quản lý gói của Node) được cài kèm Node, nên một bộ cài cho bạn cả hai.

Với BA, "Node phiên bản nào?" là câu hỏi về môi trường, giống như "trình duyệt nào?". Khi một lỗi chỉ xảy ra trên laptop của một developer, khác phiên bản Node là một trong những nghi phạm đầu tiên.

---

## 2. Package, thư viện và npm registry

Một **package** (còn gọi là thư viện, library, hay dependency) là một thư mục code do người khác viết, được công bố để ai cũng dùng lại được. Hãy nghĩ đến nấu ăn: bạn *có thể* tự làm nước tương, sợi mì và nước mắm từ đầu, nhưng người đầu bếp khôn ngoan sẽ mua nguyên liệu tốt và dồn công sức vào món ăn. Server to-do của chúng ta "mua" nguyên liệu như sau:

| Package | Việc nó làm trong dự án mẫu |
|---|---|
| `express` | Nhận HTTP request và điều hướng (route) chúng |
| `better-sqlite3` | Đọc và ghi file `todo.db` |
| `bcryptjs` | Băm (hash) mật khẩu (đừng bao giờ tự viết mã hóa) |
| `jsonwebtoken` | Ký và kiểm tra token đăng nhập |
| `cookie-parser` | Biến header `Cookie` thành `req.cookies` |

"Kho hàng" công khai chứa các package là **npm registry** (registry.npmjs.org), với hàng triệu package. **Package manager** (trình quản lý gói) là công cụ tải package từ registry, đặt vào dự án và ghi nhớ chính xác bạn đã lấy phiên bản nào. Ba cái tên bạn sẽ nghe là **npm**, **yarn** và **pnpm**. Cả ba đều đọc cùng một `package.json` và tải từ cùng registry; chúng khác nhau về tốc độ, dung lượng ổ đĩa và định dạng lock file.

Package lại phụ thuộc vào package khác. Server chỉ liệt kê 5 package, nhưng cài xong lại kéo về **hơn 100**, vì riêng Express đã phụ thuộc vào vài chục package nhỏ. Những package gián tiếp này gọi là **transitive dependency** (phụ thuộc bắc cầu), và mỗi cái trong số đó đều là code mà sản phẩm của bạn mang theo.

---

## 3. `package.json`, từng trường một

`package.json` là "căn cước" kiêm "danh sách đi chợ" của dự án. Đây là file của server trong dự án mẫu, giữ nguyên:

```json
{
  "name": "todo-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "node --env-file-if-exists=.env --watch src/index.js",
    "start": "node --env-file-if-exists=.env src/index.js",
    "db:reset": "node --env-file-if-exists=.env src/reset-db.js"
  },
  "dependencies": {
    "bcryptjs": "^3.0.2",
    "better-sqlite3": "^12.4.1",
    "cookie-parser": "^1.4.7",
    "express": "^5.1.0",
    "jsonwebtoken": "^9.0.2"
  }
}
```

| Trường | Ý nghĩa |
|---|---|
| `name`, `version` | Tên và phiên bản của chính dự án. |
| `private: true` | Chốt an toàn: npm từ chối công bố (publish) dự án này lên registry công khai do nhầm lẫn. |
| `type: "module"` | Các file dùng cú pháp hiện đại `import … from '…'` (ES module) thay cho `require()` kiểu cũ. |
| `engines` | Những phiên bản Node mà dự án hỗ trợ. `>=22` vì script dùng `--env-file-if-exists`, cờ mà Node cũ không hiểu. |
| `scripts` | Các lệnh tắt có tên (mục 6). |
| `dependencies` | Package cần **khi ứng dụng chạy**. |

Và file của client:

```json
{
  "name": "todo-client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.0",
    "vite": "^7.0.0"
  }
}
```

Trường mới là **`devDependencies`**: package chỉ cần **trong lúc phát triển hoặc build**. Vite là "đồ nghề nhà bếp": nó phục vụ và đóng gói code nhưng không nằm trong món ăn. React là "nguyên liệu": nó nằm trong file JavaScript mà trình duyệt của người dùng tải về. Server production có thể bỏ qua dev dependency bằng `npm install --omit=dev`, vừa gọn hơn vừa để lại ít thứ hơn cho kẻ tấn công.

---

## 4. Semantic versioning: `^5.1.0` thực sự nghĩa là gì

Hầu hết package dùng **semantic versioning** (SemVer, đánh số phiên bản theo ngữ nghĩa): `MAJOR.MINOR.PATCH`.

```text
      5 . 1 . 0
      │   │   └─ PATCH: bug fix, nothing else changes
      │   └───── MINOR: new features, old code still works
      └───────── MAJOR: breaking change, your code may need edits
```

Ký hiệu đứng trước số phiên bản trong `package.json` là một **khoảng** (range): những phiên bản tương lai nào npm được phép cài.

| Viết | Chấp nhận | Ví dụ: được | Ví dụ: không được |
|---|---|---|---|
| `^5.1.0` (dấu mũ, mặc định) | cùng MAJOR | 5.1.1, 5.2.1, 5.9.2 | 6.0.0 |
| `~5.1.0` (dấu ngã) | cùng MAJOR.MINOR | 5.1.1, 5.1.9 | 5.2.0 |
| `5.1.0` (chính xác) | chỉ đúng bản đó | 5.1.0 | 5.1.1 |

Bằng chứng thật từ dự án mẫu: `package.json` xin `"express": "^5.1.0"`, còn lock file ghi lại rằng bản thực sự được cài là **5.2.1**. Tương tự `better-sqlite3` `^12.4.1` thành 12.11.1, và `vite` `^7.0.0` thành 7.3.6. Một ngoại lệ cần nhớ: với phiên bản `0.x`, dấu mũ chặt hơn (`^0.2.3` nhận 0.2.9 nhưng không nhận 0.3.0), vì trước 1.0 bản minor nào cũng có thể gây vỡ.

SemVer là một **lời hứa, không phải bảo đảm**. Tác giả package vẫn có thể phát hành một bản "patch" làm hỏng code của bạn. Đó là lý do lock file ở mục sau tồn tại.

---

## 5. `node_modules` và lock file

Khi cài đặt, package manager tải mọi package vào một thư mục tên là **`node_modules`** trong dự án. Nó phình to rất nhanh: trong dự án mẫu, `server/node_modules` khoảng 18 MB và `client/node_modules` khoảng 48 MB, cho một ứng dụng bé xíu.

Ba quy tắc về `node_modules`:

1. **Không bao giờ commit** nó lên Git. File `.gitignore` của dự án mẫu mở đầu bằng `node_modules/`.
2. **Không bao giờ sửa file bên trong.** Thay đổi của bạn sẽ biến mất ở lần cài kế tiếp.
3. **Luôn có thể xóa đi và cài lại.** Nó chỉ là bộ nhớ đệm (cache), dựng lại từ `package.json` cộng lock file. "Xóa `node_modules` rồi cài lại" là phiên bản IT của "tắt đi bật lại", và nó sửa được số lỗi nhiều đến bất ngờ.

**Lock file** là "hóa đơn" chính xác của những gì đã cài: mọi package, kể cả package bắc cầu, với số phiên bản cụ thể, đường dẫn tải và mã kiểm tra `integrity` (checksum). Một đoạn trích từ `server/package-lock.json` của dự án mẫu:

```json
"node_modules/accepts": {
  "version": "2.0.0",
  "resolved": "https://registry.npmjs.org/accepts/-/accepts-2.0.0.tgz",
  "integrity": "sha512-5cvg6CtKwfgdmVqY1WIiXKc3Q1bkRqGLi+2W/6ao+6Y7gu/RCwRuAhGEzh5B4KlszSuTLgZYuqFqo5bImjNKng==",
  "license": "MIT"
}
```

yarn ghi ra `yarn.lock`, pnpm ghi ra `pnpm-lock.yaml`: cùng nhiệm vụ, khác định dạng. `package.json` nói "express 5 gì đó"; lock file nói "express 5.2.1, đúng file này". **Luôn commit lock file.** Thiếu nó, một developer cài vào tháng sau có thể nhận express 5.3.0 trong khi CI đang test 5.2.1: lỗi kinh điển **"máy tôi chạy được mà"** (works on my machine). Có nó, mọi laptop, server CI và production đều cài đúng cùng một bộ code, không lệch một byte.

---

## 6. npm script và các lệnh hằng ngày

Khối `scripts` đặt tên ngắn cho các lệnh. Bạn chạy chúng bằng `npm run <tên>`:

```bash
cd server
npm run dev        # runs: node --env-file-if-exists=.env --watch src/index.js
npm run db:reset   # runs: node --env-file-if-exists=.env src/reset-db.js
npm start          # "start" (and "test") work without the word "run"
```

Từng phần của `dev` làm gì:

- `node src/index.js` khởi động server.
- `--env-file-if-exists=.env` nạp các thiết lập như `PORT` và `JWT_SECRET` từ file `.env`, nếu file đó tồn tại.
- `--watch` tự khởi động lại server mỗi lần bạn lưu file. Vì vậy `dev` dành cho laptop của bạn, còn `start` (không theo dõi file) dành cho server thật.

Ở client, `npm run dev` chỉ đơn giản chạy `vite`. Script còn đóng vai trò tài liệu: nó cho người mới biết dự án được khởi động, build và test ra sao.

**Các lệnh bạn sẽ thực sự gõ**, npm và yarn đặt cạnh nhau (yarn ở đây là Yarn 1 "classic", thứ bạn nhận được khi chạy `npm install -g yarn`):

| Việc cần làm | npm | yarn |
|---|---|---|
| Cài mọi thứ trong `package.json` | `npm install` (hoặc `npm i`) | `yarn` |
| Thêm một package | `npm install dayjs` | `yarn add dayjs` |
| Thêm package chỉ dùng khi dev | `npm install -D vite` | `yarn add -D vite` |
| Gỡ một package | `npm uninstall dayjs` | `yarn remove dayjs` |
| Chạy một script | `npm run dev` | `yarn dev` |
| Cài sạch, đúng theo lock file (CI) | `npm ci` | `yarn install --frozen-lockfile` |
| Chạy lệnh của một package mà không cài | `npx cowsay hi` | `yarn dlx cowsay hi` (chỉ Yarn 2+) |
| Liệt kê lỗ hổng đã biết | `npm audit` | `yarn audit` |

`npm ci` xóa `node_modules`, cài **chính xác** những gì lock file ghi, và báo lỗi nếu `package.json` với lock file không khớp nhau: đúng sự chặt chẽ mà một server build cần.

**pnpm** là lựa chọn thứ ba với cùng ý tưởng (`pnpm install`, `pnpm add dayjs`, `pnpm dlx`); nó chỉ lưu mỗi phiên bản package một lần trên ổ đĩa, nên nhanh và tiết kiệm dung lượng.

**Quy tắc: mỗi dự án chỉ một package manager.** Xem lock file nào đang được commit và dùng đúng công cụ đó. Nếu một dự án có cả `package-lock.json` lẫn `yarn.lock`, hai file sẽ dần lệch nhau và mọi người lại nhận phiên bản khác nhau. Các dự án mới thường "ghim" luôn công cụ bằng trường `"packageManager": "yarn@…"` trong `package.json`; một công cụ hỗ trợ tên **corepack** đọc trường này và chạy đúng phiên bản. Corepack được cài kèm Node đến hết phiên bản 24; các bản Node mới hơn không kèm nữa, nên bạn cài nó bằng `npm install -g corepack`.

---

## 7. Thực hành: package đầu tiên trong năm phút

Làm trong một thư mục trống bất kỳ, bên ngoài dự án mẫu, ví dụ trên Desktop.

1. Tạo thư mục và một file `package.json`:

   ```powershell
   mkdir hello-dayjs
   cd hello-dayjs
   npm init -y
   ```

   `-y` trả lời "yes" cho mọi câu hỏi, và npm in ra file mới:

   ```text
   Wrote to C:\Users\you\Desktop\hello-dayjs\package.json:

   {
     "name": "hello-dayjs",
     "version": "1.0.0",
     ...
     "license": "ISC"
   }
   ```

2. Cài một thư viện ngày tháng nhỏ và chuyển dự án sang cú pháp `import`, giống dự án mẫu:

   ```powershell
   npm install dayjs
   npm pkg set type=module
   ```

   ```text
   added 1 package, and audited 2 packages in 1s

   found 0 vulnerabilities
   ```

3. Tạo file `index.js` gồm ba dòng:

   ```js
   import dayjs from 'dayjs';

   console.log('Today is', dayjs().format('DD/MM/YYYY'));
   ```

4. Chạy nó:

   ```powershell
   node index.js
   ```

   ```text
   Today is 21/09/2026
   ```

5. Nhìn quanh. Thư mục giờ có `index.js`, `package.json`, `package-lock.json` và `node_modules/` (bên trong có thư mục `dayjs`). `package.json` có thêm `"dependencies": { "dayjs": "^1.11.23" }` và `"type": "module"`, còn lock file ghim `"version": "1.11.23"` kèm mã `integrity`.
6. Chứng minh `node_modules` là thứ "dùng xong bỏ được": xóa nó (`Remove-Item -Recurse node_modules` trong PowerShell, `rm -rf node_modules` trên macOS), chạy `node index.js` và thấy nó báo lỗi `Cannot find package 'dayjs'`, rồi chạy `npm install` và mọi thứ lại chạy.

**Phiên bản yarn.** Trong một thư mục trống thứ hai (cài yarn một lần bằng `npm install -g yarn`):

```powershell
mkdir hello-yarn
cd hello-yarn
yarn init -y
yarn add dayjs
```

```text
success Saved lockfile.
success Saved 1 new dependency.
info Direct dependencies
└─ dayjs@1.11.23
```

Chép cùng file `index.js`, thêm `"type": "module"`, rồi chạy `node index.js`. Lần này lock file là `yarn.lock` thay cho `package-lock.json`: cùng ý tưởng, khác định dạng. Xóa cả hai thư mục luyện tập khi xong.

---

## 8. Các lỗi thường gặp và ý nghĩa

Phần lớn sự cố khi cài đặt rơi vào vài kiểu quen thuộc. Hãy đọc dòng lỗi **đầu tiên**, không phải dòng cuối.

| Bạn thấy | Nghĩa là | Cần làm |
|---|---|---|
| `'npm' is not recognized as an internal or external command` (hoặc `The term 'npm' is not recognized` trong PowerShell) | Chưa cài Node, hoặc terminal được mở trước khi cài | Cài Node LTS, rồi **mở lại** terminal (và VS Code) |
| `npm.ps1 cannot be loaded because running scripts is disabled on this system` | Windows PowerShell mặc định chặn chạy file script | Chạy một lần: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, rồi mở lại PowerShell |
| `Cannot find module 'express'` / `Cannot find package 'dayjs'` | Package không có trong `node_modules`: chưa cài, hoặc đứng sai thư mục | `cd` vào thư mục có `package.json` (ví dụ `server/`), rồi `npm install` |
| `npm error code ERESOLVE` … `unable to resolve dependency tree` | Hai package cần hai phiên bản không tương thích của cùng một **peer dependency** (ví dụ một plugin viết cho React 18 trong dự án React 19) | Nâng cấp hoặc thay plugin; `--legacy-peer-deps` là phương án cuối cùng, không phải cách sửa |
| `EACCES: permission denied` (macOS/Linux), `EPERM` (Windows) | Không có quyền ghi vào thư mục đó, hoặc file đang bị server đang chạy, editor hay phần mềm diệt virus khóa | Đừng dùng `sudo npm`; dừng server, đóng editor, thử lại |
| `gyp ERR!` khi cài `better-sqlite3`, hoặc `was compiled against a different Node.js version` | Package **native** (viết bằng C++): npm tải bản dựng sẵn (prebuilt binary) cho đúng phiên bản Node của bạn; nếu không có, nó thử tự biên dịch, việc cần bộ công cụ build | Dùng Node LTS (22 hoặc 24), xóa `node_modules`, cài lại |

Với BA hoặc tester: dán nguyên văn thông báo lỗi vào bug report, kèm kết quả `node -v` và `npm -v`. Chỉ vậy thôi thường đã đủ để developer trả lời trong một tin nhắn.

---

## 9. Bảo mật cơ bản và góc BA

Cài một package nghĩa là chạy code của người lạ với quyền của chính bạn. Ba thói quen giúp việc này an toàn:

- **Cảnh giác typosquatting** (đặt tên gần giống để lừa gõ nhầm). Kẻ tấn công công bố package có tên chỉ lệch một chữ so với package nổi tiếng (`expresss`, `reakt`). Năm 2017, package giả `crossenv` (bản thật là `cross-env`) đã đánh cắp biến môi trường, kể cả secret, của tất cả những ai cài nó. Hãy chép tên package từ tài liệu chính thức, đừng gõ theo trí nhớ.
- **Ưu tiên package nổi tiếng, còn được bảo trì.** Trước khi thêm, xem trang npm của nó: lượt tải mỗi tuần, ngày phát hành gần nhất, giấy phép (license). Một package có 40 lượt tải mỗi tuần, bỏ không nhiều năm, là một rủi ro dù trông tiện đến đâu.
- **Chạy `npm audit`.** Lệnh này đối chiếu các phiên bản bạn đã cài với cơ sở dữ liệu lỗ hổng đã biết. `npm audit fix` áp dụng các nâng cấp an toàn; `npm audit fix --force` có thể nhảy phiên bản MAJOR và làm hỏng app, nên cần test lại.

> **Góc BA:** "Nâng cấp thư viện thôi mà" không bao giờ miễn phí. Một lần nâng cấp MAJOR (Express 4 → 5, React 18 → 19) có thể thay đổi hành vi mà người dùng đang dựa vào, nên hãy coi nó là **một story có rủi ro**: có ticket riêng, một vòng regression test, và acceptance criteria kiểu "đăng ký, đăng nhập, đăng xuất và mọi thao tác với to-do hoạt động y như trước". Ngay cả nâng cấp MINOR cũng nên có một lượt smoke test. Thứ hai, **giấy phép là chuyện kinh doanh**: package nào cũng có một license (lock file còn ghi cả `"license": "MIT"`). MIT, ISC và Apache-2.0 là loại dễ dãi (permissive); license kiểu GPL có thể buộc công ty phải công bố cả mã nguồn của mình. Trong dự án doanh nghiệp hoặc dự án cho khách hàng, hãy hỏi sớm xem có danh sách license được phê duyệt không, và thêm "không thêm dependency có license ngoài danh sách" vào definition of done.

---

## 10. Tóm tắt

Node.js chạy JavaScript bên ngoài trình duyệt: nó chạy backend Express của chúng ta và các công cụ build frontend React. Package là "nguyên liệu" dùng lại được, do package manager (npm, yarn hoặc pnpm) tải về từ npm registry. `package.json` liệt kê dự án cần gì và chạy thế nào; lock file ghi lại chính xác những gì đã cài; `node_modules` là bản sao của tất cả, bỏ đi được và không bao giờ commit.

Giờ bạn có thể:

- [ ] Kiểm tra môi trường bằng `node -v` và `npm -v`, và giải thích LTS là gì
- [ ] Đọc một `package.json` và phân biệt `dependencies` với `devDependencies`
- [ ] Giải thích vì sao `^5.1.0` có thể cài 5.2.1 nhưng không bao giờ cài 6.0.0
- [ ] Giải thích vì sao lock file được commit còn `node_modules` thì không
- [ ] Chạy script của dự án bằng `npm run dev`, `npm start` hoặc `yarn dev`
- [ ] Nhận ra các lỗi cài đặt thường gặp và đính kèm thông tin hữu ích vào bug report
- [ ] Coi việc nâng cấp thư viện hay thêm dependency mới là công việc có rủi ro, có vấn đề license và cần test

**Bài tiếp theo:** fs-03 cài đặt và chạy toàn bộ app to-do trên máy của bạn, dùng đúng những lệnh này.
