# Hash Table – Hàm băm, xung đột & load factor

## 1. Hash table là gì

**Bảng băm** (hash table, hash map) lưu các **cặp key-value**. Giống array, bên dưới nó là một dãy ô nhớ liên tiếp, nhưng bạn tra cứu giá trị bằng một **key** có ý nghĩa thay vì chỉ số, và các key không có thứ tự.

Điểm mạnh của nó là tốc độ: trung bình, **thêm, tra cứu và xoá đều là O(1)** — điều mà cả array (tìm kiếm O(n)) lẫn linked list (truy cập O(n)) đều không làm được.

Ngôn ngữ phổ biến nào cũng có sẵn: JavaScript có `Map`/`Set` (và object thường, kèm một số hạn chế), Python có `dict`, Java có `HashMap`, Go có `map`, Ruby có `Hash`.

Ví dụ mở đầu — lưu màu sắc. Dùng array được, nhưng khó đọc:

```js
const colorsArr = ["#ff69b4", "#ff4500", "#00ffff"];
colorsArr[2]; // which colour is this?

const colors = { pink: "#ff69b4", orangered: "#ff4500", cyan: "#00ffff" };
colors["cyan"]; // "#00ffff" — much clearer
```

Câu hỏi của bài này: nếu các hash table có sẵn biến mất, **ta sẽ tự xây một cái như thế nào?** Máy tính chỉ biết nhảy tới `slots[3]`, chứ không biết nhảy tới `slots["cyan"]`.

---

## 2. Hàm băm: từ key thành index

Mẹo ở đây là vẫn dùng một **array** bình thường, và thêm một hàm biến bất kỳ key nào thành một index hợp lệ của array. Hàm đó gọi là **hàm băm** (hash function).

```text
key "pink"      --hash-->  0
key "cyan"      --hash-->  3
key "orangered" --hash-->  7

index:   0              1   2   3              4   5   6   7                   8   9
       ["pink","#ff69b4"]      ["cyan","#00ffff"]         ["orangered","#ff4500"]
```

Mọi thao tác đều theo cùng một công thức:

1. Cho key đi qua hàm băm để lấy index — O(1) nếu hàm băm là O(1).
2. Nhảy thẳng tới ô đó của array — truy cập ngẫu nhiên O(1).
3. Đọc, ghi hoặc xoá cặp dữ liệu nằm ở đó.

Ta lưu **cả key lẫn value** trong ô, vì (như sẽ thấy) nhiều key có thể rơi vào cùng một index và ta cần phân biệt chúng.

---

## 3. Thế nào là một hàm băm tốt

Ở đây ta nói về hàm băm cho cấu trúc dữ liệu, **không phải hàm băm mật mã** (SHA-256 cố tình chạy chậm và có những mục tiêu như chống tìm ngược mà ta không cần). Một hàm băm tốt cho hash table phải:

1. **Nhanh** — lý tưởng là thời gian hằng số. Hàm băm chạy trong mọi thao tác.
2. **Phân bố đều** (uniform) — rải key đều ra mọi index thay vì dồn cục vào vài chỗ.
3. **Tất định** (deterministic) — cùng một key luôn cho ra cùng một index.

Một phản ví dụ cho mỗi tính chất:

```js
// Not fast: burns 10,000 iterations on every call
function slowHash(key) {
  for (let i = 0; i < 10000; i++) {
    console.log("everyday I'm hashing");
  }

  return key.charCodeAt(0);
}

// Not uniform: every key collides at index 0 -> the table becomes a list
function sameHashedValue(key) {
  return 0;
}

// Not deterministic: set("pink") and get("pink") look in different slots
function randomHash(key) {
  return Math.floor(Math.random() * 1000);
}
```

Tính tất định là bắt buộc: hàm băm ngẫu nhiên không phải là chậm, mà là **hỏng** — bạn sẽ không bao giờ tìm lại được giá trị đã lưu.

---

## 4. Hàm băm chuỗi đầu tiên

Một hàm băm đơn giản cho chuỗi chữ thường: gán `"a"` là 1, `"b"` là 2, v.v., cộng các chữ lại và dùng `%` để giữ tổng nằm trong phạm vi array.

```js
function hash(key, arrayLen) {
  let total = 0;

  for (const char of key) {
    const value = char.charCodeAt(0) - 96; // "a" is 97 -> 1
    total = (total + value) % arrayLen;
  }

  return total;
}

hash("pink", 10);      // 0
hash("orangered", 10); // 7
hash("cyan", 10);      // 3
```

Trace của `hash("pink", 10)`:

```text
char  value  total = (total + value) % 10
 p     16         (0 + 16) % 10 = 6
 i      9         (6 +  9) % 10 = 5
 n     14         (5 + 14) % 10 = 9
 k     11         (9 + 11) % 10 = 0   -> index 0
```

Phép modulo đảm bảo index luôn hợp lệ: với `x` không âm, `x % len` luôn nằm trong khoảng `0` đến `len - 1`.

Hàm này chạy được, nhưng có ba vấn đề:

- **Chỉ băm được chuỗi** (chấp nhận được khi học; hash table thật băm cả số, object…).
- **Không phải thời gian hằng số** — nó là O(k) theo độ dài key `k`.
- **Phân bố kém** — phép cộng bỏ qua thứ tự chữ cái, nên mọi **anagram (từ đảo chữ) đều xung đột**: `"listen"` và `"silent"` cùng ra 9. Còn `"darkblue"`, `"salmon"` và `"tomato"` đều rơi vào 4.

---

## 5. Cải tiến hàm băm: số nguyên tố và giới hạn độ dài

```js
function hash(key, arrayLen) {
  let total = 0;
  const WEIRD_PRIME = 31;

  for (let i = 0; i < Math.min(key.length, 100); i++) {
    const value = key.charCodeAt(i) - 96;
    total = (total * WEIRD_PRIME + value) % arrayLen;
  }

  return total;
}
```

Hai thay đổi:

- **`Math.min(key.length, 100)`** giới hạn khối lượng công việc, nên hàm băm gần như O(1) (đổi lại là nhiều xung đột hơn với các key có chung một tiền tố dài).
- **`total * 31 + value`** làm cho vị trí chữ cái có ý nghĩa — đây là một đa thức `c₀·31ᵏ⁻¹ + c₁·31ᵏ⁻² + …`, nên `"ab"` và `"ba"` giờ đã khác nhau. `String.hashCode` của Java cũng dùng hệ số này.

**Vì sao lại là số nguyên tố?** Một hệ số nhân nguyên tố và một **độ dài bảng nguyên tố** không có ước chung, nên phép nhân thực sự trộn đều key ra mọi ô. Một ví dụ thất bại cụ thể: với `arrayLen = 10`, `31 % 10 === 1`, nên nhân 31 chẳng thay đổi gì theo modulo 10 và `"listen"`/`"silent"` vẫn xung đột. Với độ dài nguyên tố 13, chúng rơi vào 6 và 12. Đó là lý do class bên dưới mặc định kích thước **53**.

**Cạm bẫy:** `charCodeAt(i) - 96` ra số âm với chữ hoa và chữ số (`"A"` cho -31), và `%` trong JavaScript giữ nguyên dấu (`-5 % 53 === -5`) — bạn nhận được một **index âm**. Class bên dưới dùng mã ký tự gốc để tránh lỗi này.

---

## 6. Xung đột là không thể tránh

**Xung đột** (collision) xảy ra khi hai key khác nhau cho ra cùng một index. Không thể tránh được chúng:

- **Nguyên lý chuồng bồ câu** (pigeonhole) — có vô số chuỗi key khả dĩ nhưng chỉ có `m` ô, nên chắc chắn có key phải ở chung.
- **Nghịch lý ngày sinh** (birthday paradox) — chỉ cần 23 người là xác suất có hai người trùng ngày sinh đã vượt 50%, dù có 365 ngày. Trong bảng 1.000 ô, xung đột đã có khả năng xảy ra chỉ sau khoảng 40 key.

Vì vậy một hash table thực chất là **hàm băm cộng với một chiến lược xử lý xung đột**. Hai chiến lược kinh điển là **separate chaining** (nối chuỗi riêng) và **open addressing** (địa chỉ mở), mà dạng đơn giản nhất là **linear probing** (dò tuyến tính).

---

## 7. Separate chaining

Với **separate chaining**, mỗi ô của array chứa một tập hợp nhỏ — array hoặc linked list — gồm mọi cặp đã băm vào ô đó (gọi là "bucket").

```text
hash("darkblue") = 4, hash("salmon") = 4   (table length 10)

index:  0     1     2     3     4                         5 ...
       [ ]   [ ]   [ ]   [ ]   [ ["darkblue","#00008b"],  [ ]
                                 ["salmon",  "#fa8072"] ]
```

- **set**: băm key, rồi duyệt bucket. Nếu key đã tồn tại thì cập nhật value; nếu chưa thì push cặp mới.
- **get**: băm key, rồi duyệt bucket so sánh từng key.
- **delete**: băm key, rồi xoá cặp khớp ra khỏi bucket.

Chi phí mỗi thao tác = O(1) để băm + O(độ dài bucket) để duyệt. Với hàm băm tốt và độ dài bucket ≈ `n / m`, trung bình là O(1). Chaining xuống cấp một cách "êm": bảng vẫn hoạt động khi **số key nhiều hơn số ô**, chỉ chậm đi.

---

## 8. Linear probing

**Linear probing** chỉ lưu đúng **một cặp mỗi ô**. Khi xung đột, nó đi tiếp về phía trước (`index + 1`, quay vòng về đầu) cho đến khi gặp ô trống.

```text
insert darkblue (hash 4) -> slot 4 free            -> store at 4
insert salmon   (hash 4) -> 4 taken                -> store at 5
insert tomato   (hash 4) -> 4 taken, 5 taken       -> store at 6

index:  3     4                       5                     6                     7
       [ ]   ["darkblue","#00008b"]  ["salmon","#fa8072"]  ["tomato","#ff6347"]  [ ]
```

`get("tomato")` dò qua 4, 5, 6 và dừng khi thấy key — hoặc khi gặp **ô trống**, điều chứng minh key không tồn tại.

So sánh với chaining:

| | Separate chaining | Linear probing |
|---|---|---|
| Số cặp mỗi ô | Nhiều (bucket) | Một |
| Vượt quá kích thước bảng? | Được | Không — phải resize trước khi đầy |
| Cache locality | Kém hơn (con trỏ) | Tốt hơn (các ô liền kề) |
| Điểm yếu chính | Chuỗi dài | **Primary clustering**: các dải ô đầy dài dần và làm chậm mọi lần dò |
| Xoá | Chỉ cần gỡ khỏi bucket | Cần một dấu **tombstone** (bia mộ) |

Vì sao cần tombstone: nếu bạn đơn giản làm trống ô 5 (salmon), lần `get("tomato")` sau đó sẽ dừng ở ô trống 5 và báo sai là "không tìm thấy". Tombstone nghĩa là "đã xoá, cứ dò tiếp".

---

## 9. Xây class HashTable: set và get

Ta cài đặt separate chaining, dùng array làm bucket.

```js
class HashTable {
  constructor(size = 53) {
    this.keyMap = new Array(size);
  }

  _hash(key) {
    let total = 0;
    const WEIRD_PRIME = 31;

    for (let i = 0; i < Math.min(key.length, 100); i++) {
      total = (total * WEIRD_PRIME + key.charCodeAt(i)) % this.keyMap.length;
    }

    return total;
  }

  set(key, value) {
    const index = this._hash(key);

    if (!this.keyMap[index]) {
      this.keyMap[index] = [];
    }

    const bucket = this.keyMap[index];

    for (const pair of bucket) {
      if (pair[0] === key) {
        pair[1] = value; // key exists: update, don't duplicate

        return;
      }
    }

    bucket.push([key, value]);
  }

  get(key) {
    const bucket = this.keyMap[this._hash(key)];

    if (!bucket) return undefined;

    for (const [k, v] of bucket) {
      if (k === key) return v;
    }

    return undefined;
  }
}

const ht = new HashTable(17);
ht.set("maroon", "#800000");
ht.set("yellow", "#FFFF00");
ht.set("yellow", "#FFFF01");
ht.get("yellow"); // "#FFFF01"
ht.get("purple"); // undefined
```

Cả hai method đều O(1) trung bình (băm + duyệt một bucket ngắn) và O(n) trong trường hợp xấu nhất khi mọi key rơi vào cùng một bucket. Bộ nhớ của cả bảng là O(n + m) với `n` cặp và `m` ô.

---

## 10. keys và values

Để liệt kê key hoặc value, ta phải đi qua **mọi ô** của array bên dưới, kể cả các ô trống.

```js
// inside class HashTable
keys() {
  const result = [];

  for (const bucket of this.keyMap) {
    if (!bucket) continue;

    for (const [k] of bucket) {
      result.push(k);
    }
  }

  return result;
}

values() {
  const result = [];

  for (const bucket of this.keyMap) {
    if (!bucket) continue;

    for (const [, v] of bucket) {
      result.push(v);
    }
  }

  return result;
}
```

- Thời gian: **O(n + m)** — `m` ô cộng `n` cặp. Không phải O(1), và một bảng khổng lồ mà hầu hết trống vẫn tốn O(m).
- Vì `set` cập nhật key đã có, `keys()` không bao giờ trả về key trùng. **Value thì có thể trùng một cách hợp lệ** (hai màu cùng mã hex); nếu cần value duy nhất, hãy khử trùng bằng `Set` trong O(n) thay vì dùng `includes` tốn O(n²).
- Thứ tự đi theo vị trí ô, tức là trông **ngẫu nhiên** — hash table thuần không có thứ tự nào có ý nghĩa.

---

## 11. Big O của hash table

| Thao tác | Trung bình | Xấu nhất |
|---|---|---|
| Thêm (`set`) | O(1) | O(n) |
| Truy cập (`get`) | O(1) | O(n) |
| Xoá | O(1) | O(n) |
| Tìm theo **value** | O(n) | O(n) |
| `keys()` / `values()` | O(n + m) | O(n + m) |
| Bộ nhớ | O(n) | O(n) |

**Trường hợp trung bình giả định hàm băm tốt và load factor bị chặn**. Trường hợp xấu nhất là hàm băm tệ nhất thế giới — mọi key dồn vào một ô:

```text
good hash                          terrible hash
0: [a]   1: [b]   2: [c]           0: [a, b, c, d, e, f, ...]   <- a list
3: [d]   4: [e]   5: [f]           1: [ ]  2: [ ]  3: [ ]
=> O(1) per lookup                 => O(n) per lookup
```

Trường hợp xấu nhất còn xảy ra qua các cuộc tấn công **hash flooding** (các key được chế tạo để xung đột), vì thế các runtime dùng hàm băm có seed ngẫu nhiên.

Cũng lưu ý rằng băm một key dài `k` tốn O(k); nói "O(1)" là đang coi kích thước key là hằng số.

---

## 12. Load factor và resize

**Load factor** (hệ số tải) là `α = n / m` — số cặp đã lưu chia cho số ô.

- Với chaining, độ dài bucket kỳ vọng là α, nên tra cứu tốn O(1 + α).
- Với linear probing, α phải luôn nhỏ hơn 1, và hiệu năng sụp đổ khi α tiến gần 1. Ngưỡng thường gặp: ~0,75 với chaining (`HashMap` của Java), ~0,5–0,7 với probing.

Khi α vượt ngưỡng, bảng **resize**: cấp phát array lớn gấp khoảng đôi (lý tưởng là số nguyên tố), rồi **băm lại (rehash) mọi cặp**, vì mỗi index phụ thuộc vào `% this.keyMap.length`.

```js
// inside class HashTable (assumes set() tracks this.count)
_resize() {
  const oldMap = this.keyMap;
  this.keyMap = new Array(oldMap.length * 2 + 1);
  this.count = 0;

  for (const bucket of oldMap) {
    if (!bucket) continue;

    for (const [k, v] of bucket) {
      this.set(k, v); // new length -> new index
    }
  }
}
```

```text
m = 5, n = 4  (alpha = 0.8 > 0.75)  -> resize to m = 11, n = 4 (alpha ~ 0.36)
```

Một lần resize tốn O(n), nhưng vì kích thước tăng gấp đôi nên các lần resize thưa dần theo cấp số nhân. Tính trung bình trên nhiều lần thêm, `set` vẫn là **amortized O(1)** (O(1) khấu hao) — cùng lập luận với `push` của dynamic array.

---

## 13. Hash table trong thực tế (JavaScript)

| Nhu cầu | Dùng |
|---|---|
| Key → value, key thuộc mọi kiểu, thêm/xoá thường xuyên | `Map` |
| Kiểm tra tồn tại / khử trùng lặp | `Set` |
| Bản ghi có cấu trúc cố định, JSON | object thường |
| Thứ tự sắp xếp, min/max, truy vấn khoảng ("mọi key từ 10 đến 20") | balanced BST hoặc array đã sắp xếp, **không phải** hash table |

Vì sao nên dùng `Map` thay object làm từ điển: key của object bị ép thành chuỗi (`obj[1]` và `obj["1"]` là cùng một key), các key kế thừa như `"constructor"` có thể gây bất ngờ, và `map.size` là O(1) còn `Object.keys(obj).length` là O(n). `Map` và `Set` duyệt theo **thứ tự chèn**, một đảm bảo của đặc tả ngôn ngữ được xây trên nền phép băm.

Các ứng dụng phỏng vấn điển hình: đếm và phát hiện trùng lặp (pattern frequency counter), gom nhóm anagram, Two Sum (lưu `value → index`, tra `target - x` trong O(1), biến O(n²) thành O(n)), memoization, và phần tra cứu của LRU cache.

---

## Điểm cần nhớ khi phỏng vấn

- Hash table = **array + hàm băm + chiến lược xử lý xung đột**; thêm, get và xoá trung bình O(1).
- Hàm băm tốt phải **nhanh, phân bố đều, tất định**; hàm băm ngẫu nhiên là hỏng, hàm băm trả hằng số biến bảng thành list.
- Hệ số nhân và kích thước bảng là **số nguyên tố** giúp rải key tốt hơn; ví dụ hệ số 31 với kích thước 10 vô dụng vì `31 % 10 === 1`.
- Xung đột là không tránh được (chuồng bồ câu, nghịch lý ngày sinh). **Separate chaining** giữ một bucket mỗi ô; **linear probing** dò tới ô trống kế tiếp, bị clustering và cần tombstone.
- Trường hợp xấu nhất là **O(n)** khi các key xung đột; tìm theo value luôn O(n); `keys()`/`values()` là O(n + m).
- **Load factor α = n/m**; vượt ngưỡng thì tăng gấp đôi kích thước và **rehash mọi key** — thêm phần tử amortized O(1).
- Không có thứ tự: cần dữ liệu sắp xếp hay truy vấn khoảng → dùng BST, không dùng hash table.
- Trong JS, ưu tiên `Map`/`Set` thay cho object thường khi cần từ điển.

## Tóm tắt

- Hash table lưu cặp key-value trong một array, dùng hàm băm để biến key thành index.
- Hàm băm tốt chạy nhanh, rải key đều và luôn trả cùng index cho cùng key.
- Cộng mã ký tự làm anagram xung đột; nhân với số nguyên tố và dùng độ dài bảng nguyên tố khắc phục phần lớn vấn đề.
- Xung đột được xử lý bằng separate chaining (bucket) hoặc linear probing (ô trống kế tiếp).
- `set`/`get` là O(1) trung bình và O(n) xấu nhất; liệt kê key hoặc value phải đi qua cả array.
- Giữ load factor thấp bằng resize và rehash là điều giúp các thao tác giữ được O(1) trong thực tế.
