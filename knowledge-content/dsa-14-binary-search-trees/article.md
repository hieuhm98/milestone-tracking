# Binary Search Trees – Cây nhị phân tìm kiếm

## 1. Cây là gì?

**Cây** (tree) là cấu trúc dữ liệu gồm các **nút** (node) liên kết theo quan hệ **cha / con** (parent / child). Một nút nằm trên cùng (**gốc** — root), mọi nút khác có **đúng một cha**, và đi theo các liên kết xuống con thì không bao giờ quay lại được chỗ cũ.

```text
              2                <- root
          /   |   \
         9    12    8
        / \         |
       1   7        44         <- nodes with no children are leaves
```

Ba quy tắc tạo nên một cây:

- Có **đúng một gốc** (nút không có cha).
- Mọi nút còn lại có **đúng một cha**.
- **Không có chu trình** (cycle): cây có `n` nút thì có đúng `n − 1` cạnh.

Vi phạm bất kỳ quy tắc nào thì không còn là cây:

```text
NOT A TREE: a cycle             NOT A TREE: two parents, two roots
        2                            2         8
       / \                            \       /
      9---12                           12    /
                                         \  /
                                          44
```

Ở hình đầu, cạnh thừa 9–12 tạo ra chu trình (2 → 9 → 12 → 2). Ở hình sau, 44 có hai cha và có tới hai gốc (2 và 8).

---

## 2. Thuật ngữ về cây

```text
depth 0            10            <- root
                 /    \
depth 1         6      15        <- 6 and 15 are siblings
               / \       \
depth 2       3   8       20     <- 3, 8, 20 are leaves
```

| Thuật ngữ | Ý nghĩa | Trong hình |
|---|---|---|
| **Root** (gốc) | Nút trên cùng, nút duy nhất không có cha | 10 |
| **Child** (con) | Nút nối trực tiếp với một nút khác theo hướng đi xa gốc | 6 và 15 là con của 10 |
| **Parent** (cha) | Khái niệm ngược với con | 15 là cha của 20 |
| **Siblings** (anh em) | Các nút có cùng cha | 3 và 8 |
| **Leaf** (lá) | Nút không có con | 3, 8, 20 |
| **Edge** (cạnh) | Liên kết giữa hai nút | 10–6 là một cạnh |
| **Subtree** (cây con) | Một nút cùng toàn bộ con cháu của nó | 6, 3, 8 là cây con trái của 10 |
| **Depth** (độ sâu) của nút | Số cạnh từ gốc xuống nút đó | depth(8) = 2 |
| **Height** (chiều cao) của nút | Số cạnh trên đường dài nhất từ nút đó xuống một lá | height(15) = 1 |
| **Chiều cao của cây** | Chiều cao của gốc | 2 |

Có người đếm chiều cao theo số nút (cây này sẽ cao 3); chỉ cần nói rõ bạn dùng quy ước nào. Nếu đếm theo cạnh, cây một nút cao 0 và cây rỗng cao −1.

---

## 3. Cây so với danh sách, và cây xuất hiện ở đâu

Array, linked list, stack và queue đều là cấu trúc **tuyến tính** (linear): mỗi phần tử có tối đa một phần tử "kế tiếp". Cây là cấu trúc **phi tuyến** (non-linear): một nút có thể rẽ nhánh ra nhiều con.

Một singly linked list (`2 -> 12 -> 11`) thực chất là một cây suy biến, trong đó mỗi nút có tối đa một con. Hãy nhớ hình ảnh này — đó chính là thứ một BST có hình dạng tệ sẽ biến thành (mục 9).

Cây mô hình hoá mọi thứ có **cấu trúc phân cấp**:

- **HTML DOM**: `<html>` → `<body>` → `<div>` → …
- **Hệ thống file** và tài liệu **JSON**: thư mục lồng thư mục, object lồng object.
- **Cây cú pháp trừu tượng** (AST) do compiler, Babel, ESLint tạo ra.
- **Định tuyến mạng** (network routing) và **cây quyết định / cây trò chơi** trong AI.
- **Index của database** (B-tree) và **hàng đợi ưu tiên** (heap, chủ đề 16).

---

## 4. Cây nhị phân

**Cây nhị phân** (binary tree) là cây mà **mỗi nút có tối đa hai con**, gọi là `left` và `right`.

```text
BINARY TREE              NOT A BINARY TREE
       1                        1
     /   \                  /   |   \
    5     12               5    9    12
   / \      \             / \          \
  6   3      11          6   3          11
```

Một số hình dạng có tên riêng (sẽ gặp lại ở heap và cây cân bằng):

| Hình dạng | Quy tắc |
|---|---|
| **Full** (đầy đủ) | Mọi nút có 0 hoặc 2 con |
| **Complete** (hoàn chỉnh) | Mọi tầng đều đầy, trừ tầng cuối có thể thiếu và được lấp từ trái sang phải |
| **Perfect** (hoàn hảo) | Mọi nút trong có 2 con và mọi lá nằm cùng một tầng |

Vài con số hữu ích về cây nhị phân:

- Tầng `d` chứa tối đa `2^d` nút (1, 2, 4, 8, …).
- Cây cao `h` chứa tối đa `2^(h+1) − 1` nút. Cây perfect có 4 tầng (h = 3) có 1 + 2 + 4 + 8 = 15 nút.
- Vì vậy `n` nút cần chiều cao **tối thiểu ⌊log₂ n⌋** — và có thể cao **tối đa n − 1** (một chuỗi).

Hai giới hạn log n và n này chính là toàn bộ câu chuyện về hiệu năng của BST.

---

## 5. Cây nhị phân tìm kiếm và tính chất BST

**Cây nhị phân tìm kiếm** (binary search tree — BST) là cây nhị phân giữ các giá trị **theo thứ tự**:

- Mỗi nút có tối đa hai con.
- **Mọi** giá trị trong **cây con trái** của một nút đều **nhỏ hơn** giá trị của nút đó.
- **Mọi** giá trị trong **cây con phải** của một nút đều **lớn hơn** giá trị của nút đó.

```text
          10
        /    \
       6      15
      / \       \
     3   8       20
```

Quy tắc áp dụng cho **toàn bộ cây con**, không chỉ cho con trực tiếp. Đây là lỗi hay gặp nhất:

```text
INVALID: 12 is in the LEFT subtree of 10, but 12 > 10
          10
        /    \
       6      15
      / \
     3   12          <- 6 < 12 is fine locally, but it breaks the rule for 10
```

Nhờ tính chất này, mỗi lần so sánh loại bỏ được nguyên một cây con — cùng ý tưởng "chia đôi không gian tìm kiếm" như binary search trên mảng đã sắp xếp, nhưng trong một cấu trúc mà việc chèn cũng rẻ. Duyệt BST theo thứ tự cây con trái → nút → cây con phải sẽ cho ra các giá trị đã sắp xếp (cách duyệt này, in-order DFS, thuộc chủ đề tiếp theo).

**Giá trị trùng** (duplicate) cần một quy ước. Các lựa chọn thường gặp: bỏ qua (cách dùng trong bài này), lưu thêm `count` trên nút, hoặc luôn đưa giá trị bằng về một phía (ví dụ `<=` đi sang trái).

---

## 6. Class Node và BinarySearchTree

BST chỉ là các nút trỏ tới nút khác, cộng với một tham chiếu tới gốc:

```js
class Node {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class BinarySearchTree {
  constructor() {
    this.root = null;
  }
}
```

Bạn có thể nối nút bằng tay (`tree.root.left = new Node(6)`), nhưng chẳng có gì ngăn bạn đặt 20 sang bên trái. Phương thức `insert` sẽ đảm bảo tính chất BST thay bạn.

---

## 7. Chèn một giá trị

Các bước (viết lặp hoặc đệ quy đều được):

1. Tạo nút mới.
2. Nếu chưa có gốc, nút mới trở thành gốc.
3. Nếu có, bắt đầu từ gốc và so sánh: **lớn hơn → sang phải, nhỏ hơn → sang trái**.
4. Nếu phía đó trống, gắn nút mới vào đó. Nếu không, đi xuống nút con đó và lặp lại.

```js
// inside class BinarySearchTree
insert(value) {
  const newNode = new Node(value);

  if (this.root === null) {
    this.root = newNode;

    return this;
  }

  let current = this.root;

  while (true) {
    if (value === current.value) return undefined; // ignore duplicates

    if (value < current.value) {
      if (current.left === null) {
        current.left = newNode;

        return this;
      }

      current = current.left;
    } else {
      if (current.right === null) {
        current.right = newNode;

        return this;
      }

      current = current.right;
    }
  }
}
```

Trace — chèn 13 vào cây ở mục 5:

```text
13 vs 10 -> greater, go right
13 vs 15 -> less, go left: left is null -> attach

          10
        /    \
       6      15
      / \    /  \
     3   8  13   20
```

Bản đệ quy trả về gốc (có thể là mới) của cây con và **gán** nó ngược lại vào con trỏ của nút cha:

```js
function insertNode(node, value) {
  if (node === null) return new Node(value);

  if (value < node.value) {
    node.left = insertNode(node.left, value);
  } else if (value > node.value) {
    node.right = insertNode(node.right, value);
  }

  return node;
}

// tree.root = insertNode(tree.root, 13);
```

Quên phép gán (chỉ viết `insertNode(node.left, value);`) là bug kinh điển: nút mới được tạo ra rồi bị mất ngay lập tức.

**Độ phức tạp:** thời gian **O(h)**, với h là chiều cao cây — mỗi tầng một phép so sánh. Không gian **O(1)** với bản lặp, **O(h)** với bản đệ quy (call stack).

---

## 8. Tìm một giá trị, min và max

Tìm kiếm đi đúng con đường giống như chèn, nhưng dừng lại khi gặp giá trị hoặc khi "rơi" ra khỏi cây:

```js
// inside class BinarySearchTree
find(value) {
  let current = this.root;

  while (current !== null) {
    if (value === current.value) return current;

    current = value < current.value ? current.left : current.right;
  }

  return null;
}

contains(value) {
  return this.find(value) !== null;
}
```

```text
find(9) in           10         9 < 10 -> left
                   /    \       9 > 6  -> right
                  6      15     9 > 8  -> right: null -> not found
                 / \       \    3 comparisons
                3   8       20
```

**Giá trị nhỏ nhất** là nút ngoài cùng bên trái, **giá trị lớn nhất** là nút ngoài cùng bên phải — không cần so sánh gì:

```js
// inside class BinarySearchTree
min() {
  if (this.root === null) return null;

  let current = this.root;

  while (current.left !== null) {
    current = current.left;
  }

  return current.value;
}
```

`max()` là bản đối xứng, đi theo `right`. Cả ba đều **O(h) thời gian, O(1) bộ nhớ**.

---

## 9. Big O: trường hợp tốt nhất và xấu nhất

Mọi thao tác chỉ đi trên một đường từ gốc xuống lá, nên tất cả đều là **O(h)**. Câu hỏi là cây cao bao nhiêu.

Trong một cây cân bằng tốt, **gấp đôi số nút chỉ thêm đúng một tầng**: 15 nút nằm gọn trong 4 tầng, 1.023 nút trong 10 tầng, khoảng một triệu nút trong 20 tầng. Vậy insert và find là **O(log n) — nhưng điều đó không được đảm bảo.** Chèn các giá trị theo thứ tự tăng dần thì mọi nút mới đều đi sang phải:

```text
insert 1, 2, 3, 4, 5

1
 \
  2
   \
    3            a valid BST, but really a linked list
     \           height = n - 1
      4
       \
        5
```

| Thao tác | Cân bằng (tốt nhất/trung bình) | Suy biến (xấu nhất) |
|---|---|---|
| insert | O(log n) | O(n) |
| find / contains | O(log n) | O(n) |
| remove | O(log n) | O(n) |
| min / max | O(log n) | O(n) |
| bộ nhớ cho cả cây | O(n) | O(n) |

Nếu thứ tự chèn là **ngẫu nhiên**, độ sâu trung bình của một nút khoảng 1,39 log₂ n, nên BST thường chạy tốt với dữ liệu ngẫu nhiên. Nhưng dữ liệu thực tế hay đã sắp xếp hoặc gần như sắp xếp (ID, timestamp) — đúng trường hợp xấu nhất. Cách khắc phục là dùng cây tự giữ cân bằng.

---

## 10. Cây cân bằng: AVL và red-black (tổng quan)

**Cây BST tự cân bằng** (self-balancing BST) làm thêm một chút việc khi insert và remove để giữ chiều cao ở mức **O(log n)**, biến trường hợp trung bình thành **cam kết**. Công cụ là **phép xoay** (rotation): sắp xếp lại vài con trỏ trong O(1), đổi hình dạng cây nhưng vẫn giữ thứ tự BST.

```text
insert 10, 20, 30 -> right-heavy, rotate left around 10

  10                        20
    \      rotate left     /  \
     20    ----------->  10    30
       \
        30
```

| Loại cây | Quy tắc cân bằng | Giới hạn chiều cao | Dùng ở đâu |
|---|---|---|---|
| **AVL** | Với mọi nút, chiều cao cây con trái và phải chênh nhau tối đa 1 | ≈ 1,44 log₂ n (chặt hơn) | Tra cứu nhiều, ít ghi |
| **Red-black** | Nút có màu đỏ hoặc đen; nút đỏ không có con đỏ; mọi đường từ gốc tới null có cùng số nút đen | ≤ 2 log₂(n + 1) (lỏng hơn, ít phép xoay hơn) | `TreeMap` của Java, `std::map` của C++, scheduler của Linux |
| **B-tree / B+ tree** | Nhiều key trong một nút, mọi lá cùng độ sâu | Rất thấp | Index của database và hệ thống file |

Phỏng vấn hiếm khi bắt bạn code phép xoay của AVL hay red-black, nhưng bạn cần biết chúng tồn tại và cam kết điều gì. JavaScript không có sorted map dựng sẵn, nên bạn phải dùng thư viện hoặc một giải pháp thay thế.

Một mẹo liên quan: từ một **mảng đã sắp xếp**, bạn có thể dựng BST cân bằng hoàn hảo trong O(n) bằng cách lấy phần tử giữa làm gốc rồi đệ quy cho từng nửa.

**Khi nào BST cân bằng là lựa chọn đúng?**

| Nhu cầu | Mảng đã sắp xếp | Hash table | BST cân bằng |
|---|---|---|---|
| Tra cứu theo key | O(log n) | O(1) trung bình | O(log n) |
| Insert / delete | O(n) | O(1) trung bình | O(log n) |
| Min / max | O(1) | O(n) | O(log n) |
| Duyệt theo thứ tự tăng dần | O(n) | O(n log n) (phải sort trước) | O(n) |
| Truy vấn khoảng / key lớn hơn kế tiếp | O(log n + k) | O(n) | O(log n + k) |

Chọn BST khi bạn cần **thứ tự** (duyệt có thứ tự, floor/ceiling, truy vấn khoảng) **và** insert/delete thường xuyên. Nếu chỉ cần hỏi "có tồn tại không?", hash table thắng.

---

## 11. Xoá một nút: ba trường hợp

Xoá là thao tác khó nhất vì cây phải tiếp tục là một BST hợp lệ. Trước tiên tìm nút cần xoá, sau đó:

**Trường hợp 1 — lá (0 con):** chỉ việc cắt bỏ (cho nút cha trỏ tới `null`).

**Trường hợp 2 — một con:** thay nút đó bằng đứa con duy nhất của nó.

```text
remove 15 (one child)
          10                     10
        /    \                 /    \
       6      15     ->       6      20
      / \       \            / \
     3   8       20         3   8
```

**Trường hợp 3 — hai con:** không thể nối tắt qua nút. Hãy thay giá trị của nó bằng **nút kế tiếp theo in-order** (in-order successor) — **giá trị nhỏ nhất trong cây con phải** (sang phải một lần, rồi đi trái đến tận cùng) — sau đó xoá nút successor đó, vốn có tối đa một con. Dùng in-order predecessor (lớn nhất trong cây con trái) cũng đúng như vậy.

```text
remove 10 (two children): successor = 13
          10                     13
        /    \                 /    \
       6      15     ->       6      15
      / \    /  \            / \       \
     3   8  13   20         3   8       20
```

```js
function removeNode(node, value) {
  if (node === null) return null;

  if (value < node.value) {
    node.left = removeNode(node.left, value);
  } else if (value > node.value) {
    node.right = removeNode(node.right, value);
  } else {
    // Cases 1 and 2: zero or one child -> return the other side
    if (node.left === null) return node.right;

    if (node.right === null) return node.left;

    // Case 3: two children -> copy the successor, then delete it
    let successor = node.right;

    while (successor.left !== null) {
      successor = successor.left;
    }

    node.value = successor.value;
    node.right = removeNode(node.right, successor.value);
  }

  return node;
}

// inside class BinarySearchTree
remove(value) {
  this.root = removeNode(this.root, value);

  return this;
}
```

Để ý rằng trường hợp 1 được xử lý "miễn phí": lá có `left === null` nên hàm trả về `node.right`, tức là `null`. Xoá gốc cũng chạy đúng, vì nơi gọi gán lại `this.root`.

**Độ phức tạp:** O(h) thời gian — tìm nút, rồi đi xuống tới successor, vẫn chỉ trên một đường. O(h) bộ nhớ cho call stack.

---

## 12. Kiểm tra một cây có phải BST

"Cây nhị phân này có phải BST hợp lệ không?" là câu hỏi phỏng vấn rất được ưa chuộng, và lời giải ngây thơ thì sai:

```js
// BUG: only compares a node with its direct children
function isValidNaive(node) {
  if (node === null) return true;

  if (node.left && node.left.value >= node.value) return false;

  if (node.right && node.right.value <= node.value) return false;

  return isValidNaive(node.left) && isValidNaive(node.right);
}
```

Hàm này chấp nhận cây không hợp lệ ở mục 5 (12 nằm dưới 6, bên trái của 10), vì từng cặp cha/con nhìn cục bộ đều ổn. Bản đúng truyền xuống **khoảng giá trị cho phép** của mỗi cây con:

```js
function isValidBST(node, min = -Infinity, max = Infinity) {
  if (node === null) return true;

  if (node.value <= min || node.value >= max) return false;

  return (
    isValidBST(node.left, min, node.value) &&
    isValidBST(node.right, node.value, max)
  );
}
```

```text
range check for the invalid tree
10 must be in (-inf, +inf)  ok
 6 must be in (-inf, 10)    ok
12 must be in (6, 10)       FAIL -> not a BST
```

**Độ phức tạp:** O(n) thời gian (mỗi nút kiểm tra một lần), O(h) bộ nhớ cho đệ quy.

---

## Điểm cần nhớ khi phỏng vấn

- Cây là cấu trúc **liên thông, không chu trình**, một gốc, mọi nút khác có **một cha**; `n` nút → `n − 1` cạnh.
- **Cây nhị phân** = tối đa hai con. **BST** = cây nhị phân mà **toàn bộ** cây con trái nhỏ hơn và **toàn bộ** cây con phải lớn hơn nút.
- Insert, find, remove, min, max đều tốn **O(h)**: **O(log n)** khi cân bằng, **O(n)** khi suy biến (ví dụ input đã sắp xếp tạo ra một linked list).
- Bản đệ quy tốn **O(h)** bộ nhớ call stack; insert/find viết lặp chỉ tốn **O(1)**.
- Xoá: **lá → cắt bỏ**, **một con → nối tắt**, **hai con → thay bằng in-order successor** (min của cây con phải), rồi xoá successor.
- Kiểm tra BST bằng **khoảng min/max**, không chỉ so sánh cha với con.
- **AVL** và **red-black** dùng phép xoay O(1) để đảm bảo O(log n); red-black đứng sau `TreeMap` / `std::map`.
- Chọn BST cân bằng thay vì hash table khi cần **thứ tự**: duyệt có thứ tự, min/max, floor/ceiling, truy vấn khoảng.

## Tóm tắt

- Cây là cấu trúc phi tuyến, phân cấp: root, parent, child, sibling, leaf, edge, depth, height.
- Cây nhị phân cao h chứa tối đa 2^(h+1) − 1 nút, nên chiều cao nằm trong khoảng ⌊log₂ n⌋ đến n − 1.
- Thứ tự của BST cho phép mỗi phép so sánh loại bỏ nguyên một cây con.
- `insert` và `find` đi trên một đường từ gốc; `min`/`max` đi theo con trỏ trái/phải đến tận cùng.
- Hiệu năng phụ thuộc hình dạng: cân bằng O(log n), suy biến O(n); cây tự cân bằng biến O(log n) thành cam kết.
- Xoá nút có hai con dùng in-order successor; kiểm tra BST truyền xuống khoảng giá trị cho phép.
