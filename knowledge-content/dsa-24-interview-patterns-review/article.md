# Ôn tập pattern phỏng vấn – Tổng hợp toàn khoá

## 1. Từ ràng buộc đến độ phức tạp mục tiêu

Mỗi bài trước dạy một công cụ. Trong phỏng vấn, không ai nói cho bạn nên dùng công cụ nào — bạn phải tự suy ra từ đề bài. Manh mối đầu tiên và hay bị bỏ qua nhất là **kích thước input** (constraints).

Máy hiện đại làm được khoảng 10⁸ phép toán đơn giản mỗi giây, và các online judge thường cho 1–2 giây. Suy ngược từ `n`, bạn có ngay **độ phức tạp mục tiêu** trước khi viết dòng code nào:

| Ràng buộc của n | Độ phức tạp lớn nhất chấp nhận được | Kỹ thuật thường gặp |
|---|---|---|
| n ≤ 10 | O(n!) | Hoán vị, vét cạn (brute force) |
| n ≤ 20 | O(2ⁿ) hoặc O(n · 2ⁿ) | Tập con, bitmask, backtracking |
| n ≤ 500 | O(n³) | Ba vòng lặp lồng, DP trên đoạn |
| n ≤ 5.000 | O(n²) | Hai vòng lặp lồng, DP 2 chiều |
| n ≤ 10⁶ | O(n log n) | Sắp xếp, heap, binary search |
| n ≤ 10⁸ | O(n) | Một lượt duyệt, hash map, two pointers |
| lớn hơn nữa | O(log n) hoặc O(1) | Binary search, công thức toán |

Nếu đề cho `n ≤ 10⁵` mà ý tưởng của bạn là O(n²), tức khoảng 10¹⁰ phép toán — bạn biết ngay phải tìm cách thông minh hơn, nhiều khả năng là sắp xếp, hash map hoặc sliding window.

Manh mối thứ hai là **hình dạng input** (đã sắp xếp? lưới? cây? các cặp phụ thuộc?), và thứ ba là **câu hỏi đề đặt ra** (đếm, tìm nhỏ nhất, liệt kê mọi tổ hợp, có/không). Mục 2 và 3 biến các manh mối đó thành lựa chọn cụ thể.

---

## 2. Chọn cấu trúc dữ liệu

Chọn cấu trúc dữ liệu bằng cách hỏi **thao tác nào bắt buộc phải nhanh**. Mọi thứ khác là thứ yếu.

```text
What must be fast?
|
+-- read by position ..................... Array
+-- look up / count / dedupe by key ...... Map, Set, Object
+-- add & remove at one end (LIFO) ....... Stack (array push/pop)
+-- add at back, remove at front (FIFO) .. Queue (linked list or head index)
+-- add & remove at both ends ............ Deque / doubly linked list
+-- repeatedly take the min or max ....... Binary heap (priority queue)
+-- keep items sorted, range queries ..... Balanced BST (sorted array if static)
+-- prefix search on strings ............. Trie
+-- relationships / networks ............. Graph (adjacency list)
+-- "are A and B in the same group?" ..... Union-find
```

Những trade-off nên nói to lên khi phỏng vấn:

- **Array vs linked list** — array cho truy cập theo index O(1) và thân thiện với cache; linked list cho chèn/xoá O(1) tại một node đã biết nhưng truy cập O(n).
- **Hash map vs BST** — hash map O(1) trung bình nhưng không có thứ tự; BST cân bằng O(log n) nhưng giữ key được sắp xếp (min, max, "phần tử lớn hơn kế tiếp").
- **Heap vs mảng đã sắp xếp** — heap cho chèn O(log n) và xem phần tử cực trị O(1); giữ mảng luôn sắp xếp tốn O(n) mỗi lần chèn.
- **Adjacency list vs matrix** — list tốn O(V + E) bộ nhớ, hợp với đồ thị thưa; matrix tốn O(V²) nhưng trả lời "có cạnh không?" trong O(1).

---

## 3. Bảng nhận diện pattern

Phần lớn bài phỏng vấn là một pattern quen thuộc được nguỵ trang. Hãy tập ánh xạ **tín hiệu** trong đề sang **pattern**:

| Tín hiệu trong đề | Pattern nên thử | Chi phí điển hình |
|---|---|---|
| Mảng đã sắp xếp, tìm cặp / bộ ba | Two pointers | O(n) sau khi sort |
| Mảng đã sắp xếp, tìm giá trị hoặc biên | Binary search | O(log n) |
| "X nhỏ nhất sao cho điều kiện đúng", điều kiện đơn điệu | Binary search trên đáp án | O(n log range) |
| Mảng con / chuỗi con liên tiếp, dài nhất / ngắn nhất | Sliding window | O(n) |
| Nhiều truy vấn tổng đoạn | Prefix sums (mảng cộng dồn) | O(n) dựng, O(1) truy vấn |
| Anagram, trùng lặp, "đã gặp chưa?", đếm tần suất | Hash map / frequency counter | O(n) |
| Top k, phần tử lớn thứ k, gộp k danh sách | Heap kích thước k | O(n log k) |
| Khoảng chồng lấn, lịch phòng họp | Sort theo điểm đầu rồi quét | O(n log n) |
| Phần tử lớn hơn kế tiếp, ngoặc hợp lệ | Monotonic stack / stack | O(n) |
| Đường đi ngắn nhất, đồ thị không trọng số hoặc lưới | BFS | O(V + E) |
| Đường đi ngắn nhất, trọng số không âm | Dijkstra với heap | O((V + E) log V) |
| Thành phần liên thông, loang (flood fill) | DFS / BFS hoặc union-find | O(V + E) |
| Phụ thuộc, thứ tự build | Topological sort | O(V + E) |
| Tiền tố / autocomplete / từ điển | Trie | O(L) mỗi từ |
| Mọi tổ hợp / hoán vị / cách đặt | Backtracking | O(n · 2ⁿ), O(n · n!) |
| Đếm số cách / chi phí nhỏ nhất, bài toán con lặp lại | Quy hoạch động (DP) | số trạng thái × số chuyển |
| Lựa chọn cục bộ tốt nhất được chứng minh là an toàn | Greedy (thường sau khi sort) | O(n log n) |
| Số xuất hiện lẻ lần duy nhất, tập con với n ≤ 20 | Bit manipulation | O(n) / O(2ⁿ) |

Bảng này là điểm xuất phát, không phải chứng minh: luôn kiểm tra pattern có thực sự khớp không (ví dụ sliding window đòi hỏi tính hợp lệ của cửa sổ thay đổi đơn điệu khi cửa sổ nới rộng).

---

## 4. Pattern trên mảng: two pointers, sliding window, prefix sums

**Two pointers** (hai con trỏ) trên mảng đã sắp xếp — dịch con trỏ nào giúp tổng tiến gần target hơn:

```js
function pairWithSum(sorted, target) {
  let left = 0;
  let right = sorted.length - 1;

  while (left < right) {
    const sum = sorted[left] + sorted[right];

    if (sum === target) return [left, right];

    if (sum < target) {
      left++;
    } else {
      right--;
    }
  }

  return null;
}
// O(n) time, O(1) space (O(n log n) if you must sort first)
```

**Sliding window** (cửa sổ trượt) — nới mép phải, thu mép trái khi cửa sổ không còn hợp lệ:

```js
function longestUniqueSubstring(s) {
  const lastSeen = new Map(); // char -> last index
  let start = 0;
  let best = 0;

  for (let end = 0; end < s.length; end++) {
    const ch = s[end];

    if (lastSeen.has(ch) && lastSeen.get(ch) >= start) {
      start = lastSeen.get(ch) + 1;
    }

    lastSeen.set(ch, end);
    best = Math.max(best, end - start + 1);
  }

  return best;
}
// O(n) time, O(k) space, k = distinct characters
```

```text
s = "abcabcbb"
end=0 a  window [a]      best 1
end=2 c  window [abc]    best 3
end=3 a  a seen at 0 -> start=1, window [bca]   best 3
end=4 b  b seen at 1 -> start=2, window [cab]   best 3
```

Mỗi index vào và ra khỏi cửa sổ nhiều nhất một lần, nên tổng công việc là O(n) dù có hai mép cùng di chuyển.

**Prefix sums** — tính trước một lần, trả lời mọi tổng đoạn trong O(1):

```js
function buildPrefix(nums) {
  const prefix = [0];

  for (const x of nums) {
    prefix.push(prefix[prefix.length - 1] + x);
  }

  return prefix;
}

// Sum of nums[i..j] inclusive
const rangeSum = (prefix, i, j) => prefix[j + 1] - prefix[i];
```

---

## 5. Hash map và binary search trên đáp án

Hash map đổi O(n) bộ nhớ lấy tra cứu O(1) trung bình, và là cách phổ biến nhất để biến O(n²) thành O(n). Ví dụ kinh điển là **Two Sum** trên mảng chưa sắp xếp:

```js
function twoSum(nums, target) {
  const indexOf = new Map(); // value -> index

  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];

    if (indexOf.has(need)) return [indexOf.get(need), i];

    indexOf.set(nums[i], i);
  }

  return null;
}
// O(n) time, O(n) space — versus O(n^2) for checking every pair
```

**Binary search trên đáp án** (binary search on the answer) là áp dụng binary search không phải lên một mảng mà lên **khoảng các đáp án có thể**. Nó dùng được khi "đáp án x khả thi" có tính **đơn điệu** (monotonic): nếu x được thì mọi x lớn hơn cũng được.

```js
// Smallest eating speed k that finishes all piles within h hours
function minEatingSpeed(piles, h) {
  const hoursAt = (k) => piles.reduce((sum, p) => sum + Math.ceil(p / k), 0);
  let lo = 1;
  let hi = piles.reduce((a, b) => Math.max(a, b), 1);

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);

    if (hoursAt(mid) <= h) {
      hi = mid;     // mid works, try slower
    } else {
      lo = mid + 1; // mid is too slow
    }
  }

  return lo;
}
// O(n log M) time, M = largest pile; O(1) extra space
```

```text
speeds:   1  2  3  4  5  6  ...  M
feasible: N  N  N  Y  Y  Y  ...  Y   <- find the first Y
```

---

## 6. Heap, top-k và bài toán khoảng

Các câu hỏi **top-k** ("k phần tử xuất hiện nhiều nhất", "k điểm gần nhất", "phần tử lớn thứ k") gợi ý ngay đến heap. Giữ một **min-heap kích thước k**: đẩy từng phần tử vào, nếu heap vượt quá k thì pop phần tử nhỏ nhất. Cái còn lại chính là k phần tử lớn nhất.

| Cách tìm phần tử lớn thứ k | Time | Space |
|---|---|---|
| Sắp xếp toàn bộ | O(n log n) | O(1)–O(n) |
| Min-heap kích thước k | O(n log k) | O(k) |
| Dựng max-heap, pop k lần | O(n + k log n) | O(n) |
| Quickselect | O(n) trung bình, O(n²) tệ nhất | O(1) |

JavaScript không có heap dựng sẵn, nên khi phỏng vấn bạn hoặc viết nhanh một heap dựa trên mảng (bubble up / sink down), hoặc nói rõ là sẽ dùng heap rồi tập trung vào logic chính.

Bài toán **khoảng** (intervals) gần như luôn bắt đầu bằng việc sắp xếp theo điểm đầu, rồi quét một lượt:

```js
function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [sorted[0].slice()];

  for (let i = 1; i < sorted.length; i++) {
    const [start, end] = sorted[i];
    const last = merged[merged.length - 1];

    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  return merged;
}
// O(n log n) time (the sort dominates), O(n) space
```

```text
input:   [1,3] [8,10] [2,6] [15,18]
sorted:  [1,3] [2,6] [8,10] [15,18]
merged:  [1,6]       [8,10] [15,18]
```

---

## 7. Cây và đồ thị: duyệt kiểu nào?

| Câu hỏi | Công cụ |
|---|---|
| In theo từng tầng, độ sâu nhỏ nhất, node gần nhất | BFS (queue) |
| Thứ tự tăng dần của BST | DFS in-order |
| Sao chép / serialize một cây | DFS pre-order |
| Xoá cây, tính chiều cao hoặc tổng cây con | DFS post-order |
| Đường đi ngắn nhất, không trọng số | BFS |
| Đường đi ngắn nhất, trọng số không âm | Dijkstra |
| Sắp thứ tự công việc có điều kiện tiên quyết, phát hiện chu trình | Topological sort (Kahn hoặc DFS) |
| Truy vấn động "cùng thành phần không?" | Union-find |
| Nối mọi node với tổng chi phí nhỏ nhất | Cây khung nhỏ nhất – MST (Kruskal / Prim) |

Trên cây, BFS có thể giữ cả một tầng trong queue (O(w), cây rộng thì tốn), còn DFS giữ một đường từ gốc đến lá trên stack (O(h), cây sâu thì tốn).

Lưới (grid) là một đồ thị trá hình — mỗi ô là một đỉnh với tối đa bốn cạnh. Mẫu BFS:

```js
function shortestPathInGrid(grid, start, goal) {
  const rows = grid.length;
  const cols = grid[0].length;
  const dist = Array.from({ length: rows }, () => Array(cols).fill(-1));
  const queue = [start];
  let head = 0; // read index instead of O(n) shift()
  dist[start[0]][start[1]] = 0;

  while (head < queue.length) {
    const [r, c] = queue[head++];

    if (r === goal[0] && c === goal[1]) return dist[r][c];

    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      const inside = nr >= 0 && nr < rows && nc >= 0 && nc < cols;

      if (inside && grid[nr][nc] === 0 && dist[nr][nc] === -1) {
        dist[nr][nc] = dist[r][c] + 1;
        queue.push([nr, nc]);
      }
    }
  }

  return -1;
}
// 0 = open, 1 = wall. O(rows * cols) time and space
```

Đánh dấu ô là đã thăm **ngay khi đưa vào queue**, không phải khi lấy ra — nếu không, cùng một ô có thể bị đưa vào queue rất nhiều lần.

---

## 8. Backtracking, greedy hay quy hoạch động?

Cả ba đều giải các bài "chọn một chuỗi quyết định". Khác biệt nằm ở điều bạn biết về các lựa chọn:

| Câu hỏi tự đặt ra | Nếu đúng |
|---|---|
| Có phải liệt kê **mọi** tổ hợp / cách sắp xếp hợp lệ? | Backtracking (quay lui) |
| Có lựa chọn cục bộ nào **được chứng minh luôn an toàn** (lập luận hoán đổi)? | Greedy (tham lam) |
| Bài toán con có **lặp lại**, và đáp án tối ưu có dựng từ đáp án tối ưu của bài con? | Quy hoạch động (DP) |

```text
          need all solutions? --yes--> backtracking (+ pruning)
                 |
                 no (need count / min / max)
                 |
     safe local choice proven? --yes--> greedy
                 |
                 no
                 |
   overlapping subproblems? --yes--> DP (memo or table)
```

Mẫu backtracking — chọn, khám phá, bỏ chọn:

```js
function subsets(nums) {
  const result = [];
  const path = [];

  function backtrack(start) {
    result.push([...path]);

    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]); // choose
      backtrack(i + 1);   // explore
      path.pop();         // un-choose
    }
  }

  backtrack(0);

  return result;
}
// O(n * 2^n) time and space
```

Cái bẫy kinh điển: đổi tiền với các đồng `[1, 3, 4]` và số tiền 6. Greedy lấy 4 + 1 + 1 (3 đồng); DP tìm ra 3 + 3 (2 đồng). Khi không chứng minh được lựa chọn tham lam là đúng, hãy quay về DP.

---

## 9. Bảng độ phức tạp tổng hợp: cấu trúc dữ liệu

Mặc định là trường hợp trung bình; trường hợp tệ nhất ghi trong ngoặc vuông nếu khác.

| Cấu trúc | Truy cập | Tìm kiếm | Chèn | Xoá | Bộ nhớ |
|---|---|---|---|---|---|
| Array (động) | O(1) | O(n) | O(1) amortized ở cuối, O(n) ở đầu/giữa | O(1) ở cuối, O(n) chỗ khác | O(n) |
| Singly linked list | O(n) | O(n) | O(1) ở đầu/cuối | O(1) ở đầu, O(n) ở cuối | O(n) |
| Doubly linked list | O(n) | O(n) | O(1) ở hai đầu | O(1) ở hai đầu hoặc node đã biết | O(n) |
| Stack / Queue | O(n) | O(n) | O(1) | O(1) | O(n) |
| Hash table / Map / Set | — | O(1) [O(n)] | O(1) [O(n)] | O(1) [O(n)] | O(n) |
| BST cân bằng (AVL, red-black) | O(log n) | O(log n) | O(log n) | O(log n) | O(n) |
| BST không cân bằng | O(log n) [O(n)] | O(log n) [O(n)] | O(log n) [O(n)] | O(log n) [O(n)] | O(n) |
| Binary heap | O(1) xem đỉnh | O(n) | O(log n) | O(log n) lấy đỉnh | O(n) |
| Trie (từ dài L) | — | O(L) | O(L) | O(L) | O(tổng số ký tự) |
| Union-find (đủ cả hai tối ưu) | — | O(α(n)) find | O(α(n)) union | — | O(n) |

Đồ thị với V đỉnh và E cạnh:

| Thao tác | Adjacency list | Adjacency matrix |
|---|---|---|
| Bộ nhớ | O(V + E) | O(V²) |
| Thêm đỉnh | O(1) | O(V²) |
| Thêm cạnh | O(1) | O(1) |
| Xoá cạnh | O(E) | O(1) |
| Xoá đỉnh | O(V + E) | O(V²) |
| Có cạnh u–v không? | O(deg(u)) | O(1) |

Dựng heap từ n phần tử bằng heapify là **O(n)**, không phải O(n log n). α(n) là hàm Ackermann ngược — không quá 4 với mọi n thực tế, nên coi như hằng số.

---

## 10. Bảng độ phức tạp tổng hợp: thuật toán

**Sắp xếp**

| Thuật toán | Tốt nhất | Trung bình | Tệ nhất | Bộ nhớ phụ | Ổn định (stable) |
|---|---|---|---|---|---|
| Bubble sort (dừng sớm) | O(n) | O(n²) | O(n²) | O(1) | Có |
| Selection sort | O(n²) | O(n²) | O(n²) | O(1) | Không |
| Insertion sort | O(n) | O(n²) | O(n²) | O(1) | Có |
| Merge sort | O(n log n) | O(n log n) | O(n log n) | O(n) | Có |
| Quick sort | O(n log n) | O(n log n) | O(n²) | O(log n) trung bình, O(n) tệ nhất | Không |
| Heap sort | O(n log n) | O(n log n) | O(n log n) | O(1) | Không |
| Counting sort (miền giá trị k) | O(n + k) | O(n + k) | O(n + k) | O(n + k) | Có |
| Radix sort (d chữ số, cơ số b) | O(d(n + b)) | O(d(n + b)) | O(d(n + b)) | O(n + b) | Có |

**Tìm kiếm, đồ thị, đệ quy**

| Thuật toán | Time | Space |
|---|---|---|
| Linear search | O(n) | O(1) |
| Binary search (vòng lặp) | O(log n) | O(1) |
| Tìm chuỗi ngây thơ (văn bản n, mẫu m) | O(n · m) | O(1) |
| KMP | O(n + m) | O(m) |
| BFS / DFS trên đồ thị | O(V + E) | O(V) |
| Dijkstra với binary heap | O((V + E) log V) | O(V) |
| Dijkstra quét mảng thường | O(V²) | O(V) |
| Topological sort | O(V + E) | O(V) |
| Kruskal (MST) | O(E log E) | O(V + E) |
| Prim (MST) với heap | O(E log V) | O(V) |
| Fibonacci đệ quy ngây thơ | O(2ⁿ) | O(n) |
| Fibonacci có memo hoặc bảng | O(n) | O(n), O(1) nếu chỉ giữ hai biến |
| Tập con / hoán vị (backtracking) | O(n · 2ⁿ) / O(n · n!) | O(n) đệ quy + output |

Sắp xếp dựa trên so sánh không thể nhanh hơn **O(n log n)** trong trường hợp tệ nhất; counting sort và radix sort thoát được giới hạn này chỉ vì chúng không so sánh các phần tử.

---

## 11. Cơ bản về bit manipulation

Số được lưu ở dạng nhị phân, và các toán tử bitwise làm việc trên từng bit. Trong JavaScript, chúng chuyển toán hạng thành **số nguyên có dấu 32-bit** trước.

- `a & b` — **AND**: bằng 1 chỉ khi cả hai bit là 1. `13 & 6` là `4`.
- `a | b` — **OR**: bằng 1 nếu một trong hai bit là 1. `13 | 6` là `15`.
- `a ^ b` — **XOR**: bằng 1 nếu hai bit khác nhau. `13 ^ 6` là `11`.
- `~a` — **NOT**: lật mọi bit. `~5` là `-6`.
- `a << k` — **dịch trái**, nhân với 2ᵏ. `13 << 1` là `26`.
- `a >> k` — **dịch phải**, giữ dấu, chia cho 2ᵏ làm tròn xuống. `13 >> 1` là `6`.
- `a >>> k` — **dịch phải không dấu**, điền số 0. `-1 >>> 0` là `4294967295`.

```text
 13  = 1101
  6  = 0110
 ----------
 AND = 0100 = 4
 OR  = 1111 = 15
 XOR = 1011 = 11
```

Những mẹo thực sự hay gặp:

```js
const isOdd = (n) => (n & 1) === 1;
const isPowerOfTwo = (n) => n > 0 && (n & (n - 1)) === 0;
const getBit = (n, i) => (n >> i) & 1;
const setBit = (n, i) => n | (1 << i);
const clearBit = (n, i) => n & ~(1 << i);
const toggleBit = (n, i) => n ^ (1 << i);

function countSetBits(n) {
  let count = 0;

  while (n !== 0) {
    n &= n - 1; // clears the lowest set bit
    count++;
  }

  return count;
}
// O(number of set bits), at most 32 iterations

function singleNumber(nums) {
  let x = 0;

  for (const n of nums) {
    x ^= n; // a ^ a = 0 and a ^ 0 = a, so pairs cancel
  }

  return x;
}
// O(n) time, O(1) space
```

`n & (n - 1)` hoạt động vì trừ 1 sẽ lật bit 1 thấp nhất và mọi bit 0 phía dưới nó: `12 = 1100`, `11 = 1011`, AND ra `1000`. Luỹ thừa của 2 có đúng một bit 1, nên kết quả bằng 0. Một **bitmask** n bit cũng có thể biểu diễn một tập con của n phần tử: cho `mask` chạy từ 0 đến 2ⁿ − 1 là liệt kê được mọi tập con.

Cạm bẫy: `1 << 31` ra số âm trong JavaScript vì bit 31 là bit dấu; dùng `>>> 0` để đọc giá trị dưới dạng không dấu.

---

## 12. Checklist khi phỏng vấn

Một đáp án đúng nhưng im lặng khi làm thường bị chấm thấp hơn một đáp án chậm hơn chút nhưng được giải thích rõ ràng. Lần nào cũng đi theo cùng một vòng:

```text
1. Clarify     input types, size limits, sorted?, duplicates?, negatives?,
               empty input?, what to return when there is no answer
2. Examples    one normal case, one edge case — work them by hand
3. Brute force say it and its complexity, even if it is slow
4. Optimise    find the bottleneck, repeated work, unneeded work;
               match the signals to a pattern (section 3)
5. Plan        agree on the approach before coding
6. Code        clear names, small helpers, no premature cleverness
7. Test        trace your examples through the code; then empty,
               single element, all equal, very large values
8. Analyse     state time AND space, including recursion stack
```

Các edge case hay làm người ta vấp: mảng hoặc chuỗi rỗng, chỉ một phần tử, mọi phần tử bằng nhau, số âm, tràn số (dùng `BigInt` khi vượt `Number.MAX_SAFE_INTEGER`), lệch một (off-by-one) ở biên binary search, chu trình trong đồ thị, và sửa trực tiếp input khi người gọi không mong đợi.

Khi bị bí, hãy nói ra suy nghĩ: "hai vòng lặp lồng cho O(n²); mình đang tìm đi tìm lại một giá trị, nên hash map có thể đưa bước đó về O(1)". Người phỏng vấn đánh giá cao quá trình suy luận mà họ nhìn thấy được.

---

## Điểm cần nhớ khi phỏng vấn

- Đọc **ràng buộc trước tiên**: n ≤ 20 gợi ý hàm mũ, n ≤ 10⁵ gợi ý O(n log n) hoặc tốt hơn.
- Chọn cấu trúc theo **thao tác cần nhanh**: theo index → array, theo key → hash map, min/max → heap, thứ tự → BST cân bằng, tiền tố → trie.
- Input đã sắp xếp → **two pointers hoặc binary search**; đoạn liên tiếp → **sliding window**; top k → **heap kích thước k**; khoảng → **sort rồi quét**.
- Đường ngắn nhất không trọng số → **BFS**; trọng số không âm → **Dijkstra**; phụ thuộc → **topological sort**; liên thông → **union-find**.
- Mọi lời giải → **backtracking**; lựa chọn cục bộ được chứng minh an toàn → **greedy**; bài toán con chồng lấn → **DP**.
- Thuộc các bảng tổng hợp: hash O(1) trung bình nhưng O(n) tệ nhất, quick sort O(n²) tệ nhất, heapify O(n), BFS/DFS O(V + E).
- Bit: `n & (n - 1)` xoá bit 1 thấp nhất, XOR triệt tiêu các cặp, bitwise trong JS làm việc trên số nguyên có dấu 32-bit.
- Luôn luôn: làm rõ đề, brute force, tối ưu, code, test edge case, nêu **cả time lẫn space**.

## Tóm tắt

- Kích thước input quyết định độ phức tạp mục tiêu; hình dạng input và câu hỏi của đề chỉ ra pattern.
- Cấu trúc dữ liệu được chọn theo thao tác nhanh nhất của nó, và mỗi lựa chọn là một trade-off đáng nói ra.
- Các pattern cốt lõi — two pointers, sliding window, prefix sums, hashing, binary search trên đáp án, heap, quét khoảng, BFS/DFS, backtracking, greedy và DP — bao phủ phần lớn bài phỏng vấn.
- Các bảng tổng hợp tóm tắt chi phí của mọi cấu trúc và thuật toán trong khoá học.
- Bit manipulation cho kiểm tra chẵn lẻ, luỹ thừa của 2 và từng bit trong O(1), cùng mẹo XOR và tập con bằng bitmask.
- Một checklist lặp lại được — làm rõ, ví dụ, brute force, tối ưu, code, test, phân tích — quan trọng không kém bản thân thuật toán.
