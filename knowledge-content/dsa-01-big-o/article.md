# Big O Notation – Đo hiệu năng thuật toán

## 1. Vì sao cần Big O

Hầu hết bài toán đều giải được theo nhiều cách. Lấy ví dụ "viết hàm trả về bản đảo ngược của một chuỗi": bạn có thể lặp ngược, dùng `split('').reverse().join('')`, đệ quy, hoặc dùng stack. Cách nào cũng đúng — vậy cách nào **tốt nhất**?

"Tốt hơn" có thể mang nhiều nghĩa:

- **Nhanh hơn** — ít bước hơn khi input lớn dần (**độ phức tạp thời gian** — time complexity).
- **Tốn ít bộ nhớ hơn** — cần ít vùng nhớ phụ khi chạy (**độ phức tạp không gian** — space complexity).
- **Dễ đọc hơn** — dễ bảo trì cho con người.

Bài này tập trung vào hai tiêu chí đầu. Big O cho ta một **bộ từ vựng chính xác, thống nhất** để nói về hiệu năng của code. Nhờ nó bạn có thể:

- Thảo luận trade-off giữa các cách làm một cách khách quan.
- Tìm ra đúng phần code đang là nút thắt cổ chai (bottleneck) khi chương trình chậm.
- Trả lời câu hỏi mở đầu gần như mọi buổi phỏng vấn coding: "Độ phức tạp của lời giải này là bao nhiêu?"

Ví dụ kinh điển: tính tổng các số từ 1 đến `n`.

```js
// Version A: loop
function addUpToLoop(n) {
  let total = 0;

  for (let i = 1; i <= n; i++) {
    total += i;
  }

  return total;
}

// Version B: Gauss's formula
function addUpToFormula(n) {
  return (n * (n + 1)) / 2;
}
```

Vì sao công thức đúng? Viết tổng theo chiều xuôi và chiều ngược rồi cộng hai dòng lại:

```text
  S = 1     + 2     + 3     + ... + n
+ S = n     + (n-1) + (n-2) + ... + 1
-----------------------------------------
 2S = (n+1) + (n+1) + (n+1) + ... + (n+1)   <- n copies
 2S = n(n+1)   =>   S = n(n+1) / 2
```

Cả hai trả về cùng kết quả. Big O là công cụ giúp ta giải thích chính xác vì sao Version B tốt hơn.

---

## 2. Sao không đo bằng đồng hồ?

Ý tưởng hiển nhiên nhất là đo thời gian chạy:

```js
const t1 = performance.now();
addUpToLoop(1_000_000_000);
const t2 = performance.now();
console.log(`Time elapsed: ${(t2 - t1) / 1000} seconds`);
```

Cách này hữu ích khi profiling code thật, nhưng là cách tệ để **so sánh thuật toán**:

- **Máy khác nhau** cho thời gian khác nhau (CPU, RAM, tải nền).
- **Cùng một máy** mỗi lần chạy lại ra một con số khác (JIT warm-up, garbage collection, lịch của hệ điều hành).
- **Thuật toán nhanh** có thể chạy xong quá nhanh để đo cho chính xác.
- Một lần đo chỉ nói về **một kích thước input**; nó không cho biết điều gì xảy ra khi `n` tăng gấp 1000 lần.

Ta cần một thước đo chỉ phụ thuộc vào **thuật toán**, không phụ thuộc phần cứng.

---

## 3. Đếm số phép toán cơ bản

Thay vì đếm giây, ta đếm số **phép toán đơn giản** (simple operations) mà máy phải thực hiện.

```text
function addUpToFormula(n) {
  return n * (n + 1) / 2;     1 multiplication, 1 addition, 1 division
}                             => 3 operations, whatever n is
```

```text
function addUpToLoop(n) {
  let total = 0;                    1 assignment
  for (let i = 1; i <= n; i++) {    1 assignment, n comparisons, n increments
    total += i;                     n additions + n assignments
  }
  return total;
}
```

Tuỳ bạn đếm những gì, bản dùng vòng lặp thực hiện khoảng từ `2n` đến `5n + 2` phép toán. Con số chính xác không quan trọng. Điều quan trọng là **xu hướng**: khối lượng công việc tăng **tỉ lệ thuận với n**. Nhân đôi `n` thì số phép toán cũng xấp xỉ nhân đôi. Còn bản dùng công thức luôn làm đúng 3 phép toán, dù `n = 5` hay `n = 5 tỉ`.

---

## 4. Định nghĩa Big O

Big O chính thức hoá kiểu "đếm ước lượng" này. Nó mô tả **thời gian chạy (hoặc bộ nhớ) tăng như thế nào khi input tăng**, bỏ qua chi tiết vụn vặt.

> Một thuật toán là **O(f(n))** nếu số phép toán đơn giản **cuối cùng luôn nhỏ hơn một hằng số nhân với f(n)** khi n tăng.

Viết chặt chẽ: tồn tại hằng số `c > 0` và `n₀` sao cho với mọi `n ≥ n₀`, `ops(n) ≤ c · f(n)`.

Áp dụng vào hai ví dụ:

| Hàm | Số phép toán | Big O |
|---|---|---|
| `addUpToFormula` | luôn là 3 | **O(1)** — hằng số (constant) |
| `addUpToLoop` | ≈ 5n + 2 ≤ 6n với n ≥ 2 | **O(n)** — tuyến tính (linear) |

Hai điểm cần lưu ý:

- **Big O là chặn trên (upper bound).** Về lý thuyết, một thuật toán tuyến tính cũng là O(n²), nhưng ta luôn nêu chặn **sát nhất**, vì đó mới là thông tin có ích.
- Còn có các ký hiệu liên quan: **Ω (Omega)** là chặn dưới, **Θ (Theta)** là chặn sát (vừa trên vừa dưới). Trong phỏng vấn và công việc thực tế, người ta thường dùng "Big O" một cách thoải mái để chỉ chặn sát.

---

## 5. Rút gọn biểu thức Big O

Vì Big O chỉ quan tâm tốc độ tăng khi `n` lớn, hai quy tắc sau suy ra trực tiếp từ định nghĩa.

**Hằng số không quan trọng:**

| Biểu thức | Rút gọn thành |
|---|---|
| O(2n) | O(n) |
| O(500) | O(1) |
| O(13n²) | O(n²) |

**Số hạng nhỏ hơn không quan trọng** — chỉ giữ số hạng tăng nhanh nhất:

| Biểu thức | Rút gọn thành |
|---|---|
| O(n + 10) | O(n) |
| O(1000n + 50) | O(n) |
| O(n² + 5n + 8) | O(n²) |

Với `n = 1.000.000`, `n²` là 10¹² trong khi `5n` chỉ là 5 × 10⁶ — số hạng nhỏ chỉ là nhiễu.

**Input khác nhau thì dùng biến khác nhau.** Đây là cái bẫy phỏng vấn rất hay gặp:

```js
function printBoth(arrA, arrB) {
  for (const a of arrA) console.log(a);  // O(a)

  for (const b of arrB) console.log(b);  // O(b)
}
// Total: O(a + b), NOT O(n) and NOT O(2n)

function printPairs(arrA, arrB) {
  for (const a of arrA) {
    for (const b of arrB) console.log(a, b);
  }
}
// Total: O(a * b)
```

Bạn không được bỏ `b` trong `O(a + b)`: bạn không biết input nào lớn hơn.

---

## 6. Quy tắc kinh nghiệm khi phân tích code

Các "mẹo nhanh" sau đúng với phần lớn code hằng ngày:

1. **Phép toán số học** là hằng số.
2. **Gán biến** là hằng số.
3. **Truy cập phần tử mảng theo index** hoặc **thuộc tính object theo key** là hằng số.
4. **Trong vòng lặp**, độ phức tạp = **số lần lặp × chi phí của thân vòng lặp**.
5. **Các khối nối tiếp thì cộng**; **các khối lồng nhau thì nhân**.

```js
function countUpAndDown(n) {
  for (let i = 0; i < n; i++) {
    console.log(i);           // O(n)
  }

  for (let j = n - 1; j >= 0; j--) {
    console.log(j);           // O(n)
  }
}
// O(n) + O(n) = O(2n) = O(n)

function printAllPairs(n) {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      console.log(i, j);      // O(n) work inside an O(n) loop
    }
  }
}
// O(n * n) = O(n²)
```

Hãy nhìn vào **điều kiện dừng** của vòng lặp, không chỉ nhìn việc có vòng lặp hay không:

```js
function logAtLeast5(n) {
  for (let i = 1; i <= Math.max(5, n); i++) console.log(i);
}
// Grows with n -> O(n)

function logAtMost5(n) {
  for (let i = 1; i <= Math.min(5, n); i++) console.log(i);
}
// Never more than 5 iterations -> O(1)
```

---

## 7. Các lớp độ phức tạp thường gặp

Xếp theo tốc độ tăng, từ chậm nhất (thuật toán nhanh nhất) đến nhanh nhất (thuật toán chậm nhất):

| Big O | Tên gọi | Ví dụ điển hình |
|---|---|---|
| O(1) | Hằng số (constant) | Truy cập mảng theo index, tra cứu hash map, `push`/`pop` |
| O(log n) | Logarit (logarithmic) | Binary search, tra cứu trong BST cân bằng |
| O(n) | Tuyến tính (linear) | Một vòng lặp, linear search |
| O(n log n) | Tuyến tính-logarit (linearithmic) | Merge sort, heap sort, các thuật toán sắp xếp hiệu quả |
| O(n²) | Bậc hai (quadratic) | Hai vòng lặp lồng nhau trên cùng input, bubble sort |
| O(2ⁿ) | Hàm mũ (exponential) | Fibonacci đệ quy ngây thơ, sinh mọi tập con |
| O(n!) | Giai thừa (factorial) | Sinh mọi hoán vị, vét cạn bài toán người du lịch |

Số phép toán với các giá trị `n` khác nhau:

| n | log n | n log n | n² | 2ⁿ |
|---|---|---|---|---|
| 10 | ~3 | ~33 | 100 | 1.024 |
| 1.000 | ~10 | ~10.000 | 1.000.000 | ≈ 10³⁰¹ |
| 1.000.000 | ~20 | ~20.000.000 | 10¹² | không tưởng |

Một ngân sách ước lượng: máy tính hiện đại làm được khoảng 10⁸ phép toán đơn giản mỗi giây. Với `n = 10⁵`, O(n log n) chạy tức thì, còn O(n²) cần ~10¹⁰ phép toán — quá chậm.

---

## 8. Logarit

Ngoài O(1), O(n) và O(n²), biểu thức xuất hiện nhiều nhất là **logarit** (logarithm).

`log₂(value) = exponent` nghĩa là `2^exponent = value`. Ví dụ `log₂(8) = 3` vì `2³ = 8`. Trong khoa học máy tính, `log` mặc định là **log cơ số 2** (và với Big O thì cơ số không quan trọng, vì log ở các cơ số khác nhau chỉ chênh nhau một hằng số).

**Quy tắc kinh nghiệm:** logarit của một số xấp xỉ **số lần bạn chia số đó cho 2 cho đến khi được giá trị ≤ 1**.

```text
 8  ÷2 -> 4  ÷2 -> 2  ÷2 -> 1            3 halvings  => log(8)  = 3
25  ÷2 -> 12.5 ÷2 -> 6.25 ÷2 -> 3.125
    ÷2 -> 1.5625 ÷2 -> 0.78125           ~5 halvings => log(25) ≈ 4.64
```

Vì vậy, bất cứ khi nào thuật toán **chia đôi phần việc còn lại sau mỗi bước**, nó là O(log n):

```js
function countHalvings(n) {
  let steps = 0;

  while (n > 1) {
    n = Math.floor(n / 2);
    steps++;
  }

  return steps;
}

countHalvings(1_000_000); // 19 -> a million items need only ~20 steps
```

Tương tự với việc nhân đôi cho đến khi chạm `n` (`for (let i = 1; i < n; i *= 2)`) — cũng là O(log n).

---

## 9. Logarit và hàm mũ xuất hiện ở đâu

**O(log n)** — "cắt đôi bài toán":
- Binary search trên mảng đã sắp xếp.
- Tìm kiếm / chèn trong cây nhị phân tìm kiếm (BST) cân bằng.
- Chèn / lấy phần tử trong binary heap.

**O(n log n)** — "log n tầng, mỗi tầng O(n) việc", hoặc "O(log n) việc cho mỗi phần tử trong n phần tử":
- Merge sort: mảng bị chia đôi `log n` lần, và mỗi tầng trộn (merge) `n` phần tử.
- Sắp xếp dựa trên so sánh (comparison sort) không thể nhanh hơn O(n log n) trong trường hợp tổng quát.

```js
function nLogN(n) {
  for (let i = 0; i < n; i++) {           // n times
    for (let j = 1; j < n; j *= 2) {      // log n times
      console.log(i, j);
    }
  }
}
// O(n log n)
```

**Log trong không gian** — đệ quy chia đôi input (ví dụ binary search viết đệ quy) chỉ giữ `log n` frame trên call stack, nên tốn O(log n) bộ nhớ.

**O(2ⁿ)** — mỗi lời gọi rẽ nhánh thành hai lời gọi:

```js
function fib(n) {
  if (n <= 1) return n;

  return fib(n - 1) + fib(n - 2);
}
// Roughly O(2^n) time: the call tree doubles at each level
```

```text
                fib(4)
             /          \
        fib(3)          fib(2)
       /     \          /    \
   fib(2)  fib(1)   fib(1)  fib(0)
   /    \
fib(1) fib(0)
```

Mới đến `fib(4)` mà `fib(2)` đã bị tính hai lần; đến `fib(40)` là hàng trăm triệu lời gọi. Quy hoạch động (dynamic programming) sẽ khắc phục chuyện này ở phần sau của khoá học.

---

## 10. Độ phức tạp không gian

Nãy giờ ta đo thời gian. Big O cũng dùng để mô tả **độ phức tạp không gian** (space complexity): thuật toán cần bao nhiêu bộ nhớ khi input tăng.

**Auxiliary space complexity** (không gian phụ trợ) là phần bộ nhớ thuật toán cấp phát thêm, **không tính chính input**. Nếu không nói gì thêm, "space complexity" trong phỏng vấn nghĩa là auxiliary space — nếu tính cả input thì mọi hàm nhận vào một mảng đều tối thiểu O(n).

Quy tắc kinh nghiệm trong JavaScript:

| Giá trị | Không gian |
|---|---|
| Hầu hết primitive: `boolean`, `number`, `undefined`, `null` | O(1) |
| String | O(n), n = độ dài chuỗi |
| Array | O(n), n = độ dài mảng |
| Object / Map | O(n), n = số key |

Đừng quên **call stack**: mỗi lời gọi đệ quy đang chờ giữ một stack frame, nên độ sâu đệ quy `d` tốn O(d) bộ nhớ.

---

## 11. Ví dụ về độ phức tạp không gian

**O(1) space** — chỉ dùng một số lượng biến cố định, dù mảng dài bao nhiêu:

```js
function sum(arr) {
  let total = 0;                          // one number

  for (let i = 0; i < arr.length; i++) {  // another number
    total += arr[i];
  }

  return total;
}
// Time O(n), space O(1)
```

**O(n) space** — mảng mới lớn dần theo input:

```js
function double(arr) {
  const newArr = [];

  for (let i = 0; i < arr.length; i++) {
    newArr.push(2 * arr[i]);              // n numbers stored
  }

  return newArr;
}
// Time O(n), space O(n)
```

**O(n) space mà không hề tạo mảng** — do độ sâu đệ quy:

```js
function sumTo(n) {
  if (n === 0) return 0;

  return n + sumTo(n - 1);
}
// Time O(n), space O(n): n frames wait on the call stack
```

```text
call stack at the deepest point of sumTo(3)
+-----------+
| sumTo(0)  |  <- top, returns 0
| sumTo(1)  |
| sumTo(2)  |
| sumTo(3)  |  <- bottom
+-----------+
```

Thời gian và không gian thường đánh đổi cho nhau: lưu kết quả vào hash map (tốn thêm bộ nhớ) có thể biến một phép tìm kiếm O(n²) thành O(n) thời gian.

---

## 12. Best, average, worst case và chi phí ẩn

Cùng một thuật toán có thể chạy khác nhau với các input khác nhau. Ví dụ linear search tìm một giá trị trong mảng:

| Trường hợp | Khi nào | Thời gian |
|---|---|---|
| Tốt nhất (best) | Phần tử cần tìm nằm đầu mảng | O(1) |
| Trung bình (average) | Nằm đâu đó ở giữa | O(n) |
| Xấu nhất (worst) | Nằm cuối hoặc không có | O(n) |

Nếu không được yêu cầu khác, hãy **nêu worst case** — đó là cam kết chắc chắn.

Chi phí **khấu hao** (amortized) là trung bình trên một chuỗi thao tác. `arr.push()` thỉnh thoảng tốn O(n) khi vùng nhớ bên dưới phải cấp phát lại, nhưng tính **amortized là O(1)** qua nhiều lần push.

**Vòng lặp ẩn** là lỗi phân tích phổ biến nhất. Một dòng code có thể giấu bên trong O(n) công việc:

```js
function hasDuplicate(arr) {
  for (let i = 0; i < arr.length; i++) {
    if (arr.slice(i + 1).includes(arr[i])) return true;  // slice + includes are O(n)
  }

  return false;
}
// Looks like one loop, but it is O(n²) time and O(n) extra space

function hasDuplicateFast(arr) {
  const seen = new Set();

  for (const x of arr) {
    if (seen.has(x)) return true;         // O(1) average

    seen.add(x);
  }

  return false;
}
// O(n) time, O(n) space
```

Các built-in có O(n) ẩn: `includes`, `indexOf`, `slice`, `concat`, spread `[...arr]`, `shift`/`unshift`, `Object.keys`, và việc nối chuỗi lặp đi lặp lại trong vòng lặp.

---

## Điểm cần nhớ khi phỏng vấn

- Big O mô tả **tốc độ tăng** khi input tăng, không phải thời gian chính xác; nó phụ thuộc thuật toán, không phụ thuộc phần cứng.
- **Bỏ hằng số và số hạng nhỏ**: O(3n² + 10n) → O(n²).
- **Nối tiếp thì cộng, lồng nhau thì nhân**; input khác nhau dùng **biến khác nhau** (O(a + b), O(a · b)).
- **Mỗi bước chia đôi bài toán → O(log n)**; sắp xếp hiệu quả → O(n log n); đệ quy rẽ hai nhánh → thường là O(2ⁿ).
- Luôn nêu **cả time lẫn space**; space nghĩa là **auxiliary space** và phải tính cả **call stack của đệ quy**.
- Mặc định nêu **worst case**; nhắc tới amortized khi nói về `push` của mảng động.
- Soi kỹ **vòng lặp ẩn** trong built-in (`includes`, `slice`, `indexOf`, spread).
- Thuộc thứ tự: O(1) < O(log n) < O(n) < O(n log n) < O(n²) < O(2ⁿ) < O(n!).

## Tóm tắt

- Đồng hồ không đáng tin để so sánh thuật toán, nên ta **đếm số phép toán** và nhìn vào xu hướng.
- Thuật toán là **O(f(n))** nếu số phép toán cuối cùng bị chặn bởi `c · f(n)`.
- Rút gọn bằng cách bỏ hằng số và số hạng bậc thấp; vòng lặp = số lần lặp × chi phí thân vòng lặp.
- Các lớp phổ biến từ nhanh đến chậm: hằng số, logarit, tuyến tính, tuyến tính-logarit, bậc hai, hàm mũ, giai thừa.
- Logarit đếm số lần bạn chia đôi một số cho đến khi còn 1.
- **Space complexity** đo bộ nhớ phụ: primitive O(1), string/array/object O(n), đệ quy O(độ sâu).
