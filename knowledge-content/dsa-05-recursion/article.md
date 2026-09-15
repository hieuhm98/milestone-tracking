# Đệ quy (Recursion) – Hàm tự gọi chính nó

## 1. Đệ quy là gì?

Một **hàm đệ quy** (recursive function) là hàm tự gọi lại chính nó. Thay vì giải toàn bộ bài toán một lúc, nó chỉ giải một mẩu nhỏ rồi giao **phiên bản nhỏ hơn của cùng bài toán** cho một lời gọi khác của chính nó.

Một câu chuyện ngắn minh hoạ ý tưởng này. Martin hỏi con rồng: "Trong `[3142, 5798, 6550, 5914]` có số nào lẻ không?" Con rồng chỉ chịu trả lời đúng một câu hỏi: *"số đầu tiên của danh sách có lẻ không?"*. Vậy Martin hỏi về số đầu tiên (không lẻ), rồi hỏi về danh sách đã bỏ số đó `[5798, 6550, 5914]` (không lẻ), cứ thế cho đến khi còn một danh sách rỗng. Danh sách rỗng không có số lẻ nào, nên mọi danh sách dài hơn mà cậu đã hỏi cũng không có. Martin vừa dùng đệ quy: thu nhỏ bài toán, dừng ở một trường hợp hiển nhiên, rồi ghép câu trả lời trên đường quay về.

Đệ quy xuất hiện khắp nơi trong code thực tế:

- `JSON.parse` / `JSON.stringify` duyệt qua các object lồng nhau.
- Duyệt DOM (`document.getElementById`, đi qua các node con).
- Cây và đồ thị (DFS), merge sort, quick sort, backtracking.
- Mọi dữ liệu **tự đồng dạng** (self-similar): thư mục trong thư mục, bình luận có trả lời, mảng lồng mảng.

Với những bài toán như vậy, đệ quy thường là lựa chọn gọn gàng hơn vòng lặp.

---

## 2. Call stack

Muốn hiểu đệ quy, bạn phải hiểu **call stack** (ngăn xếp lời gọi) — cấu trúc mà JavaScript engine dùng để theo dõi những hàm đang chạy.

- Gọi một hàm sẽ **push** một frame (tham số, biến cục bộ và vị trí cần chạy tiếp) lên đỉnh stack.
- Khi hàm gặp `return` (hoặc chạy đến dấu đóng ngoặc), frame của nó bị **pop**, và việc thực thi quay lại frame ngay bên dưới.
- Đây là một **stack**: vào sau, ra trước (LIFO). Chỉ frame trên cùng đang chạy; mọi frame bên dưới đều đang tạm dừng, chờ đợi.

```js
function takeShower() {
  return 'Showering!';
}

function eatBreakfast() {
  const meal = cookFood();

  return `Eating ${meal}`;
}

function cookFood() {
  const items = ['Oatmeal', 'Eggs', 'Protein Shake'];

  return items[Math.floor(Math.random() * items.length)];
}

function wakeUp() {
  takeShower();
  eatBreakfast();
  console.log('Ok ready to go to work!');
}

wakeUp();
```

```text
time ->
                        cookFood
          takeShower    eatBreakfast  eatBreakfast
wakeUp    wakeUp        wakeUp        wakeUp        wakeUp       (empty)
```

Với hàm thông thường, frame được push và pop rất nhanh. Với đệ quy, **cùng một hàm liên tục push thêm frame mới** cho đến khi có điều kiện bảo nó dừng. Bạn có thể quan sát trực tiếp trong tab Sources của Chrome DevTools: đặt breakpoint bên trong hàm đệ quy và xem danh sách "Call Stack".

---

## 3. Hai thành phần bắt buộc: base case và input khác đi

Mọi hàm đệ quy đúng đều cần:

1. **Base case** (trường hợp cơ sở) — điều kiện mà tại đó đệ quy **kết thúc**, trả về mà không tự gọi lại nữa. Đây là khái niệm quan trọng nhất.
2. **Input khác đi** ở mỗi lần gọi, và phải **tiến dần về** base case.

Thiếu một trong hai, hàm sẽ không bao giờ dừng.

```js
// Iterative version
function countDownLoop(num) {
  for (let i = num; i > 0; i--) {
    console.log(i);
  }

  console.log('All done!');
}

// Recursive version
function countDown(num) {
  if (num <= 0) {                // base case
    console.log('All done!');

    return;
  }

  console.log(num);
  countDown(num - 1);            // different input: num - 1
}

countDown(3); // 3, 2, 1, "All done!"
```

Để ý base case dùng `num <= 0` chứ không phải `num === 0`: một base case "phòng thủ" vẫn dừng được với input như `-5` hay `2.5` — những giá trị sẽ nhảy qua mất phép so sánh bằng chính xác.

---

## 4. Trả về giá trị: `return` cực kỳ quan trọng

`countDown` chỉ in ra màn hình. Đa số hàm đệ quy cần **tính ra một giá trị**, và mỗi lời gọi phải **return** kết quả cho lời gọi nằm ngay dưới nó trên stack.

```js
function sumRange(num) {
  if (num === 1) return 1;          // base case

  return num + sumRange(num - 1);   // combine current value with the smaller answer
}

sumRange(4); // 10
```

Các frame không thể xong việc trên đường *đi xuống*: `sumRange(4)` phải chờ `sumRange(3)`, lời gọi này lại chờ `sumRange(2)`, v.v. Câu trả lời được ghép dần trên đường *quay lên*:

```text
sumRange(4)                      (winding: pushing frames)
  = 4 + sumRange(3)
        = 3 + sumRange(2)
              = 2 + sumRange(1)
                    = 1          <- base case, start unwinding
              = 2 + 1 = 3
        = 3 + 3 = 6
  = 4 + 6 = 10                   (unwinding: popping frames)
```

Nếu bạn viết `num + sumRange(num - 1);` mà quên `return`, mọi lời gọi (trừ base case) đều trả về `undefined`, và `sumRange(4)` cho ra `undefined` dù tất cả các lời gọi đệ quy vẫn chạy đầy đủ.

---

## 5. Giai thừa và call stack từng bước

`n! = n × (n-1) × … × 1`. Định nghĩa đệ quy là `n! = n × (n-1)!` với `1! = 1` (và `0! = 1`).

```js
function factorial(num) {
  if (num <= 1) return 1;

  return num * factorial(num - 1);
}

factorial(5); // 120
```

Call stack tại điểm sâu nhất khi chạy `factorial(5)`:

```text
+----------------+
| factorial(1)   |  <- top: base case, returns 1
| factorial(2)   |  waits, then returns 2 * 1 = 2
| factorial(3)   |  waits, then returns 3 * 2 = 6
| factorial(4)   |  waits, then returns 4 * 6 = 24
| factorial(5)   |  waits, then returns 5 * 24 = 120
+----------------+
```

Có năm frame cùng tồn tại một lúc. Con số đó — **độ sâu đệ quy tối đa** (maximum recursion depth) — chính là thứ quyết định lượng bộ nhớ mà hàm đệ quy tiêu tốn.

---

## 6. Những chỗ hay sai

Ba lỗi kinh điển:

**1. Không có base case, hoặc base case không bao giờ chạm tới.**

```js
function factorial(num) {
  if (num === 1) return 1;

  return num * factorial(num);   // BUG: input never changes
}
```

Input không hề nhỏ đi nên không bao giờ chạm base case. Chuyện tương tự xảy ra khi bước `num - 1` đúng nhưng điều kiện dừng không với tới: `factorial(0)` với `if (num === 1)` sẽ chạy 0, -1, -2, … mãi mãi.

**2. Quên return, hoặc return sai thứ.**

```js
function factorial(num) {
  if (num === 1) console.log(1); // BUG: logs instead of returning

  return num * factorial(num - 1);
}
```

Base case in ra màn hình nhưng không dừng lại, nên các lời gọi tiếp tục đi xuống số âm.

**3. Tràn stack (stack overflow).** Cả hai lỗi trên đều kết thúc giống nhau. Mỗi frame tốn bộ nhớ, và engine giới hạn kích thước stack (thường khoảng mười nghìn frame, tuỳ engine và kích thước frame). Vượt quá giới hạn, JavaScript sẽ ném lỗi:

```text
RangeError: Maximum call stack size exceeded
```

Tràn stack cũng có thể xảy ra với code **đúng** nếu input đơn giản là quá sâu, ví dụ `sumRange(1_000_000)`. Đó là dấu hiệu nên chuyển sang vòng lặp.

---

## 7. Big O của hàm đệ quy

**Thời gian:** đếm **tổng số lời gọi**, nhân với **khối lượng việc trong mỗi lời gọi** (không tính bản thân các lời gọi đệ quy).

**Không gian:** **số frame tối đa cùng nằm trên call stack** (độ sâu đệ quy), nhân với bộ nhớ mỗi frame giữ, cộng thêm các cấu trúc dữ liệu bạn tạo ra.

| Hàm | Số lời gọi | Việc mỗi lời gọi | Thời gian | Độ sâu tối đa | Không gian |
|---|---|---|---|---|---|
| `countDown(n)` | n | O(1) | O(n) | n | O(n) |
| `sumRange(n)` / `factorial(n)` | n | O(1) | O(n) | n | O(n) |
| binary search đệ quy | log n | O(1) | O(log n) | log n | O(log n) |
| `fib(n)` ngây thơ | ~2ⁿ | O(1) | O(2ⁿ) | n | O(n) |

Lưu ý `fib` có số lời gọi theo hàm mũ nhưng chỉ tốn O(n) bộ nhớ: các lời gọi diễn ra lần lượt từng nhánh, nên stack không bao giờ chứa nhiều hơn một đường đi từ gốc đến lá. Khi hàm chỉ gọi đệ quy **một** lần, hãy vẽ một chuỗi; khi gọi **hai lần trở lên**, hãy vẽ một cây và đếm số node.

---

## 8. Đệ quy với hàm helper (helper method recursion)

Đôi khi bạn muốn **gom** kết quả qua tất cả các lời gọi. Nếu khai báo mảng bên trong hàm đệ quy, nó sẽ bị tạo mới ở mỗi lần gọi. Mẫu **helper method** giải quyết điều này: một hàm ngoài (không đệ quy) sở hữu trạng thái, còn một hàm helper đệ quy bên trong thì cập nhật trạng thái đó.

```js
function collectOddValues(arr) {
  const result = [];                     // lives in the outer scope

  function helper(helperInput) {
    if (helperInput.length === 0) return;

    if (helperInput[0] % 2 !== 0) {
      result.push(helperInput[0]);
    }

    helper(helperInput.slice(1));        // smaller input
  }

  helper(arr);

  return result;
}

collectOddValues([1, 2, 3, 4, 5]); // [1, 3, 5]
```

Nhờ closure, mọi lời gọi `helper` đều truy cập cùng một `result`. Hàm ngoài chỉ được gọi một lần; chỉ có helper là đệ quy.

---

## 9. Đệ quy thuần (pure recursion)

**Đệ quy thuần** gói mọi thứ trong một hàm tự chứa duy nhất, không dùng biến bên ngoài. Mỗi lời gọi trả về phần của riêng nó, và các phần được **ghép lại trên đường quay lên**.

```js
function collectOddValuesPure(arr) {
  let newArr = [];

  if (arr.length === 0) return newArr;

  if (arr[0] % 2 !== 0) {
    newArr.push(arr[0]);
  }

  newArr = newArr.concat(collectOddValuesPure(arr.slice(1)));

  return newArr;
}
```

```text
[1,2,3]  -> [1].concat( [2,3] result )
[2,3]    -> [ ].concat( [3] result )
[3]      -> [3].concat( [] result )
[]       -> []                          base case
unwind: [] -> [3] -> [3] -> [1,3]
```

Mẹo viết đệ quy thuần **mà không làm thay đổi (mutate) input**:

- **Mảng:** dùng `slice`, spread operator `[...arr]` và `concat` — chúng trả về bản sao. Tránh `shift`, `splice`, `pop` vì chúng sửa luôn mảng của nơi gọi.
- **Chuỗi** là bất biến (immutable), nên dùng `slice`, `substring` (hoặc `substr` đã lỗi thời) để lấy bản sao ngắn hơn.
- **Object:** sao chép bằng `Object.assign({}, obj)` hoặc `{ ...obj }`.

---

## 10. Chi phí ẩn của việc sao chép

Những bản sao đó không miễn phí. `arr.slice(1)` là O(n), và nó chạy ở mỗi lời gọi:

```text
call 1 copies n-1 items, call 2 copies n-2, ... => (n-1) + (n-2) + ... + 1 ≈ n²/2
```

Vì vậy cả hai phiên bản `collectOddValues` ở trên đều là **O(n²) thời gian**, không phải O(n). Chúng còn có thể giữ O(n²) bộ nhớ, vì mỗi frame đang tạm dừng vẫn tham chiếu tới bản sao của riêng nó. Cách sửa là truyền một **index** thay vì một mảng ngắn hơn:

```js
function collectOdds(arr, i = 0, result = []) {
  if (i === arr.length) return result;

  if (arr[i] % 2 !== 0) {
    result.push(arr[i]);
  }

  return collectOdds(arr, i + 1, result);
}
// Time O(n), space O(n) for the call stack
```

Mẹo này cũng áp dụng cho chuỗi: so sánh `str[left]` với `str[right]` thay vì cắt bớt ký tự.

---

## 11. Bài tập mẫu

**Luỹ thừa (power).** `power(2, 4) = 16`. Dùng `bᵉ = b × bᵉ⁻¹` và `b⁰ = 1`.

```js
function power(base, exponent) {
  if (exponent === 0) return 1;

  return base * power(base, exponent - 1);
}
// Time O(e), space O(e)
```

Chia đôi số mũ nhanh hơn nhiều: `bᵉ = (b^(e/2))²`.

```js
function fastPower(base, exponent) {
  if (exponent === 0) return 1;

  const half = fastPower(base, Math.floor(exponent / 2));

  return exponent % 2 === 0 ? half * half : half * half * base;
}
// Time O(log e), space O(log e)
```

**productOfArray.** Base case của phép nhân là `1` — phần tử đơn vị của phép nhân — nên mảng rỗng trả về `1`, không phải `0`.

```js
function productOfArray(arr, i = 0) {
  if (i === arr.length) return 1;

  return arr[i] * productOfArray(arr, i + 1);
}

productOfArray([1, 2, 3, 10]); // 60, time O(n), space O(n)
```

**Làm phẳng mảng lồng nhau (flatten)** mang tính đệ quy tự nhiên, vì mỗi phần tử có thể lại là một mảng:

```js
function flatten(arr) {
  const result = [];

  function helper(items) {
    for (const item of items) {
      if (Array.isArray(item)) {
        helper(item);
      } else {
        result.push(item);
      }
    }
  }

  helper(arr);

  return result;
}

flatten([1, [2, [3, 4]], 5]); // [1, 2, 3, 4, 5]
// Time O(total elements), space O(n) output + O(d) stack, d = nesting depth
```

---

## 12. Đệ quy vs vòng lặp và tail call

Mọi thứ viết bằng đệ quy đều viết lại được bằng vòng lặp, hoặc là vòng lặp thường, hoặc dùng một **stack tường minh** (explicit stack) thay cho call stack.

| | Đệ quy | Vòng lặp |
|---|---|---|
| Dễ đọc | Rất hợp với cây, dữ liệu lồng nhau, chia để trị | Rất hợp với duyệt tuyến tính đơn giản |
| Bộ nhớ | O(độ sâu) stack frame | Thường là O(1) |
| Rủi ro | Tràn stack khi input sâu | Không bị giới hạn độ sâu |
| Tốc độ | Tốn chi phí gọi hàm | Thường nhanh hơn một chút |

**Tail call** (lời gọi đuôi) là lời gọi mà kết quả được return thẳng, không còn việc gì phải làm sau đó: `return collectOdds(arr, i + 1, result)` là tail call, còn `return num * factorial(num - 1)` thì không (phép nhân vẫn đang chờ). ES2015 quy định **proper tail calls** trong strict mode, cho phép những lời gọi này tái sử dụng frame để stack không lớn thêm. Trên thực tế chỉ engine của Safari (JavaScriptCore) cài đặt; V8 (Chrome, Node.js) và Firefox thì không. **Đừng dựa vào tail call optimization trong code JavaScript production**: nếu độ sâu có thể lớn, hãy chuyển sang vòng lặp.

```js
function sumRangeIterative(num) {
  let total = 0;

  while (num > 0) {
    total += num;
    num--;
  }

  return total;
}
// Time O(n), space O(1), no stack overflow
```

---

## Điểm cần nhớ khi phỏng vấn

- Hàm đệ quy cần **base case** và **input khác đi, tiến dần về base case**; hãy nói rõ cả hai trước khi code.
- Luôn **`return`** kết quả đệ quy; quên return sẽ âm thầm trả về `undefined`.
- Viết base case **phòng thủ** (`<= 0`, `<= 1`, mảng rỗng) để input bất ngờ vẫn dừng được.
- **Thời gian** = số lời gọi × việc mỗi lời gọi; **không gian** = độ sâu đệ quy tối đa. Gọi một lần mỗi tầng là chuỗi; gọi từ hai lần là cây.
- `slice`, `concat`, spread trong đệ quy là các bản sao O(n) ẩn; truyền **index** để giữ O(n).
- Đệ quy **helper method** giữ trạng thái chung ở scope ngoài; đệ quy **thuần** ghép các giá trị trả về.
- Input sâu → `RangeError: Maximum call stack size exceeded`. Hầu hết JavaScript engine không có tail call optimization, nên hãy chuyển sang vòng lặp hoặc stack tường minh.

## Tóm tắt

- Đệ quy giải một bài toán bằng cách giải phiên bản nhỏ hơn của chính nó cho đến khi gặp base case hiển nhiên.
- Mỗi lời gọi push một frame lên call stack (LIFO); kết quả được ghép lại khi stack "tháo cuộn" (unwind).
- Lỗi thường gặp: thiếu base case hoặc không chạm tới, input không đổi, quên return — tất cả đều dẫn đến tràn stack.
- Độ phức tạp của đệ quy: đếm số lời gọi để tính thời gian, đo độ sâu tối đa để tính không gian.
- Helper method recursion dùng closure để gom kết quả; pure recursion sao chép input thay vì mutate, và phải trả giá cho việc sao chép.
- Ưu tiên vòng lặp khi độ sâu có thể lớn; JavaScript không thể trông cậy vào tail call optimization.
