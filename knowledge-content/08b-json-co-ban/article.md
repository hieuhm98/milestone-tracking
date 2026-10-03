# JSON là gì?

## 1. JSON là gì?

**JSON** (JavaScript Object Notation) là **định dạng văn bản** để lưu và trao đổi dữ liệu giữa các hệ thống. Đây là định dạng phổ biến nhất mà API dùng để trả dữ liệu về.

### Hình dung bằng một mẫu đơn chuẩn

Hãy tưởng tượng mỗi cơ quan nhà nước tự nghĩ ra một kiểu mẫu đơn riêng. Chuyển thông tin của bạn từ nơi này sang nơi khác sẽ rất hỗn loạn. Giờ hãy tưởng tượng tất cả thống nhất một mẫu đơn đơn giản: một nhãn, một dấu hai chấm, một câu trả lời. Ai cũng điền và đọc được — dù là người hay máy.

JSON chính là mẫu đơn thống nhất đó dành cho máy tính. Khi app ngân hàng hỏi server của ngân hàng số dư của bạn, câu trả lời quay về là một đoạn văn bản JSON ngắn như `{ "balance": 1500000 }`. Điện thoại, server và mọi hệ thống khác đều biết cách đọc nó.

"Định dạng văn bản" nghĩa là JSON chỉ là các ký tự thông thường — bạn mở được bằng Notepad (Windows) hay TextEdit (macOS). Nó không phải chương trình và tự nó không làm gì cả; nó chỉ *mô tả* dữ liệu. Dù tên có chữ JavaScript, mọi ngôn ngữ lập trình đều đọc và ghi được JSON.

**Tại sao BA cần biết JSON?**
- Đọc kết quả API trong Postman/Swagger để **kiểm thử** yêu cầu.
- Đối chiếu (**mapping**) trường dữ liệu giữa hai hệ thống khi viết tài liệu tích hợp.
- Viết **acceptance criteria** rõ ràng: "response phải có trường `status` = `confirmed`".

JSON được thiết kế để **con người đọc được** và **máy tính xử lý được** cùng lúc.

---

## 2. Cú pháp cơ bản: key–value

JSON được tạo từ các cặp **key (khóa)** và **value (giá trị)**:

```json
{ "name": "Nguyen Van A", "age": 25 }
```

- **Key** luôn là chuỗi, đặt trong dấu nháy kép `"..."`, nằm bên trái dấu `:`.
- **Value** là dữ liệu, nằm bên phải dấu `:`.
- Các cặp cách nhau bằng dấu phẩy `,`.

Đọc như tiếng Việt: *"name của người này là Nguyen Van A; age là 25".*

Hãy nghĩ tới một danh thiếp trong danh bạ điện thoại: "Tên: Lan", "SĐT: 0901…". **Key** là nhãn in sẵn (Tên), **value** là thứ bạn điền vào (Lan). Cặp ngoặc nhọn `{ }` là mép của tấm thiếp.

### Dấu cách và xuống dòng không quan trọng

Hai đoạn sau là cùng một dữ liệu:

```json
{"name":"Nguyen Van A","age":25}
```

```json
{
  "name": "Nguyen Van A",
  "age": 25
}
```

Hệ thống thường gửi dạng thứ nhất, viết dồn (**minified**), để tiết kiệm dung lượng. Công cụ và tài liệu hiển thị dạng thứ hai (**pretty-printed** — trình bày đẹp) để con người dễ đọc. Chỉ dấu cách *bên trong* dấu nháy mới là một phần của dữ liệu: `"Nguyen Van A"` vẫn giữ nguyên các dấu cách.

---

## 3. Các kiểu giá trị

| Kiểu | Ví dụ | Ghi chú |
|------|-------|---------|
| String (chuỗi) | `"Laptop Dell"` | Luôn trong nháy kép |
| Number (số) | `25000000` | Không dùng nháy, không có dấu phẩy ngăn cách nghìn |
| Boolean | `true` / `false` | Đúng/sai |
| Null | `null` | Không có giá trị |
| Object | `{ ... }` | Một đối tượng lồng bên trong |
| Array | `[ ... ]` | Một danh sách |

**String** nghĩa là văn bản. **Boolean** là công tắc có/không, viết chữ thường và không có nháy. **Null** nghĩa là "cố ý để trống".

### Dấu nháy làm đổi nghĩa

Cùng các ký tự nhưng có thể là hai kiểu khác nhau:

| Cách viết | Kiểu | Chương trình hiểu là |
|-----------|------|----------------------|
| `25` | Number | Một số lượng có thể cộng trừ |
| `"25"` | String | Chỉ là hai ký tự 2 và 5 |
| `false` | Boolean | Giá trị "không" |
| `"false"` | String | Một chữ tình cờ viết là false |

Điều này quan trọng. Trong nhiều ngôn ngữ lập trình, mọi đoạn chữ không rỗng đều được coi là "có", nên một chương trình kiểm tra `"active": "false"` có thể coi tài khoản là **đang hoạt động**. Chỉ một cặp nháy nhỏ cũng có thể gây ra lỗi thật.

> **Hiểu lầm thường gặp:** "Số điện thoại là số, nên không cần nháy." Số điện thoại, số CCCD, mã bưu chính nên là **string**: `"0901234567"`. Nếu là number, số `0` ở đầu sẽ bị mất và giá trị thành `901234567`. Quy tắc dễ nhớ: nếu không bao giờ làm phép tính với nó, hãy để là string.

### Không có kiểu ngày tháng

JSON không có kiểu riêng cho ngày tháng. Ngày được gửi dưới dạng string, thường theo định dạng quốc tế năm-tháng-ngày: `"2024-04-08"`, hoặc kèm giờ: `"2024-04-08T14:30:00Z"`. Hai hệ thống phải thống nhất định dạng — một điểm kinh điển mà BA cần chốt trong tài liệu.

---

## 4. Object `{}` và Array `[]`

Đây là hai khối quan trọng nhất — phân biệt được là hiểu 90% JSON.

- **Object `{}`** = một **đối tượng** gồm nhiều key–value. Ví dụ: một sản phẩm.
- **Array `[]`** = một **danh sách** các giá trị, ngăn cách bằng dấu phẩy. Ví dụ: danh sách tags.

```json
{
  "id": 5,
  "name": "Laptop Dell XPS",
  "price": 25000000,
  "inStock": true,
  "tags": ["laptop", "dell", "premium"]
}
```

Ở đây `tags` là một **array** chứa 3 chuỗi.

| | Object `{}` | Array `[]` |
|--|-------------|------------|
| Hình ảnh đời thường | Một tờ đơn đã điền | Một danh sách đánh số / một hàng người xếp hàng |
| Nội dung | Các giá trị có nhãn (`"name": ...`) | Các giá trị không nhãn, chỉ có vị trí |
| Cách tìm một giá trị | Theo key: `name` | Theo vị trí: `[0]`, `[1]`… |
| Dùng điển hình | Một khách hàng, một sản phẩm | Nhiều tag, nhiều dòng đơn hàng |

Phép thử đơn giản: nếu bạn gọi nó là "**một** khách hàng", đó là object; nếu bạn nói "**danh sách** khách hàng", đó là array.

---

## 5. Dữ liệu lồng nhau (nested)

Một value có thể lại là một object. Đây gọi là **object lồng nhau** (nested / associative array).

Hình dung: một thư mục trên máy tính có thể chứa thư mục khác, bên trong lại có các file. JSON cũng vậy — hộp nằm trong hộp.

```json
{
  "id": 5,
  "name": "Laptop Dell XPS",
  "specs": {
    "cpu": "Intel i7",
    "ram": "16GB",
    "storage": "512GB SSD"
  }
}
```

`specs` không phải một giá trị đơn — nó là một object con chứa thông tin chi tiết.

**Mẹo đọc:** nhìn theo thụt lề. Mọi thứ thụt vào dưới `"specs": {` đều thuộc về `specs`, cho tới dấu `}` tương ứng. Mỗi `{` phải được đóng bằng một `}` và mỗi `[` bằng một `]`, giống dấu ngoặc trong công thức toán.

Vì sao phải lồng? Để gom thông tin liên quan. Thay vì ba trường rời `specsCpu`, `specsRam`, `specsStorage`, thông số đi cùng nhau thành một khối.

---

## 6. Mảng các object – danh sách bản ghi

Trường hợp cực kỳ phổ biến trong response API: một **array chứa nhiều object**, mỗi object là một bản ghi (giống một hàng trong bảng dữ liệu).

```json
{
  "orderId": "ORD-20240408-001",
  "status": "confirmed",
  "total": 50500000,
  "customer": {
    "id": 5,
    "name": "Nguyen Van A",
    "phone": "0901234567"
  },
  "items": [
    { "productId": 5, "name": "Laptop Dell XPS", "quantity": 1, "price": 25000000 },
    { "productId": 8, "name": "Chuột Logitech",  "quantity": 2, "price": 500000 }
  ]
}
```

`items` là danh sách 2 sản phẩm trong đơn hàng. Mỗi phần tử có cùng bộ key.

Nếu đưa `items` vào một bảng tính, nó trông như thế này — mỗi object là một hàng, mỗi key là một cột:

| productId | name | quantity | price |
|-----------|------|----------|-------|
| 5 | Laptop Dell XPS | 1 | 25000000 |
| 8 | Chuột Logitech | 2 | 500000 |

Đây là hình ảnh cần nhớ: **mảng các object = một bảng**. Danh sách đơn hàng, danh sách giao dịch, kết quả tìm kiếm — gần như mọi màn hình danh sách trong app đều được "nuôi" bằng một mảng các object.

---

## 7. Đọc giá trị theo "đường dẫn" (path)

Khi dev nói *"lấy `customer.name`"* hay *"`items[0].price`"*, họ đang chỉ đường đi trong JSON. Với ví dụ ở mục 6:

| Đường dẫn | Giá trị |
|-----------|---------|
| `status` | `"confirmed"` |
| `customer.name` | `"Nguyen Van A"` |
| `items` | danh sách 2 sản phẩm |
| `items[0].name` | `"Laptop Dell XPS"` (phần tử **đầu tiên**) |
| `items[1].quantity` | `2` |

> ⚠️ Array đánh số từ **0**, nên phần tử đầu tiên là `items[0]`, không phải `items[1]`.

### Đọc một đường dẫn từng bước

Đường dẫn giống địa chỉ nhà đọc từ lớn tới nhỏ. Lấy ví dụ `items[1].quantity`:

1. Bắt đầu từ cặp `{ }` ngoài cùng của cả response.
2. `items` → đi tới key `items`. Nó là một array.
3. `[1]` → lấy phần tử ở vị trí 1, tức là phần tử **thứ hai** (con chuột).
4. `.quantity` → bên trong object đó, đọc key `quantity` → `2`.

Dấu chấm `.` nghĩa là "đi vào bên trong object này"; ngoặc vuông `[n]` nghĩa là "lấy phần tử số n trong danh sách này".

> **Tự thử:** mở `https://api.github.com/users/octocat` trên trình duyệt. Firefox hiển thị JSON gọn gàng, có thể thu gọn từng phần; các trình duyệt khác hiển thị văn bản, thường có tùy chọn "Pretty-print" để trình bày cho dễ đọc. Tìm key `login` (đường dẫn: `login`) và key `public_repos`. `public_repos` là number hay string? (Đáp án: number — không có nháy.)

---

## 8. JSON vs XML

Trước JSON, **XML** là định dạng phổ biến. XML bọc mỗi giá trị trong một **thẻ** mở và thẻ đóng, như `<status>` … `</status>` — giống cách viết trang web. Cùng một đơn hàng, XML dài dòng hơn nhiều:

```xml
<order>
  <status>confirmed</status>
  <total>50500000</total>
</order>
```

Cùng dữ liệu đó bằng JSON:

```json
{ "status": "confirmed", "total": 50500000 }
```

Trong XML, tên mỗi trường xuất hiện hai lần (thẻ mở và thẻ đóng), còn JSON chỉ một lần. Qua hàng nghìn bản ghi, sự khác biệt đó cộng dồn lại rất lớn.

| Tiêu chí | JSON | XML |
|----------|------|-----|
| Độ gọn | Ngắn gọn | Dài, nhiều thẻ |
| Dễ đọc | Rất dễ | Khó hơn |
| Phổ biến trong API mới | Rất cao | Giảm dần |
| Còn dùng nhiều ở | Web, mobile, REST | Hệ thống cũ, ngân hàng, SOAP |

**SOAP** là một kiểu API cũ hơn dựa trên XML, vẫn còn ở ngân hàng, bảo hiểm và hệ thống nhà nước. Vì vậy BA trong dự án tích hợp có thể gặp cả hai định dạng. Không cái nào "sai"; XML chỉ cũ hơn và dài dòng hơn.

Đa số API hiện đại mặc định trả **JSON**. Một lý do lớn: JSON khớp trực tiếp với danh sách và đối tượng mà các ngôn ngữ lập trình vốn đã dùng, nên gần như không cần chuyển đổi.

---

## 9. JSON đi qua API như thế nào?

Khi JSON được gửi trong request hay response, một **header** (nhãn gắn kèm thông điệp) cho biết body ở định dạng gì. API dùng header **`Content-Type: application/json`** để báo rằng dữ liệu trong body là JSON. Client dùng header **`Accept: application/json`** để yêu cầu server trả về JSON.

Hình dung: `Content-Type` là nhãn dán trên bưu kiện ghi "bên trong là tài liệu tiếng Anh". `Accept` là lời nhắn "vui lòng trả lời bằng tiếng Anh".

```text
POST /api/orders HTTP/1.1
Content-Type: application/json
Accept: application/json

{ "productId": 5, "quantity": 2 }
```

Nếu hai bên không thống nhất định dạng, hệ thống sẽ báo lỗi. Thường server trả `400 Bad Request` (không hiểu được body) hoặc `415 Unsupported Media Type` (không nhận định dạng đó).

> **Tự thử:** mở DevTools trên một web app hiện đại bất kỳ (Windows: `F12`; macOS: `Cmd+Option+I`), vào **Network → Fetch/XHR** rồi tải lại trang. Bấm vào một request. Trong phần **Headers**, tìm `content-type: application/json`; tab **Preview** hoặc **Response** hiển thị chính đoạn JSON.

---

## 10. BA dùng JSON để làm gì?

- **Mapping trường dữ liệu**: hệ thống A trả `full_name`, hệ thống B cần `customerName` → BA lập bảng ánh xạ.
- **Viết acceptance criteria**: "khi đặt hàng thành công, response trả `status: confirmed` và `orderId` khác rỗng".
- **Kiểm thử nhanh**: đọc response trong Postman xem đủ trường chưa, giá trị đúng chưa.
- **Rà soát tài liệu API**: đối chiếu ví dụ JSON trong Swagger với yêu cầu nghiệp vụ.

### Một bảng mapping trông như thế nào

| Hệ thống A (CRM) | Hệ thống B (Billing) | Quy tắc |
|------------------|----------------------|---------|
| `full_name` | `customerName` | Chép nguyên |
| `dob` | `birthDate` | Cùng ngày, định dạng `YYYY-MM-DD` |
| `vip` (`"Y"`/`"N"`) | `isVip` (`true`/`false`) | `"Y"` → `true`, còn lại `false` |
| `discount` | `discountAmount` | Nếu `null`, hiển thị "Không giảm giá" |

Để ý hai dòng cuối: khác kiểu dữ liệu và ý nghĩa của `null` chính là nơi lỗi tích hợp hay ẩn nấp. Hãy hỏi sớm: *"Khi trường này là `null`, nghĩa là bằng 0, chưa xác định, hay không áp dụng?"*

**Ví dụ thực tế trong công việc:** BA đính kèm một payload JSON mẫu vào tài liệu. Dev nhận ra ngay BA ghi `customer_phone` trong khi API dùng `customer.phone`. Mười giây với một ví dụ cụ thể tiết kiệm cả ngày sửa lại — payload mẫu xóa sự mơ hồ nhanh hơn mọi đoạn văn mô tả.

---

## 11. Lỗi JSON thường gặp

JSON rất khắt khe: sai một ký tự là cả đoạn không đọc được (dân lập trình gọi là **parse** thất bại). Hãy để ý:

- Thiếu nháy kép quanh key hoặc chuỗi: `{ name: "A" }` ❌ → phải là `{ "name": "A" }` ✅.
- **Dấu phẩy thừa** ở phần tử cuối: `[1, 2, 3,]` ❌.
- Dùng nháy đơn `'` thay vì nháy kép `"`.
- Nhầm object `{}` với array `[]`.
- Số tiền có dấu phẩy ngăn cách nghìn: `25,000,000` ❌ → phải là `25000000`.
- Thiếu ngoặc đóng: `{ "a": [1, 2 }` ❌ — dấu `[` chưa bao giờ được đóng.
- Chú thích: `// ghi chú` không được phép trong JSON chuẩn.

"Nháy thông minh" là lỗi khó thấy: nếu bạn chép JSON từ Word hay email, dấu nháy thẳng `"` có thể bị đổi thành nháy cong `“ ”`, và JSON không chấp nhận.

> 💡 Mẹo: dán JSON vào một trình **JSON validator/formatter** để kiểm tra hợp lệ và xem cấu trúc rõ ràng.

> **Hiểu lầm thường gặp:** "Trang định dạng JSON online nào cũng được, kể cả dữ liệu công việc." Response API thật thường chứa tên, số điện thoại hay số giấy tờ của khách hàng. Đừng dán chúng vào website công cộng — hãy dùng tính năng định dạng có sẵn trong công cụ của công ty (Postman, VS Code, DevTools của trình duyệt) hoặc xóa dữ liệu cá nhân trước.

---

## 12. Tóm tắt

- **JSON** = định dạng dữ liệu phổ biến nhất trong API, gồm các cặp **key–value**.
- **`{}`** = object (một đối tượng); **`[]`** = array (một danh sách).
- Kiểu dữ liệu quan trọng: `25` ≠ `"25"`, `false` ≠ `"false"`; số điện thoại là string; ngày tháng là string.
- Value có thể **lồng nhau**: object trong object, array các object.
- Một **mảng các object** là một bảng: mỗi object là một hàng.
- Đọc dữ liệu theo **đường dẫn**: `customer.name`, `items[0].price` (array đánh số từ 0).
- **JSON gọn hơn XML** và là mặc định của API hiện đại.
- BA dùng JSON để **mapping dữ liệu, viết acceptance criteria và kiểm thử** API.

### Thuật ngữ chính

| Thuật ngữ | Nghĩa đơn giản |
|-----------|----------------|
| JSON | "Mẫu đơn chuẩn" dạng văn bản thuần cho dữ liệu, người và chương trình đều đọc được |
| Key / value | Nhãn và câu trả lời điền vào, ví dụ `"age": 25` |
| Object `{}` | Một đối tượng được mô tả bằng các trường có nhãn |
| Array `[]` | Một danh sách có thứ tự; vị trí bắt đầu từ 0 |
| Nested (lồng nhau) | Một value mà bản thân nó là object hoặc array |
| Path (đường dẫn) | Lối đi tới một giá trị, ví dụ `items[1].quantity` |
| Parse | Chương trình đọc văn bản JSON thành dữ liệu; thất bại nếu sai cú pháp |
| `Content-Type: application/json` | Header báo "body này là JSON" |
