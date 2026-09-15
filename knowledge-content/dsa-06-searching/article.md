# Thuật toán tìm kiếm – Linear, Binary, Naive String Search & KMP

## 1. Thuật toán tìm kiếm là gì

Một **thuật toán tìm kiếm** (searching algorithm) trả lời câu hỏi "giá trị này có trong tập dữ liệu không, và nằm ở đâu?". Tìm user theo id, kiểm tra một từ có trong danh sách, tìm chuỗi con trong văn bản — ta hay coi đó là chuyện hiển nhiên vì JavaScript có sẵn các method:

| Method | Trả về | So sánh bằng |
|---|---|---|
| `arr.indexOf(x)` | index đầu tiên của `x`, hoặc `-1` | so sánh nghiêm ngặt `===` |
| `arr.includes(x)` | `true` / `false` | SameValueZero (như `===`, nhưng `NaN` bằng `NaN`) |
| `arr.find(fn)` | phần tử đầu tiên mà `fn` trả về truthy, hoặc `undefined` | callback của bạn |
| `arr.findIndex(fn)` | index của phần tử đó, hoặc `-1` | callback của bạn |

Cả bốn đều chỉ **duyệt mảng từ đầu** và dừng ở lần khớp đầu tiên. Chúng không biết gì về thứ tự dữ liệu, nên worst case là **O(n)** — kể cả khi mảng đã sắp xếp. Một điểm lạ: `[NaN].indexOf(NaN)` là `-1` (vì `NaN !== NaN`), còn `[NaN].includes(NaN)` là `true`.

Chọn thuật toán nào phụ thuộc vào điều bạn biết về dữ liệu: dữ liệu **chưa sắp xếp** buộc phải duyệt tuyến tính, dữ liệu **đã sắp xếp** cho phép dùng binary search, còn **chuỗi văn bản** có họ thuật toán riêng.

---

## 2. Tìm kiếm tuyến tính (linear search)

**Linear search** kiểm tra lần lượt từng phần tử cho đến khi gặp giá trị cần tìm hoặc hết mảng.

```js
function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }

  return -1;
}

linearSearch([5, 8, 1, 100, 12, 3, 12], 12); // 4 (first 12 wins)
```

```text
search for 12
[ 5,  8,  1, 100, 12,  3, 12 ]
  ^   ^   ^   ^    ^
  no  no  no  no   yes -> return 4
```

| Trường hợp | Khi nào | Thời gian |
|---|---|---|
| Tốt nhất (best) | phần tử cần tìm nằm đầu mảng | O(1) |
| Trung bình (average) | nằm đâu đó ở giữa (~n/2 lần kiểm tra) | O(n) |
| Xấu nhất (worst) | nằm cuối hoặc không có | O(n) |

Space là **O(1)**. Linear search không hề "tệ": với dữ liệu **chưa sắp xếp**, đó là cách tốt nhất cho một lần tìm, vì bất kỳ phần tử nào bạn bỏ qua cũng có thể là đáp án. Nó còn chạy được trên mọi thứ duyệt được (linked list, stream).

---

## 3. Tìm kiếm nhị phân (binary search): ý tưởng

Nếu mảng **đã sắp xếp**, hãy nhìn vào phần tử ở giữa:

- bằng giá trị cần tìm → xong;
- nhỏ hơn giá trị cần tìm → đáp án chỉ có thể nằm ở **nửa bên phải**;
- lớn hơn giá trị cần tìm → đáp án chỉ có thể nằm ở **nửa bên trái**.

Mỗi lần so sánh loại bỏ **một nửa** số ứng viên còn lại thay vì chỉ một phần tử — đó là **chia để trị** (divide and conquer) áp dụng vào tìm kiếm.

> Binary search đòi hỏi dữ liệu **đã sắp xếp** và **truy cập ngẫu nhiên** (random access — lấy phần tử theo index trong O(1)). Trên mảng chưa sắp xếp nó lặng lẽ trả về kết quả sai; trên linked list, chỉ riêng việc đi tới phần tử giữa đã tốn O(n).

Tìm `15`:

```text
[ 1, 3, 4, 6, 8, 9, 11, 12, 15, 16, 17, 18, 19 ]
  0  1  2  3  4  5   6   7   8   9  10  11  12

step 1: L=0  R=12 mid=6  arr[6]=11 < 15  -> L = 7
step 2: L=7  R=12 mid=9  arr[9]=16 > 15  -> R = 8
step 3: L=7  R=8  mid=7  arr[7]=12 < 15  -> L = 8
step 4: L=8  R=8  mid=8  arr[8]=15 = 15  -> return 8
```

Chỉ bốn lần so sánh, trong khi linear search cần chín lần.

---

## 4. Binary search dạng vòng lặp

Hai con trỏ (pointer) `left` và `right` giới hạn vùng mảng mà đáp án còn có thể nằm trong đó. **Bất biến** (invariant): **nếu giá trị tồn tại thì index của nó nằm trong `[left, right]`**.

```js
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      left = mid + 1;   // mid is too small: discard it and everything left of it
    } else {
      right = mid - 1;  // mid is too large: discard it and everything right of it
    }
  }

  return -1;            // empty range: left > right
}
```

Ba chi tiết khiến code đúng:

1. `right` bắt đầu ở `arr.length - 1`, index **hợp lệ** cuối cùng, vì khoảng tìm kiếm là khoảng **đóng** (inclusive).
2. Vòng lặp chạy khi `left <= right`: khoảng chỉ còn một phần tử (`left === right`) vẫn phải được kiểm tra.
3. Khoảng mới **loại bỏ** `mid` (`mid + 1` / `mid - 1`), nên nó co lại sau mỗi vòng và vòng lặp chắc chắn kết thúc.

Thời gian **O(log n)**, không gian **O(1)**.

---

## 5. Các lỗi lệch một đơn vị (off-by-one)

Binary search dễ giải thích nhưng rất dễ viết sai một cách tinh vi. Phần lớn lỗi đến từ việc trộn lẫn hai quy ước.

| Lỗi | Triệu chứng | Ví dụ |
|---|---|---|
| `while (left < right)` với khoảng đóng | ứng viên cuối cùng không bao giờ được kiểm tra | `binarySearch([7], 7)` → `-1` |
| `right = mid` với `left <= right` | lặp vô hạn khi `left === right` | `binarySearch([5], 3)` không bao giờ trả về |
| `left = mid` thay vì `mid + 1` | lặp vô hạn khi còn hai phần tử | `[1, 2]`, tìm `2`: `mid` mãi là `0` |
| mảng chưa sắp xếp | sai kết quả, không báo lỗi | `binarySearch([5, 1, 9, 3, 7], 3)` → `-1` |

```text
right = mid on [5], target 3
L=0 R=0 mid=0  arr[0]=5 > 3  -> R = mid = 0
L=0 R=0 mid=0  arr[0]=5 > 3  -> R = mid = 0   (nothing changed: loops forever)
```

Hai khuôn mẫu (template) nhất quán — chọn một và đừng bao giờ trộn:

| Template | `right` ban đầu | Điều kiện lặp | Bỏ nửa phải |
|---|---|---|---|
| Khoảng đóng `[left, right]` | `arr.length - 1` | `left <= right` | `right = mid - 1` |
| Nửa mở `[left, right)` | `arr.length` | `left < right` | `right = mid` |

Trong JavaScript, number chính xác đến 2⁵³ nên `(left + right) / 2` không bị tràn số (overflow); trong Java hay C++ nên viết `left + (right - left) / 2`. **Luôn test** mảng rỗng, mảng một và hai phần tử, giá trị nhỏ hơn / lớn hơn mọi phần tử, và giá trị ở vị trí đầu / cuối.

---

## 6. Binary search đệ quy và vì sao là O(log n)

```js
function binarySearchRecursive(arr, target, left = 0, right = arr.length - 1) {
  if (left > right) return -1;                       // base case: empty range

  const mid = Math.floor((left + right) / 2);

  if (arr[mid] === target) return mid;

  if (arr[mid] < target) {
    return binarySearchRecursive(arr, target, mid + 1, right);
  }

  return binarySearchRecursive(arr, target, left, mid - 1);
}
```

Hãy truyền **index**, đừng dùng `arr.slice(...)`: slice sao chép nửa mảng ở mỗi lời gọi (tổng cộng tốn thêm O(n)) và làm mất index gốc.

**Vì sao O(log n)?** Sau `k` bước còn tối đa `n / 2ᵏ` ứng viên, nên khoảng tìm kiếm rỗng sau khoảng `log₂ n` bước — chính xác là tối đa **⌊log₂ n⌋ + 1** lần so sánh.

| n | số lần so sánh tối đa |
|---|---|
| 16 | 5 |
| 1.000 | 10 |
| 1.000.000 | 20 |
| 1.000.000.000 | 30 |

Dữ liệu tăng gấp đôi chỉ thêm **một** bước. Cả hai phiên bản đều O(1) ở best case (đáp án nằm ngay ở `mid` đầu tiên) và O(log n) ở average lẫn worst case. Không gian là **O(1)** với bản vòng lặp, **O(log n)** với bản đệ quy (do call stack).

---

## 7. Biến thể: lần xuất hiện đầu tiên và vị trí chèn

Khi có phần tử trùng, binary search thường trả về **bất kỳ** vị trí khớp nào mà `mid` rơi vào trước: với `[2, 4, 4, 4, 7]` và `4` nó trả về `2`, không phải `1`. Cách sửa là **lower bound** — index đầu tiên có giá trị `>= target`. Gặp giá trị khớp thì đừng dừng; tiếp tục thu hẹp về bên trái.

```js
function lowerBound(arr, target) {
  let left = 0;
  let right = arr.length;           // half-open range [left, right)

  while (left < right) {
    const mid = Math.floor((left + right) / 2);

    if (arr[mid] < target) {
      left = mid + 1;
    } else {
      right = mid;                  // mid might be the answer, keep it
    }
  }

  return left;
}

lowerBound([2, 4, 4, 4, 7], 4);    // 1 -> first occurrence (check arr[1] === 4)
lowerBound([2, 4, 4, 4, 7], 5);    // 4 -> insertion point that keeps the array sorted
```

**Upper bound** (index đầu tiên có giá trị `> target`: đổi `<` thành `<=`) cho phép đếm số lần xuất hiện bằng `upperBound - lowerBound`. Tất cả đều O(log n) thời gian, O(1) không gian.

---

## 8. Tìm chuỗi ngây thơ (naive string search)

**Tìm kiếm chuỗi** (string searching) hỏi: một **mẫu** (pattern) dài `m` xuất hiện bao nhiêu lần (hoặc ở đâu) trong một **văn bản** (text) dài `n`. Cách **ngây thơ** (naive) thử mọi vị trí bắt đầu và so sánh từng ký tự, dừng ngay khi gặp ký tự không khớp.

```text
text:    w o w o m g z o m g        pattern: o m g
i=0      o                          'w' != 'o' at first char
i=1        o m                      'w' != 'm' at second char
i=3            o m g                match  -> count = 1
i=7                    o m g        match  -> count = 2
```

```js
function naiveSearch(text, pattern) {
  if (pattern.length === 0) return 0;

  let count = 0;

  for (let i = 0; i <= text.length - pattern.length; i++) {
    let j = 0;

    while (j < pattern.length && text[i + j] === pattern[j]) {
      j++;
    }

    if (j === pattern.length) count++;
  }

  return count;
}

naiveSearch('wowomgzomg', 'omg'); // 2
naiveSearch('aaaa', 'aa');        // 3 (overlapping matches count)
```

Có `n - m + 1` vị trí bắt đầu, mỗi vị trí tốn tối đa `m` phép so sánh: **O(n · m)** thời gian, **O(1)** không gian. Worst case này xảy ra thật: text `aaaaaaaaab` với pattern `aaab` gần như khớp ở mọi vị trí rồi mới hỏng.

---

## 9. Ý tưởng của KMP

Naive search lãng phí thông tin. Giả sử pattern là `lolol` và ta đã khớp được `lolo` trước khi gặp ký tự sai:

```text
text:    l o l o m ...
pattern: l o l o l
                 ^ mismatch ('m' != 'l')
```

Naive search dịch pattern đi một ô rồi đọc lại những ký tự text **đã đọc rồi**. Thuật toán **Knuth–Morris–Pratt (KMP)** (công bố năm 1977) tránh việc đó. Câu hỏi then chốt: **tiền tố thực sự (proper prefix) dài nhất của pattern mà đồng thời là hậu tố (suffix) của phần vừa khớp** là gì? (*Thực sự* nghĩa là không phải toàn bộ chuỗi.) Với `lolo`, đó là `lo`, dài 2:

```text
matched part:  l o l o
                   l o    <- suffix "lo"
               l o        <- prefix "lo"
```

Vậy pattern trượt lên để hai ký tự đầu của nó thẳng hàng với hai ký tự text vừa đọc, và việc so sánh tiếp tục **từ index 2 của pattern** — con trỏ trên text không bao giờ lùi lại. Các độ dài "lùi về" này chỉ phụ thuộc vào pattern, nên KMP **tính trước** chúng thành một bảng.

---

## 10. Bảng tiền tố (LPS)

**Bảng LPS** (longest proper prefix which is also a suffix; còn gọi là *prefix function* hay *failure function*) lưu, với mỗi index `i`, độ dài nói trên cho chuỗi `pattern[0..i]`.

```text
pattern:  l  o  l  o  l
lps:      0  0  1  2  3      "lolol": "lol" is both prefix and suffix

pattern:  a  b  a  c  a  b  a  b  d  a
lps:      0  0  1  0  1  2  3  2  0  1
```

```js
function buildLps(pattern) {
  const lps = new Array(pattern.length).fill(0);
  let len = 0;  // length of the current longest prefix-suffix
  let i = 1;    // lps[0] is always 0

  while (i < pattern.length) {
    if (pattern[i] === pattern[len]) {
      len++;              // extend the previous prefix-suffix
      lps[i] = len;
      i++;
    } else if (len > 0) {
      len = lps[len - 1]; // fall back to the next shorter candidate, keep i
    } else {
      lps[i] = 0;         // no prefix-suffix ends here
      i++;
    }
  }

  return lps;
}
```

Bước lùi trong `abacababda` từ index 7 (`len = 3` sau `aba`):

```text
i=7 'b' vs pattern[3]='c'  mismatch, len = lps[2] = 1
i=7 'b' vs pattern[1]='b'  match,    len = 2 -> lps[7] = 2
i=8 'd' vs pattern[2]='a'  mismatch, len = lps[1] = 0
i=8 'd' vs pattern[0]='a'  mismatch, len = 0 -> lps[8] = 0
i=9 'a' vs pattern[0]='a'  match,    len = 1 -> lps[9] = 1
```

Thời gian **O(m)**, không gian **O(m)**.

---

## 11. Tìm kiếm bằng KMP

Có bảng rồi, ta duyệt text đúng một lần. `j` là số ký tự của pattern đang khớp.

```js
function kmpSearch(text, pattern) {
  if (pattern.length === 0) return 0;

  const lps = buildLps(pattern);
  let count = 0;
  let j = 0;

  for (let i = 0; i < text.length; i++) {
    while (j > 0 && text[i] !== pattern[j]) {
      j = lps[j - 1];         // fall back inside the pattern, i stays put
    }

    if (text[i] === pattern[j]) j++;

    if (j === pattern.length) {
      count++;
      j = lps[j - 1];         // keep going: allows overlapping matches
    }
  }

  return count;
}

kmpSearch('lolomlolol', 'lolol'); // 1
kmpSearch('lololol', 'lolol');    // 2 (matches at 0 and 2 overlap)
```

```text
text lolomlolol, pattern lolol, lps = [0, 0, 1, 2, 3]
i=0..3  l o l o  match               j = 4
i=4     'm' vs pattern[4]='l'  miss  j = lps[3] = 2
        'm' vs pattern[2]='l'  miss  j = lps[1] = 0
        'm' vs pattern[0]='l'  miss  j = 0
i=5..9  l o l o l  match             j = 5 -> count = 1, j = lps[4] = 3
```

**Vì sao O(n + m)?** `i` chỉ tiến lên, đúng `n` lần. `j` tăng tối đa 1 cho mỗi ký tự, nên tổng cộng tăng không quá `n` lần, và mỗi lần lùi đều làm `j` giảm hẳn — vì vậy tổng số lần lùi cũng không quá `n`. Duyệt text là O(n), dựng bảng là O(m): **O(n + m)** thời gian, **O(m)** không gian, kể cả với những input khiến naive search thành bậc hai.

---

## 12. Chọn cách tìm kiếm nào

| Thuật toán | Yêu cầu | Thời gian | Không gian |
|---|---|---|---|
| Linear search | không | O(n) | O(1) |
| Binary search (vòng lặp) | đã sắp xếp, random access | O(log n) | O(1) |
| Binary search (đệ quy) | đã sắp xếp, random access | O(log n) | O(log n) |
| Naive string search | không | O(n · m) | O(1) |
| KMP | không | O(n + m) | O(m) |

- **Tìm một lần trong dữ liệu chưa sắp xếp** → linear search; riêng việc sắp xếp trước đã tốn O(n log n).
- **Tìm nhiều lần** → sắp xếp một lần rồi binary search: O(n log n + k log n) tốt hơn O(k · n) khi `k` lớn. Nếu chỉ cần kiểm tra có/không, `Set` cho O(1) trung bình.
- **Chuỗi** → trong code thật hãy dùng `text.includes(pattern)`; engine đã dùng thuật toán tối ưu sẵn. Tự viết KMP khi được yêu cầu hoặc khi cần đảm bảo worst case tuyến tính. Rabin–Karp và Boyer–Moore là các lựa chọn nổi tiếng khác.

---

## Điểm cần nhớ khi phỏng vấn

- `indexOf`, `includes`, `find`, `findIndex` đều là **duyệt tuyến tính, O(n)**, kể cả trên mảng đã sắp xếp; `includes` tìm được `NaN`, `indexOf` thì không.
- Linear search: best O(1), average và worst **O(n)**, space O(1) — công cụ đúng cho dữ liệu chưa sắp xếp.
- Binary search cần **dữ liệu đã sắp xếp và truy cập theo index O(1)**: **O(log n)** thời gian, O(1) space bản vòng lặp, O(log n) stack bản đệ quy.
- Chọn **một** template: khoảng đóng (`right = n - 1`, `left <= right`, `right = mid - 1`) hoặc nửa mở (`right = n`, `left < right`, `right = mid`). Trộn lẫn sẽ bỏ sót phần tử hoặc lặp vô hạn.
- Dùng **lower bound** cho lần xuất hiện đầu tiên, vị trí chèn và đếm phần tử trùng.
- Naive string search là **O(n · m)**; KMP là **O(n + m)** thời gian, **O(m)** không gian nhờ **bảng LPS**, và không bao giờ lùi con trỏ trên text.

## Tóm tắt

- Chọn thuật toán tìm kiếm theo dữ liệu: chưa sắp xếp, đã sắp xếp, hay là chuỗi.
- Linear search kiểm tra từng phần tử: O(n).
- Binary search chia đôi số ứng viên sau mỗi bước: O(log n), nhưng chỉ trên dữ liệu đã sắp xếp và truy cập được theo index.
- Lỗi off-by-one đến từ việc giới hạn không nhất quán; giữ bất biến và điều kiện lặp khớp nhau.
- Naive string search thử pattern ở mọi vị trí: O(n · m).
- KMP tính trước độ dài prefix-suffix rồi duyệt text một lần: O(n + m).
