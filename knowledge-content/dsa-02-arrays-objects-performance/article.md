# Array, Object, Map & Set – Cấu trúc dữ liệu có sẵn dưới góc nhìn Big O

## 1. Những cấu trúc dữ liệu có sẵn

Trước khi tự xây linked list, cây hay heap, bạn nên phân tích những cấu trúc JavaScript cho sẵn. Bạn dùng chúng ở gần như mọi dòng code, và rất nhiều lỗi "sao chạy chậm thế?" đến từ việc không biết một thao tác built-in thực sự tốn bao nhiêu.

Bài này bàn về Big O của **object** và **array** (mảng), vì sao thêm phần tử vào **đầu** mảng lại tốn kém, chi phí của các method built-in phổ biến, khi nào nên dùng `Map` và `Set`, và vì sao dựng **chuỗi** (string) trong vòng lặp là một cái bẫy ẩn.

Nhắc lại nhanh từ bài trước: ta quan tâm khối lượng công việc **tăng thế nào theo n**, bỏ hằng số, và phải đếm cả những vòng lặp ẩn bên trong các lời gọi thư viện.

---

## 2. Object: các cặp key-value không có thứ tự

Object lưu giá trị theo **key** (khoá). Về mặt khái niệm nó là một bảng băm (hash table): engine biến key thành một vị trí, nên không bao giờ phải quét qua mọi phần tử.

```js
const instructor = {
  firstName: "Kelly",
  isInstructor: true,
  favoriteNumbers: [1, 2, 3, 4],
};

instructor.firstName;        // access    O(1)
instructor.lastName = "Lee"; // insertion O(1)
delete instructor.isInstructor; // removal O(1)
```

| Thao tác | Big O | Vì sao |
|---|---|---|
| Truy cập theo key | O(1) | Key dẫn thẳng tới giá trị |
| Thêm (insertion) | O(1) | Không phần tử nào khác phải di chuyển |
| Xoá (removal) | O(1) | Không phần tử nào khác phải di chuyển |
| Tìm theo **giá trị** | O(n) | Giá trị không được đánh chỉ mục; phải kiểm tra từng key |

Các con số O(1) là chi phí **trung bình** của một lần tra bảng băm; trường hợp xấu nhất được bàn ở mục 12.

**Dùng object khi** bạn không cần thứ tự và muốn tra cứu, thêm, xoá nhanh theo một key đã biết: bản ghi người dùng, cấu hình, bảng tra từ id sang dữ liệu.

"Không có thứ tự" không hẳn đúng từng chữ (key dạng số nguyên được duyệt trước, theo thứ tự tăng dần), nhưng đừng dựa vào thứ tự key — nếu cần thứ tự, hãy dùng array hoặc `Map`.

---

## 3. Chi phí của các method trên object

Các method biến object thành danh sách phải đi qua mọi key, nên chúng là tuyến tính:

| Method | Big O | Ghi chú |
|---|---|---|
| `Object.keys(obj)` | O(n) | Tạo mảng mới gồm n key (tốn cả O(n) bộ nhớ) |
| `Object.values(obj)` | O(n) | Tạo mảng mới gồm n giá trị |
| `Object.entries(obj)` | O(n) | Tạo n cặp `[key, value]` |
| `obj.hasOwnProperty(key)` / `Object.hasOwn(obj, key)` | O(1) | Chỉ là một lần tra key |
| `key in obj` | O(1) | Có đi thêm prototype chain (vốn rất ngắn) |

Một chi phí ẩn kinh điển là kiểm tra theo **giá trị** thay vì theo key:

```js
const stock = { apple: 3, pear: 0, kiwi: 7 };

// O(1): look up by key
const hasKiwi = Object.hasOwn(stock, "kiwi");

// O(n): Object.values builds an array, then includes scans it
const anySoldOut = Object.values(stock).includes(0);
```

Cũng cẩn thận với `Object.keys(obj).length` đặt trong vòng lặp — nó dựng lại cả một mảng chỉ để đếm số key, biến vòng lặp O(n) thành O(n²).

---

## 4. Array: danh sách có thứ tự

Array giữ các phần tử **theo thứ tự**, mỗi phần tử nằm ở một **index** (chỉ số) dạng số. Hãy hình dung một dãy ô được đánh số:

```text
index:   0          1          2
       +----------+----------+----------+
names: | "Michael"| "Melissa"| "Andrea" |
       +----------+----------+----------+
```

```js
const names = ["Michael", "Melissa", "Andrea"];
const values = [true, {}, [], 2, "awesome"]; // JS arrays can mix types
```

| Thao tác | Big O | Vì sao |
|---|---|---|
| Truy cập theo index `arr[i]` | O(1) | Nhảy thẳng tới ô i, dù mảng dài bao nhiêu |
| Tìm một giá trị | O(n) | Chưa sắp xếp: kiểm tra từng ô |
| Thêm | **tuỳ vị trí** | Cuối: O(1); đầu hoặc giữa: O(n) |
| Xoá | **tuỳ vị trí** | Cuối: O(1); đầu hoặc giữa: O(n) |

Truy cập theo index là O(1) vì engine tính được ô thứ i nằm ở đâu. Một hiểu lầm hay gặp là `arr[9999]` chậm hơn `arr[0]` — không phải vậy.

**Dùng array khi** thứ tự quan trọng (playlist, hàng đợi sự kiện, các dòng sắp theo ngày) hoặc khi bạn chủ yếu truy cập theo vị trí.

---

## 5. push/pop so với shift/unshift

Chữ "tuỳ vị trí" xoay quanh **index**. Mỗi phần tử gắn với index của nó, nên mọi thay đổi làm phần tử dịch chỗ đều buộc mảng phải đánh số lại.

Thêm hoặc xoá ở **cuối** không đụng tới phần tử nào khác:

```text
push("Zoe"):
  0: Michael   1: Melissa   2: Andrea   3: Zoe      <- only a new slot
```

Thêm hoặc xoá ở **đầu** làm mọi phần tử dịch đi một ô:

```text
unshift("Raj"):
  before:            0: Michael   1: Melissa   2: Andrea
  after:   0: Raj    1: Michael   2: Melissa   3: Andrea
                     ^ every existing element got a new index
```

| Method | Công dụng | Thời gian |
|---|---|---|
| `push(x)` | thêm vào cuối | O(1) amortized |
| `pop()` | xoá ở cuối | O(1) |
| `unshift(x)` | thêm vào đầu | O(n) |
| `shift()` | xoá ở đầu | O(n) |

`push` là O(1) **khấu hao** (amortized): thỉnh thoảng engine phải cấp phát vùng nhớ lớn hơn và chép toàn bộ sang (O(n)), nhưng việc đó hiếm đến mức chi phí trung bình mỗi lần push vẫn là hằng số.

Vì vậy `push` + `pop` tạo thành một **ngăn xếp** (stack) hiệu quả, còn `push` + `shift` là một **hàng đợi** (queue) chậm khi input lớn:

```js
function drainQueue(tasks) {
  let processed = 0;

  while (tasks.length > 0) {
    tasks.shift();           // O(n) each time
    processed++;
  }

  return processed;
}
// n shifts of O(n) each -> O(n²) overall
```

Engine đôi khi tối ưu `shift` cho mảng nhỏ, nhưng bạn nên mặc định nó là O(n). Các bài sau sẽ xây queue (bằng linked list, bằng hai stack) với cả hai đầu đều O(1).

---

## 6. Thêm và xoá ở giữa mảng

`splice` thêm hoặc xoá ở vị trí bất kỳ, nhưng mọi phần tử phía sau vị trí đó phải đánh số lại:

```js
const letters = ["a", "b", "d", "e"];

letters.splice(2, 0, "c"); // insert "c" at index 2 -> ["a","b","c","d","e"]
letters.splice(1, 1);      // remove index 1        -> ["a","c","d","e"]
```

```text
splice(2, 0, "c") on [a, b, d, e]
  a   b   d   e
          |   |
          v   v      d and e each move one slot right
  a   b   c   d   e
```

Chi phí: O(n) nói chung (chính xác hơn là tỉ lệ với số phần tử phía sau index cộng số phần tử được thêm hoặc xoá). Chèn gần cuối thì rẻ; chèn gần đầu thì tệ ngang `unshift`.

**Mẹo khi không cần giữ thứ tự:** muốn xoá index `i` trong O(1), hãy ghi đè nó bằng phần tử cuối rồi `pop`.

```js
function removeUnordered(arr, i) {
  arr[i] = arr[arr.length - 1]; // move last element into the hole
  arr.pop();                    // O(1)
}

const bag = [10, 20, 30, 40];
removeUnordered(bag, 1); // bag is now [10, 40, 30]
```

---

## 7. Big O của các method mảng thường dùng

| Method | Thời gian | Bộ nhớ phụ | Ghi chú |
|---|---|---|---|
| `arr[i]`, `arr.at(i)`, `arr.length` | O(1) | O(1) | |
| `push` / `pop` | O(1) | O(1) | `push` là amortized |
| `shift` / `unshift` | O(n) | O(1) | đánh số lại toàn bộ |
| `concat` | O(n + m) | O(n + m) | chép cả hai mảng |
| `slice(start, end)` | O(k) | O(k) | k = độ dài bản sao; `slice()` chép cả n |
| `[...arr]`, `Array.from` | O(n) | O(n) | một bản sao đầy đủ |
| `splice` | O(n) | O(k) | k = số phần tử bị xoá được trả về |
| `indexOf` / `includes` / `find` / `some` / `every` | O(n) | O(1) | quét tuyến tính, có thể dừng sớm |
| `forEach` / `map` / `filter` / `reduce` | O(n) | O(1) / O(n) / O(n) / O(1)* | *cộng thêm những gì callback tạo ra |
| `reverse` | O(n) | O(1) | đảo tại chỗ (in place) |
| `join` | O(tổng độ dài) | O(tổng độ dài) | |
| `sort` | O(n log n) | O(n) | V8 dùng TimSort, ổn định (stable) từ ES2019 |

Có hai cái bẫy ẩn trong bảng này:

1. **Callback cũng tính.** `map` chỉ là O(n) nếu callback là O(1). Một callback gọi `includes` trên mảng khác kích thước m sẽ biến nó thành O(n · m).
2. **Nối chuỗi method (chaining) tốn thêm bộ nhớ, không nhân thời gian.** `arr.filter(f).map(g).reduce(h)` là ba lượt O(n) — O(3n) = O(n) thời gian — nhưng tạo ra hai mảng trung gian.

```js
// O(n · m): includes scans `banned` for every user
const allowed = users.filter((u) => !banned.includes(u.id));

// O(n + m): build a Set once, then O(1) checks
const bannedSet = new Set(banned);
const allowedFast = users.filter((u) => !bannedSet.has(u.id));
```

---

## 8. Array hay object: chọn cho đúng

| Nhu cầu | Chọn | Vì |
|---|---|---|
| Giữ phần tử theo thứ tự | Array | Object không mô hình hoá thứ tự |
| Lấy "phần tử thứ 5" | Array | O(1) theo index |
| Tra theo id/tên | Object / Map | O(1) theo key thay vì O(n) tìm trong mảng |
| Thêm/xoá ở đầu thường xuyên | Không cái nào (khi n lớn) | Array tốn O(n) ở đó; hãy dùng queue đúng nghĩa |
| Kiểm tra "đã gặp X chưa?" | Set | Kiểm tra thành viên O(1) |

Một tối ưu rất hay gặp là **biến mảng thành bảng tra** (lookup table) một lần, rồi trả lời nhiều truy vấn trong O(1):

```js
const users = [
  { id: 7, name: "Ana" },
  { id: 3, name: "Bao" },
];

// O(n) per call -> O(n · q) for q queries
const findUserSlow = (id) => users.find((u) => u.id === id);

// O(n) once to build, then O(1) per query -> O(n + q)
const usersById = {};

for (const u of users) {
  usersById[u.id] = u;
}

const findUserFast = (id) => usersById[id];
```

Bạn đổi O(n) bộ nhớ phụ lấy một khoản lợi lớn về thời gian — đúng tinh thần đánh đổi thời gian/không gian.

---

## 9. Map: cuốn từ điển tốt hơn

`Map` (ES2015) là một collection key-value chuyên dụng. Các thao tác có cùng chi phí trung bình như object, nhưng nó sửa được nhiều điểm kỳ quặc của object:

```js
const visits = new Map();

visits.set("/home", 1);                             // O(1)
visits.set("/home", visits.get("/home") + 1);       // O(1)
visits.has("/about");                               // O(1) -> false
visits.delete("/home");                             // O(1)
visits.size;                                        // O(1)
```

| | Object | Map |
|---|---|---|
| Kiểu key | string và symbol (số bị đổi thành string) | **mọi** giá trị: object, function, number |
| Thứ tự | key số nguyên trước, rồi theo thứ tự thêm | luôn theo thứ tự thêm vào |
| Đếm số phần tử | `Object.keys(obj).length` — O(n) | `map.size` — O(1) |
| Key "vô tình" có sẵn | kế thừa từ `Object.prototype` | không có |
| Duyệt | `Object.entries` (tạo mảng) | `for (const [k, v] of map)` trực tiếp |
| Thêm/xoá liên tục | có thể rơi vào chế độ chậm hơn | được thiết kế cho việc này |
| JSON | hỗ trợ sẵn | phải chuyển đổi |

```js
const scores = new Map();
const alice = { name: "Alice" };

scores.set(alice, 95);   // object as key: works
scores.get(alice);       // 95

const plain = {};
plain[alice] = 95;       // key becomes the string "[object Object]"
```

Quy tắc kinh nghiệm: dùng object thường cho bản ghi có cấu trúc cố định và JSON; dùng `Map` cho từ điển động mà key được thêm, xoá lúc chạy.

---

## 10. Set: tập giá trị không trùng lặp

`Set` lưu mỗi giá trị tối đa một lần, với `add`, `has`, `delete` đều O(1) trung bình:

```js
const seen = new Set([3, 1, 3, 2]); // O(n) to build -> Set {3, 1, 2}

seen.add(4);     // O(1)
seen.has(1);     // O(1) -> true (array includes would be O(n))
seen.delete(3);  // O(1)
seen.size;       // O(1) -> 3

const unique = [...new Set([1, 2, 2, 3, 3])]; // O(n) dedupe -> [1, 2, 3]
```

Tự viết phép toán tập hợp, với a và b là kích thước hai set:

```js
function intersection(a, b) {
  const result = new Set();

  for (const x of a) {
    if (b.has(x)) result.add(x);
  }

  return result;
}
// O(a) time (each b.has is O(1)), O(min(a, b)) extra space
```

Các runtime hiện đại (ví dụ Node 22+) còn có sẵn `a.union(b)`, `a.intersection(b)` và `a.difference(b)`.

Bẫy về so sánh bằng: `Set` so sánh theo **SameValueZero** — `NaN` bằng `NaN`, nhưng object và array được so sánh **theo tham chiếu** (reference):

```js
new Set([NaN, NaN]).size;        // 1
new Set([[1, 2], [1, 2]]).size;  // 2: two different array objects
```

So với array, `Set` cho kiểm tra thành viên và xoá theo giá trị trong O(1) thay vì O(n), nhưng không truy cập được theo vị trí và không chứa phần tử trùng.

---

## 11. String là bất biến

String trong JavaScript giống một **mảng ký tự chỉ đọc** (tính theo UTF-16 code unit). Bạn đọc được `s[i]` và `s.length` trong O(1), nhưng không bao giờ sửa được chuỗi tại chỗ — string là **bất biến** (immutable):

```js
const s = "cat";
s[0] = "b";     // silently ignored (TypeError in strict mode)
console.log(s); // "cat"

const t = "b" + s.slice(1); // a brand-new string "bat": O(n)
```

Mọi "chỉnh sửa" đều tạo ra chuỗi mới, nên gần như mọi method của string là O(n):

| Thao tác | Thời gian |
|---|---|
| `s[i]`, `s.charAt(i)`, `s.length` | O(1) |
| `slice`, `substring`, `toUpperCase`, `trim`, `split`, `replaceAll` | O(n) |
| `a === b` | O(n) trường hợp xấu nhất (so từng ký tự) |
| `s.includes(sub)` / `indexOf(sub)` | O(n) thường gặp, tới O(n · m) nếu tìm kiểu ngây thơ |
| `s + t` | O(n + m): chép sang chuỗi mới |

Cái bẫy là dựng chuỗi bằng `+=` trong vòng lặp. Trên lý thuyết mỗi bước chép lại toàn bộ phần đã dựng: 1 + 2 + … + n = O(n²).

```js
function buildSlow(n) {
  let out = "";

  for (let i = 0; i < n; i++) {
    out += "x";          // conceptually copies out each time
  }

  return out;
}

function buildFast(n) {
  const parts = [];

  for (let i = 0; i < n; i++) {
    parts.push("x");     // O(1) amortized
  }

  return parts.join(""); // one O(n) copy at the end
}
```

Các engine như V8 tối ưu `+=` bằng cấu trúc rope nên thực tế thường vẫn nhanh — nhưng trong phỏng vấn, và trong các ngôn ngữ như Java hay Python, cách gom từng phần rồi `join` mới là cách chắc chắn O(n).

---

## 12. "O(1)" là trung bình: lưu ý và các bẫy

Chi phí O(1) của object, `Map` và `Set` là chi phí **trung bình** của bảng băm. Nếu nhiều key va chạm (collision) vào cùng một bucket, một lần tra cứu sẽ tệ dần tới **O(n)** trong trường hợp xấu nhất (bảng băm có bài riêng ở phần sau). Trong code hằng ngày với engine tốt, cứ coi là O(1), nhưng khi phỏng vấn hãy nói rõ "trung bình".

Những bẫy khác nên biết:

- **Mảng thưa (sparse array).** `const a = []; a[1_000_000] = 1;` cho `a.length === 1000001` với toàn "lỗ hổng"; duyệt nó không phải là duyệt "một phần tử".
- **`delete arr[i]`** để lại một lỗ (ô `undefined`), không thu nhỏ mảng và không đánh số lại — hãy dùng `splice` hoặc mẹo đổi chỗ rồi pop.
- **`delete` trên object** trong đoạn code nóng có thể đẩy engine sang dạng biểu diễn từ điển (dictionary) chậm hơn; `Map` được thiết kế cho việc xoá thường xuyên.
- **Sort không phải tuyến tính.** Gọi `sort` trong vòng lặp cho O(k · n log n).
- **`unshift` trong vòng lặp.** Dựng kết quả bằng `unshift` k lần là O(k²); `push` rồi `reverse` (hoặc dùng `slice`) chỉ O(k).

---

## Điểm cần nhớ khi phỏng vấn

- Object, `Map` và `Set`: thêm, xoá, tra theo key là **O(1) trung bình**; tìm theo **giá trị** là O(n).
- `Object.keys/values/entries` là **O(n)** và cấp phát mảng mới; `map.size` là O(1).
- Array: truy cập theo index **O(1)**, tìm kiếm O(n); `push`/`pop` **O(1)**, `shift`/`unshift` **O(n)** vì mọi index đều thay đổi.
- `splice`, `slice`, `concat`, spread, `indexOf`, `includes`, `map`, `filter` là **O(n)**; `sort` là **O(n log n)**.
- Method đặt trong vòng lặp thì nhân lên: `filter` + `includes` là O(n · m) — dựng một `Set` để còn O(n + m).
- Ưu tiên `Map` cho từ điển động hoặc key không phải string, `Set` cho kiểm tra thành viên và loại trùng.
- String là **bất biến**: mỗi lần sửa tạo chuỗi mới O(n); hãy gom vào mảng rồi `join`.
- Nói "O(1) **trung bình**" cho tra cứu dựa trên băm — trường hợp xấu nhất là O(n).

## Tóm tắt

- JavaScript cho sẵn object, array, `Map`, `Set` và string; biết chi phí của chúng giúp tránh vô tình viết code O(n²).
- Object không có thứ tự và nhanh theo key; array có thứ tự, nhanh theo index và ở cuối mảng.
- Bất cứ thao tác nào làm dịch index (`shift`, `unshift`, `splice` gần đầu) đều O(n); đổi chỗ rồi pop xoá được trong O(1) khi không cần giữ thứ tự.
- `Map` là lựa chọn cho từ điển có key động; `Set` biến kiểm tra thành viên O(n) thành O(1).
- String không sửa tại chỗ được, nên nối chuỗi lặp lại sẽ sao chép; hãy gom các phần rồi `join` một lần.
