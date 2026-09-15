# Merge Sort & Quick Sort – Sắp xếp O(n log n)

## 1. Vì sao các thuật toán O(n²) là chưa đủ

Bubble sort, selection sort và insertion sort đơn giản, nhưng chúng so sánh các phần tử theo từng cặp, nên ở trường hợp trung bình và xấu nhất đều là **O(n²)**. Với 50 phần tử thì ổn, với 100.000 phần tử thì vô vọng:

| n | n² phép so sánh | n log₂ n phép so sánh |
|---|---|---|
| 1.000 | 1.000.000 | ~10.000 |
| 100.000 | 10.000.000.000 | ~1.700.000 |
| 1.000.000 | 10¹² | ~20.000.000 |

Với khoảng 10⁸ phép toán đơn giản mỗi giây, bubble sort trên 100.000 phần tử mất cỡ 100 giây; một thuật toán O(n log n) xong trong vài mili-giây.

Có một họ thuật toán đưa việc sắp xếp xuống **O(n log n)**. Cái giá phải trả là **sự đơn giản**: chúng dùng đệ quy và khó hiểu hơn. Bài này đi qua hai thuật toán quan trọng nhất — **merge sort** (sắp xếp trộn) và **quick sort** (sắp xếp nhanh).

---

## 2. Ý tưởng chung: chia để trị

Cả hai dựa trên một nhận xét: **mảng có 0 hoặc 1 phần tử thì đã được sắp xếp**. Đó chính là base case của đệ quy (nhắc lại từ bài đệ quy: mọi hàm đệ quy cần một base case và một input nhỏ dần sau mỗi lời gọi).

Sau đó cả hai áp dụng **chia để trị** (divide and conquer), nhưng đặt phần việc khó ở hai chỗ khác nhau:

| | Bước chia | Bước gộp |
|---|---|---|
| **Merge sort** | Dễ: cắt mảng làm đôi theo chỉ số | Khó: **trộn** (merge) hai nửa đã sắp xếp |
| **Quick sort** | Khó: **phân hoạch** (partition) quanh một pivot | Dễ: không phải làm gì, mảng đã được sắp xếp tại chỗ |

Mẹo nhớ: merge sort **chia mù quáng, trộn cẩn thận**; quick sort **phân hoạch cẩn thận, không bao giờ trộn**.

---

## 3. Hàm phụ merge

Trước khi viết merge sort, ta viết hàm **trộn hai mảng đã sắp xếp** thành một mảng mới cũng đã sắp xếp. Hàm phải chạy trong **O(n + m)** thời gian và bộ nhớ, và không được sửa các mảng đầu vào.

Ý tưởng là pattern **hai con trỏ** (two pointers): nhìn giá trị nhỏ nhất chưa dùng ở mỗi mảng, lấy giá trị nhỏ hơn, dịch con trỏ tương ứng. Khi một mảng hết phần tử, chép toàn bộ phần còn lại của mảng kia.

```js
function merge(arr1, arr2) {
  const results = [];
  let i = 0;
  let j = 0;

  while (i < arr1.length && j < arr2.length) {
    // <= takes from the left array on ties, which keeps the sort stable
    if (arr1[i] <= arr2[j]) {
      results.push(arr1[i]);
      i++;
    } else {
      results.push(arr2[j]);
      j++;
    }
  }

  while (i < arr1.length) {
    results.push(arr1[i]);
    i++;
  }

  while (j < arr2.length) {
    results.push(arr2[j]);
    j++;
  }

  return results;
}

merge([1, 10, 50], [2, 14, 99, 100]); // [1, 2, 10, 14, 50, 99, 100]
```

```text
arr1 = [1, 10, 50]      arr2 = [2, 14, 99, 100]

compare 1  vs 2    -> take 1     results [1]
compare 10 vs 2    -> take 2     results [1, 2]
compare 10 vs 14   -> take 10    results [1, 2, 10]
compare 50 vs 14   -> take 14    results [1, 2, 10, 14]
compare 50 vs 99   -> take 50    results [1, 2, 10, 14, 50]
arr1 exhausted     -> copy rest  results [1, 2, 10, 14, 50, 99, 100]
```

Mỗi bước push đúng một phần tử, nên có n + m lần push và tối đa n + m − 1 phép so sánh: **thời gian O(n + m), bộ nhớ O(n + m)**. Bug kinh điển là quên hai vòng lặp "chép phần còn lại" — đuôi của một mảng lặng lẽ biến mất.

---

## 4. Merge sort

Có hàm `merge` rồi thì merge sort rất ngắn:

1. Nếu mảng có 0 hoặc 1 phần tử, trả về nó.
2. Chia mảng làm đôi.
3. Gọi đệ quy merge sort cho từng nửa.
4. Trộn hai nửa đã sắp xếp và trả về kết quả.

```js
function mergeSort(arr) {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  return merge(left, right);
}

mergeSort([8, 3, 5, 4, 7, 6, 1, 2]); // [1, 2, 3, 4, 5, 6, 7, 8]
```

```text
split:            [8, 3, 5, 4, 7, 6, 1, 2]
               [8, 3, 5, 4]        [7, 6, 1, 2]
             [8, 3]   [5, 4]     [7, 6]   [1, 2]
            [8] [3]  [5] [4]    [7] [6]  [1] [2]     <- base cases
merge:       [3, 8]   [4, 5]     [6, 7]   [1, 2]
               [3, 4, 5, 8]        [1, 2, 6, 7]
                  [1, 2, 3, 4, 5, 6, 7, 8]
```

Base case phải là `arr.length <= 1`. Nếu chỉ viết `arr.length === 0`, mảng một phần tử bị chia thành `[]` và `[x]`, rồi `mergeSort([x])` tự gọi lại chính nó mãi cho đến khi tràn stack.

Phiên bản này **trả về một mảng mới** và không đụng vào mảng đầu vào (trừ trường hợp input có 0 hoặc 1 phần tử thì trả về chính tham chiếu đó).

---

## 5. Độ phức tạp và tính ổn định của merge sort

| Tốt nhất | Trung bình | Xấu nhất | Bộ nhớ |
|---|---|---|---|
| O(n log n) | O(n log n) | O(n log n) | O(n) |

**Vì sao là O(n log n)?** Chia đôi n cho đến khi các mảnh còn kích thước 1 mất **log n tầng**. Ở mỗi tầng, các lần trộn cộng lại chạm vào đủ **n phần tử** một lần:

```text
level 0:  1 merge  of size n        -> n work
level 1:  2 merges of size n/2      -> n work
level 2:  4 merges of size n/4      -> n work
...
log n levels x n work per level = O(n log n)
```

Viết dưới dạng hệ thức truy hồi: `T(n) = 2T(n/2) + O(n)`, có nghiệm O(n log n).

**Merge sort không quan tâm thứ tự của input.** Mảng đã sắp xếp sẵn vẫn bị chia và trộn đầy đủ, nên best case cũng là O(n log n). Sự dễ đoán trước này chính là điểm mạnh của nó.

**Bộ nhớ O(n):** các mảng tạm khi trộn chứa tối đa n phần tử, còn call stack chỉ sâu O(log n). (Bản dùng `slice` cấp phát tổng cộng nhiều hơn theo thời gian, nhưng tại mỗi thời điểm lượng bộ nhớ phụ đang sống là O(n).)

**Tính ổn định (stability):** một thuật toán sắp xếp là **stable** nếu các phần tử bằng nhau giữ nguyên thứ tự tương đối ban đầu. Vì `merge` lấy từ nửa trái khi hai giá trị bằng nhau (`<=`), merge sort là stable. Đổi thành `<` thì không còn stable nữa.

---

## 6. Khi nào merge sort toả sáng

- **Linked list.** Trộn bằng cách nối lại các node không cần mảng phụ và không cần truy cập ngẫu nhiên — đây là cách chuẩn để sắp xếp linked list trong O(n log n).
- **Sắp xếp ngoài (external sorting).** Dữ liệu quá lớn so với RAM: sắp xếp từng khúc vừa bộ nhớ, ghi ra đĩa, rồi trộn các file theo thứ tự tuần tự.
- **Đảm bảo worst case.** Không có input nào đẩy được nó lên O(n²).
- **Sắp xếp stable các bản ghi**, ví dụ sắp xếp đơn hàng theo ngày sau khi đã sắp xếp theo khách hàng.
- **Thuật toán lai.** **TimSort** (V8, Python, Java cho object) là một biến thể merge sort biết phát hiện các đoạn đã có thứ tự và dùng insertion sort cho các mảnh nhỏ.

---

## 7. Quick sort: ý tưởng

Quick sort cũng dựa vào việc mảng 0 hoặc 1 phần tử đã được sắp xếp, nhưng hoạt động theo cách khác:

1. Chọn một phần tử làm **pivot** (phần tử chốt).
2. Sắp xếp lại mảng sao cho mọi giá trị **nhỏ hơn** pivot nằm bên trái và mọi giá trị **lớn hơn hoặc bằng** nằm bên phải. Lúc này pivot đã ở đúng **vị trí cuối cùng** của nó trong mảng đã sắp xếp.
3. Lặp lại đệ quy quá trình đó cho phần bên trái và phần bên phải.

```text
[5, 2, 1, 8, 4, 7, 6, 3]   pivot 5
[3, 2, 1, 4] 5 [7, 6, 8]   5 is final
 pivot 3        pivot 7
[1, 2] 3 [4]   [6] 7 [8]
 pivot 1
 1 [2]
result: [1, 2, 3, 4, 5, 6, 7, 8]
```

Khác merge sort, quick sort chạy **tại chỗ** (in place): nó chỉ hoán đổi các phần tử bên trong mảng gốc.

---

## 8. Hàm phụ pivot (partition)

Hàm phụ nhận mảng cùng chỉ số `start` và `end`, chọn pivot, phân hoạch đoạn đó tại chỗ và **trả về chỉ số cuối cùng của pivot**. Thứ tự các phần tử trong mỗi bên không quan trọng.

Cho đơn giản, pivot là **phần tử đầu tiên** của đoạn (hệ quả của lựa chọn này xem ở mục 10).

```js
function swap(arr, i, j) {
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

function pivot(arr, start = 0, end = arr.length - 1) {
  const pivotValue = arr[start];
  let swapIdx = start; // last index holding a value smaller than the pivot

  for (let i = start + 1; i <= end; i++) {
    if (arr[i] < pivotValue) {
      swapIdx++;
      swap(arr, swapIdx, i);
    }
  }

  swap(arr, start, swapIdx); // drop the pivot into its final place

  return swapIdx;
}
```

`swapIdx` đếm xem có bao nhiêu giá trị nhỏ hơn pivot — đó chính xác là vị trí pivot cần đứng.

```text
arr = [5, 2, 1, 8, 4, 7, 6, 3]    pivotValue = 5, swapIdx = 0

i=1  2 < 5  swapIdx=1  swap(1,1)  [5, 2, 1, 8, 4, 7, 6, 3]
i=2  1 < 5  swapIdx=2  swap(2,2)  [5, 2, 1, 8, 4, 7, 6, 3]
i=3  8                            (no change)
i=4  4 < 5  swapIdx=3  swap(3,4)  [5, 2, 1, 4, 8, 7, 6, 3]
i=5  7, i=6  6                    (no change)
i=7  3 < 5  swapIdx=4  swap(4,7)  [5, 2, 1, 4, 3, 7, 6, 8]
end: swap(0,4)                    [3, 2, 1, 4, 5, 7, 6, 8]
return 4
```

Một lượt duyệt qua đoạn: **thời gian O(n), bộ nhớ phụ O(1)**. Cách này (quét một chiều từ trái sang phải) là một biến thể của **Lomuto partition**; **Hoare partition** quét từ hai đầu vào và hoán đổi ít hơn.

---

## 9. Cài đặt quick sort

```js
function quickSort(arr, left = 0, right = arr.length - 1) {
  if (left < right) {
    const pivotIndex = pivot(arr, left, right);
    quickSort(arr, left, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, right);
  }

  return arr;
}

quickSort([5, 2, 1, 8, 4, 7, 6, 3]); // [1, 2, 3, 4, 5, 6, 7, 8]
```

- Base case là đoạn có **ít hơn 2 phần tử**. Nếu thiếu điều kiện `left < right`, lời gọi `quickSort(arr, 0, -1)` sẽ đệ quy mãi và ném lỗi `RangeError: Maximum call stack size exceeded`.
- Pivot được **loại ra** khỏi cả hai lời gọi đệ quy — nó đã nằm đúng chỗ.
- Hàm **sửa trực tiếp** (mutate) mảng đầu vào và trả về chính tham chiếu mảng đó.

---

## 10. Độ phức tạp của quick sort

| Tốt nhất | Trung bình | Xấu nhất | Bộ nhớ (stack) |
|---|---|---|---|
| O(n log n) | O(n log n) | O(n²) | O(log n) trung bình, O(n) xấu nhất |

**Best / average case.** Khi pivot rơi gần giá trị trung vị (median), mỗi lần phân hoạch chia đôi đoạn. Cây đệ quy có **log n tầng**, và mỗi tầng tổng cộng tốn **O(n)** công phân hoạch:

```text
                 8
         4               12
     2       6       10       14
   1   3   5   7   9   11  13   15
log n levels, O(n) comparisons per level
```

Với input ngẫu nhiên, pivot không hoàn hảo nhưng đủ tốt về trung bình: khoảng 1,39 · n log₂ n phép so sánh, vẫn là O(n log n).

**Worst case.** Khi pivot là phần tử đầu tiên, mảng **đã sắp xếp sẵn** (hoặc sắp xếp ngược) là thảm hoạ: pivot luôn là giá trị nhỏ nhất, nên mỗi lần phân hoạch chỉ tách ra được đúng một phần tử.

```text
[1, 2, 3, 4, 5]   pivot 1 -> left [] , right [2, 3, 4, 5]
[2, 3, 4, 5]      pivot 2 -> left [] , right [3, 4, 5]
[3, 4, 5]         ...
n levels, (n-1) + (n-2) + ... + 1 = n(n-1)/2 comparisons = O(n²)
```

**Bộ nhớ.** Quick sort không cần mảng tạm, nhưng call stack sâu bằng chiều cao cây: O(log n) khi cân bằng, **O(n)** ở worst case — trong JavaScript điều này có thể làm tràn call stack với một mảng lớn đã sắp xếp.

---

## 11. Chọn pivot và tránh worst case

Pivot lý tưởng là **trung vị**, nhưng tìm chính xác trung vị lại tốn thời gian. Các lựa chọn thực tế:

| Chiến lược | Hệ quả |
|---|---|
| Phần tử đầu (hoặc cuối) | Đơn giản; O(n²) với input đã sắp xếp hoặc sắp xếp ngược — rất hay gặp trong dữ liệu thật |
| **Phần tử ngẫu nhiên** | Kỳ vọng O(n log n) với **mọi** input; O(n²) vẫn có thể xảy ra nhưng xác suất cực kỳ nhỏ |
| **Median of three** (đầu, giữa, cuối) | Rẻ; xử lý tốt input đã sắp xếp |

Chọn pivot ngẫu nhiên chỉ cần thêm một lần hoán đổi trước khi phân hoạch:

```js
function randomPivot(arr, start, end) {
  const r = start + Math.floor(Math.random() * (end - start + 1));
  swap(arr, start, r); // move the random choice to the front

  return pivot(arr, start, end);
}
```

Một số cải tiến khác được dùng trong thư viện thật:

- **Nhiều phần tử trùng.** Nếu mọi phần tử bằng nhau, phép so sánh `<` đẩy tất cả sang bên phải: O(n²). **Phân hoạch ba ngả** (three-way partition: nhỏ hơn / bằng / lớn hơn) gom mọi bản sao của pivot lại và không bao giờ đệ quy vào chúng.
- **Giới hạn độ sâu stack.** Đệ quy vào phía **nhỏ hơn** và dùng vòng lặp cho phía lớn hơn; stack luôn giữ ở O(log n) kể cả worst case.
- **Đoạn nhỏ.** Chuyển sang insertion sort khi đoạn còn dưới khoảng 10–20 phần tử.

---

## 12. So sánh merge sort và quick sort

| | Merge sort | Quick sort |
|---|---|---|
| Thời gian xấu nhất | **O(n log n)** | O(n²) (hiếm khi dùng pivot ngẫu nhiên) |
| Thời gian trung bình | O(n log n) | O(n log n), thực tế thường nhanh hơn |
| Bộ nhớ phụ | Mảng tạm O(n) | Stack O(log n), tại chỗ |
| Stable? | **Có** (với `<=`) | **Không** |
| Phù hợp cho | Linked list, dữ liệu ngoài bộ nhớ, cần stable, cần đảm bảo | Mảng trong bộ nhớ, bộ nhớ hạn hẹp |

Quick sort thường nhanh hơn trên mảng vì nó duyệt bộ nhớ tuần tự (thân thiện với cache), hoán đổi tại chỗ và có hằng số nhỏ.

Quick sort **không stable**. Sắp xếp `[3, 5a, 5b, 1]` bằng hàm pivot ở trên: lần hoán đổi đưa `1` lên trước đã ném `5a` ra sau `5b`, và kết quả là `[1, 3, 5b, 5a]`.

Trong thực tế, `Array.prototype.sort` của V8 dùng **TimSort** và đã **stable** từ ES2019; Java sắp xếp kiểu nguyên thuỷ bằng dual-pivot quick sort và object bằng TimSort.

Cả hai đều là **comparison sort** (sắp xếp dựa trên so sánh), và không comparison sort nào nhanh hơn O(n log n) trong trường hợp tổng quát — radix sort ở bài sau sẽ né giới hạn đó.

---

## Điểm cần nhớ khi phỏng vấn

- Các thuật toán O(n²) không mở rộng được; merge sort và quick sort đưa việc sắp xếp xuống **O(n log n)** nhờ chia để trị.
- `merge` hai mảng đã sắp xếp là thủ tục **hai con trỏ** O(n + m) — đừng quên chép phần còn lại.
- Merge sort: **O(n log n) ở mọi trường hợp**, **bộ nhớ phụ O(n)**, **stable** (lấy bên trái khi bằng nhau).
- Quick sort: phân hoạch quanh pivot tại chỗ; **trung bình O(n log n), xấu nhất O(n²)**, **stack O(log n)** trung bình.
- Pivot là phần tử đầu + **input đã sắp xếp** = worst case. Khắc phục bằng pivot **ngẫu nhiên** hoặc median of three.
- Mảng toàn phần tử bằng nhau cũng làm hại phân hoạch hai ngả; dùng **three-way partition**.
- Chọn **merge sort** cho linked list, cần stable, external sorting hoặc cần đảm bảo cận trên; chọn **quick sort** để sắp xếp mảng trong bộ nhớ thật nhanh.
- Hàm sort có sẵn của JavaScript là **TimSort** (lai merge sort) và là **stable**.

## Tóm tắt

- Cả hai thuật toán dựa trên việc mảng 0–1 phần tử đã được sắp xếp và đệ quy xuống tới đó.
- Merge sort chia đôi, sắp xếp từng nửa rồi trộn: log n tầng × O(n) công việc = O(n log n), cần mảng tạm O(n).
- Quick sort đặt pivot vào đúng vị trí cuối cùng, rồi sắp xếp tại chỗ từng bên; tốc độ phụ thuộc vào việc pivot có chia đoạn đều hay không.
- Pivot tệ trên dữ liệu đã sắp xếp hoặc nhiều giá trị trùng gây ra thời gian O(n²) và stack O(n); pivot ngẫu nhiên, three-way partition và đệ quy vào phía nhỏ hơn giúp phòng tránh.
- Merge sort stable và dễ đoán trước; quick sort chạy tại chỗ và thường nhanh hơn; các thư viện thật kết hợp chúng với insertion sort.
