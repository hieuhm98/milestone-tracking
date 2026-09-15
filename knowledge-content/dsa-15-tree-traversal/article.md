# Duyệt cây – BFS & DFS

## 1. Vì sao cây cần thuật toán duyệt

**Duyệt cây** (tree traversal) nghĩa là ghé thăm **mọi node đúng một lần** — để in ra, cộng dồn, tìm kiếm, sao chép hay xoá.

Với array hay linked list thì việc này rất đơn giản: chỉ có một thứ tự tự nhiên, từ đầu đến cuối. Cây thì **phi tuyến tính** (non-linear): sau khi thăm một node, bạn có thể có hai (hoặc nhiều) node con để đi tiếp, nên phải quyết định nhánh nào đi trước và cần nhớ gì về nhánh chưa đi.

Mọi chiến lược duyệt đều thuộc một trong hai họ:

| Họ | Ý tưởng | Cấu trúc hỗ trợ |
|---|---|---|
| **Duyệt theo chiều rộng** (Breadth-first search – BFS) | Thăm cây **theo từng tầng**, từ trái sang phải | **Hàng đợi** (queue, FIFO) |
| **Duyệt theo chiều sâu** (Depth-first search – DFS) | Đi **sâu hết mức** xuống một nhánh rồi mới quay lại | **Ngăn xếp** (stack, LIFO) — thường là call stack qua đệ quy |

Bản thân DFS có ba thứ tự chuẩn: **pre-order**, **in-order** và **post-order**.

Dù theo thứ tự nào, mỗi node cũng chỉ được thăm một lần với O(1) công việc, nên **mọi cách duyệt đều tốn O(n) thời gian**. Điểm khác nhau là **thứ tự kết quả** và **bộ nhớ phụ** cần dùng.

---

## 2. Cây ví dụ

Mọi ví dụ trong bài dùng chung một cây nhị phân. Nó tình cờ là một binary search tree (có thể dựng bằng cách insert 10, 6, 15, 3, 8, 20), nhưng code duyệt chạy được trên **mọi** cây nhị phân — không dòng nào so sánh giá trị.

```text
          10
        /    \
       6      15
      / \       \
     3   8       20
```

Một node chỉ cần giá trị và hai tham chiếu tới con:

```js
class Node {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

const root = new Node(10);
root.left = new Node(6);
root.right = new Node(15);
root.left.left = new Node(3);
root.left.right = new Node(8);
root.right.right = new Node(20);
```

Bốn cách duyệt cây này, sẽ được giải thích ở các phần sau:

| Cách duyệt | Kết quả |
|---|---|
| BFS | `[10, 6, 15, 3, 8, 20]` |
| DFS pre-order | `[10, 6, 3, 8, 15, 20]` |
| DFS in-order | `[3, 6, 8, 10, 15, 20]` |
| DFS post-order | `[3, 8, 6, 20, 15, 10]` |

---

## 3. Duyệt theo chiều rộng: ý tưởng

BFS thăm mọi node ở độ sâu 0, rồi toàn bộ độ sâu 1, rồi độ sâu 2, cứ thế tiếp. Mẹo nằm ở **hàng đợi**: khi thăm một node, ta thêm các con của nó vào **cuối** queue, và luôn lấy node tiếp theo từ **đầu** queue. Nhờ vậy con của node đến trước luôn được xử lý trước con của node đến sau.

Thuật toán:

1. Tạo một queue và mảng `result`; đưa root vào queue.
2. Khi queue còn phần tử: **lấy ra** (dequeue) một node và push giá trị của nó vào `result`.
3. Nếu node có con trái, đưa vào queue; nếu có con phải, đưa vào queue.
4. Trả về `result`.

Trace trên cây ví dụ:

```text
step  dequeue  result                  queue (front ... back)
0     -        []                      [10]
1     10       [10]                    [6, 15]
2     6        [10, 6]                 [15, 3, 8]
3     15       [10, 6, 15]             [3, 8, 20]
4     3        [10, 6, 15, 3]          [8, 20]
5     8        [10, 6, 15, 3, 8]       [20]
6     20       [10, 6, 15, 3, 8, 20]   []
```

---

## 4. Cài đặt BFS bằng JavaScript

Cách dịch trực tiếp dùng array với `push` / `shift`:

```js
function bfs(root) {
  if (root === null) return [];

  const queue = [root];
  const result = [];

  while (queue.length > 0) {
    const node = queue.shift(); // dequeue from the front
    result.push(node.value);

    if (node.left) queue.push(node.left);

    if (node.right) queue.push(node.right);
  }

  return result;
}
```

Code này đúng, nhưng `shift` tốn **O(n)**: mọi phần tử còn lại đều bị đánh lại chỉ số. Khi queue chứa tới n/2 node, trường hợp xấu nhất tiến dần tới **O(n²)**. Hai cách khắc phục:

- Giữ một **chỉ số head** thay vì shift (`const node = queue[head++]`): O(n) thời gian, nhưng mảng giữ lại cả n tham chiếu nên tốn O(n) bộ nhớ.
- Dùng **queue bằng linked list** với enqueue và dequeue O(1) (bài 13), hoặc bản duyệt theo tầng ở phần 10.

Độ phức tạp của BFS: **O(n) thời gian** (mỗi node vào và ra queue một lần) và **O(w) bộ nhớ phụ**, với `w` là độ rộng lớn nhất của cây — số node tối đa cùng lúc nằm chờ trong queue.

---

## 5. Duyệt theo chiều sâu: ba thứ tự

DFS đi theo một nhánh xuống tới lá, rồi lùi lại và thử nhánh kế tiếp. Viết đệ quy, "xử lý một node" gồm ba việc: **thăm chính node (N)**, **duyệt cây con trái (L)**, **duyệt cây con phải (R)**. Ba thứ tự DFS chỉ khác nhau ở **thời điểm thăm chính node**:

| Thứ tự | Trình tự | Node được thăm… |
|---|---|---|
| Pre-order | N → L → R | trước các con |
| In-order | L → N → R | giữa trái và phải |
| Post-order | L → R → N | sau cả hai con |

Trái luôn đi trước phải; chỉ vị trí của N thay đổi.

Mẹo hình dung: vẽ một đường vòng quanh viền ngoài của cây, bắt đầu từ root và đi xuống phía bên trái. Mỗi node bị đi qua ba lần — bên trái, bên dưới, bên phải nó. Ghi lại node khi đi qua **bên trái** cho ra pre-order, **bên dưới** cho ra in-order, **bên phải** cho ra post-order.

Đệ quy rất tự nhiên ở đây vì một cây con cũng là một cây. Base case là cây con rỗng (`null`). Độ sâu đệ quy bằng chiều cao `h` của cây, nên DFS đệ quy tốn **O(h) bộ nhớ phụ** trên call stack.

---

## 6. Pre-order (Node, Trái, Phải)

```js
function preOrder(root) {
  const result = [];

  function traverse(node) {
    if (node === null) return;

    result.push(node.value); // N
    traverse(node.left);     // L
    traverse(node.right);    // R
  }

  traverse(root);

  return result;
}

preOrder(root); // [10, 6, 3, 8, 15, 20]
```

```text
traverse(10)   push 10
  traverse(6)    push 6
    traverse(3)    push 3   (both children null)
    traverse(8)    push 8
  traverse(15)   push 15
    traverse(20)   push 20
```

**Khi nào dùng:** root đứng đầu, sau đó mới tới mọi thứ bên dưới, nên pre-order chính là thứ tự bạn sẽ **tạo** các node. Nó được dùng để **sao chép** hoặc **xuất/tuần tự hoá** (serialize) cây để dựng lại sau. Nếu ghi thêm một ký hiệu cho mỗi con null, pre-order mô tả chính xác hình dạng cây:

```js
function serialize(root) {
  const out = [];

  function walk(node) {
    if (node === null) {
      out.push('#');
      return;
    }

    out.push(node.value);
    walk(node.left);
    walk(node.right);
  }

  walk(root);

  return out.join(',');
}

serialize(root); // "10,6,3,#,#,8,#,#,15,#,20,#,#"
```

Bên đọc dựng lại theo đúng cách đó: đọc một token, tạo node, rồi đệ quy dựng cây con trái và cây con phải. Với BST, ngay cả pre-order không có ký hiệu null cũng đủ: insert các giá trị theo đúng thứ tự đó sẽ tạo lại đúng cây ban đầu.

Độ phức tạp: **O(n) thời gian, O(h) bộ nhớ phụ** (cộng O(n) cho mảng kết quả).

---

## 7. In-order (Trái, Node, Phải)

```js
function inOrder(root) {
  const result = [];

  function traverse(node) {
    if (node === null) return;

    traverse(node.left);     // L
    result.push(node.value); // N
    traverse(node.right);    // R
  }

  traverse(root);

  return result;
}

inOrder(root); // [3, 6, 8, 10, 15, 20]
```

**Khi nào dùng:** trên **BST**, in-order thăm các giá trị theo **thứ tự tăng dần**, vì mọi thứ trong cây con trái đều nhỏ hơn node và mọi thứ trong cây con phải đều lớn hơn. Từ đó có lời giải trực tiếp cho nhiều bài quen thuộc:

- **Liệt kê BST theo thứ tự đã sắp xếp** — O(n).
- **Kiểm tra một cây có phải BST hợp lệ** — dãy in-order phải tăng nghiêm ngặt.
- **Phần tử nhỏ thứ k** — dừng lại sau khi thăm k node.

Để kiểm tra BST thậm chí không cần mảng: chỉ nhớ giá trị vừa thăm trước đó và báo sai ngay khi gặp node không lớn hơn nó — O(n) thời gian, O(h) bộ nhớ. In-order chỉ được định nghĩa cho cây **nhị phân**; với node có nhiều con thì không có vị trí "ở giữa" duy nhất.

---

## 8. Post-order (Trái, Phải, Node)

```js
function postOrder(root) {
  const result = [];

  function traverse(node) {
    if (node === null) return;

    traverse(node.left);     // L
    traverse(node.right);    // R
    result.push(node.value); // N
  }

  traverse(root);

  return result;
}

postOrder(root); // [3, 8, 6, 20, 15, 10]
```

**Khi nào dùng:** một node chỉ được xử lý khi **cả hai cây con đã xong**, nên post-order hợp với mọi bài mà kết quả của node phụ thuộc vào kết quả của các con:

- **Xoá / giải phóng** cây: con phải đi trước cha.
- **Chiều cao, kích thước, tổng** của từng cây con.
- **Tính giá trị cây biểu thức** (expression tree): tính toán hạng trước rồi mới áp dụng toán tử.

```js
function height(node) {
  if (node === null) return 0;

  return 1 + Math.max(height(node.left), height(node.right));
}

height(root); // 3 (counting nodes on the longest root-to-leaf path)
```

Một số sách đếm số cạnh thay vì số node, ra kết quả 2; khi phỏng vấn hãy nói rõ bạn dùng quy ước nào.

Với biểu thức `(3 + 4) * 2`, ba thứ tự DFS cho ra ba cách viết kinh điển:

```text
        *            pre-order:  * + 3 4 2   (prefix)
       / \           in-order:   3 + 4 * 2   (infix, needs parentheses)
      +   2          post-order: 3 4 + 2 *   (postfix / Reverse Polish)
     / \
    3   4
```

---

## 9. DFS dạng lặp với stack tường minh

Đệ quy dùng call stack một cách ngầm định. Trên cây rất sâu (ví dụ một cây lệch với 100.000 node), nó sẽ ném lỗi `RangeError: Maximum call stack size exceeded`; các JavaScript engine chỉ cho phép cỡ khoảng mười nghìn frame. Cách sửa là tự quản lý một stack trên heap.

**Pre-order:** pop một node, thăm nó, push **con phải trước, rồi con trái**, để con trái được pop ra trước.

```js
function preOrderIterative(root) {
  if (root === null) return [];

  const stack = [root];
  const result = [];

  while (stack.length > 0) {
    const node = stack.pop();
    result.push(node.value);

    if (node.right) stack.push(node.right);

    if (node.left) stack.push(node.left);
  }

  return result;
}
```

**In-order:** trượt sang trái hết mức, push các node trên đường đi; pop một node, thăm nó, rồi chuyển sang con phải.

```js
function inOrderIterative(root) {
  const stack = [];
  const result = [];
  let current = root;

  while (current !== null || stack.length > 0) {
    while (current !== null) {
      stack.push(current);
      current = current.left;
    }

    current = stack.pop();
    result.push(current.value);
    current = current.right;
  }

  return result;
}
```

**Post-order** dạng lặp: chạy vòng lặp pre-order nhưng đổi thứ tự push (N → R → L) rồi đảo ngược kết quả, sẽ được L → R → N.

Cả ba vẫn là **O(n) thời gian và O(h) bộ nhớ phụ**.

---

## 10. BFS theo từng tầng

Nhiều bài phỏng vấn cần biết **một tầng kết thúc ở đâu**: in mỗi tầng một dòng, right-side view, trung bình mỗi tầng, độ sâu nhỏ nhất. Hãy xử lý cây theo từng tầng trọn vẹn:

```js
function levelOrder(root) {
  if (root === null) return [];

  const levels = [];
  let current = [root];

  while (current.length > 0) {
    const next = [];
    const values = [];

    for (const node of current) {
      values.push(node.value);

      if (node.left) next.push(node.left);

      if (node.right) next.push(node.right);
    }

    levels.push(values);
    current = next;
  }

  return levels;
}

levelOrder(root); // [[10], [6, 15], [3, 8, 20]]
```

Không có `shift` nào, nên đây thực sự là **O(n) thời gian**, và mỗi lúc chỉ giữ hai tầng nên tốn **O(w) bộ nhớ phụ**. Số tầng chính là chiều cao của cây.

Vì BFS gặp các node theo thứ tự độ sâu, nó có thể **dừng sớm** ở kết quả khớp đầu tiên — lá đầu tiên tìm thấy cho ra độ sâu nhỏ nhất, node khớp đầu tiên là node nông nhất. DFS không đảm bảo được điều đó nếu không duyệt hết.

---

## 11. Thời gian và bộ nhớ: cây rộng vs cây sâu

Mọi cách duyệt đều **O(n) thời gian**. Bộ nhớ phụ (không tính mảng kết quả) mới là chỗ BFS và DFS khác nhau:

- **BFS: O(w)** — queue chứa tối đa một tầng đầy đủ.
- **DFS: O(h)** — stack chứa một đường đi từ root tới lá.

**Cây rộng** — cây nhị phân hoàn hảo (perfect binary tree). Tầng cuối chứa khoảng một nửa số node, trong khi chiều cao chỉ khoảng log₂ n.

```text
               1
         /           \
       2               3
     /   \           /   \
    4     5         6     7
   / \   / \       / \   / \
  8   9 10  11   12  13 14  15      <- 8 of 15 nodes on one level
```

**Cây sâu** — cây lệch (skewed tree), ví dụ BST dựng từ dữ liệu đã sắp xếp. Mỗi tầng chỉ có một node, và chiều cao bằng n.

```text
  1
   \
    2
     \
      3
       \
        4            <- width 1, height n
```

| Hình dạng cây | Chiều cao h | Độ rộng tối đa w | Bộ nhớ BFS | Bộ nhớ DFS |
|---|---|---|---|---|
| Hoàn hảo / cân bằng | ≈ log₂ n | ≈ n / 2 | **O(n)** | **O(log n)** |
| Lệch (giống list) | n | 1 | **O(1)** | **O(n)** |

Với cây hoàn hảo khoảng một triệu node, BFS phải giữ khoảng 500.000 node trong queue, còn DFS đệ quy chỉ giữ khoảng 20 frame. Với cây lệch thì ngược lại.

---

## 12. Chọn cách duyệt nào

| Bạn cần… | Dùng | Vì sao |
|---|---|---|
| Giá trị BST theo thứ tự tăng, kiểm tra BST, phần tử nhỏ thứ k | **In-order** | L < N < R |
| Sao chép, clone hoặc serialize cây | **Pre-order** | Cha được tạo trước con |
| Xoá cây, chiều cao/kích thước/tổng cây con, tính biểu thức | **Post-order** | Kết quả của con có sẵn trước |
| Kết quả theo tầng, node khớp nông nhất, độ sâu nhỏ nhất | **BFS** | Thăm theo thứ tự độ sâu |
| Chỉ cần thăm hết trên cây rộng, cân bằng | **DFS** | Bộ nhớ O(log n) thay vì O(n) |
| Duyệt cây rất sâu hoặc lệch | **BFS** hoặc **DFS dạng lặp** | Tránh tràn call stack |

Hai ý tưởng này sẽ quay lại ở phần đồ thị (bài 18): BFS với queue, DFS với stack, cộng thêm một tập `visited` vì đồ thị có thể có chu trình — cây thì không.

---

## Điểm cần nhớ khi phỏng vấn

- Duyệt cây = thăm mọi node một lần; **mọi cách duyệt đều O(n) thời gian**.
- **BFS dùng queue** và đi theo tầng; **DFS dùng stack** (thường là đệ quy) và đi sâu trước.
- Các thứ tự DFS: **pre-order N-L-R**, **in-order L-N-R**, **post-order L-R-N** — chỉ vị trí của node thay đổi.
- **In-order trên BST cho kết quả đã sắp xếp**; dùng để kiểm tra BST hoặc tìm phần tử nhỏ thứ k.
- **Pre-order** để sao chép/serialize; **post-order** để xoá cây và cho mọi thứ tính từ các con (chiều cao, kích thước, tính biểu thức).
- Bộ nhớ: **BFS O(w)**, **DFS O(h)**. Cây rộng cân bằng → BFS O(n), DFS O(log n). Cây lệch → BFS O(1), DFS O(n).
- `shift()` trên array tốn O(n); dùng chỉ số head, queue bằng linked list hoặc mảng theo tầng để BFS thật sự O(n).
- Cây sâu có thể làm tràn call stack; chuyển DFS sang stack tường minh. Với pre-order dạng lặp, push **con phải trước con trái**.

## Tóm tắt

- Cây là cấu trúc phi tuyến tính, nên phải chọn chiến lược: theo chiều rộng (queue) hoặc theo chiều sâu (stack).
- Trên cây ví dụ: BFS `[10, 6, 15, 3, 8, 20]`, pre-order `[10, 6, 3, 8, 15, 20]`, in-order `[3, 6, 8, 10, 15, 20]`, post-order `[3, 8, 6, 20, 15, 10]`.
- DFS đệ quy chỉ là ba dòng, khác nhau duy nhất ở chỗ ghi nhận node; bản lặp dùng stack tường minh.
- BFS theo tầng giải các câu hỏi "theo từng tầng" và "nông nhất", và có thể dừng sớm.
- Thời gian luôn là O(n); bộ nhớ phụ thuộc hình dạng cây — độ rộng với BFS, chiều cao với DFS.
