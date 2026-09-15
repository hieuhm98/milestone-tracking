# Quy hoạch động (Dynamic Programming)

## 1. Quy hoạch động là gì

**Quy hoạch động** (dynamic programming, viết tắt DP) là phương pháp giải một bài toán phức tạp bằng cách **chia nó thành một tập các bài toán con đơn giản hơn, giải mỗi bài toán con đúng một lần, và lưu lại lời giải**. Lần sau gặp lại cùng bài toán con đó, ta tra kết quả đã lưu thay vì tính lại.

Nói gọn trong một câu: *dùng những gì đã biết để giải bài toán tiếp theo dễ hơn*.

Cái tên do Richard Bellman đặt vào thập niên 1950, khi "programming" nghĩa là lập kế hoạch bằng bảng; nó chẳng liên quan gì đến việc viết code "động".

DP được xây trên nền **đệ quy** (recursion) — nhắc nhanh: hàm tự gọi chính nó với input nhỏ hơn cho đến khi chạm base case. Lời giải DP nào cũng bắt đầu từ một định nghĩa đệ quy.

DP chỉ áp dụng được cho bài toán có **đồng thời** hai tính chất:

| Tính chất | Câu hỏi cần đặt ra |
|---|---|
| **Bài toán con chồng lấp** (overlapping subproblems) | Cùng một bài toán nhỏ có bị giải đi giải lại nhiều lần không? |
| **Cấu trúc con tối ưu** (optimal substructure) | Lời giải tốt nhất có dựng được từ lời giải tốt nhất của các bài toán con không? |

---

## 2. Bài toán con chồng lấp

Một bài toán có **bài toán con chồng lấp** nếu nó chia được thành các bài toán con **được dùng lại nhiều lần**.

Dãy Fibonacci là ví dụ kinh điển: mỗi số sau hai số đầu bằng tổng của hai số liền trước (`1, 1, 2, 3, 5, 8, 13, …`). Muốn có `fib(5)` bạn cần `fib(4)` và `fib(3)`, nhưng chính `fib(4)` *cũng* cần `fib(3)`:

```text
                     fib(5)
                  /          \
             fib(4)          fib(3)      <- fib(3) solved here...
            /      \         /     \
       fib(3)    fib(2)  fib(2)  fib(1)  <- ...and again here
       /    \
   fib(2)  fib(1)
```

So sánh với **merge sort**. Sắp xếp `[10, 24, 76, 73]` thì chia thành `[10, 24]` và `[76, 73]`, rồi thành từng phần tử đơn. Mỗi bài toán con là một đoạn *khác nhau* của mảng, không có gì bị lặp lại — merge sort là **chia để trị** (divide and conquer), không phải DP. Cache kết quả của nó chỉ tốn thêm bộ nhớ.

```text
         mergeSort([10,24,76,73])
          /                  \
  mergeSort([10,24])    mergeSort([76,73])   <- different subproblems
    /        \            /         \
 [10]       [24]        [76]        [73]
```

---

## 3. Cấu trúc con tối ưu

Một bài toán có **cấu trúc con tối ưu** nếu **lời giải tối ưu dựng được từ lời giải tối ưu của các bài toán con**.

**Đường đi ngắn nhất có tính chất này.** Nếu đường ngắn nhất từ A đến D là `A -> B -> C -> D`, thì `A -> B -> C` bắt buộc phải là đường ngắn nhất từ A đến C — nếu không, ta thay bằng đoạn ngắn hơn và làm đường A đến D ngắn đi. Đây chính là lý do thuật toán Dijkstra đúng.

**Đường đi đơn dài nhất thì không.** "Đơn" (simple) nghĩa là không đi qua đỉnh nào hai lần. Xét đồ thị vô hướng sau:

```text
  A --- B --- D
        |
        C
```

- Đường đơn dài nhất từ A đến C: `A -> B -> C`
- Đường đơn dài nhất từ C đến D: `C -> B -> D`
- Ghép lại: `A -> B -> C -> B -> D` — **B lặp lại**, nên thậm chí không còn là đường đơn hợp lệ. Đường dài nhất thật sự từ A đến D chỉ là `A -> B -> D`.

Lời giải tốt nhất của từng mảnh không ghép thành lời giải tốt nhất của cả bài, nên không thể áp dụng DP trực tiếp.

---

## 4. Fibonacci đệ quy ngây thơ: O(2ⁿ)

Công thức truy hồi chuyển thẳng thành code:

```js
// fib(1) = fib(2) = 1, fib(n) = fib(n - 1) + fib(n - 2)
function fib(n) {
  if (n <= 2) return 1;

  return fib(n - 1) + fib(n - 2);
}
```

Code đúng nhưng chậm thảm hại. Mỗi lời gọi đẻ ra hai lời gọi nữa, nên cây đệ quy gần như nhân đôi sau mỗi tầng, và sâu khoảng `n` tầng. Đếm số lời gọi:

| n | Số lời gọi | Số bài toán con khác nhau |
|---|---|---|
| 5 | 9 | 5 |
| 10 | 109 | 10 |
| 20 | 13.529 | 20 |
| 40 | 204.668.309 | 40 |
| 50 | ~25 tỉ | 50 |

Số lời gọi bằng `2·fib(n) - 1`, tăng theo khoảng 1,618ⁿ (tỉ lệ vàng). Chặn trên thường được nêu là **O(2ⁿ) thời gian**. Bộ nhớ chỉ **O(n)**, vì cùng lúc tối đa có `n` frame nằm trên call stack.

Cột cuối là mấu chốt: chỉ có `n` câu hỏi *khác nhau*. Mọi thứ còn lại là việc lặp lại vô ích.

---

## 5. Memoization (top-down)

**Memoization** (ghi nhớ kết quả) là lưu kết quả của các lời gọi hàm tốn kém và trả về kết quả đã cache khi cùng input xuất hiện lại. Ta giữ nguyên hình dạng đệ quy và thêm một bước tra cứu:

```js
function fibMemo(n, memo = []) {
  if (memo[n] !== undefined) return memo[n];

  if (n <= 2) return 1;

  const result = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo[n] = result;

  return result;
}

fibMemo(50); // 12586269025, instantly
```

Trace `fibMemo(6)`: nhánh bên trái tính mỗi giá trị một lần, còn mọi lời gọi bên phải đều trúng cache.

```text
fibMemo(6)
 +- fibMemo(5)
 |   +- fibMemo(4)
 |   |   +- fibMemo(3)
 |   |   |   +- fibMemo(2) -> 1 (base)
 |   |   |   +- fibMemo(1) -> 1 (base)     memo[3] = 2
 |   |   +- fibMemo(2) -> 1 (base)         memo[4] = 3
 |   +- fibMemo(3) -> 2 (memo hit)         memo[5] = 5
 +- fibMemo(4) -> 3 (memo hit)             memo[6] = 8

memo: [ , , , 2, 3, 5, 8]
```

**Độ phức tạp:** mỗi `n` chỉ tính một lần với O(1) việc, nên **O(n) thời gian**. Bộ nhớ là **O(n)** cho memo cộng **O(n)** độ sâu đệ quy.

Các lỗi hay gặp:

- **Quên truyền `memo` xuống.** Gọi `fibMemo(n - 1)` thiếu tham số thứ hai sẽ tạo một cache rỗng mới ở mỗi lời gọi, âm thầm đưa bạn về lại O(2ⁿ).
- **Kiểm tra "đã cache chưa" quá lỏng.** `if (memo[n])` sai khi đáp án hợp lệ là `0`. Hãy dùng `!== undefined`, hoặc `Map` với `memo.has(key)`.
- **State có nhiều tham số** cần một key ghép, ví dụ `` memo.get(`${row},${col}`) ``.

---

## 6. Tabulation (bottom-up)

**Tabulation** (lập bảng) lưu kết quả mỗi bài toán con vào một **bảng** (thường là mảng) và điền bảng bằng **vòng lặp**, bắt đầu từ các base case và đi dần lên `n`.

```js
function fibTable(n) {
  if (n <= 2) return 1;

  const table = [0, 1, 1];

  for (let i = 3; i <= n; i++) {
    table[i] = table[i - 1] + table[i - 2];
  }

  return table[n];
}
```

Điền bảng cho `fibTable(6)`:

```text
table[3] = table[2] + table[1] = 1 + 1 = 2
table[4] = table[3] + table[2] = 2 + 1 = 3
table[5] = table[4] + table[3] = 3 + 2 = 5
table[6] = table[5] + table[4] = 5 + 3 = 8

index:  0  1  2  3  4  5  6
table: [0, 1, 1, 2, 3, 5, 8]
```

**Độ phức tạp:** O(n) thời gian, O(n) bộ nhớ — và hoàn toàn không đệ quy.

Vì `table[i]` chỉ đọc **hai ô liền trước**, ta không cần giữ cả bảng. Chỉ giữ hai biến là đạt **O(1) bộ nhớ**:

```js
function fibConstantSpace(n) {
  if (n <= 2) return 1;

  let prev = 1;
  let curr = 1;

  for (let i = 3; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }

  return curr;
}
```

Mẹo "cuốn chiếu" (rolling) này là lý do chính khiến người ta nói tabulation thường cho space complexity tốt hơn.

---

## 7. Top-down hay bottom-up

| | Memoization (top-down) | Tabulation (bottom-up) |
|---|---|---|
| Hình dạng | Đệ quy + cache | Vòng lặp + bảng |
| Bắt đầu từ | Bài toán gốc `n` | Các base case |
| Thứ tự tính | Do đệ quy quyết định | Bạn phải tự chọn thứ tự hợp lệ |
| Bài toán con được giải | Chỉ những cái thực sự chạm tới | Thường là tất cả |
| Call stack | O(độ sâu) frame — có thể tràn | Không có |
| Tối ưu bộ nhớ | Khó | Thường dễ (biến cuốn chiếu) |

Call stack là chuyện thật trong JavaScript: `fibMemo(100000)` ném lỗi `RangeError: Maximum call stack size exceeded`, còn bản vòng lặp chạy bình thường. (Một chuyện khác: số Fibonacci vượt `Number.MAX_SAFE_INTEGER` sau `fib(78)`; dùng `BigInt` nếu cần giá trị lớn chính xác.)

Quy trình thực tế: viết đệ quy vét cạn, thêm memoization cho nhanh, rồi chuyển sang tabulation nếu lo về stack hoặc bộ nhớ.

---

## 8. Công thức giải bài toán DP

**Nhận diện bài DP.** Cách ra đề điển hình: "đếm số cách", "chi phí nhỏ nhất/lớn nhất", "có thể… hay không", "dài nhất/ngắn nhất…", trong đó mỗi bước là một **lựa chọn** và đệ quy vét cạn sẽ ghé lại cùng các trạng thái.

**Năm bước:**

1. **Định nghĩa trạng thái** (state) bằng lời: "`dp[i]` = số cách lên tới bậc `i`".
2. **Viết công thức truy hồi** (recurrence — chính là cấu trúc con): `dp[i]` được dựng từ các trạng thái nhỏ hơn thế nào. Đây thường là phần khó nhất và cần luyện tập nhiều.
3. **Đặt base case**: các trạng thái nhỏ nhất mà ta biết ngay đáp án.
4. **Chọn thứ tự tính**: memoize đệ quy, hoặc điền bảng sao cho mọi phụ thuộc đã sẵn sàng trước khi được đọc.
5. **Trả về đáp án** ở đúng ô, rồi tìm cách tối ưu bộ nhớ.

**Quy tắc độ phức tạp:** thời gian = **số trạng thái × công việc mỗi trạng thái**; bộ nhớ = số trạng thái được lưu (cộng độ sâu đệ quy nếu top-down).

DP so với các mô hình (paradigm) lân cận:

| Mô hình | Bài toán con | Lưu lại |
|---|---|---|
| Chia để trị (divide and conquer) | Độc lập, không lặp lại | Không gì cả |
| Quy hoạch động | Chồng lấp | Đáp án của mọi bài toán con |
| Tham lam (greedy) | Chốt ngay một lựa chọn cục bộ | Chỉ lựa chọn hiện tại |

---

## 9. Ví dụ: leo cầu thang

> Một người đứng dưới chân cầu thang `n` bậc, mỗi lần bước **1 hoặc 2** bậc. Có bao nhiêu cách khác nhau để lên tới đỉnh?

**Bắt đầu từ trường hợp nhỏ** và liệt kê các cách:

```text
stairs(1): 1                          -> 1
stairs(2): 1,1  2                     -> 2
stairs(3): 1,1,1  1,2  2,1            -> 3
stairs(4): 1,1,1,1  2,1,1  1,2,1
           1,1,2  2,2                 -> 5
stairs(5):                            -> 8
```

**Cấu trúc con:** bước cuối cùng lên bậc `n` hoặc là bước 1 (từ `n - 1`) hoặc là bước 2 (từ `n - 2`), nên `stairs(n) = stairs(n - 1) + stairs(n - 2)` — chính là Fibonacci đội lốt. Viết bằng đệ quy thuần thì nó là O(2ⁿ) vì cùng lý do với `fib`, nên ta đi thẳng tới DP:

```js
// Memoization: O(n) time, O(n) space
function stairsMemo(n, memo = []) {
  if (n <= 0) return 0;
  if (n <= 2) return n;
  if (memo[n] !== undefined) return memo[n];

  memo[n] = stairsMemo(n - 1, memo) + stairsMemo(n - 2, memo);

  return memo[n];
}

// Tabulation with two variables: O(n) time, O(1) space
function stairsTable(n) {
  if (n <= 2) return Math.max(n, 0);

  let twoBelow = 1; // ways(1)
  let oneBelow = 2; // ways(2)

  for (let i = 3; i <= n; i++) {
    const total = oneBelow + twoBelow;
    twoBelow = oneBelow;
    oneBelow = total;
  }

  return oneBelow;
}
```

Nếu được bước 1, 2 **hoặc 3** bậc, chỉ công thức truy hồi thay đổi: `ways(n) = ways(n - 1) + ways(n - 2) + ways(n - 3)`.

---

## 10. Ví dụ: đổi tiền xu (đếm số cách)

> Cho các mệnh giá `coins` và số tiền `amount`, trả về số **tổ hợp** đồng xu có tổng bằng số tiền đó (mỗi loại xu dùng không giới hạn).

Trạng thái: `ways[a]` = số cách tạo ra số tiền `a`. Base case: `ways[0] = 1` (có đúng một cách tạo ra 0: không dùng đồng nào). Xử lý **từng loại xu một**; với mỗi số tiền `a >= coin`, cộng thêm số cách tạo ra `a - coin`.

```js
function coinChange(coins, amount) {
  const ways = new Array(amount + 1).fill(0);
  ways[0] = 1;

  for (const coin of coins) {
    for (let a = coin; a <= amount; a++) {
      ways[a] += ways[a - coin];
    }
  }

  return ways[amount];
}

coinChange([1, 2, 5], 10); // 10
```

Bảng cho số tiền 10, mệnh giá `[1, 2, 5]`, sau khi xử lý từng loại xu:

```text
amount:      0  1  2  3  4  5  6  7  8  9 10
coin 1:      1  1  1  1  1  1  1  1  1  1  1
coin 1,2:    1  1  2  2  3  3  4  4  5  5  6
coin 1,2,5:  1  1  2  2  3  4  5  6  7  8 10
```

**Độ phức tạp:** O(k · amount) thời gian với `k` loại xu, O(amount) bộ nhớ.

**Thứ tự vòng lặp rất quan trọng.** Xu ở vòng ngoài, số tiền ở vòng trong thì mỗi *tổ hợp* được đếm một lần (`1+2` và `2+1` là một). Đảo hai vòng lặp thì bạn đếm *dãy có thứ tự* (hoán vị): với số tiền 3 và `[1, 2]`, tổ hợp cho 2 (`1+1+1`, `1+2`) nhưng dãy có thứ tự cho 3 (`1+1+1`, `1+2`, `2+1`).

---

## 11. Ví dụ: số xu ít nhất, và vì sao tham lam có thể sai

> Trả về số đồng xu **ít nhất** để tạo ra `amount`, hoặc `-1` nếu không thể.

Ý tưởng **tham lam** (greedy) — luôn lấy đồng xu lớn nhất còn vừa — đúng với các hệ tiền thật như `[1, 2, 5]`, nhưng không đúng trong trường hợp tổng quát. Với mệnh giá `[1, 3, 4]` và số tiền 6:

```text
greedy: 4 -> 1 -> 1       = 3 coins
best:   3 -> 3            = 2 coins
```

Với `[3, 5]` và số tiền 9, tham lam lấy 5 rồi kẹt ở 4, dù `3 + 3 + 3` là làm được. (Thuật toán tham lam sẽ có bài riêng ở phần sau.)

DP thử mọi khả năng cho đồng xu cuối cùng: `dp[a] = 1 + min(dp[a - coin])` trên mọi đồng xu còn vừa.

```js
function minCoins(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      if (coin <= a && dp[a - coin] + 1 < dp[a]) {
        dp[a] = dp[a - coin] + 1;
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
}

minCoins([1, 3, 4], 6); // 2
```

```text
amount: 0  1  2  3  4  5  6
dp:     0  1  2  1  1  2  2
```

**Độ phức tạp:** O(k · amount) thời gian, O(amount) bộ nhớ.

---

## 12. DP hai chiều và ứng dụng thực tế

Có những trạng thái cần hai chỉ số. **Đếm đường đi trên lưới:** một robot xuất phát ở góc trên-trái của lưới `rows × cols` và chỉ được đi sang phải hoặc xuống dưới. Mỗi ô được tới từ ô phía trên hoặc ô bên trái:

```js
function uniquePaths(rows, cols) {
  const dp = Array.from({ length: rows }, () => new Array(cols).fill(1));

  for (let r = 1; r < rows; r++) {
    for (let c = 1; c < cols; c++) {
      dp[r][c] = dp[r - 1][c] + dp[r][c - 1];
    }
  }

  return dp[rows - 1][cols - 1];
}
```

```text
3 x 3 grid          first row and column are all 1
1  1  1
1  2  3             dp[1][1] = 1 + 1
1  3  6   <- answer dp[2][2] = 3 + 3
```

**Độ phức tạp:** O(rows · cols) thời gian và bộ nhớ; chỉ giữ một hàng thì bộ nhớ giảm còn O(cols).

Các bài kinh điển khác theo cùng công thức: balo 0/1 (0/1 knapsack), dãy con chung dài nhất (longest common subsequence) và khoảng cách chỉnh sửa (edit distance — dùng trong kiểm tra chính tả, `diff`). DP còn có mặt ở nhận dạng giọng nói, căn chỉnh chuỗi DNA, thuật toán đường đi ngắn nhất như Bellman-Ford, và **caching** hằng ngày.

---

## Điểm cần nhớ khi phỏng vấn

- DP cần **bài toán con chồng lấp** *và* **cấu trúc con tối ưu**; merge sort thiếu tính chất đầu, đường đơn dài nhất thiếu tính chất sau.
- Fibonacci đệ quy ngây thơ là **O(2ⁿ)** thời gian (chặt hơn là ~1,618ⁿ) và O(n) bộ nhớ stack.
- **Memoization** = đệ quy top-down + cache: O(n) thời gian, O(n) memo + O(n) stack với Fibonacci.
- **Tabulation** = vòng lặp bottom-up điền bảng: O(n) thời gian; dùng biến cuốn chiếu thì **O(1) bộ nhớ**, và không có nguy cơ tràn stack.
- Luôn truyền memo vào lời gọi đệ quy, và kiểm tra "đã cache chưa" bằng `!== undefined` hoặc `Map.has`, đừng dựa vào truthiness.
- Nói to công thức: **trạng thái → truy hồi → base case → thứ tự → đáp án**; thời gian = số trạng thái × công việc mỗi trạng thái.
- Đổi tiền xu: thứ tự vòng lặp quyết định đếm tổ hợp hay hoán vị; tham lam sai với mệnh giá như `[1, 3, 4]`.

## Tóm tắt

- Quy hoạch động giải mỗi bài toán con khác nhau **đúng một lần** và lưu đáp án.
- Chỉ áp dụng được khi bài toán con **lặp lại** và đáp án tối ưu **ghép được** từ các phần.
- Memoization top-down giữ cấu trúc đệ quy; tabulation bottom-up thay nó bằng vòng lặp và thường tiết kiệm bộ nhớ hơn.
- Các lời giải vét cạn hàm mũ như Fibonacci, leo cầu thang và đổi tiền xu trở thành tuyến tính hoặc `O(k · amount)` nhờ DP.
- Phần khó nhất là tìm công thức truy hồi; hãy bắt đầu từ ví dụ nhỏ và tự hỏi "lựa chọn cuối cùng là gì?".
