# Binary Heap & Priority Queue

## 1. Binary heap là gì?

**Binary heap** (đống nhị phân) là một cây nhị phân, trông khá giống binary search tree nhưng tuân theo luật khác. Nó phải luôn thoả mãn hai tính chất:

1. **Tính chất heap (thứ tự):** trong **max heap**, mọi node cha đều lớn hơn hoặc bằng các node con; trong **min heap**, mọi node cha đều nhỏ hơn hoặc bằng các node con.
2. **Tính chất hình dạng:** cây là **cây đầy đủ** (complete tree) — mọi tầng đều kín, trừ tầng cuối có thể chưa kín, và tầng cuối được lấp **từ trái sang phải**, không chừa lỗ hổng.

```text
Valid max heap                 NOT a heap (41 is larger than its parent 33)

         41                              33
       /    \                          /    \
     39      33                      18      41
    /  \    /                       /  \    /
  18    27 12                     12    27 39
```

Hệ quả của hai luật này:

- **Root luôn giữ giá trị lớn nhất** (max heap) hoặc **nhỏ nhất** (min heap), nên đọc nó chỉ tốn O(1).
- Cây đầy đủ có `n` node thì cao `⌊log₂ n⌋`, nên heap **không bao giờ bị suy biến** thành một chuỗi dài.

---

## 2. Max heap vs min heap, và heap vs BST

Hai biến thể là ảnh phản chiếu của nhau:

```text
Max heap                        Min heap

         41                              12
       /    \                          /    \
     39      33                      18      23
    /  \    /                       /  \    /
  18    27 12                     29    51 44
```

Tính chất heap chỉ ràng buộc **cha với con**. **Không có thứ tự nào giữa các node anh em** (siblings) hay giữa hai cây con khác nhau: trong max heap trên, 39 nằm bên trái và 33 bên phải, nhưng 18 (cây con trái) lại nhỏ hơn 33 (cây con phải). Đổi chỗ hai cây con cho nhau thì vẫn là heap hợp lệ.

Đó là khác biệt then chốt so với binary search tree:

| | Binary search tree | Binary heap |
|---|---|---|
| Luật thứ tự | trái < node < phải | cha ≥ con (max) hoặc ≤ (min) |
| Anh em có thứ tự? | Có | Không |
| Hình dạng | Tuỳ ý (có thể thành chuỗi) | Luôn đầy đủ |
| Truy vấn nhanh | Tìm giá trị bất kỳ O(log n) nếu cân bằng | Đọc max/min O(1) |
| Tìm giá trị bất kỳ | O(log n) khi cân bằng, O(n) worst | O(n) |
| Duyệt có thứ tự | In-order traversal | Không làm trực tiếp được |

Heap là cấu trúc **có thứ tự yếu**: nó từ bỏ thứ tự đầy đủ để đổi lấy việc truy cập giá trị cực trị thật rẻ.

---

## 3. Vì sao heap quan trọng

Heap phát huy tác dụng mỗi khi bạn liên tục cần "phần tử quan trọng nhất ngay lúc này" trong khi phần tử mới vẫn không ngừng đổ vào:

- **Priority queue** (hàng đợi ưu tiên) — heap là cách cài đặt chuẩn (JavaScript không có sẵn; Java có `PriorityQueue`, Python có `heapq`, C++ có `priority_queue`).
- **Thuật toán đồ thị** — Dijkstra (đường đi ngắn nhất) và Prim (cây khung nhỏ nhất) liên tục lấy ra đỉnh gần nhất.
- **Lập lịch** — bộ lập lịch tiến trình của hệ điều hành, job queue, timer, mô phỏng sự kiện.
- **Bài toán top-k** — k điểm số cao nhất trong một luồng dữ liệu, k điểm gần nhất, trộn k danh sách đã sắp xếp.
- **Trung vị động** (running median) — dùng hai heap (max heap cho nửa dưới, min heap cho nửa trên).
- **Heap sort** — thuật toán sắp xếp tại chỗ O(n log n).

---

## 4. Lưu heap trong mảng

Vì heap luôn là cây đầy đủ, ta không cần object node với con trỏ `left`/`right`. Chỉ cần đọc cây **theo từng tầng, từ trái sang phải** và ghi giá trị vào một mảng:

```text
index:     0    1    2    3    4    5
values: [ 41,  39,  33,  18,  27,  12 ]

level 0:          41 (0)
level 1:     39 (1)     33 (2)
level 2:  18 (3) 27 (4) 12 (5)
```

Với node ở index `n`:

| Quan hệ | Index |
|---|---|
| Con trái | `2n + 1` |
| Con phải | `2n + 2` |
| Cha | `Math.floor((n - 1) / 2)` |

Kiểm tra: index 1 (39) có con ở 3 (18) và 4 (27); index 5 (12) có cha là `⌊4 / 2⌋ = 2` (33). Nếu index của con `≥ length` thì node con đó không tồn tại.

Cách này chỉ đúng **vì** cây là cây đầy đủ: mảng không bao giờ có lỗ hổng. Lợi ích: không tốn bộ nhớ cho con trỏ, cache locality rất tốt, và di chuyển tới cha hay con chỉ bằng phép tính số học O(1).

---

## 5. Insert: thêm vào cuối rồi bubble up

Để chèn vào max heap:

1. **Push** giá trị vào cuối mảng. Cây vẫn đầy đủ, nhưng tính chất heap có thể bị phá vỡ.
2. **Bubble up** (còn gọi là sift up, percolate up, heapify up — "nổi lên"): chừng nào giá trị mới còn lớn hơn cha, hoán đổi chúng.

Trace — chèn 55 vào `[41, 39, 33, 18, 27, 12]`:

```text
push 55 at index 6        [41, 39, 33, 18, 27, 12, 55]
parent of 6 is 2 (33)     55 > 33 -> swap
                          [41, 39, 55, 18, 27, 12, 33]
parent of 2 is 0 (41)     55 > 41 -> swap
                          [55, 39, 41, 18, 27, 12, 33]
index 0 is the root       stop

         55
       /    \
     39      41
    /  \    /  \
  18    27 12   33
```

```js
class MaxBinaryHeap {
  constructor() {
    this.values = [];
  }

  insert(value) {
    this.values.push(value);
    this.bubbleUp();

    return this;
  }

  bubbleUp() {
    const values = this.values;
    let index = values.length - 1;
    const element = values[index];

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = values[parentIndex];

      if (element <= parent) break;

      values[parentIndex] = element;
      values[index] = parent;
      index = parentIndex;
    }
  }
}
```

Mỗi vòng lặp giá trị chỉ leo lên một tầng, nên insert tốn **O(log n) thời gian** và **O(1) bộ nhớ phụ** (amortized, vì `push` thỉnh thoảng phải mở rộng mảng).

---

## 6. Extract max: đưa phần tử cuối lên rồi sink down

Khi lấy root (giá trị lớn nhất) ra, cây vẫn phải đầy đủ, nên ta không thể xoá thẳng index 0. Thay vào đó:

1. Lưu lại root.
2. **Pop** phần tử cuối cùng và đặt nó vào vị trí root.
3. **Sink down** (còn gọi là sift down, bubble down, percolate down, heapify down — "chìm xuống"): chừng nào phần tử còn nhỏ hơn một trong các con, hoán đổi nó với con **lớn hơn**.

Trace — extractMax trên `[41, 39, 33, 18, 27, 12]`:

```text
save 41, pop 12 and place at root
                          [12, 39, 33, 18, 27]
index 0: children 39, 33  larger is 39 (index 1) -> swap
                          [39, 12, 33, 18, 27]
index 1: children 18, 27  larger is 27 (index 4) -> swap
                          [39, 27, 33, 18, 12]
index 4: children at 9, 10 are out of bounds -> stop
return 41

         39
       /    \
     27      33
    /  \
  18    12
```

Vì sao phải là con **lớn hơn**? Nếu đổi 12 với 33 thay vì 39, thì 33 sẽ thành cha của 39 — lại sinh ra vi phạm mới. Đưa con lớn hơn lên đảm bảo node cha mới lớn hơn cả hai con.

---

## 7. Cài đặt extractMax

```js
class MaxBinaryHeap {
  // ...constructor, insert and bubbleUp from above

  extractMax() {
    const values = this.values;

    if (values.length === 0) return undefined;

    const max = values[0];
    const end = values.pop();

    if (values.length > 0) {
      values[0] = end;
      this.sinkDown();
    }

    return max;
  }

  sinkDown() {
    const values = this.values;
    const length = values.length;
    let index = 0;

    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let largest = index;

      if (left < length && values[left] > values[largest]) largest = left;

      if (right < length && values[right] > values[largest]) largest = right;

      if (largest === index) break;

      [values[index], values[largest]] = [values[largest], values[index]];
      index = largest;
    }
  }
}
```

Hai lỗi kinh điển mà phiên bản này tránh được:

- **Heap chỉ có một phần tử.** Sau `pop()` mảng đã rỗng; nếu gán `values[0] = end` vô điều kiện thì giá trị vừa lấy ra lại bị đặt ngược vào, và heap không bao giờ rỗng.
- **So sánh con phải với phần tử gốc thay vì với `largest` hiện tại.** Theo dõi biến `largest` đảm bảo khi cả hai con đều lớn hơn, ta đổi với con lớn nhất.

Extract max tốn **O(log n) thời gian** và **O(1) bộ nhớ phụ**: phần tử chìm xuống tối đa bằng chiều cao của cây.

---

## 8. Min heap và comparator dùng lại được

Min heap chính là cùng đoạn code với các phép so sánh bị đảo ngược. Thay vì viết hai class, hãy truyền vào một **comparator** (hàm so sánh): `compare(a, b) < 0` nghĩa là `a` nên nằm gần root hơn.

```js
class Heap {
  constructor(compare = (a, b) => a - b) {
    this.values = [];
    this.compare = compare;
  }

  get size() {
    return this.values.length;
  }

  peek() {
    return this.values[0];
  }

  push(value) {
    const values = this.values;
    values.push(value);
    let index = values.length - 1;

    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);

      if (this.compare(values[index], values[parent]) >= 0) break;

      [values[index], values[parent]] = [values[parent], values[index]];
      index = parent;
    }
  }

  pop() {
    const values = this.values;

    if (values.length === 0) return undefined;

    const top = values[0];
    const last = values.pop();

    if (values.length > 0) {
      values[0] = last;
      this.sinkDown(0);
    }

    return top;
  }

  sinkDown(index) {
    const values = this.values;
    const length = values.length;

    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let best = index;

      if (left < length && this.compare(values[left], values[best]) < 0) best = left;

      if (right < length && this.compare(values[right], values[best]) < 0) best = right;

      if (best === index) return;

      [values[index], values[best]] = [values[best], values[index]];
      index = best;
    }
  }
}

const minHeap = new Heap();                     // smallest on top
const maxHeap = new Heap((a, b) => b - a);      // largest on top
```

---

## 9. Priority queue

**Priority queue** (hàng đợi ưu tiên) là một kiểu dữ liệu trừu tượng (abstract data type): mỗi phần tử có một độ ưu tiên, và phần tử **ưu tiên cao hơn được phục vụ trước**, bất kể thứ tự thêm vào. Nó hỗ trợ `enqueue(value, priority)`, `dequeue()` và thường có `peek()`.

Heap là một cách cài đặt nó. So sánh các lựa chọn:

| Cách cài đặt | enqueue | dequeue | peek |
|---|---|---|---|
| Mảng không sắp xếp (quét tìm phần tử tốt nhất) | O(1) | O(n) | O(n) |
| Mảng đã sắp xếp | O(n) | O(1) (pop ở cuối) | O(1) |
| **Binary heap** | **O(log n)** | **O(log n)** | **O(1)** |

Danh sách ngây thơ bắt phải quét toàn bộ mỗi lần dequeue; heap cân bằng được cả hai thao tác. Quy ước phổ biến (Dijkstra cũng dùng) là **min heap, trong đó số càng nhỏ thì ưu tiên càng cao**:

```js
class Node {
  constructor(val, priority) {
    this.val = val;
    this.priority = priority;
  }
}

class PriorityQueue {
  constructor() {
    this.heap = new Heap((a, b) => a.priority - b.priority);
  }

  enqueue(val, priority) {
    this.heap.push(new Node(val, priority));
  }

  dequeue() {
    return this.heap.pop();
  }
}

const er = new PriorityQueue();
er.enqueue('common cold', 5);
er.enqueue('gunshot wound', 1);
er.enqueue('high fever', 4);
er.dequeue().val; // 'gunshot wound'
```

```text
min heap by priority

            gunshot wound (1)
           /                 \
  common cold (5)        high fever (4)
```

Heap **không ổn định** (not stable): hai node cùng độ ưu tiên có thể ra theo thứ tự bất kỳ. Nếu cần giữ thứ tự FIFO giữa các phần tử bằng nhau, hãy lưu thêm một bộ đếm thứ tự chèn tăng dần và so sánh nó khi priority bằng nhau.

**Pattern top-k:** để giữ k giá trị lớn nhất trong một luồng n phần tử, duy trì một **min heap kích thước k**; khi heap vượt quá k thì pop phần tử nhỏ nhất. Tốn O(n log k) thời gian và O(k) bộ nhớ — tốt hơn nhiều so với sắp xếp toàn bộ khi k nhỏ.

---

## 10. Big O của binary heap

| Thao tác | Thời gian | Lý do |
|---|---|---|
| peek (max/min) | O(1) | Luôn là `values[0]` |
| insert | O(log n) | Bubble up tối đa bằng chiều cao |
| extract max/min | O(log n) | Sink down tối đa bằng chiều cao |
| tìm một giá trị | O(n) | Anh em không có thứ tự, nên không bỏ qua được nửa nào |
| build heap (bottom-up) | O(n) | Xem phần tiếp theo |
| Bộ nhớ | O(n) | Mỗi phần tử một ô trong mảng |

**Vì sao là log n?** Cây đầy đủ tăng gấp đôi sức chứa sau mỗi tầng: 1 + 2 + 4 + 8 = 15 node vừa trong 4 tầng. Với 16 phần tử, giá trị mới nằm ở độ sâu 4, nên chèn một giá trị lớn nhất mới chỉ cần tối đa 4 lần so sánh và hoán đổi; với một triệu phần tử thì khoảng 20.

```text
level 0:  1 node
level 1:  2 nodes
level 2:  4 nodes
level 3:  8 nodes
level 4:  16 nodes      height ~ log2(n)
```

**Còn worst case thì sao?** BST nhận input đã sắp xếp sẽ biến thành linked list và mọi thao tác thành O(n). Điều đó không thể xảy ra với heap: tính chất hình dạng buộc cây luôn đầy đủ, nên O(log n) là **worst case**, không chỉ là trung bình.

---

## 11. Xây heap từ một mảng (heapify)

**Cách ngây thơ:** tạo heap rỗng rồi `insert` lần lượt n phần tử. Mỗi lần insert O(log n), tổng cộng **O(n log n)**.

**Heapify từ dưới lên (phương pháp Floyd):** coi mảng sẵn là một cây đầy đủ, rồi gọi `sinkDown` cho mọi node không phải lá, đi từ **node cha cuối cùng ngược về root**. Các lá (nửa sau của mảng) vốn đã là heap một node hợp lệ, nên vòng lặp bắt đầu từ index `Math.floor(n / 2) - 1`.

```js
function siftDown(arr, index, length) {
  while (true) {
    const left = 2 * index + 1;
    const right = 2 * index + 2;
    let largest = index;

    if (left < length && arr[left] > arr[largest]) largest = left;

    if (right < length && arr[right] > arr[largest]) largest = right;

    if (largest === index) return;

    [arr[index], arr[largest]] = [arr[largest], arr[index]];
    index = largest;
  }
}

function buildMaxHeap(arr) {
  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
    siftDown(arr, i, arr.length);
  }

  return arr;
}
```

Trace trên `[3, 9, 2, 1, 4, 5]` (n = 6, bắt đầu ở index 2):

```text
i = 2 (value 2): child 5 is larger    -> [3, 9, 5, 1, 4, 2]
i = 1 (value 9): children 1, 4        -> no swap
i = 0 (value 3): larger child 9       -> [9, 3, 5, 1, 4, 2]
     continue at index 1: child 4     -> [9, 4, 5, 1, 3, 2]
```

**Vì sao là O(n)?** Phần lớn node nằm gần đáy và chỉ chìm xuống một chút. Khoảng n/2 node là lá (không tốn công), n/4 node chìm tối đa 1 tầng, n/8 tối đa 2 tầng, v.v. Tổng là `n · (1/4 + 2/8 + 3/16 + …) ≤ n`, nên xây heap tốn **O(n) thời gian**, O(1) bộ nhớ phụ (tại chỗ). Chỉ duy nhất root mới có thể chìm trọn log n tầng.

---

## 12. Heap sort

Heap sort biến mảng thành max heap, rồi lặp lại việc đưa giá trị lớn nhất về cuối:

1. `buildMaxHeap(arr)` — O(n).
2. Với `end` chạy từ `n - 1` xuống 1: đổi `arr[0]` (max) với `arr[end]`, rồi `siftDown(arr, 0, end)` để khôi phục heap trong phần đầu mảng đang co lại.

```js
function heapSort(arr) {
  buildMaxHeap(arr);

  for (let end = arr.length - 1; end > 0; end--) {
    [arr[0], arr[end]] = [arr[end], arr[0]];
    siftDown(arr, 0, end);
  }

  return arr;
}

heapSort([3, 9, 2, 1, 4, 5]); // [1, 2, 3, 4, 5, 9]
```

```text
heap      [9, 4, 5, 1, 3, 2]
swap 9    [2, 4, 5, 1, 3 | 9]  sift -> [5, 4, 2, 1, 3 | 9]
swap 5    [3, 4, 2, 1 | 5, 9]  sift -> [4, 3, 2, 1 | 5, 9]
swap 4    [1, 3, 2 | 4, 5, 9]  sift -> [3, 1, 2 | 4, 5, 9]
swap 3    [2, 1 | 3, 4, 5, 9]  sift -> no change
swap 2    [1 | 2, 3, 4, 5, 9]  done
```

| Tính chất | Heap sort |
|---|---|
| Thời gian (best, average, worst) | O(n log n) |
| Bộ nhớ phụ | O(1) — tại chỗ (in place) |
| Ổn định (stable)? | Không — các lần hoán đổi xa làm đảo thứ tự các khoá bằng nhau |

Heap sort đảm bảo O(n log n) với O(1) bộ nhớ, điều mà merge sort (O(n) bộ nhớ) và quick sort (worst case O(n²)) không làm được. Thực tế nó thường chậm hơn quick sort vì nhảy lung tung trong mảng và tận dụng CPU cache kém.

---

## Điểm cần nhớ khi phỏng vấn

- Binary heap = **tính chất heap** (chỉ giữa cha và con) + **hình dạng đầy đủ**. Anh em không có thứ tự.
- Bố cục mảng: con ở **2i + 1** và **2i + 2**, cha ở **⌊(i − 1) / 2⌋**; không cần con trỏ vì cây không có lỗ hổng.
- **Insert**: push rồi bubble up — O(log n). **Extract**: đưa phần tử cuối lên root, sink down bằng cách đổi với con **lớn hơn** (max heap) / **nhỏ hơn** (min heap) — O(log n).
- **Peek O(1), search O(n)**; heap không thể suy biến nên O(log n) là worst case.
- **Build heap từ dưới lên O(n)**, bắt đầu ở index ⌊n/2⌋ − 1; insert lần lượt thì tốn O(n log n).
- Priority queue → heap. **Top-k lớn nhất → min heap kích thước k**, O(n log k). Dijkstra/Prim → min heap.
- **Heap sort**: luôn O(n log n), bộ nhớ O(1), **không ổn định**.
- Để ý edge case: heap rỗng, extract khi chỉ còn một phần tử, và index vượt quá cuối mảng.

## Tóm tắt

- Max heap giữ giá trị lớn nhất ở root, min heap giữ giá trị nhỏ nhất; cây luôn là cây đầy đủ.
- Heap nằm gọn trong một mảng thường, di chuyển bằng phép tính index.
- Insert bubble up còn extract sink down, mỗi thao tác bị chặn bởi chiều cao cây, O(log n).
- Priority queue dựa trên heap phục vụ phần tử ưu tiên cao nhất trong O(log n), so với O(n) của danh sách ngây thơ.
- Heapify từ dưới lên xây heap trong O(n), và heap sort dùng nó để sắp xếp tại chỗ trong O(n log n).
