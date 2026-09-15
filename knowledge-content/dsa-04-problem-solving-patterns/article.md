# Các mẫu giải thuật – Frequency Counter, Multiple Pointers, Sliding Window, Divide & Conquer

## 1. Vì sao cần học các mẫu giải thuật

Quy trình 5 bước ở bài trước dạy bạn *cách suy nghĩ*. Các **mẫu giải thuật** (problem-solving pattern) cho bạn biết *nên thử cái gì*. Rất nhiều bài phỏng vấn chỉ là biến thể của một vài "khuôn" quen thuộc, và nhận ra đúng khuôn thường biến một lời giải vét cạn O(n²) thành O(n) hoặc O(log n).

| Mẫu | Ý tưởng cốt lõi | Lợi ích điển hình |
|---|---|---|
| Frequency counter | Đếm giá trị bằng object / Map rồi so sánh số đếm | O(n²) → O(n) |
| Multiple pointers | Các chỉ số di chuyển về phía nhau hoặc cùng chiều theo một điều kiện | O(n²) → O(n), O(1) space |
| Sliding window | Giữ một đoạn con đang chạy và cập nhật nó dần dần | O(n·k) → O(n) |
| Divide and conquer | Chia input, giải từng phần, rồi gộp lại | O(n) → O(log n), O(n²) → O(n log n) |

Quy hoạch động (dynamic programming), tham lam (greedy) và quay lui (backtracking) cũng là các mẫu, nhưng sẽ có bài riêng. Nguyên tắc chung cho cả bài này: **viết ra độ phức tạp của lời giải ngây thơ trước, rồi hỏi mẫu nào loại bỏ được phần việc bị lặp lại.**

---

## 2. Frequency counter (bộ đếm tần suất)

**Frequency counter** gom các giá trị (hoặc số lần mỗi giá trị xuất hiện) vào một object, `Map` hay `Set`, để câu hỏi "giá trị này có không, và có mấy lần?" trở thành một phép tra cứu O(1) thay vì phải quét lại mảng.

Bài toán: `same(arr1, arr2)` trả về `true` nếu mọi giá trị trong `arr1` đều có bình phương của nó trong `arr2`, với cùng tần suất.

```js
same([1, 2, 3], [4, 1, 9]); // true
same([1, 2, 3], [1, 9]);    // false
same([1, 2, 1], [4, 4, 1]); // false (frequencies differ)
```

**Cách ngây thơ:** duyệt `arr1`; với mỗi giá trị, gọi `arr2.indexOf(val ** 2)` để tìm bình phương rồi `arr2.splice(index, 1)` để xoá nó. Trông như chỉ có một vòng lặp, nhưng `indexOf` và `splice` đều là vòng lặp O(n) ẩn, nên tổng cộng là **O(n²)** — và còn làm thay đổi mảng của người gọi.

**Frequency counter:** một lượt để đếm các bình phương, một lượt để "tiêu" chúng.

```js
function same(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;

  const counts = new Map();

  for (const val of arr1) {
    const square = val * val;
    counts.set(square, (counts.get(square) || 0) + 1);
  }

  for (const val of arr2) {
    const remaining = counts.get(val) || 0;

    if (remaining === 0) return false;

    counts.set(val, remaining - 1);
  }

  return true;
}
// Time O(n), space O(n)
```

Hai vòng lặp nối tiếp là O(2n) = O(n). Vì hai mảng dài bằng nhau và mỗi giá trị trong `arr2` tiêu đúng một lần đếm, không thể còn số đếm nào dư lại.

---

## 3. Frequency counter trong thực tế: anagram

Hai chuỗi là **anagram** nếu chuỗi này là cách sắp xếp lại các chữ cái của chuỗi kia (`"cinema"` / `"iceman"`).

```js
function validAnagram(first, second) {
  if (first.length !== second.length) return false;

  const lookup = {};

  for (const char of first) {
    lookup[char] = (lookup[char] || 0) + 1;
  }

  for (const char of second) {
    if (!lookup[char]) return false; // missing, or already used up

    lookup[char] -= 1;
  }

  return true;
}

validAnagram('anagram', 'nagaram'); // true
validAnagram('aaz', 'zza');         // false
```

**O(n) time**; space là O(k) với k ký tự khác nhau, tức **O(1)** nếu bảng chữ cái cố định như `a–z`. Sắp xếp hai chuỗi rồi so sánh cũng được, nhưng tốn O(n log n).

Nếu bỏ phần kiểm tra độ dài, `validAnagram('abc', 'ab')` sẽ trả về `true`: vòng lặp thứ hai không bao giờ phát hiện ra chữ `'c'` chưa được dùng.

**Object hay Map?** Một `{}` thường biến mọi key thành string (`1` và `"1"` bị trùng) và kế thừa các key như `constructor`. Đếm chữ cái thì ổn; đếm từ tuỳ ý thì nên dùng `Map`.

---

## 4. Multiple pointers (nhiều con trỏ)

**Multiple pointers** giữ hai hay nhiều chỉ số (**con trỏ** — pointer) và di chuyển chúng về đầu, cuối hoặc giữa dựa trên một điều kiện. Mẫu này thường cần input **đã sắp xếp** và chỉ dùng **O(1) bộ nhớ phụ**.

Bài toán: `sumZero(sortedArr)` trả về cặp đầu tiên có tổng bằng 0, hoặc `undefined`.

Cách ngây thơ kiểm tra mọi cặp bằng hai vòng lặp lồng nhau: O(n²) time, O(1) space. Dùng hai con trỏ, mỗi con ở một đầu:

```js
function sumZero(arr) {
  let left = 0;
  let right = arr.length - 1;

  while (left < right) {
    const sum = arr[left] + arr[right];

    if (sum === 0) {
      return [arr[left], arr[right]];
    } else if (sum > 0) {
      right--;
    } else {
      left++;
    }
  }
}
// Time O(n), space O(1)
```

```text
arr = [-4, -3, -2, -1, 0, 1, 2, 5]
        L                       R    -4 + 5 =  1  > 0  -> R--
        L                    R       -4 + 2 = -2  < 0  -> L++
            L                R       -3 + 2 = -1  < 0  -> L++
                L            R       -2 + 2 =  0       -> return [-2, 2]
```

**Vì sao được phép bỏ qua:** nếu `arr[left] + arr[right] > 0` thì `arr[right]` quá lớn ngay cả khi ghép với giá trị *nhỏ nhất* còn lại, nên nó không thể nằm trong đáp án nào — loại nó. Lập luận đối xứng cho phép loại `arr[left]` khi tổng âm. Mỗi bước loại một ứng viên, nên có tối đa n − 1 bước.

---

## 5. Các cách bố trí con trỏ khác

Con trỏ không phải lúc nào cũng bắt đầu từ hai đầu.

**Cùng chiều (chậm / nhanh)** — `countUniqueValues(sortedArr)`:

```js
function countUniqueValues(arr) {
  if (arr.length === 0) return 0;

  let i = 0; // last unique slot

  for (let j = 1; j < arr.length; j++) {
    if (arr[j] !== arr[i]) {
      i++;
      arr[i] = arr[j]; // compact uniques to the front (mutates arr)
    }
  }

  return i + 1;
}
// Time O(n), space O(1)
```

```text
[1, 1, 2, 3, 3, 4]   i=0 j=1  equal, skip
 i  j
[1, 2, 2, 3, 3, 4]   j=2 differs -> i=1, arr[1]=2
    i  j
[1, 2, 3, 3, 3, 4]   j=3 differs -> i=2, arr[2]=3   (j=4 equal, skip)
       i  j
[1, 2, 3, 4, 3, 4]   j=5 differs -> i=3, arr[3]=4   => return 4
          i     j
```

Nếu không được sửa input, hãy đếm số lần `arr[j] !== arr[j - 1]` — vẫn O(n) / O(1).

**Mỗi input một con trỏ** — ví dụ kiểm tra `'abc'` có phải dãy con (subsequence) của `'abracadabra'` không: duyệt chuỗi dài, và mỗi lần khớp thì tiến con trỏ trên chuỗi ngắn. O(n) time, O(1) space.

| Cách bố trí | Ví dụ |
|---|---|
| Hai đầu, tiến vào giữa | tìm cặp có tổng cho trước trong mảng đã sắp xếp, kiểm tra palindrome, đảo mảng tại chỗ |
| Chậm / nhanh, cùng chiều | xoá phần tử trùng, dồn số 0, đếm giá trị khác nhau |
| Mỗi dãy một con trỏ | trộn hai mảng đã sắp xếp, kiểm tra dãy con |

---

## 6. Sliding window (cửa sổ trượt) cố định

**Sliding window** là một đoạn liên tiếp `[start, end]` trên mảng hoặc chuỗi. Thay vì tính lại cả đoạn từ đầu, ta cập nhật nó khi trượt: cộng phần tử đi vào, trừ phần tử đi ra.

Bài toán: `maxSubarraySum(arr, k)` — tổng lớn nhất của `k` phần tử liên tiếp.

Cách ngây thơ cộng lại `k` phần tử cho mỗi vị trí bắt đầu `0…n - k`: **O((n − k + 1) · k) = O(n·k)**, tức O(n²) khi k tăng theo n. Hai cửa sổ kề nhau có chung k − 1 phần tử, nên phần lớn công việc bị lặp lại.

```js
function maxSubarraySum(arr, k) {
  if (k <= 0 || k > arr.length) return null;

  let windowSum = 0;

  for (let i = 0; i < k; i++) {
    windowSum += arr[i];
  }

  let maxSum = windowSum;

  for (let i = k; i < arr.length; i++) {
    windowSum += arr[i] - arr[i - k]; // add entering, drop leaving
    maxSum = Math.max(maxSum, windowSum);
  }

  return maxSum;
}
// Time O(n), space O(1)
```

```text
arr = [1, 2, 5, 2, 8, 1, 5], k = 2
[1  2] 5  2  8  1  5    sum = 3
 1 [2  5] 2  8  1  5    3 - 1 + 5 = 7
 1  2 [5  2] 8  1  5    7 - 2 + 2 = 7
 1  2  5 [2  8] 1  5    7 - 5 + 8 = 10   <- max
 1  2  5  2 [8  1] 5    10 - 2 + 1 = 9
 1  2  5  2  8 [1  5]   9 - 8 + 5 = 6
```

Lưu ý `maxSum` bắt đầu bằng tổng của cửa sổ đầu tiên chứ không phải 0 — khởi tạo bằng 0 sẽ cho kết quả sai với mảng toàn số âm.

---

## 7. Sliding window có kích thước thay đổi

Khi không cho trước kích thước cửa sổ, ta mở rộng mép phải và **thu hẹp mép trái chừng nào điều kiện còn thoả** (hoặc cho đến khi điều kiện được khôi phục).

Bài toán: độ dài của đoạn con liên tiếp ngắn nhất có tổng ≥ `target` (mọi số đều dương).

```js
function minSubArrayLen(nums, target) {
  let left = 0;
  let sum = 0;
  let best = Infinity;

  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];

    while (sum >= target) {
      best = Math.min(best, right - left + 1);
      sum -= nums[left];
      left++;
    }
  }

  return best === Infinity ? 0 : best;
}

minSubArrayLen([2, 3, 1, 2, 4, 3], 7); // 2  ([4, 3])
```

Một `while` nằm trong `for` trông như O(n²), nhưng **mỗi chỉ số vào cửa sổ đúng một lần và ra tối đa một lần** (`left` di chuyển tổng cộng không quá n lần), nên đây là **O(n) time, O(1) space**.

Cách này dựa vào việc các số **không âm**: thêm phần tử không bao giờ làm tổng giảm, bỏ phần tử không bao giờ làm tổng tăng. Nếu có số âm, việc thu hẹp không còn an toàn.

Kết hợp với frequency counter — chuỗi con dài nhất không có ký tự lặp:

```js
function findLongestSubstring(str) {
  const lastSeen = new Map();
  let start = 0;
  let longest = 0;

  for (let end = 0; end < str.length; end++) {
    const char = str[end];

    if (lastSeen.has(char) && lastSeen.get(char) >= start) {
      start = lastSeen.get(char) + 1; // jump past the previous copy
    }

    lastSeen.set(char, end);
    longest = Math.max(longest, end - start + 1);
  }

  return longest;
}

findLongestSubstring('thisisawesome'); // 6 ("awesom")
```

Time O(n); space O(k) cho các ký tự khác nhau.

---

## 8. Chia để trị: binary search

**Chia để trị** (divide and conquer) chia dữ liệu thành các phần nhỏ hơn rồi lặp lại quá trình trên một tập con. Dạng đơn giản nhất là vứt bỏ một nửa input sau mỗi bước.

Bài toán: trả về chỉ số của `val` trong một mảng **đã sắp xếp**, hoặc −1. Linear search là O(n). **Tìm kiếm nhị phân** (binary search):

```js
function search(arr, val) {
  let min = 0;
  let max = arr.length - 1;

  while (min <= max) {
    const middle = Math.floor((min + max) / 2);

    if (arr[middle] < val) {
      min = middle + 1;
    } else if (arr[middle] > val) {
      max = middle - 1;
    } else {
      return middle;
    }
  }

  return -1;
}
// Time O(log n), space O(1)
```

```text
arr = [1, 3, 5, 7, 9, 11, 13, 15, 17], val = 15
       0  1  2  3  4   5   6   7   8
step 1: min=0 max=8 middle=4  arr[4]=9  < 15 -> min=5
step 2: min=5 max=8 middle=6  arr[6]=13 < 15 -> min=7
step 3: min=7 max=8 middle=7  arr[7]=15      -> return 7
```

Một triệu phần tử chỉ cần tối đa khoảng 20 bước. Điều kiện là `min <= max` (không phải `<`) để đoạn chỉ còn một phần tử vẫn được kiểm tra. Binary search sẽ có bài riêng (các biến thể off-by-one, tìm vị trí xuất hiện đầu/cuối).

---

## 9. Chia để trị tổng quát

Mẫu đầy đủ có ba bước: **chia** (divide) bài toán thành các bài toán con nhỏ hơn, **trị** (conquer) từng bài con (thường bằng đệ quy — hàm tự gọi lại chính nó với input nhỏ hơn cho tới base case), rồi **gộp** (combine) kết quả.

Ví dụ: tính `base^exp`. Vòng lặp nhân `exp` lần — O(n). Chia để trị dùng `x^n = (x^(n/2))²`:

```js
function power(base, exp) {
  if (exp === 0) return 1;

  const half = power(base, Math.floor(exp / 2));

  return exp % 2 === 0 ? half * half : half * half * base;
}

power(2, 10); // 1024
// Time O(log n), space O(log n) for the call stack
```

Chỉ tính `half` **một lần**: gọi `power` hai lần ở mỗi tầng sẽ thành T(n) = 2T(n/2) + O(1), tức lại là O(n).

Merge sort (bài sau) chia làm hai nửa và trộn trong O(n):

```text
level 0          [8 3 5 1 7 2 6 4]           n work to merge
level 1      [8 3 5 1]     [7 2 6 4]         n work in total
level 2    [8 3] [5 1]   [7 2] [6 4]         n work in total
level 3   [8][3][5][1]  [7][2][6][4]         log n levels
=> O(n) per level × log n levels = O(n log n)
```

| Dạng | Công thức truy hồi | Độ phức tạp |
|---|---|---|
| Bỏ một nửa, O(1) việc | T(n) = T(n/2) + O(1) | O(log n) |
| Hai nửa, gộp O(n) | T(n) = 2T(n/2) + O(n) | O(n log n) |

---

## 10. Chọn mẫu nào

Đọc đề để tìm **tín hiệu**:

| Tín hiệu trong đề | Nên thử |
|---|---|
| "Cùng giá trị / anagram / trùng lặp / đếm", so sánh hai tập hợp | Frequency counter (Map / Set) |
| Mảng đã sắp xếp + tìm cặp / bộ ba theo target | Multiple pointers từ hai đầu |
| Nén tại chỗ, xoá phần tử trùng | Con trỏ chậm / nhanh |
| "Liên tiếp", "consecutive", "substring", "subarray" dài k hoặc thoả điều kiện | Sliding window |
| Dữ liệu đã sắp xếp + "tìm", hoặc "chia đôi bài toán" | Binary search / chia để trị |
| Bài toán tách được thành các nửa độc lập | Chia để trị (đệ quy) |

---

## 11. Đánh đổi thời gian và bộ nhớ

Một bài thường có hai lời giải tốt. **Tìm cặp có tổng bằng target trong mảng chưa sắp xếp:**

```js
// Option A: Set lookup (frequency-counter idea)
function hasPairWithSum(arr, target) {
  const seen = new Set();

  for (const x of arr) {
    if (seen.has(target - x)) return true;

    seen.add(x);
  }

  return false;
}
// Time O(n), space O(n)
```

**Cách B:** sắp xếp bằng `arr.sort((a, b) => a - b)`, rồi chạy vòng lặp hai con trỏ ở mục 4 với `target` thay cho 0.

| Cách | Time | Bộ nhớ phụ | Ghi chú |
|---|---|---|---|
| A: Set | O(n) | O(n) | Không động vào input |
| B: sort + hai con trỏ | O(n log n) + O(n) = O(n log n) | O(1) cho con trỏ, cộng phần bộ nhớ của thuật toán sort | Sort tại chỗ làm thay đổi input |

Hãy nói rõ trade-off này khi phỏng vấn — "nếu bộ nhớ bị giới hạn thì sao?" là câu hỏi tiếp theo rất hay gặp.

---

## 12. Các lỗi thường gặp

- **Dùng con trỏ hoặc binary search trên dữ liệu chưa sắp xếp.** Loại bỏ dựa trên so sánh cần có thứ tự: binary search trên `[5, 1, 4, 2, 3]` để tìm `1` trả về −1.
- **Quên chi phí sắp xếp.** Sort + hai con trỏ là O(n log n), và `sort()` không có `(a, b) => a - b` sẽ so sánh như string.
- **Số âm trong cửa sổ tính tổng.** Logic "thu hẹp khi còn thoả" giả định mọi giá trị không âm.
- **Sai lệch biên (off-by-one).** Cửa sổ cuối cùng kích thước k bắt đầu tại `n - k`.
- **Vòng lặp ẩn và sửa input.** `indexOf`/`splice` trong vòng lặp đưa bạn về O(n²); `countUniqueValues` ghi đè lên input.
- **Khởi tạo max bằng 0.** Sai với input toàn số âm; hãy bắt đầu từ một giá trị thật hoặc `-Infinity`.

---

## Điểm cần nhớ khi phỏng vấn

- Nêu **độ phức tạp của cách ngây thơ trước**, rồi gọi tên mẫu loại bỏ phần việc lặp lại.
- **Frequency counter**: O(n) time đổi lấy O(n) space (O(1) nếu bảng chữ cái cố định); dùng `Map` cho key tuỳ ý.
- **Multiple pointers** cần input có thứ tự; giải thích được mỗi bước di chuyển ("phần tử này không thể nằm trong đáp án nào").
- **Sliding window**: từ khoá là "liên tiếp"; cửa sổ thay đổi kích thước vẫn O(n) vì mỗi chỉ số vào và ra một lần.
- **Chia để trị**: chia đôi → O(log n); hai nửa + gộp tuyến tính → O(n log n).
- **Set so với sort + hai con trỏ**: O(n) time / O(n) space so với O(n log n) time / O(1) bộ nhớ phụ.

## Tóm tắt

- Các mẫu giải thuật là những "khuôn" tái sử dụng giúp giảm độ phức tạp của lời giải vét cạn.
- Frequency counter: đếm bằng Map/object rồi so sánh số đếm — `same`, anagram.
- Multiple pointers: hai đầu, chậm/nhanh, hoặc mỗi input một con trỏ — `sumZero`, `countUniqueValues`, kiểm tra dãy con.
- Sliding window: cố định (`maxSubarraySum`) hoặc thay đổi (`minSubArrayLen`, chuỗi con dài nhất không lặp), đều O(n).
- Chia để trị: binary search O(log n), luỹ thừa nhanh O(log n), merge sort O(n log n).
- Chọn mẫu dựa vào tín hiệu trong đề, và luôn nêu cả time lẫn space.
