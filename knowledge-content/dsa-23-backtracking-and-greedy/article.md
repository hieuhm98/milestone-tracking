# Backtracking & Greedy – Quay lui và Tham lam

## 1. Hai cách tiếp cận một bài toán tìm kiếm

Rất nhiều bài phỏng vấn yêu cầu bạn **xây dựng** đáp án từ một chuỗi lựa chọn: phần tử nào đưa vào tập con, đặt quân hậu kế tiếp ở đâu, cuộc họp nào nên nhận tiếp. Có hai chiến lược đối lập:

- **Quay lui** (backtracking) — thử *mọi* lựa chọn, nhưng bỏ ngay một đáp án dở dang khi thấy nó không thể dẫn tới lời giải hợp lệ. Vì vét cạn nên luôn đúng, và thường tốn thời gian hàm mũ.
- **Tham lam** (greedy) — ở mỗi bước chọn phương án *tốt nhất tại chỗ* và không bao giờ xem xét lại. Rất nhanh (thường là một lần sort cộng một lần duyệt), nhưng chỉ đúng khi bài toán có cấu trúc đặc biệt.

Quy hoạch động (dynamic programming, bài 20) nằm ở giữa: cũng xét mọi lựa chọn, nhưng tái sử dụng kết quả của các bài toán con trùng lặp.

Cả ba có thể hình dung bằng **cây không gian trạng thái** (state-space tree): gốc là đáp án rỗng, mỗi cạnh là một lựa chọn, mỗi lá là một ứng viên hoàn chỉnh.

```text
                      [ ]                  <- empty partial answer
            /          |          \
         [a]          [b]         [c]      <- first choice
        /   \        /   \       /   \
    [a,b]  [a,c]  [b,a] [b,c] [c,a] [c,b]  <- second choice
```

Backtracking duyệt cây này theo chiều sâu và **cắt bỏ** các nhánh đã chắc chắn không hợp lệ. Greedy chỉ đi **một đường duy nhất** từ gốc xuống một lá.

---

## 2. Khuôn mẫu backtracking: chọn, khám phá, huỷ chọn

Backtracking chính là đệ quy (bài 5) cộng thêm một thói quen: **hoàn tác lựa chọn sau khi lời gọi đệ quy trả về**, để trạng thái dùng chung sạch sẽ cho nhánh anh em tiếp theo.

```js
// Generic skeleton: plug in the problem-specific hooks
function backtrackAll(isComplete, getChoices, isValid) {
  const results = [];
  const path = [];

  function backtrack() {
    if (isComplete(path)) {
      results.push([...path]);           // copy! path keeps changing

      return;
    }

    for (const choice of getChoices(path)) {
      if (!isValid(path, choice)) continue;  // prune

      path.push(choice);                 // 1. choose
      backtrack();                       // 2. explore
      path.pop();                        // 3. un-choose
    }
  }

  backtrack();

  return results;
}
```

Để thiết kế một lời giải, trả lời bốn câu hỏi: **trạng thái** (state) là gì (`path` cùng các biến phụ như `used`), các **lựa chọn** ở độ sâu này là gì, **ràng buộc** nào loại lựa chọn sớm (cắt tỉa — pruning), và **đích** (goal) nào cho biết đáp án đã hoàn chỉnh.

Hai lỗi kinh điển: push chính `path` thay vì bản sao (mọi kết quả lưu lại đều trỏ tới cùng một mảng, cuối cùng rỗng), và quên bước huỷ chọn (trạng thái của nhánh này rò rỉ sang nhánh sau).

---

## 3. Tập con (subsets)

**Bài toán:** trả về mọi tập con của `[1, 2, 3]` (tập luỹ thừa — power set). Mỗi phần tử hoặc có hoặc không, nên có `2ⁿ` tập con.

Dùng **chỉ số bắt đầu** (start index) để mỗi phần tử chỉ được xét sau các phần tử đứng trước nó. Nhờ vậy không sinh ra cả `[1, 2]` lẫn `[2, 1]`.

```js
function subsets(nums) {
  const result = [];
  const path = [];

  function backtrack(start) {
    result.push([...path]);              // every node is a valid subset

    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);                // choose
      backtrack(i + 1);                  // explore with later elements only
      path.pop();                        // un-choose
    }
  }

  backtrack(0);

  return result;
}

subsets([1, 2, 3]);
// [[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]]
```

```text
                  []
          /        |       \
       [1]        [2]      [3]
      /   \        |
  [1,2]  [1,3]   [2,3]
    |
 [1,2,3]

8 nodes = 2^3 subsets; every node is recorded, not just leaves
```

**Độ phức tạp:** có `2ⁿ` tập con và sao chép mỗi tập tốn tối đa O(n), nên thời gian là **O(n · 2ⁿ)**. Không gian phụ là **O(n)** cho độ sâu đệ quy và `path`, chưa tính O(n · 2ⁿ) của kết quả đầu ra.

---

## 4. Hoán vị (permutations)

**Bài toán:** trả về mọi cách sắp thứ tự của `[1, 2, 3]`. Giờ thứ tự có ý nghĩa, nên dùng start index là sai — mọi phần tử chưa dùng đều là ứng viên ở mọi vị trí. Theo dõi phần tử đã dùng bằng một mảng boolean.

```js
function permutations(nums) {
  const result = [];
  const path = [];
  const used = new Array(nums.length).fill(false);

  function backtrack() {
    if (path.length === nums.length) {
      result.push([...path]);

      return;
    }

    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;

      used[i] = true;                    // choose
      path.push(nums[i]);
      backtrack();                       // explore
      path.pop();                        // un-choose (both pieces of state)
      used[i] = false;
    }
  }

  backtrack();

  return result;
}

permutations([1, 2, 3]);
// [[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]
```

Vị trí đầu có `n` lựa chọn, vị trí thứ hai có `n − 1`, cứ thế tiếp, cho ra `n!` lá. Mỗi lá tốn O(n) để sao chép, nên thời gian là **O(n · n!)**; không gian phụ là **O(n)** (`path`, `used`, call stack). Quy tắc nhớ nhanh: thứ tự không quan trọng (tập con, tổ hợp) → start index; thứ tự quan trọng (hoán vị) → `used[]`.

---

## 5. Cắt tỉa: combination sum và phần tử trùng

Liệt kê thuần tuý sẽ đi hết cả cây. **Cắt tỉa** (pruning) là loại bỏ một nhánh ngay khi thấy rõ nó vô vọng — đó là điều khiến backtracking nhanh hơn kiểu vét cạn "sinh hết rồi mới lọc".

**Bài toán:** cho các số dương phân biệt `candidates` và một `target`, liệt kê mọi tổ hợp có tổng bằng `target`; mỗi số được dùng lại nhiều lần.

```js
function combinationSum(candidates, target) {
  const sorted = [...candidates].sort((a, b) => a - b);
  const result = [];
  const path = [];

  function backtrack(start, remaining) {
    if (remaining === 0) {
      result.push([...path]);

      return;
    }

    for (let i = start; i < sorted.length; i++) {
      if (sorted[i] > remaining) break;  // prune: later candidates are even bigger

      path.push(sorted[i]);
      backtrack(i, remaining - sorted[i]); // i, not i + 1: reuse allowed
      path.pop();
    }
  }

  backtrack(0, target);

  return result;
}

combinationSum([2, 3, 6, 7], 7); // [[2, 2, 3], [7]]
```

Sort trước biến `continue` thành `break`: một khi một ứng viên đã quá lớn, toàn bộ phần còn lại của vòng lặp bị bỏ qua. Độ sâu tối đa là `target / min(candidates)`, và thời gian chạy là hàm mũ theo độ sâu đó.

**Input có phần tử trùng.** Với `[1, 2, 2]`, code tập con thông thường in `[2]` hai lần. Hãy sort, rồi ở đầu vòng lặp bỏ qua giá trị bằng giá trị liền trước **ở cùng một tầng**: `if (i > start && sorted[i] === sorted[i - 1]) continue;`. Điều kiện `i > start` rất quan trọng: nó vẫn cho phép `[2, 2]` (số 2 thứ hai ở tầng sâu hơn) nhưng bỏ nhánh thứ hai bắt đầu bằng `2` ở cùng tầng.

---

## 6. N-Queens: cắt tỉa bằng các tập ràng buộc

**Bài toán:** đặt `n` quân hậu lên bàn cờ `n × n` sao cho không hai quân nào cùng hàng, cùng cột hay cùng đường chéo.

Đặt đúng **một quân hậu mỗi hàng**, nên hàng không bao giờ xung đột. Với cột và đường chéo, dùng ba Set. Mọi ô trên cùng đường chéo `\` có cùng giá trị `row − col`; mọi ô trên cùng đường chéo `/` có cùng `row + col`.

```js
function solveNQueens(n) {
  const solutions = [];
  const queens = [];                     // queens[row] = column
  const cols = new Set();
  const diag = new Set();                // row - col
  const antiDiag = new Set();            // row + col

  function place(row) {
    if (row === n) {
      solutions.push(queens.map((c) => '.'.repeat(c) + 'Q' + '.'.repeat(n - c - 1)));

      return;
    }

    for (let col = 0; col < n; col++) {
      if (cols.has(col) || diag.has(row - col) || antiDiag.has(row + col)) continue;

      queens.push(col);                  // choose
      cols.add(col);
      diag.add(row - col);
      antiDiag.add(row + col);

      place(row + 1);                    // explore

      queens.pop();                      // un-choose
      cols.delete(col);
      diag.delete(row - col);
      antiDiag.delete(row + col);
    }
  }

  place(0);

  return solutions;
}

solveNQueens(4);
// [[".Q..", "...Q", "Q...", "..Q."], ["..Q.", "Q...", "...Q", ".Q.."]]
```

Kiểm tra Set là O(1), nên mỗi nút tốn O(n) cho vòng lặp. Cây có tối đa `n · (n−1) · …` nút, nên thời gian bị chặn bởi **O(n!)** (thực tế ít hơn nhiều nhờ cắt tỉa); không gian phụ **O(n)**. Với n = 8 có 92 lời giải.

---

## 7. Độ phức tạp của backtracking và khi nào nên dùng

Ước lượng chi phí backtracking bằng **(số nút) × (công việc mỗi nút)**, trong đó số nút ≈ hệ số rẽ nhánh luỹ thừa độ sâu.

| Bài toán | Số kết quả | Thời gian | Không gian phụ |
|---|---|---|---|
| Tập con | 2ⁿ | O(n · 2ⁿ) | O(n) |
| Hoán vị | n! | O(n · n!) | O(n) |
| Tổ hợp C(n, k) | C(n, k) | O(k · C(n, k)) | O(k) |
| N-Queens | ≤ n! | O(n!) | O(n) |

Khi đề bài nói **"tất cả"**, **"mọi"**, **"sinh ra"**, hoặc cần một cấu hình hợp lệ thoả ràng buộc (Sudoku, tìm từ trên lưới, chia chuỗi thành các palindrome), backtracking là lựa chọn tự nhiên. Vì bản thân đầu ra có thể lớn theo hàm mũ, không gì tốt hơn về mặt tiệm cận khi bạn phải liệt kê hết. Khi đề chỉ hỏi **số lượng** hoặc **giá trị tốt nhất** và các bài toán con lặp lại, hãy chuyển sang DP; khi có quy tắc cục bộ chứng minh được là an toàn, hãy chuyển sang greedy.

---

## 8. Thuật toán tham lam: ý tưởng

**Thuật toán tham lam** (greedy algorithm) xây dựng đáp án từng bước, luôn chọn phương án trông tốt nhất ngay lúc này, và **không bao giờ hoàn tác**. Không có tìm kiếm trên cây — chỉ có một đường đi.

Greedy chỉ đúng khi bài toán có hai tính chất:

1. **Tính chất lựa chọn tham lam** (greedy-choice property) — tồn tại một lời giải tối ưu bắt đầu bằng lựa chọn tham lam. Chọn nó không bao giờ chặn đường tới tối ưu.
2. **Cấu trúc con tối ưu** (optimal substructure) — sau khi chọn, phần còn lại là một bài toán cùng dạng nhỏ hơn, và lời giải tối ưu của nó ghép với lựa chọn vừa rồi thành lời giải tối ưu tổng thể.

DP cũng cần cấu trúc con tối ưu; greedy cần thêm tính chất 1, nhờ đó mới được phép bỏ qua các phương án khác.

Để biện minh cho greedy khi phỏng vấn, dùng **lập luận hoán đổi** (exchange argument): lấy một lời giải tối ưu bất kỳ khác với lời giải greedy, thay lựa chọn greedy vào, và chỉ ra kết quả không tệ hơn. Trước đó, hãy **săn phản ví dụ** bằng input nhỏ và các trường hợp hoà — chỉ một phản ví dụ là đủ bác bỏ một quy tắc greedy.

Lời giải greedy thường tốn **O(n log n)** cho việc sort cộng **O(n)** cho lần duyệt.

---

## 9. Lập lịch khoảng (interval scheduling): sort theo thời điểm kết thúc

**Bài toán:** cho các cuộc họp `[start, end]`, chọn được nhiều cuộc họp nhất sao cho không chồng lấn (cuộc bắt đầu đúng lúc cuộc khác kết thúc thì vẫn hợp lệ).

**Quy tắc tham lam:** sort theo **thời điểm kết thúc**, rồi nhận mọi cuộc họp bắt đầu không sớm hơn thời điểm kết thúc của cuộc vừa chọn.

```js
function maxNonOverlapping(intervals) {
  const sorted = [...intervals].sort((a, b) => a[1] - b[1]);
  const chosen = [];
  let lastEnd = -Infinity;

  for (const [start, end] of sorted) {
    if (start >= lastEnd) {
      chosen.push([start, end]);
      lastEnd = end;
    }
  }

  return chosen;
}

maxNonOverlapping([[1, 3], [2, 5], [4, 6], [6, 8], [5, 9], [8, 10]]);
// [[1, 3], [4, 6], [6, 8], [8, 10]]
```

```text
time:   0 1 2 3 4 5 6 7 8 9 10
[1,3]     |===|                   take  (lastEnd = 3)
[2,5]       |=====|               skip  (2 < 3)
[4,6]           |===|             take  (lastEnd = 6)
[6,8]               |===|         take  (lastEnd = 8)
[5,9]             |=======|       skip  (5 < 8)
[8,10]                  |===|     take  (lastEnd = 10)
```

**Vì sao là thời điểm kết thúc?** Cuộc họp kết thúc sớm nhất để lại nhiều chỗ nhất cho phần còn lại. Lập luận hoán đổi: nếu một lịch tối ưu bắt đầu bằng cuộc họp X, hãy thay X bằng cuộc họp kết thúc sớm nhất G. G kết thúc không muộn hơn X, nên không thể va chạm với bất kỳ cuộc nào đứng sau X — lịch vẫn hợp lệ và vẫn lớn như cũ.

**Những quy tắc nghe hợp lý nhưng sai:**

| Quy tắc | Phản ví dụ | Greedy được | Tối ưu |
|---|---|---|---|
| Bắt đầu sớm nhất | `[0,10], [1,2], [3,4]` | 1 (chọn `[0,10]`) | 2 |
| Ngắn nhất | `[0,5], [4,7], [6,11]` | 1 (chọn `[4,7]`) | 2 |
| Kết thúc sớm nhất | — | luôn tối ưu | — |

Thời gian **O(n log n)** cho sort, O(n) cho lần duyệt; không gian O(n) cho bản sao đã sort. "Số cuộc họp tối thiểu cần xoá" chính là `n − maxNonOverlapping`.

---

## 10. Thêm những bài greedy thắng

**Jump game.** `nums[i]` là độ dài bước nhảy tối đa từ vị trí `i`; liệu có tới được chỉ số cuối? Theo dõi chỉ số xa nhất có thể chạm tới.

```js
function canJump(nums) {
  let farthest = 0;

  for (let i = 0; i < nums.length; i++) {
    if (i > farthest) return false;      // this index can never be reached

    farthest = Math.max(farthest, i + nums[i]);
  }

  return true;
}

canJump([2, 3, 1, 1, 4]); // true
canJump([3, 2, 1, 0, 4]); // false: stuck at index 3
```

Thời gian **O(n)**, không gian **O(1)**. Bản backtracking thử mọi độ dài bước nhảy sẽ tốn hàm mũ; DP có memo sẽ là O(n²).

Các thuật toán greedy khác được chứng minh tối ưu: **fractional knapsack** (ba lô chia được — lấy theo tỉ lệ giá trị/khối lượng cao nhất), **Kruskal** cho cây khung nhỏ nhất (cạnh rẻ nhất không tạo chu trình) và **Dijkstra** (chốt đỉnh gần nhất). Khuôn mẫu lặp lại là **sort (hoặc dùng heap), rồi duyệt một lần**.

---

## 11. Khi greedy thất bại: bài đổi tiền

**Bài toán:** tạo ra `amount` với ít đồng xu nhất. Quy tắc greedy hiển nhiên là "sort mệnh giá giảm dần và cứ lấy đồng lớn nhất còn vừa". Với xu Mỹ `{1, 5, 10, 25}` và 63, nó cho 25, 25, 10, 1, 1, 1 — sáu đồng, đúng là tối ưu. Đổi hệ mệnh giá thì nó hỏng:

```text
coins {1, 3, 4}, amount 6

greedy:  6 --take 4--> 2 --take 1--> 1 --take 1--> 0     3 coins
optimal: 6 --take 3--> 3 --take 3--> 0                   2 coins
```

Lấy 4 trước trông có vẻ tốt nhất, nhưng để lại phần dư (2) mà chỉ đồng nhỏ mới lấp được. Tính chất lựa chọn tham lam không đúng với hệ mệnh giá tuỳ ý. Nó chỉ tình cờ đúng với các hệ "chuẩn tắc" (canonical) như xu Mỹ — vì thế quy tắc này nghe có vẻ đúng. Nó thậm chí có thể không tìm ra đáp án: với `{3, 5}` và 9, greedy lấy 5 rồi kẹt ở 4, trong khi 3 + 3 + 3 hợp lệ.

Cách sửa là DP (bài 20): `dp[a] = min trên các đồng c ≤ a của dp[a − c] + 1`, xét mọi đồng xu cho mọi số tiền con trong **O(amount · k)** thời gian với `k` loại đồng xu và **O(amount)** không gian.

Cái bẫy tương tự xuất hiện ở **0/1 knapsack** (ba lô không chia được): greedy theo tỉ lệ giá trị/khối lượng tối ưu cho bản chia được nhưng không tối ưu khi không được cắt món đồ. Sức chứa 50, các món (nặng 10, giá trị 60), (20, 100), (30, 120): greedy theo tỉ lệ lấy hai món đầu được 160, nhưng tối ưu là hai món sau với 220.

---

## 12. Lựa chọn giữa backtracking, greedy và DP

| | Backtracking | Greedy | Quy hoạch động |
|---|---|---|---|
| Khám phá | Mọi lựa chọn, cắt nhánh chết | Một lựa chọn mỗi bước | Mọi lựa chọn, mỗi bài toán con một lần |
| Tính đúng đắn | Luôn đúng (vét cạn) | Chỉ khi có greedy-choice property | Cần cấu trúc con tối ưu + bài toán con trùng lặp |
| Thời gian điển hình | Hàm mũ: O(2ⁿ), O(n!) | O(n) hoặc O(n log n) | Đa thức theo số trạng thái |
| Ví dụ | Tập con, hoán vị, N-Queens, Sudoku | Lập lịch khoảng, jump game, MST | Đổi tiền, 0/1 knapsack, LIS |

Một luồng quyết định thực tế:

```text
Must you LIST every solution / find any valid configuration?
  yes -> backtracking (prune hard)
  no  -> is there a local rule you can PROVE safe (exchange argument)?
           yes -> greedy
           no  -> do subproblems repeat? -> dynamic programming
```

---

## Điểm cần nhớ khi phỏng vấn

- Backtracking = **chọn, khám phá, huỷ chọn**; luôn push **bản sao** của path, và hoàn tác mọi trạng thái đã thay đổi.
- Tập con và tổ hợp dùng **start index**; hoán vị dùng **mảng `used`**. Phần tử trùng: sort rồi bỏ qua khi `i > start && a[i] === a[i-1]`.
- Độ phức tạp: tập con **O(n · 2ⁿ)**, hoán vị **O(n · n!)**, N-Queens ≤ **O(n!)**; không gian phụ bằng độ sâu đệ quy, O(n).
- **Cắt tỉa** (sort + `break`, các Set của N-Queens cho cột, `row − col`, `row + col`) phân biệt backtracking với vét cạn thô.
- Greedy chỉ đúng khi có **greedy-choice property** và **cấu trúc con tối ưu**; biện minh bằng **lập luận hoán đổi**.
- Lập lịch khoảng: **sort theo thời điểm kết thúc**; bắt đầu sớm nhất và ngắn nhất đều sai.
- Đổi tiền `{1, 3, 4}` cho 6 phá greedy lấy-đồng-lớn-nhất (3 đồng so với 2) — dùng **DP**. 0/1 knapsack cũng vậy.

## Tóm tắt

- Backtracking duyệt cây không gian trạng thái theo chiều sâu, bỏ các đáp án dở dang không hợp lệ: luôn đúng, thường tốn hàm mũ.
- Tập con (2ⁿ), hoán vị (n!), combination sum và N-Queens là các dạng cốt lõi; cắt tỉa thu nhỏ phần cây phải duyệt.
- Greedy chọn một phương án tốt nhất tại chỗ, không hoàn tác, ở mỗi bước: nhanh (thường là sort + một lần duyệt), nhưng cần chứng minh.
- Lập lịch khoảng theo thời điểm kết thúc sớm nhất và jump game là greedy tối ưu đã được chứng minh; đổi tiền với mệnh giá tuỳ ý và 0/1 knapsack là nơi greedy thất bại và phải dùng DP.
