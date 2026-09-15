# Sắp xếp cơ bản – Bubble, Selection & Insertion Sort

## 1. Sắp xếp là gì và vì sao học các thuật toán đơn giản

**Sắp xếp** (sorting) là sắp đặt lại các phần tử của một tập hợp theo một thứ tự nào đó: số từ nhỏ đến lớn, tên theo bảng chữ cái, phim theo năm phát hành hoặc theo doanh thu.

Sắp xếp xuất hiện ở khắp nơi, và thường là bước đầu tiên của một thuật toán khác: binary search, two pointers hay tìm phần tử trùng lặp đều dễ hơn nhiều trên dữ liệu đã sắp xếp. Vậy tại sao phải học các thuật toán O(n²) chậm chạp khi ngôn ngữ nào cũng có sẵn hàm sort nhanh?

- Đây là **cách đơn giản nhất để hiểu sắp xếp hoạt động ra sao**: so sánh, hoán đổi (swap), và duy trì một vùng đã sắp xếp lớn dần.
- Chúng giới thiệu bộ từ vựng dùng cho mọi thuật toán sắp xếp: **in-place**, **ổn định** (stable), **thích nghi** (adaptive), **online**.
- Một trong số chúng, **insertion sort**, thực sự được dùng trong production — bên trong các thuật toán lai (hybrid), cho mảng nhỏ hoặc gần như đã sắp xếp.
- Người phỏng vấn hay yêu cầu bạn viết lại, trace từng bước và giải thích best case / worst case của chúng.

Cả ba thuật toán trong bài đều là **comparison sort** (sắp xếp dựa trên so sánh): thông tin duy nhất chúng biết về dữ liệu là câu trả lời cho câu hỏi "`a` có lớn hơn `b` không?".

---

## 2. Hàm sort có sẵn và bất ngờ mặc định

Mảng JavaScript có `Array.prototype.sort`. Với chuỗi, nó chạy đúng như mong đợi:

```js
["Steele", "Colt", "Data Structures", "Algorithms"].sort();
// ["Algorithms", "Colt", "Data Structures", "Steele"]
```

Nhưng với số thì trông như bị lỗi:

```js
[6, 4, 15, 10].sort();
// [10, 15, 4, 6]
```

Khi không có comparator, `sort` **chuyển mọi phần tử thành chuỗi** rồi so sánh theo mã UTF-16. `"10"` đứng trước `"4"` vì ký tự `"1"` đứng trước `"4"`, giống hệt "apple" đứng trước "banana". Một vài điểm lạ khác của hành vi mặc định:

- Chữ hoa đứng trước chữ thường: `["b", "A", "a"].sort()` cho `["A", "a", "b"]`.
- Các giá trị `undefined` bị đẩy xuống cuối mà không hề được so sánh.
- `sort` **sửa trực tiếp mảng gốc** (mutate) và trả về chính mảng đó, không phải bản sao. Hãy dùng `toSorted()` (ES2023) hoặc `[...arr].sort()` khi cần giữ nguyên mảng ban đầu.

Trong V8 (Chrome, Node.js), sort có sẵn là **TimSort**: worst case O(n log n), O(n) với input đã sắp xếp, tốn O(n) bộ nhớ phụ. Từ ES2019, đặc tả bắt buộc hàm sort phải **ổn định** (stable).

---

## 3. Hàm so sánh (comparator)

Để tự quyết định thứ tự, truyền vào một **comparator** `(a, b) => number`. Hàm sort gọi nó trên từng cặp phần tử và chỉ đọc **dấu** của kết quả:

| Comparator trả về | Ý nghĩa |
|---|---|
| số âm | `a` đứng **trước** `b` |
| số dương | `a` đứng **sau** `b` |
| `0` | `a` và `b` bằng nhau khi xét thứ tự (sort ổn định giữ nguyên thứ tự ban đầu của chúng) |

```js
const ascending = (a, b) => a - b;
const descending = (a, b) => b - a;
const byLength = (s1, s2) => s1.length - s2.length;

[6, 4, 15, 10].sort(ascending); // [4, 6, 10, 15]

["Steele", "Colt", "Data Structures", "Algorithms"].sort(byLength);
// ["Colt", "Steele", "Algorithms", "Data Structures"]

// Several keys: by age, then by name
const people = [
  { name: "Mai", age: 30 },
  { name: "An", age: 25 },
  { name: "Binh", age: 30 },
];

people.sort((p, q) => p.age - q.age || p.name.localeCompare(q.name));
// An (25), Binh (30), Mai (30)
```

Những lỗi comparator hay gặp:

- **Trả về boolean**: `(a, b) => a > b` trả về `true` (1) hoặc `false` (0) và **không bao giờ trả về số âm**, nên hàm sort không phân biệt được "đứng trước" với "bằng nhau". Nó có thể trông như chạy đúng trên mảng nhỏ nhưng sai trên mảng khác hoặc trên engine khác.
- **Trừ hai chuỗi**: `"b" - "a"` là `NaN`. Với văn bản hãy dùng `a.localeCompare(b)`.
- **Trừ hai giá trị vô cực**: `Infinity - Infinity` cũng là `NaN`. Nếu dữ liệu có thể chứa các giá trị đó, hãy so sánh tường minh bằng `<` và `>`.
- **Kết quả không nhất quán**: comparator phải luôn cho cùng một đáp án với cùng một cặp; comparator ngẫu nhiên không phải là cách xáo trộn (shuffle) đúng.

---

## 4. Hàm swap

Bubble sort và selection sort di chuyển phần tử bằng cách **hoán đổi** (swap) hai vị trí. Hãy viết hàm hỗ trợ một lần:

```js
// Classic version with a temporary variable
function swap(arr, i, j) {
  const temp = arr[i];
  arr[i] = arr[j];
  arr[j] = temp;
}

// ES2015 destructuring version
const swapES6 = (arr, i, j) => {
  [arr[i], arr[j]] = [arr[j], arr[i]];
};
```

Cả hai đều O(1) thời gian và O(1) bộ nhớ. Bản dùng biến tạm không phải cấp phát một mảng tạm nhỏ, điều này có thể đáng kể trong vòng lặp chạy rất nhiều lần, nhưng cả hai đều đúng. Các thuật toán bên dưới dùng lại hàm `swap`.

---

## 5. Bubble sort: ý tưởng

**Bubble sort** (sắp xếp nổi bọt) duyệt mảng, so sánh **từng cặp phần tử kề nhau** và hoán đổi cặp nào sai thứ tự. Sau một lượt (pass) đầy đủ, **giá trị lớn nhất "nổi" lên cuối mảng** và nằm đúng vị trí cuối cùng của nó. Mỗi lượt tiếp theo có thể dừng sớm hơn một vị trí.

Lượt 1 trên `[5, 3, 4, 1, 2]`:

```text
[5, 3, 4, 1, 2]   compare 5,3 -> swap
[3, 5, 4, 1, 2]   compare 5,4 -> swap
[3, 4, 5, 1, 2]   compare 5,1 -> swap
[3, 4, 1, 5, 2]   compare 5,2 -> swap
[3, 4, 1, 2, 5]   5 is now in its sorted position
```

Các lượt còn lại:

```text
pass 2: [3, 1, 2 | 4, 5]      4 settles
pass 3: [1, 2 | 3, 4, 5]      3 settles
pass 4: [1 | 2, 3, 4, 5]      no swaps -> the array is sorted, stop
```

Vùng đã sắp xếp lớn dần từ **bên phải**. Pseudocode:

1. Lặp `i` từ cuối mảng về đầu mảng.
2. Vòng lặp trong `j` chạy từ `0` đến `i - 1`.
3. Nếu `arr[j] > arr[j + 1]`, hoán đổi hai phần tử.
4. Trả về mảng.

---

## 6. Bubble sort: code, dừng sớm và độ phức tạp

```js
function bubbleSort(arr) {
  for (let i = arr.length; i > 0; i--) {
    let swapped = false;

    for (let j = 0; j < i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        swap(arr, j, j + 1);
        swapped = true;
      }
    }

    if (!swapped) break; // no swaps: everything is already in order
  }

  return arr;
}

bubbleSort([5, 3, 4, 1, 2]); // [1, 2, 3, 4, 5]
```

Cờ `swapped` chính là **tối ưu dừng sớm** (early exit). Không có nó, bubble sort chạy đủ mọi lượt kể cả khi mảng đã sắp xếp sẵn. Có nó, mảng đã sắp xếp chỉ tốn một lượt với `n - 1` phép so sánh rồi dừng.

| Trường hợp | Thời gian | Lý do |
|---|---|---|
| Tốt nhất (đã sắp xếp, có dừng sớm) | O(n) | một lượt, không có swap |
| Trung bình | O(n²) | khoảng n²/4 lần swap |
| Xấu nhất (sắp xếp ngược) | O(n²) | n(n-1)/2 phép so sánh và swap |
| Bộ nhớ | O(1) | sắp xếp tại chỗ (in place) |

Bubble sort là **ổn định**: nó chỉ swap khi `arr[j] > arr[j + 1]` (lớn hơn hẳn), nên hai phần tử bằng nhau không bao giờ nhảy qua nhau. Dùng `>=` sẽ phá vỡ tính ổn định. Mỗi lần swap sửa đúng một **nghịch thế** (inversion — một cặp đang sai thứ tự), nên số lần swap bằng số nghịch thế trong input.

---

## 7. Selection sort: ý tưởng và code

**Selection sort** (sắp xếp chọn) là hình ảnh ngược lại: thay vì đẩy giá trị lớn về cuối, nó **chọn giá trị nhỏ nhất còn lại và đặt vào đầu**. Vùng đã sắp xếp lớn dần từ **bên trái**.

Pseudocode:

1. Coi phần tử tại `i` là nhỏ nhất đã gặp (`minIdx = i`).
2. Quét phần còn lại của mảng; mỗi khi gặp giá trị nhỏ hơn, ghi nhớ index của nó.
3. Quét xong, nếu `minIdx` khác `i` thì hoán đổi hai phần tử.
4. Dịch `i` sang phải một bước và lặp lại.

```text
start           [5, 3, 4, 1, 2]
i=0  min is 1   [1 | 3, 4, 5, 2]    swap 5 and 1
i=1  min is 2   [1, 2 | 4, 5, 3]    swap 3 and 2
i=2  min is 3   [1, 2, 3 | 5, 4]    swap 4 and 3
i=3  min is 4   [1, 2, 3, 4 | 5]    swap 5 and 4, done
```

```js
function selectionSort(arr) {
  for (let i = 0; i < arr.length - 1; i++) {
    let minIdx = i;

    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] < arr[minIdx]) minIdx = j;
    }

    if (minIdx !== i) swap(arr, i, minIdx);
  }

  return arr;
}
```

Vòng lặp ngoài dừng ở `arr.length - 2`: khi `n - 1` phần tử đã đúng chỗ thì phần tử cuối cùng chắc chắn cũng đúng chỗ.

---

## 8. Selection sort: độ phức tạp và tính chất

Selection sort **luôn quét toàn bộ phần chưa sắp xếp**, bất kể input trông như thế nào. Lần chạy nào nó cũng làm (n-1) + (n-2) + … + 1 = n(n-1)/2 phép so sánh.

| Trường hợp | Thời gian | Lý do |
|---|---|---|
| Tốt nhất (đã sắp xếp) | O(n²) | vẫn phải quét hết để xác nhận từng giá trị nhỏ nhất |
| Trung bình | O(n²) | số phép so sánh luôn như nhau |
| Xấu nhất | O(n²) | số phép so sánh luôn như nhau |
| Bộ nhớ | O(1) | tại chỗ |

Những tính chất làm nó khác biệt:

- **Không thích nghi** (not adaptive): input đã sắp xếp chẳng giúp được gì.
- **Tối đa n − 1 lần swap**. Đây là ưu điểm thực sự duy nhất: khi mỗi lần ghi rất đắt (ví dụ bộ nhớ flash có số chu kỳ ghi giới hạn), giảm số lần swap có thể quan trọng hơn giảm số phép so sánh.
- **Không ổn định**: lần swap ở khoảng cách xa có thể đẩy một phần tử nhảy qua "anh em sinh đôi" bằng giá trị với nó.

```text
[2a, 2b, 1]     i=0: min is 1, swap it with 2a
[1, 2b, 2a]     2a now sits after 2b -> original order of equal keys lost
```

---

## 9. Insertion sort: ý tưởng và code

**Insertion sort** (sắp xếp chèn) xây dựng một **phần bên trái đã sắp xếp**, mỗi lần thêm một phần tử, giống như bạn xếp bài trên tay. Lấy phần tử tiếp theo, trượt nó sang trái qua mọi phần tử lớn hơn, rồi thả vào chỗ trống.

```text
start             [5 | 3, 4, 1, 2]
i=1  insert 3     [3, 5 | 4, 1, 2]    shift 5
i=2  insert 4     [3, 4, 5 | 1, 2]    shift 5
i=3  insert 1     [1, 3, 4, 5 | 2]    shift 5, 4, 3
i=4  insert 2     [1, 2, 3, 4, 5]     shift 5, 4, 3
```

Thay vì swap liên tục, cách cài đặt thông dụng **dịch** (shift) các phần tử lớn hơn sang phải một bước và chỉ ghi giá trị đã lưu một lần:

```js
function insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    const current = arr[i];
    let j = i - 1;

    while (j >= 0 && arr[j] > current) {
      arr[j + 1] = arr[j]; // shift the larger element right
      j--;
    }

    arr[j + 1] = current; // drop current into the gap
  }

  return arr;
}
```

Hai chi tiết rất dễ viết sai:

- Điều kiện lặp là `j >= 0`. Viết `j > 0` thì không bao giờ so sánh với index 0, nên một giá trị nhỏ nhất mới không bao giờ lên được đầu mảng.
- Phép so sánh là `arr[j] > current` (lớn hơn hẳn). Nhờ vậy thuật toán **ổn định**; dùng `>=` sẽ đẩy các phần tử bằng nhau vượt qua nhau.

---

## 10. Insertion sort: độ phức tạp, dữ liệu gần sắp xếp và sắp xếp online

| Trường hợp | Thời gian | Lý do |
|---|---|---|
| Tốt nhất (đã sắp xếp) | O(n) | mỗi phần tử so sánh một lần rồi đứng yên |
| Trung bình | O(n²) | mỗi phần tử dịch qua khoảng một nửa phần đã sắp xếp |
| Xấu nhất (sắp xếp ngược) | O(n²) | mỗi phần tử dịch về tận đầu mảng |
| Bộ nhớ | O(1) | tại chỗ |

Chính xác hơn, insertion sort chạy trong **O(n + k)**, với `k` là số **nghịch thế** (inversion). Mỗi lần dịch loại bỏ đúng một nghịch thế. Trên mảng **gần như đã sắp xếp** (mỗi phần tử chỉ lệch vài vị trí), `k` nhỏ và thuật toán gần như tuyến tính — thường còn nhanh hơn các thuật toán O(n log n) vốn có hằng số lớn hơn.

Insertion sort còn là thuật toán **online**: nó sắp xếp được dữ liệu **ngay khi dữ liệu đến**, không cần thấy toàn bộ input trước. Khi có giá trị mới, chỉ việc chèn nó vào danh sách đã sắp xếp.

```js
const scores = [];

function addScore(score) {
  scores.push(score);
  let j = scores.length - 2;

  while (j >= 0 && scores[j] > score) {
    scores[j + 1] = scores[j];
    j--;
  }

  scores[j + 1] = score; // O(k) for k larger elements, O(1) if it belongs at the end
}
```

Bubble sort và selection sort không làm được điều này: selection sort phải thấy hết mọi phần tử còn lại mới biết đâu là giá trị nhỏ nhất.

---

## 11. So sánh ba thuật toán

| Thuật toán | Tốt nhất | Trung bình | Xấu nhất | Bộ nhớ | Ổn định | Thích nghi | Số swap/ghi |
|---|---|---|---|---|---|---|---|
| Bubble sort (dừng sớm) | O(n) | O(n²) | O(n²) | O(1) | Có | Có | tới n²/2 |
| Selection sort | O(n²) | O(n²) | O(n²) | O(1) | Không | Không | tối đa n − 1 |
| Insertion sort | O(n) | O(n²) | O(n²) | O(1) | Có | Có | tới n²/2 lần dịch |
| `sort` có sẵn (TimSort) | O(n) | O(n log n) | O(n log n) | O(n) | Có | Có | — |

- **Ổn định** (stable) nghĩa là các phần tử có khoá bằng nhau giữ nguyên thứ tự tương đối ban đầu. Điều này quan trọng khi sắp xếp lần lượt theo nhiều trường: sắp xếp theo tên, sau đó sắp xếp ổn định theo phòng ban, thì tên vẫn theo thứ tự chữ cái trong từng phòng ban.
- **Thích nghi** (adaptive) nghĩa là input đã sắp xếp sẵn khiến thuật toán chạy nhanh hơn.
- **Tại chỗ** (in place) nghĩa là chỉ tốn O(1) bộ nhớ phụ: cả ba thuật toán cơ bản đều thoả mãn.

Cả ba đều có thời gian trung bình bậc hai. Với n = 100.000, đó là cỡ 5 × 10⁹ phép so sánh — mất vài giây đến vài phút — trong khi một thuật toán O(n log n) chỉ cần khoảng 1,7 triệu.

---

## 12. Khi nào nên dùng các thuật toán sắp xếp cơ bản

**Insertion sort** là thuật toán thực sự có chỗ đứng trong code thật:

- **Mảng nhỏ**: với vài chục phần tử, chi phí thấp của nó thắng các thuật toán đệ quy O(n log n). Các thuật toán lai chuyển sang insertion sort cho các đoạn nhỏ: TimSort (V8, Python, Java cho object) dùng binary insertion sort để tạo các run ngắn, và nhiều cài đặt quick sort cũng chuyển sang insertion sort khi đoạn con nhỏ hơn một ngưỡng.
- **Dữ liệu gần như đã sắp xếp**: log gần đúng thứ tự thời gian, danh sách vừa được thêm một phần tử mới.
- **Dữ liệu dạng luồng** (streaming): giữ một danh sách nhỏ luôn được sắp xếp khi giá trị liên tục đến.

**Selection sort** chủ yếu dùng để dạy học; lợi thế duy nhất của nó là số lần swap tối thiểu.

**Bubble sort** gần như không bao giờ là lựa chọn tốt nhất trong thực tế. Bản có dừng sớm là một cách kiểm tra "mảng đã sắp xếp chưa?" khá rẻ, nhưng một vòng lặp đơn còn làm việc đó tốt hơn.

Với nhu cầu sắp xếp thông thường trong JavaScript, hãy dùng `sort` có sẵn cùng một comparator đúng. Bài tiếp theo sẽ cho bạn cách tự vượt qua giới hạn O(n²) bằng **merge sort** và **quick sort**.

---

## Điểm cần nhớ khi phỏng vấn

- `sort()` mặc định so sánh **theo chuỗi**: `[6, 4, 15, 10].sort()` cho `[10, 15, 4, 6]`. Với số phải dùng `(a, b) => a - b`.
- Comparator trả về **số âm / số dương / 0**, không phải boolean. `sort` sửa mảng gốc; `toSorted()` trả về bản sao.
- **Bubble sort**: swap các cặp kề nhau, giá trị lớn nhất nổi về cuối sau mỗi lượt; cờ dừng sớm đưa best case về O(n).
- **Selection sort**: tìm giá trị nhỏ nhất và swap về đầu; luôn O(n²), tối đa n − 1 lần swap, **không ổn định**.
- **Insertion sort**: mở rộng phần trái đã sắp xếp bằng cách dịch phần tử; best case O(n), tổng quát O(n + số nghịch thế), **ổn định** và **online**.
- Cả ba đều O(n²) thời gian trung bình và xấu nhất, O(1) bộ nhớ.
- Chọn insertion sort cho dữ liệu nhỏ hoặc gần sắp xếp; nó là viên gạch bên trong các thuật toán lai như TimSort.
- Khi trace, hãy nói rõ vùng nào đã sắp xếp sau mỗi lượt: đầu phải với bubble sort, đầu trái với selection sort và insertion sort.

## Tóm tắt

- Sắp xếp là sắp đặt phần tử theo một thứ tự; comparison sort chỉ hỏi "a có lớn hơn b không?".
- `sort` của JavaScript ổn định, O(n log n) và sửa trực tiếp mảng truyền vào, nhưng so sánh theo chuỗi nếu bạn không truyền comparator.
- Bubble, selection và insertion sort đều tốn O(1) bộ nhớ phụ và O(n²) thời gian trong trường hợp trung bình.
- Bubble sort và insertion sort ổn định và thích nghi; selection sort không có cả hai tính chất nhưng thực hiện ít swap nhất.
- Insertion sort toả sáng với dữ liệu nhỏ, gần sắp xếp và dạng luồng — đó là lý do các thuật toán lai nhanh dùng nó bên trong.
