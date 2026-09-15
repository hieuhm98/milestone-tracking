# Radix Sort & bức tranh toàn cảnh về sắp xếp

## 1. Chúng ta đang ở đâu: comparison sort

Mọi thuật toán sắp xếp đã học — bubble, selection và insertion (O(n²)), merge sort (O(n log n)), quick sort (trung bình O(n log n), tệ nhất O(n²)) — đều hoạt động giống nhau: nhìn **hai phần tử**, hỏi "phần tử nào nhỏ hơn?", rồi di chuyển chúng. Đó là các **thuật toán sắp xếp dựa trên so sánh** (comparison sort).

**Liệu một comparison sort thông minh hơn có đạt được O(n)?** Không — và hiểu *vì sao* là một điểm phỏng vấn kinh điển. Nó cũng giải thích cách radix sort "lách luật": nó không bao giờ so sánh hai phần tử với nhau.

---

## 2. Chặn dưới O(n log n) của comparison sort

Hãy xem mọi comparison sort như một **cây quyết định** (decision tree). Mỗi nút trong là một phép so sánh; mỗi lá là một thứ tự cuối cùng của input. Với ba phần tử `a, b, c`:

```text
                     a < b ?
                 /             \
              yes               no
            b < c ?            a < c ?
           /      \           /       \
      [a,b,c]    a < c ?   [b,a,c]    b < c ?
                /     \               /     \
           [a,c,b]  [c,a,b]      [b,c,a]  [c,b,a]
```

Lập luận gồm ba bước:

1. Input có thể nằm ở bất kỳ thứ tự nào trong **n!** hoán vị, mỗi thứ tự cần một chuỗi thao tác khác nhau, nên cây cần **ít nhất n! lá**.
2. Cây nhị phân cao `h` có tối đa `2^h` lá, nên `2^h ≥ n!`, tức là `h ≥ log₂(n!)`.
3. `log₂(n!)` là **Θ(n log n)** (vì `n! ≥ (n/2)^(n/2)`). Chiều cao chính là số phép so sánh trên đường đi tệ nhất.

| n | log₂(n!) — số phép so sánh tối thiểu ở worst case | n·log₂ n |
|---|---|---|
| 3 | ≈ 2,6 → 3 | ≈ 4,8 |
| 10 | ≈ 21,8 → 22 | ≈ 33,2 |
| 1.000 | ≈ 8.529 | ≈ 9.966 |

Vậy **mọi comparison sort đều cần Ω(n log n) phép so sánh trong trường hợp tệ nhất** (và cả trung bình). Merge sort và heap sort vì thế là **tối ưu về mặt tiệm cận** trong nhóm comparison sort.

Điều này không mâu thuẫn với việc insertion sort chạy O(n) trên mảng đã sắp xếp: chặn dưới nói về **trường hợp tệ nhất trên mọi input**, không nói về các input "may mắn".

---

## 3. Thoát khỏi chặn dưới: non-comparison sort

Chặn dưới chỉ áp dụng cho thuật toán **chỉ tìm hiểu dữ liệu qua phép so sánh**. Nếu key là **số nguyên trong một khoảng nhỏ** hoặc có **số chữ số cố định**, ta có thể dùng thẳng chúng làm chỉ số mảng và không cần so sánh.

| Thuật toán | Giả định về key | Thời gian |
|---|---|---|
| Counting sort | Số nguyên trong `0..k`, k không quá lớn | O(n + k) |
| Radix sort | Số nguyên (hoặc chuỗi độ dài cố định) có `k` chữ số | O(n · k) |
| Bucket sort | Giá trị phân bố đều trong một khoảng | O(n) trung bình |

Cái giá phải trả là **tính tổng quát** (không dùng được comparator tuỳ ý) và bộ nhớ phụ cho mảng đếm hoặc các bucket.

---

## 4. Counting sort

**Ý tưởng:** nếu mọi giá trị là số nguyên từ `0` đến `k`, hãy đếm số lần xuất hiện của từng giá trị, rồi ghi lại các giá trị theo thứ tự.

```js
function countingSort(nums, maxValue) {
  const counts = new Array(maxValue + 1).fill(0);

  for (const num of nums) {
    counts[num]++;
  }

  const result = [];

  for (let value = 0; value <= maxValue; value++) {
    for (let c = 0; c < counts[value]; c++) {
      result.push(value);
    }
  }

  return result;
}

countingSort([3, 0, 2, 3, 1, 0], 3); // [0, 0, 1, 2, 3, 3]
```

```text
input:   [3, 0, 2, 3, 1, 0]
value:    0  1  2  3
counts:  [2, 1, 1, 2]
output:  0 0 | 1 | 2 | 3 3
```

**Độ phức tạp:** thời gian **O(n + k)** — một lượt qua n phần tử và một lượt qua k + 1 bộ đếm. Bộ nhớ **O(n + k)** cho mảng đếm và mảng kết quả.

Rất hợp với tuổi (0–120), điểm thi (0–100) hay byte (0–255); rất tệ với 1.000 số có giá trị tới 10⁹, vì riêng mảng đếm đã cần một tỉ ô. Khi `k ≫ n`, `k` chiếm ưu thế.

Để sắp xếp **bản ghi theo key** mà vẫn giữ nguyên thứ tự ban đầu của các key bằng nhau, dùng **tổng tiền tố** (prefix sum) và điền mảng kết quả từ cuối lên:

```js
function countingSortBy(items, getKey, maxKey) {
  const counts = new Array(maxKey + 1).fill(0);

  for (const item of items) {
    counts[getKey(item)]++;
  }

  // prefix sums: counts[k] = number of items with key <= k
  for (let k = 1; k <= maxKey; k++) {
    counts[k] += counts[k - 1];
  }

  const output = new Array(items.length);

  // walk backwards so equal keys keep their original order
  for (let i = items.length - 1; i >= 0; i--) {
    const key = getKey(items[i]);
    counts[key]--;
    output[counts[key]] = items[i];
  }

  return output;
}
```

---

## 5. Radix sort: ý tưởng

Radix sort là một non-comparison sort dành cho **số nguyên**. Nó tận dụng việc thông tin về độ lớn của một số được mã hoá trong **các chữ số** của nó: nhiều chữ số hơn nghĩa là số lớn hơn, còn khi cùng độ dài thì các hàng cao hơn quyết định.

Phiên bản phổ biến là **LSD radix sort** (least significant digit — bắt đầu từ chữ số thấp nhất):

1. Tạo 10 **bucket** (thùng), mỗi thùng cho một chữ số 0–9.
2. Bỏ mỗi số vào thùng ứng với chữ số **hàng đơn vị**, giữ nguyên thứ tự đến.
3. Đọc lại các thùng từ 0 đến 9 vào mảng.
4. Lặp lại với hàng chục, hàng trăm, … cho đến số chữ số của số dài nhất.

```text
start:      [1556, 4, 3556, 593, 408, 4386, 902, 7, 8157, 86, 9637, 29]

ones:       2:[902] 3:[593] 4:[4] 6:[1556,3556,4386,86] 7:[7,8157,9637] 8:[408] 9:[29]
         -> [902, 593, 4, 1556, 3556, 4386, 86, 7, 8157, 9637, 408, 29]

tens:       0:[902,4,7,408] 2:[29] 3:[9637] 5:[1556,3556,8157] 8:[4386,86] 9:[593]
         -> [902, 4, 7, 408, 29, 9637, 1556, 3556, 8157, 4386, 86, 593]

hundreds:   0:[4,7,29,86] 1:[8157] 3:[4386] 4:[408] 5:[1556,3556,593] 6:[9637] 9:[902]
         -> [4, 7, 29, 86, 8157, 4386, 408, 1556, 3556, 593, 9637, 902]

thousands:  0:[4,7,29,86,408,593,902] 1:[1556] 3:[3556] 4:[4386] 8:[8157] 9:[9637]
         -> [4, 7, 29, 86, 408, 593, 902, 1556, 3556, 4386, 8157, 9637]  sorted
```

Vì sao nó đúng? Sau lượt `k`, mảng đã được sắp xếp theo `k + 1` chữ số cuối. Mỗi lượt giữ nguyên thứ tự cũ giữa các số có cùng chữ số đang xét, nên các chữ số thấp hơn phân định đúng các trường hợp hoà. Tính chất "giữ thứ tự đến" này gọi là **tính ổn định** (stability), và radix sort phụ thuộc vào nó (mục 9).

---

## 6. Các hàm helper của radix sort

Ba hàm nhỏ giúp phần cài đặt dễ đọc hơn.

**`getDigit(num, i)`** — chữ số ở hàng `10^i` (0 = hàng đơn vị):

```js
function getDigit(num, i) {
  return Math.floor(Math.abs(num) / Math.pow(10, i)) % 10;
}

getDigit(12345, 0); // 5
getDigit(12345, 2); // 3   12345 / 100 = 123.45 -> 123 -> 123 % 10 = 3
getDigit(12345, 5); // 0   past the leading digit
```

**`digitCount(num)`** — `num` có bao nhiêu chữ số:

```js
function digitCount(num) {
  if (num === 0) return 1;

  return Math.floor(Math.log10(Math.abs(num))) + 1;
}

digitCount(7);   // 1
digitCount(314); // 3
```

Điều kiện `num === 0` rất quan trọng: `Math.log10(0)` là `-Infinity`, nên thiếu nó hàm sẽ trả về `-Infinity`. Cũng cẩn thận với sai số dấu phẩy động ở số rất lớn: `Math.log10(999999999999999)` bị làm tròn thành `15`, cho ra 16 chữ số thay vì 15. Với số nguyên, `String(Math.abs(num)).length` là cách thay thế an toàn.

**`mostDigits(nums)`** — số chữ số của số dài nhất, tức là số lượt cần chạy:

```js
function mostDigits(nums) {
  let maxDigits = 0;

  for (let i = 0; i < nums.length; i++) {
    maxDigits = Math.max(maxDigits, digitCount(nums[i]));
  }

  return maxDigits;
}

mostDigits([1234, 56, 7]); // 4
```

Hai hàm đầu là O(1) cho mỗi số, nên `mostDigits` là O(n).

---

## 7. Cài đặt radix sort

Pseudocode:

- Tìm số chữ số của số lớn nhất.
- Lặp `k` từ 0 đến số chữ số đó.
- Ở mỗi vòng, tạo các bucket 0–9 **mới** và bỏ mỗi số vào bucket ứng với chữ số thứ `k` của nó.
- Thay mảng bằng nội dung các bucket, từ bucket 0 đến 9.
- Trả về mảng.

```js
function radixSort(nums) {
  const maxDigitCount = mostDigits(nums);

  for (let k = 0; k < maxDigitCount; k++) {
    const digitBuckets = Array.from({ length: 10 }, () => []);

    for (let i = 0; i < nums.length; i++) {
      const digit = getDigit(nums[i], k);
      digitBuckets[digit].push(nums[i]);
    }

    nums = [].concat(...digitBuckets);
  }

  return nums;
}

radixSort([23, 345, 5467, 12, 2345, 9852]); // [12, 23, 345, 2345, 5467, 9852]
```

Các lỗi hay gặp:

- **Tạo bucket một lần, bên ngoài vòng lặp `k`** — số của các lượt trước vẫn nằm trong bucket và mảng bị đầy các phần tử trùng lặp.
- **`new Array(10).fill([])`** — cả 10 ô dùng chung **cùng một** mảng, nên mọi số rơi vào một bucket.
- **Không gán lại `nums`** — bucket được tạo rồi bỏ đi; mảng không hề thay đổi.

---

## 8. Độ phức tạp của radix sort

Gọi **n** là số phần tử và **k** là số chữ số của số dài nhất.

| Best | Average | Worst | Space |
|---|---|---|---|
| O(nk) | O(nk) | O(nk) | O(n + b) |

- Có **k lượt**, mỗi lượt duyệt cả n số cộng với `b = 10` bucket: O(k · (n + b)) = **O(nk)** với cơ số cố định.
- Các bucket cùng lúc chứa toàn bộ n số, cộng `b` mảng bucket: bộ nhớ phụ **O(n + b)**, với cơ số 10 là O(n). (Nhiều tài liệu viết là O(n + k).)
- Thứ tự input không ảnh hưởng: best, average và worst như nhau.

**O(nk) có thật sự nhanh hơn O(n log n)?** Nếu các số bị chặn (ví dụ số 32-bit), `k` là hằng số và radix sort là **tuyến tính**. Nhưng `n` số **phân biệt** thì số lớn nhất ít nhất là `n − 1`, nên `k ≥ log₁₀ n` và O(nk) không tốt hơn O(n log n). Nó thắng với mảng lớn gồm số nguyên độ rộng cố định — không phải "bữa trưa miễn phí".

Các cài đặt thực tế thường dùng **cơ số 256**: một số nguyên 32-bit chỉ cần 4 lượt, với chữ số là `(num >>> (8 * pass)) & 255`.

---

## 9. Tính ổn định (stability)

Một thuật toán sắp xếp là **ổn định** (stable) nếu các phần tử có **key bằng nhau giữ nguyên thứ tự tương đối ban đầu**.

```js
const people = [
  { name: 'An', age: 30 },
  { name: 'Binh', age: 25 },
  { name: 'Chi', age: 30 },
];

people.sort((a, b) => a.age - b.age);
// stable:   Binh(25), An(30), Chi(30)   An stays before Chi
// unstable: Binh(25), Chi(30), An(30)   also "sorted", but order changed
```

Vì sao quan trọng:

- **Sắp xếp nhiều key** — muốn sắp theo phòng ban, rồi theo tên: sắp theo tên trước, sau đó stable-sort theo phòng ban.
- **Radix sort** — mỗi lượt phải ổn định, nếu không thứ tự do các chữ số thấp tạo ra sẽ bị phá.

| Ổn định | Không ổn định (cài đặt thông thường) |
|---|---|
| Bubble, insertion, merge, counting (bản prefix sum), radix | Selection, quick, heap |

Merge sort chỉ ổn định nếu khi hoà, bước merge lấy từ nửa **trái** (`<=`, không phải `<`). Từ **ES2019**, `Array.prototype.sort` bắt buộc phải ổn định trên mọi JavaScript engine.

---

## 10. Biến thể và giới hạn của radix sort

**Số âm.** `getDigit` dùng `Math.abs`, nên bản cơ bản sắp xếp theo **giá trị tuyệt đối**: `[-5, 3, -1, 2]` thành `[-1, 2, 3, -5]`. Một cách sửa là tách riêng hai dấu:

```js
function radixSortWithNegatives(nums) {
  const negatives = nums.filter((n) => n < 0).map((n) => -n);
  const positives = nums.filter((n) => n >= 0);
  const sortedNegatives = radixSort(negatives).reverse().map((n) => -n);

  return sortedNegatives.concat(radixSort(positives));
}
```

Cách khác là trừ mọi giá trị đi số nhỏ nhất, sắp xếp, rồi cộng lại.

**Các loại key khác.** Số thực (float) phải dùng dãy bit của nó, không dùng chữ số thập phân. **Chuỗi độ dài cố định** (mã bưu chính, ID) rất hợp: mỗi ký tự là một "chữ số", xử lý từ phải sang trái. **MSD radix sort** bắt đầu từ chữ số cao nhất và đệ quy sắp xếp từng bucket, phù hợp với chuỗi độ dài thay đổi.

**Khi nào không nên dùng:** mảng nhỏ, object cần comparator, key rất dài (k lớn), hoặc bộ nhớ hạn chế — radix sort không phải in-place.

---

## 11. Bảng so sánh các thuật toán sắp xếp

| Thuật toán | Best | Average | Worst | Bộ nhớ phụ | Ổn định |
|---|---|---|---|---|---|
| Bubble sort | O(n) | O(n²) | O(n²) | O(1) | Có |
| Selection sort | O(n²) | O(n²) | O(n²) | O(1) | Không |
| Insertion sort | O(n) | O(n²) | O(n²) | O(1) | Có |
| Merge sort | O(n log n) | O(n log n) | O(n log n) | O(n) | Có |
| Quick sort | O(n log n) | O(n log n) | O(n²) | O(log n) avg | Không |
| Heap sort | O(n log n) | O(n log n) | O(n log n) | O(1) | Không |
| Counting sort | O(n + k) | O(n + k) | O(n + k) | O(n + k) | Có |
| Radix sort | O(nk) | O(nk) | O(nk) | O(n + b) | Có |

Ghi chú: best case O(n) của bubble sort cần kiểm tra thoát sớm (early exit). Bộ nhớ của quick sort là call stack đệ quy — trung bình O(log n), tệ nhất O(n) trừ khi luôn đệ quy vào phía nhỏ hơn trước. Với counting sort, k = khoảng giá trị; với radix sort, k = số chữ số, b = cơ số.

---

## 12. Chọn thuật toán sắp xếp trong thực tế

Trong JavaScript thực tế, hãy dùng **`sort` có sẵn** với comparator cho số (`(a, b) => a - b`) — mặc định nó so sánh dạng chuỗi. V8 dùng **TimSort**, lai giữa merge sort và insertion sort: tệ nhất O(n log n), O(n) với input đã sắp xếp, ổn định, bộ nhớ phụ O(n). Với các trường hợp đặc biệt:

| Tình huống | Lựa chọn tốt |
|---|---|
| Mảng rất nhỏ hoặc gần như đã sắp xếp, hoặc dữ liệu đến từng phần tử một | Insertion sort |
| Cần đảm bảo O(n log n) và ổn định | Merge sort |
| Cần đảm bảo O(n log n) với bộ nhớ phụ O(1) | Heap sort |
| Sắp xếp tổng quát trong bộ nhớ, ưu tiên tốc độ trung bình | Quick sort (pivot ngẫu nhiên) |
| Số nguyên trong khoảng nhỏ (tuổi, điểm, byte) | Counting sort |
| Rất nhiều số nguyên độ rộng cố định hoặc key chuỗi độ dài cố định | Radix sort |
| Chỉ cần k phần tử nhỏ nhất / lớn nhất | Dùng heap, không sắp xếp toàn bộ |

---

## Điểm cần nhớ khi phỏng vấn

- **Comparison sort không thể nhanh hơn Ω(n log n)** ở worst case: cây quyết định có n! lá nên chiều cao ít nhất là log₂(n!) = Θ(n log n).
- Merge sort và heap sort là comparison sort **tối ưu**; best case O(n) của insertion sort không phá vỡ chặn dưới.
- **Non-comparison sort** (counting, radix, bucket) vượt chặn dưới bằng cách dùng key làm chỉ số, đổi lại mất tính tổng quát và tốn bộ nhớ.
- **Counting sort**: O(n + k) thời gian và bộ nhớ; tuyệt vời với khoảng giá trị nhỏ, vô dụng khi k ≫ n.
- **Radix sort**: helper `getDigit`, `digitCount`, `mostDigits`; k lượt phân phối vào bucket; **thời gian O(nk), bộ nhớ O(n + b)**, như nhau với mọi thứ tự input.
- O(nk) chỉ tuyến tính khi k bị chặn; với n số phân biệt thì k ≥ log n.
- Radix sort cần các lượt **ổn định**; bản cơ bản sắp theo giá trị tuyệt đối nên phải xử lý số âm riêng.
- Ổn định: bubble, insertion, merge, counting, radix. Không ổn định: selection, quick, heap. `Array.prototype.sort` ổn định từ ES2019.

## Tóm tắt

- Mọi thuật toán chỉ sắp xếp bằng cách so sánh phần tử đều cần khoảng n log n phép so sánh ở trường hợp tệ nhất.
- Counting sort đếm số lần xuất hiện của từng giá trị rồi ghi lại, mất O(n + k).
- Radix sort phân phối số nguyên vào 10 bucket theo từng chữ số, từ thấp đến cao, dựng lại mảng sau mỗi lượt.
- Chi phí là O(nk) thời gian và O(n + b) bộ nhớ; nó toả sáng với mảng lớn gồm số nguyên độ rộng cố định.
- Tính ổn định giữ các key bằng nhau theo thứ tự ban đầu, giúp sắp xếp nhiều key và radix sort hoạt động đúng.
- Trong JavaScript hằng ngày, hãy dùng `sort` có sẵn (ổn định) với comparator đúng; chọn thuật toán chuyên biệt khi hình dạng dữ liệu cho phép.
