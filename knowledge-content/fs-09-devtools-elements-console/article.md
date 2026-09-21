# Chrome DevTools (1): Kiểm tra giao diện với Elements & Console

## 1. Vì sao DevTools quan trọng với BA và tester

Mọi bản Chrome đều có sẵn một bộ công cụ soi trang đầy đủ tên là **DevTools**. Developer dùng nó cả ngày, nhưng nó hữu ích không kém cho bất kỳ ai kiểm thử hoặc nghiệm thu một tính năng. Bạn không cần viết code: phần lớn việc trong bài này là nhìn, bấm và đọc.

- **Bug report có bằng chứng.** Thay vì "danh sách nhìn bị lỗi", bạn đính kèm ảnh chụp, đúng rule CSS gây lỗi và dòng lỗi màu đỏ trong Console. Developer thường sửa được ngay mà không phải hỏi lại câu nào.
- **Phân biệt được bug frontend với bug backend.** Nếu server trả đúng dữ liệu mà màn hình hiển thị sai, bug nằm ở frontend. Nếu bản thân dữ liệu sai, bug nằm ở backend. Giao ticket đúng người là tiết kiệm được cả một ngày.
- **Tự kiểm tra requirement mà không cần hỏi developer.** Thông báo lỗi có nằm trong khung có `role="alert"` không? Việc đã xong có bị gạch ngang không? Bố cục có chịu được màn hình điện thoại 320 pixel không? Bạn tự trả lời được trong vài giây.

Đây là bài đầu tiên trong ba bài về DevTools, tập trung vào **những gì người dùng nhìn thấy**: Elements, Console, Device Toolbar, một chút Sources và một lượt kiểm tra khả năng truy cập (accessibility). Panel **Network** nằm ở bài fs-10, còn **Application** (cookie, `localStorage`) ở bài fs-11.

Hãy chạy app to-do (`npm run dev` trong `server/` và trong `client/`), mở **http://localhost:5173**, đăng nhập, thêm ba bốn to-do và tick một cái.

---

## 2. Mở DevTools và làm quen bố cục

| Cách | Windows / Linux | macOS |
|---|---|---|
| Mở DevTools | **F12** hoặc **Ctrl+Shift+I** | **Cmd+Option+I** |
| Mở thẳng vào Console | **Ctrl+Shift+J** | **Cmd+Option+J** |
| Mở ngay tại một phần tử | Chuột phải vào nó → **Inspect** | Như trên |
| Công cụ chọn phần tử | **Ctrl+Shift+C** | **Cmd+Shift+C** |

**Vị trí đặt DevTools (docking).** Mở menu **⋮** ở góc trên bên phải của DevTools và chọn **Dock side**: trái, dưới, phải, hoặc tách ra cửa sổ riêng. Tách cửa sổ rất tiện trên laptop, vì trang giữ nguyên chiều rộng thật khi bạn kiểm thử.

**Bản đồ các panel.** Các tab dọc phía trên gọi là panel:

| Panel | Dùng để làm gì | Học ở |
|---|---|---|
| **Elements** | HTML đang hiển thị của trang và CSS áp lên từng phần tử | Bài này |
| **Console** | Thông báo, lỗi và cảnh báo; một dấu nhắc để gõ JavaScript | Bài này |
| **Sources** | Các file code trang đã tải; tạm dừng code bằng breakpoint | Bài này (sơ lược) |
| **Network** | Mọi request trang gửi đi và mọi response nhận về | fs-10 |
| **Application** | Cookie, `localStorage` và các kho lưu trữ khác | fs-11 |
| **Lighthouse** | Kiểm tra tự động: accessibility, hiệu năng, best practices, SEO | Bài này |

Panel nào không đủ chỗ sẽ nằm sau mũi tên **»**. **Command Menu** (**Ctrl+Shift+P**, Cmd+Shift+P) là ô tìm kiếm cho mọi lệnh: gõ "screenshot" hay "dock" rồi nhấn Enter.

**BA được gì?** Hôm nay chỉ cần nhớ hai phím tắt: **F12** và **Ctrl+Shift+C**. Hai phím này đã chiếm một nửa công việc hằng ngày.

---

## 3. Elements: đọc cấu trúc và style của trang

Nhấn **Ctrl+Shift+C** rồi rê chuột lên danh sách to-do. Mỗi phần tử sáng lên kèm nhãn ghi tag, class và kích thước. Bấm vào một phần tử và panel **Elements** nhảy tới đúng chỗ đó. Bên trái là **cây DOM** (DOM tree), tức HTML mà trình duyệt đang hiển thị *ngay lúc này* (đã rút gọn):

```html
<main class="container">
  <section class="card">
    <header class="row"> <h1>Hi, Lan</h1> <button class="secondary">Log out</button> </header>
    <form class="row">
      <input placeholder="What needs doing?" aria-label="New to-do">
      <button type="submit">Add</button>
    </form>
    <div class="row filters">
      <button class="chip active">all</button> <button class="chip">active</button>
      <button class="chip">done</button> <span class="muted">2 left</span>
    </div>
    <ul class="todos">
      <li class=""> <label><input type="checkbox"><span>Buy milk</span></label>
        <button class="link" aria-label="Delete Buy milk">Delete</button> </li>
      <li class="done">…</li>
    </ul>
  </section>
</main>
```

- Bạn thấy **HTML, không phải code React**. Component `TodoPage` không hiện thành một tag; chỉ có HTML nó sinh ra, và `className` trong JSX đã thành `class`.
- Chip ghi `all` trong cây nhưng hiện **All** trên màn hình. Đó không phải bug: rule `.chip { text-transform: capitalize; }` đổi cách hiển thị. Elements cho bạn biết requirement kiểu "chip hiển thị chữ All" được đáp ứng bằng CSS.
- Việc đã tick có `class="done"`. Class này là cách style biết phải gạch ngang nó.

**Styles và Computed.** Bên phải hiện CSS của phần tử đang chọn. Tab **Styles** liệt kê mọi rule khớp, rule cụ thể nhất ở trên; khai báo bị gạch ngang nghĩa là đã bị một rule mạnh hơn **ghi đè** (overridden). Chọn một nút **Delete**: background trong `button { background: #2f6feb; }` bị gạch vì `button.link { background: none; }` thắng. Tab **Computed** chỉ hiện giá trị cuối cùng của mỗi thuộc tính. Dùng nó khi bạn cần đáp án ("chữ này thực sự màu gì?") chứ không cần lịch sử.

**Box model.** Trên cùng tab Computed là các hộp lồng nhau: **margin**, **border**, **padding** và kích thước **content**. Rê chuột lên từng lớp sẽ tô sáng lớp đó trên trang. Chọn `section.card` và bạn đọc được padding 24 ở mỗi cạnh. Khi thiết kế ghi "cách mép card 24 px", đây là chỗ để đo thay vì đoán qua ảnh chụp.

**Tìm trong cây.** Khi đang ở Elements, **Ctrl+F** tìm theo chữ hoặc CSS selector, ví dụ `.todos li`.

---

## 4. Elements: sửa trực tiếp để dựng thử một thay đổi

Mọi thứ trong Elements đều sửa được và trang cập nhật ngay. Không có gì được lưu: **refresh là mọi thứ về như cũ**, nên đây là một "sân chơi" an toàn.

**Đổi chữ.** Chọn bộ lọc **done** khi chưa tick việc nào, để trang hiện `Nothing here yet.` Double-click vào dòng chữ đó trong cây, gõ `No finished to-dos yet.` rồi Enter. Chụp màn hình, thế là bạn có mock-up câu chữ mới cho trạng thái rỗng để đem đi review với stakeholder.

**Đổi màu.** Chọn nút **Add**. Trong Styles, tìm `background: #2f6feb;` trong rule `button`, bấm vào ô màu nhỏ và chọn xanh lá. Mọi nút dựa vào rule đó đều đổi màu; nút Log out và các chip giữ màu riêng vì `button.secondary` và `.chip` ghi đè nó. Muốn chỉ đổi đúng phần tử đang chọn, hãy gõ khai báo vào khối `element.style` ở đầu tab Styles.

**Ép trạng thái (force state).** Style khi hover hay focus biến mất ngay khi bạn đưa chuột sang DevTools. Bấm **:hov** trên thanh công cụ Styles và tick **:hover**, **:focus** hoặc **:focus-visible** để "đóng băng" phần tử ở trạng thái đó (hoặc chuột phải vào node → **Force state**).

**Kiểm tra khung báo lỗi.** Bấm **Add** khi ô nhập trống. Server trả `Title is required.` và Elements hiện:

```html
<p class="error" role="alert">Title is required.</p>
```

`role="alert"` khiến trình đọc màn hình (screen reader) đọc thông báo ngay khi nó xuất hiện. Nếu acceptance criteria ghi "lỗi được thông báo cho công nghệ hỗ trợ", thuộc tính này chính là bằng chứng.

**Ẩn hoặc xóa.** Chọn một node và nhấn **H** để ẩn, hoặc **Delete** để xóa, để xem bố cục trông ra sao khi thiếu nó.

React quản lý trang này: khi state thay đổi (bạn tick hoặc thêm việc), nó render lại và có thể xóa mất chỗ bạn vừa sửa. Sửa, chụp, rồi refresh.

**BA được gì?** Một lần sửa trực tiếp biến câu "làm to hơn chút được không?" thành một đề xuất cụ thể, có ảnh chụp và con số chính xác.

---

## 5. Device Toolbar: thử trên kích thước điện thoại

Nhấn **Ctrl+Shift+M** (Cmd+Shift+M), hoặc bấm biểu tượng điện thoại-máy tính bảng ở góc trên bên trái DevTools, để bật/tắt **Device Toolbar**. Trang giờ được vẽ trong một khung nhìn (viewport) co giãn được:

1. **Dimensions**: **Responsive** (kéo mép hoặc gõ chiều rộng) hoặc một mẫu điện thoại/máy tính bảng có sẵn. Danh sách mẫu thay đổi theo phiên bản Chrome; **Edit…** cho phép thêm mẫu của bạn.
2. **Xoay** giữa dọc và ngang bằng biểu tượng xoay.
3. **Zoom** để điện thoại dài vừa màn hình. Zoom chỉ đổi bản xem trước.
4. Menu **⋮** của thanh công cụ có thêm **Show device frame**, **Show media queries** và **Capture screenshot**.

**Bài kiểm tra 320 px.** Ở chế độ Responsive, gõ `320` làm chiều rộng: đây là chiều rộng điện thoại hẹp nhất còn phổ biến, và là chỗ bố cục hay vỡ. Nút **Add** có còn nằm cạnh ô nhập không? Ba chip và "2 left" có vừa một dòng không? Tiêu đề dài có xuống dòng bên trong card không? Sau đó thử khoảng 400 px, máy tính bảng (768 px) và chiều rộng desktop. Card có `max-width: 520px`, nên trên màn hình rộng nó phải nằm giữa.

Chế độ thiết bị giả lập thao tác chạm và user agent di động, nhưng không giả lập điện thoại chậm hay trình duyệt di động thật, nên vẫn cần kiểm tra trên thiết bị thật trước khi phát hành.

**BA được gì?** Ghi chiều rộng vào acceptance criteria ("dùng được từ 320 px đến 1440 px"). Thanh công cụ này là cách bạn kiểm tra chúng.

---

## 6. Console: đọc lỗi và hỏi trang vài câu

Mở **Console** (**Ctrl+Shift+J**). Nó hiện thông báo từ trang và từ trình duyệt, và có dấu nhắc (`>`) để bạn gõ.

| Trông như | Mức (level) | Ý nghĩa |
|---|---|---|
| Đỏ, biểu tượng ✖ | Error | Có gì đó hỏng: crash, request thất bại, lỗi React |
| Vàng, biểu tượng ⚠ | Warning | Đáng ngờ hoặc lỗi thời, nhưng vẫn chạy |
| Bình thường | Info / log | Thông báo thường do code ghi ra |
| Ẩn mặc định | Verbose | Chi tiết để debug |

Dropdown **Default levels** bật/tắt từng mức, còn ô **Filter** chỉ giữ các dòng chứa một từ. Đường link bên phải mỗi thông báo (như `api.js:6`) là file và dòng đã sinh ra nó.

**Không phải dòng đỏ nào cũng là bug.** Đăng xuất, tải lại trang, bạn sẽ thấy hai lỗi đỏ:

```text
Failed to load resource: the server responded with a status of 401 (Unauthorized)
Failed to load resource: the server responded with a status of 401 (Unauthorized)
```

Cả hai đến từ `GET /api/auth/me`: app hỏi "có ai đang đăng nhập không?" và server trả lời "không". Đây là hành vi đúng như thiết kế: app bắt câu trả lời đó và hiện form đăng nhập. Nó xuất hiện hai lần vì `StrictMode` của React (trong `main.jsx`) cố ý chạy effect khởi động hai lần ở môi trường development. Chrome in mọi request thất bại bằng màu đỏ, dù app đã xử lý hay chưa; nhập sai mật khẩu cũng sinh một dòng tương tự trong khi trang hiện đúng `Email or password is incorrect.` Phép thử "có phải bug không" rất đơn giản: **người dùng có thấy đúng điều cần thấy không?**

**Giải thích một cảnh báo React.** Nếu developer render một danh sách mà không gắn `key` cho từng phần tử (giả sử bỏ `key={todo.id}` khỏi `<li>`), React in ra:

```text
Each child in a list should have a unique "key" prop.
Check the render method of `TodoPage`.
```

React dùng key để phân biệt các phần tử khi danh sách thay đổi; thiếu key, tick hoặc xóa một việc có thể khiến sai dòng giữ sai trạng thái. React ghi nó bằng `console.error`, nên nó **màu đỏ** dù trang vẫn chạy, và chỉ xuất hiện ở bản build development. Hãy báo lại: sửa rất rẻ trước khi nó thành một bug khó hiểu.

**Console như một tờ nháp.** Gõ biểu thức bất kỳ rồi Enter:

```js
24 * 2 + 8                                       // a calculator
document.title                                   // 'My To-dos'
document.querySelectorAll('.todos li').length    // to-dos on screen now
document.querySelector('[role="alert"]')         // null = no error box
$0.textContent                                   // text of the element selected in Elements
copy('x'.repeat(201))                            // put 201 characters on the clipboard
```

`$0` luôn là phần tử bạn chọn gần nhất trong Elements. Dán 201 ký tự vào ô nhập rồi bấm **Add**: khung đỏ phải hiện `Title must be 200 characters or fewer.`

**Đếm so với nhãn.** Danh sách chỉ hiện các việc khớp bộ lọc hiện tại, còn "N left" đếm **mọi** việc chưa xong. Khi chọn bộ lọc **active**, hai con số phải bằng nhau; nếu không, bạn đã tìm ra bug và có số liệu để chứng minh.

**Preserve log.** Console bị xóa sạch khi tải lại trang. Mở phần cài đặt của Console (biểu tượng bánh răng) và tick **Preserve log** trước khi tái hiện một bug có liên quan tới refresh hay đăng nhập.

---

## 7. Sources và kiểm tra nhanh accessibility

**Sources: nếm thử.** Vite phục vụ **source map** ở môi trường development, nên Sources hiện đúng file gốc của bạn. Nhấn **Ctrl+P** trong Sources, gõ `TodoPage` và mở `TodoPage.jsx`.

1. Trong `addTodo`, bấm vào số dòng của `const data = await api('POST', '/todos', { title: newTitle });`. Một dấu xanh xuất hiện.
2. Gõ một to-do và bấm **Add**. Trang đứng lại với dải "Paused in debugger".
3. Rê chuột lên `newTitle` để thấy chữ bạn vừa gõ; mục **Scope** liệt kê các giá trị khác.
4. Nhấn **F8** để chạy tiếp, rồi bấm lại vào dấu xanh để gỡ nó.

Thấy code dừng lại đúng lúc *bạn* bấm giúp câu "frontend gọi API ở chỗ này" trở nên cụ thể.

**Lighthouse.** Mở panel **Lighthouse**, giữ chế độ **Navigation**, tick **Accessibility**, chọn Mobile hoặc Desktop và bấm **Analyze page load**. Bạn nhận điểm 0–100 cho mỗi hạng mục và danh sách các mục không đạt. Hãy chạy trong cửa sổ Incognito để extension không làm sai kết quả, và bỏ qua điểm Performance trên dev server vì bản dev cố ý không tối ưu. Với app của ta, nó có thể báo chữ xám của việc đã xong (`#8c959f` trên nền trắng) có độ tương phản thấp: một câu hỏi thật cho designer.

**Pane Accessibility.** Trong Elements, mở tab **Accessibility** cạnh Styles. Nó hiện **role** và **name** mà screen reader sẽ đọc. Tên của nút **Delete** là `Delete Buy milk` (lấy từ `aria-label`); ô nhập to-do mới có tên `New to-do` dù không có nhãn hiển thị.

**Kiểm tra chỉ bằng bàn phím.** Bấm vào thanh địa chỉ rồi nhấn **Tab** liên tục. Mọi control phải có vòng focus nhìn thấy được, theo thứ tự hợp lý: Log out, ô nhập, Add, các chip, các checkbox, Delete. **Enter** trong ô nhập để thêm; **Space** để tick checkbox.

---

## 8. Checklist kiểm thử giao diện cho app to-do

| # | Kiểm tra | Kỳ vọng | Cách kiểm tra bằng DevTools |
|---|---|---|---|
| 1 | Bố cục ở 320 px, ~400 px, desktop | Không cuộn ngang; Add nằm cạnh ô nhập | Device Toolbar → Responsive, gõ chiều rộng |
| 2 | Trạng thái đang tải | "Loading…" trước khi hiện danh sách | Giả lập mạng chậm (fs-10) hoặc dừng trong Sources |
| 3 | Trạng thái rỗng | `Nothing here yet.` | Lọc **done** khi chưa tick việc nào |
| 4 | Trạng thái lỗi | `Title is required.` trong khung đỏ | Add khi ô trống; soi `p.error[role="alert"]` |
| 5 | Giới hạn độ dài | 201 ký tự bị từ chối | `copy('x'.repeat(201))`, dán, Add |
| 6 | Tiêu đề dài xuống dòng | Nằm gọn trong card | Dán tiêu đề dài ở 320 px, thử cả chuỗi không có dấu cách |
| 7 | Style việc đã xong | Gạch ngang và màu xám | Computed của `span`: `text-decoration-line: line-through` |
| 8 | Chip bộ lọc | Chỉ chip đang chọn có màu xanh | Xem class `active` di chuyển trong Elements |
| 9 | Nhãn đếm | Ở bộ lọc **active**, số `li` bằng "N left" | `document.querySelectorAll('.todos li').length` |
| 10 | Focus nhìn thấy được | Vòng focus trên mọi control | Tab qua các control; ép `:focus-visible` để chụp |
| 11 | Tên accessible | Ô nhập và nút Delete có tên rõ ràng | Elements → tab Accessibility |
| 12 | Console sạch | Không có dòng đỏ bất ngờ | Bật **Preserve log**; hai lỗi 401 từ `/auth/me` khi đã đăng xuất là bình thường |

Dòng 6 đáng chú ý. Một câu văn xuống dòng ở giữa các từ, nhưng một chuỗi liền (ví dụ một URL được dán vào) không có chỗ nào để xuống dòng, và stylesheet không có rule nào bảo từ dài phải ngắt. Trên màn hình hẹp, tiêu đề như vậy thật sự tràn ra ngoài card và làm cả trang cuộn ngang. Dự án mẫu cố ý giữ lại bug này để bạn luyện tìm và báo cáo nó: đúng loại trường hợp biên mà người dùng phát hiện ngay tuần đầu.

> **Góc BA:** Biến bảng này thành acceptance criteria trước khi bắt đầu phát triển. "Given một tiêu đề 200 ký tự không có dấu cách, when hiển thị ở 320 px, then nó xuống dòng bên trong card" là tiêu chí kiểm thử được, và nhắc developer thêm CSS ngay từ ngày đầu.

---

## 9. Thu thập bằng chứng và viết bug report giao diện tốt

**Chụp màn hình.** Mở Command Menu (**Ctrl+Shift+P**) và gõ "screenshot":

- **Capture screenshot**: phần trang đang nhìn thấy.
- **Capture full size screenshot**: toàn bộ trang, kể cả phần phải cuộn mới thấy.
- **Capture node screenshot**: chỉ phần tử đang chọn trong Elements (chọn `ul.todos` để chụp riêng danh sách).
- **Capture area screenshot**: kéo chọn một vùng chữ nhật.

File PNG được lưu vào thư mục Downloads. Ở chế độ thiết bị, ảnh có đúng kích thước điện thoại, đúng thứ một bug trên di động cần.

**Lỗi trong Console.** Bôi đen nội dung lỗi và nhấn **Ctrl+C**, hoặc chuột phải trong Console và chọn **Save as…** để lưu cả log. Dán dưới dạng chữ, không chỉ là ảnh, để developer tìm kiếm được, và kèm cả link file và dòng. Một số phiên bản Chrome có trợ lý AI giải thích lỗi; nội dung lỗi gốc vẫn là thứ phải có trong report.

**Mẫu bug report giao diện:**

```text
Title:    [To-do list] Long title with no spaces overflows the card at 320 px
Env:      http://localhost:5173 (dev), Chrome, Windows 11, Device Toolbar 320 x 640
Steps:    1. Log in  2. Add a to-do of 60 "x" characters  3. Set width to 320
Expected: The title wraps inside the card; no horizontal scrollbar.
Actual:   The title runs past the right edge; the page scrolls sideways.
Evidence: overflow-320.png (node screenshot of ul.todos)
          Console: no errors. Elements: no overflow-wrap rule on the span.
Severity: Minor (cosmetic, but any user can reach it)
```

Một tiêu đề tốt nêu **khu vực**, **triệu chứng** và **điều kiện**. Expected và actual phải trích đúng chữ hoặc giá trị thay vì cảm nhận mơ hồ kiểu "trông sai sai". "Console: no errors" cũng là thông tin: nó hướng developer vào CSS chứ không phải logic. Severity (mức độ nghiêm trọng) mô tả bug gây hại cho người dùng tới đâu, còn priority (độ ưu tiên) mô tả team sẽ sửa nó sớm tới mức nào. Một bug thẩm mỹ (cosmetic) không chặn ai, nhưng vẫn đáng có một ticket.

---

## 10. Tóm tắt

Màn hình chỉ là bề mặt. DevTools cho bạn thấy cấu trúc, style và các thông báo bên dưới, nhờ vậy phát hiện của bạn trở nên chính xác và tái hiện được.

Giờ bạn có thể:

- [ ] Mở DevTools bằng **F12**, chọn phần tử bằng **Ctrl+Shift+C** và đặt panel ở vị trí thuận tay.
- [ ] Đọc cây DOM, xem rule nào thắng trong **Styles** và đọc giá trị cuối trong **Computed**.
- [ ] Đo margin và padding bằng box model thay vì đoán.
- [ ] Sửa chữ và CSS trực tiếp để dựng thử một thay đổi, biết rằng nó mất khi refresh.
- [ ] Ép `:hover` hoặc `:focus` và xác nhận khung lỗi có `role="alert"`.
- [ ] Kiểm tra bố cục ở 320 px và các chiều rộng khác bằng **Device Toolbar**.
- [ ] Phân biệt dòng đỏ bình thường (lỗi 401 từ `/auth/me` khi đã đăng xuất) với lỗi thật, và giải thích cảnh báo `key` của React.
- [ ] Dùng Console làm tờ nháp: `document.title`, `$0`, đếm phần tử, `copy()` để tạo dữ liệu test dài.
- [ ] Chạy Lighthouse, đọc tên trong pane Accessibility và kiểm tra chỉ bằng bàn phím.
- [ ] Chụp màn hình từ Command Menu và viết bug report mà developer xử lý được ngay.

Hãy luyện trên bất kỳ website nào bạn dùng hằng ngày: soi một nút, đếm phần tử trong một danh sách, thu về 320 px. Thói quen quan trọng hơn thuộc lòng mọi phím tắt.

**Bài tiếp theo:** fs-10 mở panel **Network**, nơi bạn theo dõi từng request đi tới server và đọc các status code đứng sau hầu hết các báo cáo "nó không chạy".
