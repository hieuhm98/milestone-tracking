# Frontend với React: Component, Props & State

## 1. Vì sao cần một thư viện như React?

Ở fs-03 bạn đã chạy app và thấy danh sách to-do thay đổi ngay lập tức: tick một ô thì dòng đó bị gạch ngang, thêm một to-do thì nó hiện lên đầu danh sách, và bộ đếm "N left" tự cập nhật theo. Trang không hề tải lại. Bài này giải thích frontend làm được điều đó như thế nào, dựa trên các file thật trong `client/src/`.

Với HTML và JavaScript thuần, bạn phải **tự thay đổi trang từng bước một**. Mỗi khi dữ liệu đổi, code phải tìm đúng phần tử và sửa nó:

```js
// Plain JavaScript (illustration, not from the sample)
const li = document.createElement('li');
li.textContent = title;
document.querySelector('.todos').prepend(li);
document.querySelector('#left').textContent = `${remaining} left`; // easy to forget!
```

Cách này ổn với một nút bấm. Nhưng khi có mười nút, ba bộ lọc và một màn hình đăng nhập, sớm muộn sẽ có người quên một chỗ cập nhật, và bộ đếm ghi "3 left" trong khi danh sách chỉ còn hai dòng. Đó là một lỗi UI kinh điển.

**React** đảo ngược cách làm. Bạn mô tả **màn hình nên trông như thế nào với dữ liệu hiện tại**, còn React tự tính xem phần nào của trang (**DOM**, cây phần tử "sống" của trình duyệt) thực sự cần thay đổi:

```text
      data (state)                what the screen should be            real page
 todos = [milk, bank]   ──►   <ul><li>milk</li><li>bank</li></ul>   ──►  React patches
 filter = 'all'               <span>2 left</span>                        only what changed
```

Một cách dễ nhớ: **UI = f(data)**, giao diện là một hàm của dữ liệu. Bạn không bao giờ viết "giờ thêm một `<li>`"; bạn đổi dữ liệu, React vẽ lại những phần khác đi.

**BA được gì?** Khi dev nói "chỉ là đổi state thôi" hay "component đó render lại", họ đang nói về mô hình này. Nó cũng giải thích vì sao nhiều lỗi UI thực chất là lỗi dữ liệu: màn hình hiển thị trung thực một dữ liệu sai.

## 2. Một app Vite + React khởi động như thế nào

Mở thư mục `client/` trong editor (VS Code: gõ `code .` bên trong thư mục). Ba file khởi động mọi thứ, theo thứ tự:

```text
 index.html  ──loads──►  src/main.jsx  ──renders──►  <App />
 div#root                createRoot(#root)           picks the screen
```

1. Trình duyệt tải `index.html`. Phần body gần như trống: một `<div id="root"></div>` và một thẻ script.
2. Script đó là `src/main.jsx`, **entry point** (điểm bắt đầu chạy):

```jsx
// Entry point: mount the <App /> component into <div id="root"> in index.html.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

3. `createRoot` giao cái `div` trống cho React, và `render(<App />)` bảo React vẽ component `App` vào trong đó. Từ lúc này, React "sở hữu" mọi thứ bên trong `#root`.

`StrictMode` bật thêm một số kiểm tra, chỉ trong lúc phát triển. Một hệ quả bạn có thể thấy: ở chế độ dev, request như `GET /api/auth/me` có thể xuất hiện hai lần trong terminal của server. Điều này bình thường và không xảy ra ở bản build production.

**Vite làm gì?** Trình duyệt không hiểu file `.jsx`. **Vite** là công cụ build (build tool) đứng ở giữa:

| Lệnh (trong `client/`) | Vite làm gì |
|---|---|
| `npm run dev` | Chạy **dev server** ở cổng 5173, chuyển JSX sang JS ngay khi cần, chuyển tiếp `/api` sang cổng 4000 (proxy trong `vite.config.js`) |
| (lưu một file) | **Hot reload** (HMR, Hot Module Replacement): thay đổi hiện lên trình duyệt trong tích tắc, thường không mất những gì bạn đang gõ |
| `npm run build` | Gom và nén mọi thứ vào thư mục `dist/` gồm HTML, CSS, JS thuần mà web server nào cũng host được |

Output mong đợi của `npm run build` (con số và mã hash sẽ khác):

```text
vite v7.x.x building for production...
✓ 30 modules transformed.
dist/index.html                   0.40 kB
dist/assets/index-a1b2c3d4.css    1.60 kB
dist/assets/index-e5f6g7h8.js   195.00 kB
✓ built in 900ms
```

**BA được gì?** "Chạy được trên máy em (dev)" và "chạy được ở bản build" là hai chuyện khác nhau. Thứ được deploy là thư mục `dist/`, không phải dev server.

## 3. Component và JSX: màn hình là một cái cây

**Component** là một mảnh giao diện dùng lại được, viết dưới dạng một hàm JavaScript trả về thứ cần hiển thị. Tên component viết hoa chữ cái đầu. Project mẫu có đúng ba component:

| Component | File | Nhiệm vụ |
|---|---|---|
| `App` | `src/App.jsx` | Kiểm tra bạn đã đăng nhập chưa và chọn màn hình |
| `AuthForm` | `src/components/AuthForm.jsx` | Form "Log in" / "Create an account" |
| `TodoPage` | `src/components/TodoPage.jsx` | Màn hình sau khi đăng nhập: thêm, tick, xóa, lọc |

Component lồng vào nhau, tạo thành **cây component** (component tree):

```text
<App>                    state: user, checking
 ├── checking?  <p>Loading…</p>
 ├── no user?   <AuthForm onLoggedIn />
 └── user?      <TodoPage user onLogout onSessionExpired />
```

Và đây là màn hình sau đăng nhập được chia thành từng khối, kèm tên class bạn sẽ thấy trong `TodoPage.jsx`:

```text
┌─ TodoPage  <section class="card"> ─────────────────┐
│ Hi, An                              [Log out]      │ ◄ header.row
│ [What needs doing?_______________]  [Add]          │ ◄ form.row
│ (error message, only when there is one)            │ ◄ p.error
│ (All) (Active) (Done)    2 left                    │ ◄ div.row.filters
│ ☐ Buy milk                              Delete     │ ◄ ul.todos > li
│ ☑ Call the bank                         Delete     │ ◄ li.done
└────────────────────────────────────────────────────┘
```

Phần code giống HTML bên trong các hàm là **JSX**: thẻ kiểu HTML viết ngay trong JavaScript. Nó trông như HTML, với vài quy tắc:

| Quy tắc JSX | Ví dụ trong project mẫu |
|---|---|
| Dùng `className` thay cho `class` (vì `class` là từ khóa của JavaScript) | `<section className="card">` |
| `{ }` chèn một biểu thức JavaScript vào giao diện | `<h1>Hi, {user.name}</h1>` |
| Component trả về **một** phần tử cha (bọc các phần tử ngang hàng trong `<div>`, `<section>` hoặc `<>…</>`) | mọi thứ trong `TodoPage` nằm trong `<section>` |
| Thẻ nào cũng phải đóng, kể cả thẻ rỗng | `<input ... />` |
| Sự kiện là prop viết kiểu camelCase, nhận vào một hàm | `onClick={onLogout}` |

**BA được gì?** Cây component là một checklist miễn phí khi review mockup: mỗi khối là một component, và mỗi component có các trạng thái riêng cần đặc tả (xem mục 9).

## 4. Props: truyền dữ liệu xuống

**Props** (viết tắt của properties) là đầu vào của một component, được component cha truyền xuống giống như thuộc tính HTML. Hãy nghĩ component là một hàm và props là **tham số** của hàm: về tinh thần giống `TodoPage(user, onLogout)`.

Trong `App.jsx`, component cha truyền ba props cho `TodoPage`:

```jsx
<TodoPage user={user} onLogout={handleLogout} onSessionExpired={() => setUser(null)} />
```

`TodoPage` nhận chúng theo tên ngay dòng đầu tiên:

```jsx
export default function TodoPage({ user, onLogout, onSessionExpired }) {
```

và dùng chúng trong JSX:

```jsx
<header className="row">
  <h1>Hi, {user.name}</h1>
  <button type="button" className="secondary" onClick={onLogout}>
    Log out
  </button>
</header>
```

Ở đây có hai loại props:

- **Props dữ liệu**, như `user`: `TodoPage` chỉ đọc để hiển thị "Hi, An". Component không bao giờ tự sửa props của chính nó.
- **Props callback**, như `onLogout` và `onSessionExpired`: các hàm mà cha đưa xuống để con có thể báo "có chuyện vừa xảy ra". `TodoPage` không biết cách đăng xuất; nó chỉ gọi `onLogout`, còn `App` làm phần việc thật (`POST /api/auth/logout`, rồi `setUser(null)`).

Form đăng nhập dùng đúng mô hình này: `<AuthForm onLoggedIn={setUser} />`. Khi đăng nhập thành công, `AuthForm` gọi `onLoggedIn(data.user)`, hàm này đặt `user` trong `App`, và `App` đổi màn hình.

```text
            App  (owns user)
   data ↓ user              ↑ events  onLogout(), onLoggedIn(user)
         TodoPage / AuthForm
```

**Dữ liệu chảy xuống, sự kiện đi lên.** **BA được gì?** Khi bug ghi "tên trên header bị sai", dev sẽ xem prop đó đến từ đâu (component cha), chứ không chỉ nhìn vào header.

## 5. State và sự kiện: làm màn hình "phản ứng"

**State** là dữ liệu mà component ghi nhớ giữa các lần render và có thể thay đổi khi trang đang mở. Bạn tạo nó bằng **hook** `useState` (hook là hàm đặc biệt của React, tên bắt đầu bằng `use`). Bắt đầu với một bộ đếm nhỏ (ví dụ minh họa, không có trong project mẫu):

```jsx
import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

`useState(0)` trả về một cặp: giá trị hiện tại (`count`, bắt đầu từ 0) và một **setter**, hàm dùng để đổi giá trị (`setCount`). Mỗi lần click sẽ gọi setter, và đây là vòng lặp khiến React có cảm giác "sống":

```text
 click ──► setCount(1) ──► React calls Counter() again ──► new JSX "Clicked 1 times" ──► DOM updated
```

Lần gọi lại hàm đó chính là một lần **re-render** (render lại). Quy tắc: **chỉ đổi state qua setter**. Gán trực tiếp `count = 5` sẽ không đổi gì trên màn hình, vì React không hề được báo.

Giờ đến code thật. Đầu file `TodoPage.jsx` khai báo năm state:

```jsx
const [todos, setTodos] = useState([]);
const [newTitle, setNewTitle] = useState('');
const [filter, setFilter] = useState(readFilter);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
```

| State | Chứa gì |
|---|---|
| `todos` | Danh sách to-do |
| `newTitle` | Nội dung đang gõ trong ô nhập |
| `filter` | `'all'`, `'active'` hoặc `'done'` (đồng thời lưu vào `localStorage` với key `todo:filter`) |
| `loading` | `true` cho tới khi danh sách tải xong |
| `error` | Thông báo lỗi cần hiện, hoặc `''` |

**Sự kiện** (event) nối người dùng với các setter. Ba sự kiện bạn gặp ở khắp nơi:

| Sự kiện | Xảy ra khi | Trong `TodoPage.jsx` |
|---|---|---|
| `onClick` | Bấm một nút | `onClick={() => changeFilter(f)}` trên mỗi chip lọc |
| `onChange` | Giá trị của ô nhập thay đổi | `onChange={(e) => setNewTitle(e.target.value)}` |
| `onSubmit` | Form được gửi (bấm nút hoặc Enter) | `<form className="row" onSubmit={addTodo}>` |

Ô nhập ở đây là **controlled input** (ô nhập được điều khiển): `value={newTitle}` lấy từ state, và mỗi lần gõ phím lại cập nhật state đó. Vì vậy `setNewTitle('')` sau khi thêm to-do sẽ làm ô nhập trống trơn.

Dưới đây là một **phiên bản đầu tiên đã được đơn giản hóa** của `TodoPage`, viết chỉ để học (không phải file trong project mẫu). Nó dùng cùng state và sự kiện, nhưng chưa có server, nên to-do chỉ nằm trong bộ nhớ và mất khi tải lại trang. Nối nó với API là nội dung bài sau, fs-05.

```jsx
// SIMPLIFIED first version for learning: local state only, no API calls.
import { useState } from 'react';

export default function TodoPage({ user, onLogout }) {
  const [todos, setTodos] = useState([]);
  const [newTitle, setNewTitle] = useState('');

  function addTodo(event) {
    event.preventDefault(); // stop the browser's full-page form submit

    if (!newTitle.trim()) return;

    const todo = { id: Date.now(), title: newTitle.trim(), done: false };
    setTodos([todo, ...todos]); // a NEW array: newest first
    setNewTitle('');
  }

  function toggleTodo(todo) {
    setTodos(todos.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)));
  }

  return (
    <section className="card">
      <h1>Hi, {user.name}</h1>
      <form className="row" onSubmit={addTodo}>
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      <ul className="todos">
        {todos.map((todo) => (
          <li key={todo.id} className={todo.done ? 'done' : ''}>
            <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo)} />
            {todo.title}
          </li>
        ))}
      </ul>
      <button type="button" className="secondary" onClick={onLogout}>Log out</button>
    </section>
  );
}
```

Để ý rằng code không bao giờ gọi `todos.push(...)`. Nó tạo ra một **mảng mới** (`[todo, ...todos]`, `todos.map(...)`) rồi đưa cho setter. React so sánh giá trị cũ và mới; nếu bạn sửa trực tiếp mảng cũ, React có thể không nhận ra và màn hình không cập nhật.

**BA được gì?** "State" là câu trả lời cho câu hỏi "màn hình này nhớ gì, và nhớ đến khi nào?". Ở đây `todos` sẽ mất khi tải lại trang, trừ khi được tải lại từ server; còn `filter` vẫn giữ vì được lưu thêm vào `localStorage`. Đó là câu hỏi về yêu cầu, không chỉ là chuyện kỹ thuật.

## 6. Hiển thị danh sách và render có điều kiện

**Hiển thị danh sách.** JSX không có vòng lặp `for`; bạn biến một mảng dữ liệu thành một mảng phần tử bằng `.map`. Trích từ `TodoPage.jsx`:

```jsx
<ul className="todos">
  {visible.map((todo) => (
    <li key={todo.id} className={todo.done ? 'done' : ''}>
      <label>
        <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo)} />
        <span>{todo.title}</span>
      </label>
      <button type="button" className="link" onClick={() => deleteTodo(todo)} aria-label={`Delete ${todo.title}`}>
        Delete
      </button>
    </li>
  ))}
</ul>
```

**Vì sao cần `key={todo.id}`?** Khi danh sách render lại, React ghép từng `<li>` mới với `<li>` cũ theo `key`, nhờ đó chỉ di chuyển, thêm hoặc xóa đúng những dòng đã thay đổi. Key phải **ổn định và duy nhất**: id từ database là lựa chọn hoàn hảo. Dùng vị trí trong mảng (0, 1, 2…) sẽ hỏng khi xóa hoặc lọc, vì "dòng số 1" bỗng trỏ tới một to-do khác và React có thể dùng lại nhầm dòng. Nếu quên key, React in cảnh báo trong Console: `Each child in a list should have a unique "key" prop.` Các chip lọc dùng `key={f}` vì `'all'`, `'active'` và `'done'` cũng là duy nhất.

**Render có điều kiện** (conditional rendering) nghĩa là hiển thị JSX khác nhau tùy theo dữ liệu. Project mẫu dùng ba dạng:

| Dạng | Ý nghĩa | Code thật |
|---|---|---|
| `return` sớm | Dừng ở đây và chỉ hiện cái này | `if (checking) return <p className="center">Loading…</p>;` (trong `App`) |
| `a ? b : c` | Hoặc cái này, hoặc cái kia | `{user ? <TodoPage … /> : <AuthForm … />}` (trong `App`) |
| `a && b` | Chỉ hiện `b` khi `a` có giá trị (truthy) | `{error && <p className="error" role="alert">{error}</p>}` |

`TodoPage` nối hai toán tử ba ngôi (ternary) để chọn một trong ba trạng thái cho vùng danh sách:

```jsx
{loading ? (
  <p className="muted">Loading…</p>
) : visible.length === 0 ? (
  <p className="muted">Nothing here yet.</p>
) : (
  <ul className="todos">…</ul>
)}
```

Đọc là: nếu đang tải, hiện "Loading…"; nếu không, và không có gì để hiện, hiện "Nothing here yet."; còn lại thì hiện danh sách.

**BA được gì?** Mỗi dấu `?` và `&&` trong component là một trạng thái màn hình mà lẽ ra phải có người đặc tả. Để ý rằng "Nothing here yet." hiện ra cả khi người dùng mới tinh chưa có gì, lẫn khi bộ lọc "Done" không khớp to-do nào. Một thông báo có đúng cho cả hai trường hợp không? Đó chính là câu hỏi BA nên nêu ra trước khi build, chứ không phải sau.

## 7. Giá trị suy ra: đừng lưu thứ bạn tính được

Hãy xem những gì `TodoPage` **không** giữ trong state: danh sách đã lọc và con số "N left". Chúng được **tính lại ở mỗi lần render** từ `todos` và `filter`:

```jsx
const visible = todos.filter((t) => {
  if (filter === 'active') return !t.done;
  if (filter === 'done') return t.done;

  return true;
});
const remaining = todos.filter((t) => !t.done).length;
```

`visible` cung cấp dữ liệu cho danh sách, `remaining` cung cấp cho `<span className="muted">{remaining} left</span>`. Đây là các **giá trị suy ra** (derived value): bất cứ thứ gì tính được từ state sẵn có.

Sao không thêm `const [remaining, setRemaining] = useState(0)`? Vì khi đó mọi thao tác (thêm, tick, xóa, tải) đều phải nhớ cập nhật nó, và đó chính là lỗi "bộ đếm ghi 3, danh sách có 2" ở mục 1. Với giá trị suy ra, con số **không thể** lệch với danh sách, vì nó luôn được tính lại từ một nguồn sự thật duy nhất (single source of truth) là `todos`.

Để ý quy tắc nghiệp vụ ẩn trong dòng code này: "N left" đếm **tất cả** to-do chưa xong, bất kể đang chọn bộ lọc nào. Ở bộ lọc "Done" bạn có thể không thấy dòng nào mà vẫn thấy "2 left".

**BA được gì?** Giá trị suy ra là nơi các quy tắc nghiệp vụ sống trong UI ("left" nghĩa là chưa xong; "active" nghĩa là chưa xong). Hãy viết chúng ra bằng lời thường trong tài liệu yêu cầu, để dev và tester cài đặt và kiểm tra cùng một quy tắc.

## 8. Thực hành: ba chỉnh sửa an toàn

Chạy cả hai server như ở fs-03 (`npm run dev` trong `server/`, rồi `npm run dev` trong `client/`), mở http://localhost:5173 và đăng nhập. Đặt trình duyệt và editor cạnh nhau. Mỗi chỉnh sửa được lưu bằng **Ctrl + S** (macOS: **Cmd + S**) và hiện ra nhờ hot reload, không cần tải lại trang.

1. **Đổi tiêu đề.** Trong `client/src/components/TodoPage.jsx`, tìm `<h1>Hi, {user.name}</h1>` và sửa thành:

   ```jsx
   <h1>{user.name}'s to-dos</h1>
   ```

   Kết quả mong đợi: tiêu đề thành "An's to-dos" (với tên của bạn). Những gì bạn đang gõ dở trong ô nhập vẫn còn nguyên: hot reload đã giữ lại state.

2. **Hiện số to-do đã xong.** Ngay dưới dòng `remaining`, thêm một giá trị suy ra, rồi hiển thị nó cạnh "N left":

   ```jsx
   const remaining = todos.filter((t) => !t.done).length;
   const doneCount = todos.filter((t) => t.done).length;
   ```

   ```jsx
   <span className="muted">{remaining} left</span>
   <span className="muted">{doneCount} done</span>
   ```

   Kết quả mong đợi: "2 left 1 done". Tick một ô: cả hai số cùng đổi, vì cả hai đều được tính từ `todos`. (Tùy chọn: thêm một nút giữ chỗ `<button type="button" className="secondary" onClick={() => alert('Coming soon')}>Clear done</button>`. Nó chỉ hiện một alert; không có API nào cho chức năng này.)

3. **Đổi một màu.** Trong `client/src/styles.css`, tìm rule `.chip.active` và đổi màu nền:

   ```css
   .chip.active {
     background: #1a7f37;
     color: #fff;
   }
   ```

   Kết quả mong đợi: chip lọc đang chọn chuyển sang màu xanh lá, còn nút "Add" vẫn màu xanh dương, vì nó dùng rule `button` riêng.

Nếu có gì hỏng, Vite hiện một lớp báo lỗi màu đỏ trên trình duyệt và terminal in ra tên file và số dòng. Hoàn tác bằng **Ctrl + Z** rồi lưu lại, hoặc giải nén lại file đó từ [todo-auth-app.zip](/downloads/todo-auth-app.zip).

**React DevTools.** Cài extension miễn phí **React Developer Tools** cho Chrome hoặc Edge. Nhấn **F12**: xuất hiện hai tab mới, **Components** và **Profiler**. Trong tab **Components**, bấm vào `TodoPage` trên cây: khung bên phải hiện **props** của nó (`user`, `onLogout`, `onSessionExpired`) và các **hook**, liệt kê theo thứ tự dưới dạng giá trị `State` (`todos`, nội dung đang gõ, bộ lọc…). Gõ vào ô nhập và xem `State` thứ hai thay đổi. Bạn thậm chí có thể sửa một giá trị ngay tại đó để thử một state mà không cần bấm qua app.

**BA được gì?** Bạn vừa đổi một nhãn, một quy tắc và một kiểu hiển thị ở ba chỗ khác nhau. Giờ khi dev nói "sửa có một dòng thôi", bạn hình dung được điều đó, và bạn có thể tự kiểm tra một báo cáo lỗi ("con số bị sai") ngay trong tab Components.

## 9. Trạng thái UI và tái sử dụng: BA cần đặc tả gì

Mục 6 cho thấy một màn hình thực ra là nhiều màn hình. Với mỗi màn hình hoặc component có tải dữ liệu, hãy chờ đợi ít nhất bốn trạng thái:

| Trạng thái | Trong app to-do | Cần đặc tả gì |
|---|---|---|
| **Loading** (đang tải) | "Loading…" (App và TodoPage) | Hiện gì, nút có bị vô hiệu hóa không (`Please wait…` trên nút đăng nhập) |
| **Empty** (trống) | "Nothing here yet." | Câu thông báo, và lời kêu gọi hành động nếu có ("Thêm to-do đầu tiên") |
| **Error** (lỗi) | Khung đỏ `p.error`, ví dụ `Title is required.` | Câu chữ chính xác, hiện ở đâu, khi nào biến mất |
| **Success** (thành công) | Danh sách, "Hi, An", "2 left" | Giao diện bình thường, kể cả tiêu đề dài và rất nhiều dòng |

> **Góc BA:** Với mỗi màn hình trong user story, hãy liệt kê các trạng thái loading, empty, error và success trong acceptance criteria và vẽ từng trạng thái trong mockup. Ví dụ: "Given tôi chưa có to-do nào, When danh sách tải xong, Then tôi thấy 'Nothing here yet.'" và "Given server từ chối tiêu đề trống, When tôi bấm Add, Then tôi thấy 'Title is required.' trong khung đỏ phía trên bộ lọc." Dev đằng nào cũng sẽ viết một `?` hoặc `&&` cho từng trạng thái; nếu bạn không đặc tả, họ sẽ đoán, và tester sẽ không có gì để đối chiếu.

**Tái sử dụng component nghĩa là nhất quán.** Project mẫu tạo kiểu cho mọi nút qua một rule `button` và mọi lỗi qua `.error`, và `AuthForm` hiện lỗi theo cùng mẫu `p.error` như `TodoPage`. Trong dự án thật, một component dùng chung như `<ErrorMessage>` hay `<Button>` nghĩa là sửa một chỗ thì mọi màn hình đều đúng. Khi viết yêu cầu, hãy dùng lại cả tên gọi: nói "thông báo lỗi chuẩn" hoặc "cùng empty state như danh sách Orders", để dev ánh xạ được sang component có sẵn thay vì làm một bản sao hơi khác.

**BA được gì?** Hãy hỏi trong buổi refinement: "Đã có component nào cho việc này chưa?" Câu trả lời "có" thường nghĩa là estimate nhỏ hơn và ít lỗi không nhất quán về UI phải test hơn.

## 10. Tóm tắt

- React cho bạn mô tả màn hình nên trông thế nào với dữ liệu hiện tại; React tự cập nhật DOM (UI = f(data)).
- App khởi động từ `index.html` (`div#root`) → `main.jsx` (`createRoot(...).render(<App />)`) → `App.jsx`. Vite cung cấp dev server, hot reload và `npm run build` → `dist/`.
- Component là các hàm dùng lại được, trả về JSX; app to-do là một cây: `App` → `AuthForm` hoặc `TodoPage`.
- Props truyền dữ liệu và callback xuống (`user`, `onLogout`); dữ liệu chảy xuống, sự kiện đi lên.
- State từ `useState` (`todos`, `newTitle`, `filter`) chỉ được đổi qua setter, và mỗi lần đổi sẽ kích hoạt một lần re-render.
- `onClick`, `onChange` và `onSubmit` nối người dùng với state; danh sách dùng `.map` với `key={todo.id}` ổn định.
- Render có điều kiện bao phủ các trạng thái loading, empty (`Nothing here yet.`) và error (`&&`), còn giá trị suy ra (`visible`, `remaining`) được tính chứ không lưu.

**Giờ bạn có thể:**
- [ ] Chỉ ra file khởi động app và component chọn màn hình
- [ ] Phác một màn hình thành cây component và gọi tên props, state của nó
- [ ] Sửa một chỗ nhỏ về chữ, logic hoặc kiểu hiển thị và thấy nó hot reload
- [ ] Xem props và state bằng React DevTools
- [ ] Viết acceptance criteria bao phủ các trạng thái loading, empty, error và success

**Tiếp theo:** fs-05 nối màn hình này với backend: form, `fetch` qua `api.js`, và hiển thị thông báo lỗi từ server.
