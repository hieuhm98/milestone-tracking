# Danh sách liên kết đơn (Singly Linked List)

## 1. Danh sách liên kết đơn là gì?

**Danh sách liên kết đơn** (singly linked list) là một chuỗi các **node**. Mỗi node lưu một **giá trị** (value) và một **con trỏ** (pointer) `next` trỏ tới node kế tiếp; node cuối cùng trỏ tới `null`. Bản thân đối tượng list chỉ giữ ba thứ:

- **head** — node đầu tiên,
- **tail** — node cuối cùng,
- **length** — số lượng node.

```text
 HEAD                                   TAIL
  |                                      |
  v                                      v
+---+---+    +---+---+    +---+---+    +---+---+
| 4 | *-+--> | 6 | *-+--> | 8 | *-+--> | 2 | / |--> null
+---+---+    +---+---+    +---+---+    +---+---+
 val next                               length = 4
```

Không có index. Muốn tới node thứ ba, bạn phải bắt đầu từ `head` và đi theo `next` hai lần. Chữ "đơn" (singly) nghĩa là mỗi node chỉ biết node đứng sau nó — bạn chỉ đi tới được, không đi lùi được (danh sách liên kết đôi ở bài sau sẽ thêm con trỏ `prev`).

---

## 2. So sánh linked list với array

Array là **một khối bộ nhớ liền mạch** (contiguous), nên `arr[i]` chỉ là một phép tính địa chỉ. Các node của linked list là **những object riêng lẻ nằm rải rác trên heap**, chỉ được nối với nhau bằng tham chiếu.

```text
Array (contiguous):   [ 4 | 6 | 8 | 2 ]   arr[2] = base + 2 * slot  -> O(1)

Linked list (scattered):
  0x10: {4, next: 0x88}   0x88: {6, next: 0x3C}   0x3C: {8, next: 0x51}   0x51: {2, next: null}
```

| Khía cạnh | Array | Singly linked list |
|---|---|---|
| Có index | Có, `arr[i]` | Không |
| Truy cập phần tử thứ i | O(1) | O(n) — đi từ head |
| Chèn / xoá ở đầu | O(n) — mọi phần tử phải dịch chỗ | O(1) |
| Chèn / xoá ở cuối | O(1) amortized | Chèn O(1), xoá O(n) |
| Chèn sau một node đang nắm trong tay | O(n) do dịch chỗ | O(1) — nối lại hai con trỏ |
| Bộ nhớ thêm | Không có cho mỗi phần tử | Mỗi node thêm một con trỏ `next` |
| Thân thiện với CPU cache | Rất tốt (liền mạch) | Kém (phải nhảy theo con trỏ) |

Quy tắc kinh nghiệm: chọn linked list khi bạn **thêm và xoá ở đầu** thường xuyên và **hiếm khi cần truy cập ngẫu nhiên** (random access). Nó cũng là viên gạch nền để xây stack và queue.

---

## 3. Class Node và SinglyLinkedList

Dùng cú pháp class ES2015 từ bài trước:

```js
class Node {
  constructor(val) {
    this.val = val;
    this.next = null;
  }
}

class SinglyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  // Traversal: visit every node from head to tail
  toArray() {
    const out = [];
    let current = this.head;

    while (current) {
      out.push(current.val);
      current = current.next;
    }

    return out;
  }
}
```

Vòng lặp `while (current)` là **mẫu duyệt danh sách** (traversal) mà mọi method khác đều dùng lại: bắt đầu ở `head`, xử lý, chuyển sang `current.next`, dừng khi gặp `null`. Thời gian O(n); `toArray` tốn O(n) bộ nhớ cho mảng kết quả, còn một vòng duyệt chỉ in ra thì tốn O(1).

Hai **bất biến** (invariant) phải luôn đúng sau **mọi** method:

1. List rỗng ⇔ `head === null` ⇔ `tail === null` ⇔ `length === 0`.
2. `tail.next === null`.

Phần lớn bug với linked list là một trường hợp biên (list rỗng, list chỉ có một node) làm vỡ một trong hai bất biến này.

---

## 4. push — thêm vào cuối

1. Tạo node mới.
2. Nếu list rỗng, node đó vừa là `head` vừa là `tail`.
3. Ngược lại, nối tail hiện tại tới node mới rồi dời `tail`.
4. Tăng `length` và trả về list.

```js
push(val) {
  const newNode = new Node(val);

  if (!this.head) {
    this.head = newNode;
    this.tail = newNode;
  } else {
    this.tail.next = newNode;
    this.tail = newNode;
  }

  this.length++;

  return this;
}
```

```text
before:  HEAD -> [1] -> [2] <- TAIL
step 1:  HEAD -> [1] -> [2] -> [3]        tail.next = newNode
step 2:  HEAD -> [1] -> [2] -> [3] <- TAIL tail = newNode
```

**O(1) thời gian, O(1) bộ nhớ** — nhờ có con trỏ `tail`. Không có nó, bạn phải duyệt cả list để tìm node cuối: O(n).

---

## 5. pop — xoá ở cuối

Xoá tail khó hơn: ta phải biến node **áp chót** (second-to-last) thành tail mới, mà node trong danh sách liên kết đơn không có con trỏ ngược về nó. Cách duy nhất để tìm là đi từ head.

```js
pop() {
  if (!this.head) return undefined;

  let current = this.head;
  let newTail = current;

  while (current.next) {
    newTail = current;
    current = current.next;
  }

  this.tail = newTail;
  this.tail.next = null;
  this.length--;

  if (this.length === 0) {
    this.head = null;
    this.tail = null;
  }

  return current.val;
}
```

```text
list: [1] -> [2] -> [3] -> null

start      newTail=[1]  current=[1]
iter 1     newTail=[1]  current=[2]
iter 2     newTail=[2]  current=[3]   current.next is null: stop

tail = [2], [2].next = null
HEAD -> [1] -> [2] <- TAIL            return 3
```

**O(n) thời gian, O(1) bộ nhớ.** Khối `length === 0` rất quan trọng: khi pop node duy nhất, `newTail` vẫn đang trỏ vào chính node vừa bị xoá, nên phải xoá `head` và `tail` một cách tường minh.

---

## 6. shift và unshift — làm việc ở đầu list

**shift** xoá head: lưu head lại, dời `head` sang `head.next`, giảm length.

```js
shift() {
  if (!this.head) return undefined;

  const oldHead = this.head;
  this.head = oldHead.next;
  this.length--;

  if (this.length === 0) {
    this.tail = null;
  }

  oldHead.next = null; // detach so it does not leak a reference into the list

  return oldHead.val;
}
```

**unshift** thêm head mới: cho node mới trỏ vào head hiện tại, rồi dời `head`.

```js
unshift(val) {
  const newNode = new Node(val);

  if (!this.head) {
    this.head = newNode;
    this.tail = newNode;
  } else {
    newNode.next = this.head;
    this.head = newNode;
  }

  this.length++;

  return this;
}
```

```text
unshift(0):   [0]          HEAD -> [1] -> [2]
              [0] -> [1] -> [2]     newNode.next = head
      HEAD -> [0] -> [1] -> [2]     head = newNode
```

Cả hai đều **O(1) thời gian, O(1) bộ nhớ** — list dài bao nhiêu cũng vậy. So với `Array.prototype.shift/unshift` là O(n) vì mọi phần tử phải đánh lại index. Đây chính là lợi thế đặc trưng của linked list.

---

## 7. get và set — theo vị trí

`get(index)` đi `index` bước từ head. Index nằm ngoài phạm vi thì trả về `null`.

```js
get(index) {
  if (index < 0 || index >= this.length) return null;

  let current = this.head;
  let counter = 0;

  while (counter !== index) {
    current = current.next;
    counter++;
  }

  return current;
}
```

`set(index, val)` dùng lại `get` rồi ghi đè giá trị tại chỗ.

```js
set(index, val) {
  const node = this.get(index);

  if (!node) return false;

  node.val = val;

  return true;
}
```

Cả hai là **O(n) thời gian** trong worst case (chính xác là O(index)), **O(1) bộ nhớ**. Lưu ý `get(0)` là O(1) còn `get(length - 1)` vẫn là O(n) dù ta đang giữ `tail` — vòng lặp tổng quát không xử lý riêng trường hợp này (bạn có thể thêm lối tắt đó).

---

## 8. insert — chèn tại một vị trí

Để chèn tại `index`, ta cần node **đứng trước** vị trí đó để nối lại con trỏ quanh nó.

```js
insert(index, val) {
  if (index < 0 || index > this.length) return false;

  if (index === this.length) {
    this.push(val);

    return true;
  }

  if (index === 0) {
    this.unshift(val);

    return true;
  }

  const newNode = new Node(val);
  const prev = this.get(index - 1);
  newNode.next = prev.next; // 1. new node grabs the rest of the list
  prev.next = newNode;      // 2. predecessor points to the new node
  this.length++;

  return true;
}
```

Chú ý `index === this.length` là **hợp lệ** với insert (tức là chèn vào cuối), vì vậy điều kiện chặn dùng `>`.

```text
insert(2, 'X') on  A -> B -> C -> D
prev = get(1) = B
1. X.next = B.next   A -> B -> C -> D
                               ^
                          X ---+
2. B.next = X        A -> B -> X -> C -> D
```

**Thứ tự rất quan trọng.** Nếu làm `prev.next = newNode` trước, bạn mất tham chiếu duy nhất tới `C`, và `newNode.next = prev.next` sẽ khiến `X` trỏ vào chính nó. **O(n) thời gian** (do `get`), **O(1) bộ nhớ**; bản thân thao tác nối lại con trỏ chỉ O(1).

---

## 9. remove — xoá tại một vị trí

```js
remove(index) {
  if (index < 0 || index >= this.length) return undefined;

  if (index === 0) return this.shift();

  if (index === this.length - 1) return this.pop();

  const prev = this.get(index - 1);
  const removed = prev.next;
  prev.next = removed.next; // skip over the removed node
  removed.next = null;
  this.length--;

  return removed.val;
}
```

```text
remove(2) on  A -> B -> C -> D
prev = B, removed = C
B.next = C.next     A -> B ---------> D
                          C (unreachable, garbage collected)
```

Khác với insert, **`index === length` nằm ngoài phạm vi** với remove: không có node nào ở đó để xoá. Nếu điều kiện chặn viết là `index > this.length`, lời gọi `remove(length)` sẽ lọt qua, `prev` thành tail, `removed` là `null`, và `removed.next` ném ra `TypeError`.

**O(n) thời gian, O(1) bộ nhớ.** Xoá index 0 là O(1); xoá index cuối thì gọi `pop`, vẫn là O(n).

---

## 10. reverse — đảo ngược tại chỗ

Đảo ngược list mà không tạo node mới (in place): lật mọi con trỏ `next` cho trỏ ngược lại. Ba biến cùng di chuyển: `prev`, `node`, `next`.

```js
reverse() {
  let node = this.head;
  this.head = this.tail;
  this.tail = node;

  let prev = null;
  let next = null;

  while (node) {
    next = node.next;  // 1. save the rest of the list
    node.next = prev;  // 2. flip the pointer
    prev = node;       // 3. advance prev
    node = next;       // 4. advance node
  }

  return this;
}
```

Trace trên `13 -> 27 -> 32 -> 71`:

```text
start       prev=null  node=13
iter 1      null <- 13        27 -> 32 -> 71      prev=13 node=27
iter 2      null <- 13 <- 27        32 -> 71      prev=27 node=32
iter 3      null <- 13 <- 27 <- 32        71      prev=32 node=71
iter 4      null <- 13 <- 27 <- 32 <- 71          prev=71 node=null  stop

result      HEAD                   TAIL
             |                      |
             71 -> 32 -> 27 -> 13 -> null
```

**O(n) thời gian, O(1) bộ nhớ.** Bản reverse viết bằng đệ quy cũng O(n) thời gian nhưng tốn **O(n) bộ nhớ** trên call stack. Đảo ngược linked list là một trong những bài khởi động phổ biến nhất khi phỏng vấn — hãy thuộc lòng bốn dòng trong vòng lặp.

---

## 11. Tổng hợp Big O

| Thao tác | Thời gian | Bộ nhớ phụ | Lý do |
|---|---|---|---|
| push | O(1) | O(1) | Có con trỏ tail |
| pop | O(n) | O(1) | Phải tìm node áp chót |
| unshift | O(1) | O(1) | Nối lại head |
| shift | O(1) | O(1) | Dời head |
| get / set | O(n) | O(1) | Đi từ head |
| insert(i) | O(n) | O(1) | `get(i - 1)` là O(n); nối con trỏ O(1) |
| remove(i) | O(n) | O(1) | Tương tự, O(1) tại index 0 |
| tìm theo giá trị | O(n) | O(1) | Quét tuyến tính |
| reverse | O(n) | O(1) | Một lượt lật con trỏ |

Bản thân list chiếm O(n) bộ nhớ. Cách nói tắt thường gặp là **"chèn O(1), xoá O(1) hoặc O(n), tìm kiếm O(n), truy cập O(n)"**: chèn ở hai đầu đều O(1); xoá ở head là O(1) nhưng ở tail là O(n).

Vì push và shift đều O(1), danh sách liên kết đơn cho ta một **queue** hiệu quả (enqueue ở tail, dequeue ở head), còn unshift + shift cho ta một **stack** ở phía head. Cả hai sẽ được học ở bài sau.

---

## 12. Kỹ thuật thường dùng và lỗi hay gặp

**Các trường hợp biên cần kiểm tra cho mọi method:** list rỗng, list một node, index đầu, index cuối và index ngoài phạm vi.

**Node giả ở đầu (dummy / sentinel head).** Đặt một node giả trước head thật giúp bỏ trường hợp đặc biệt "đây có phải index 0 không?", vì khi đó node thật nào cũng có node đứng trước:

```js
function removeValue(head, target) {
  const dummy = new Node(null);
  dummy.next = head;
  let prev = dummy;

  while (prev.next) {
    if (prev.next.val === target) {
      prev.next = prev.next.next;
    } else {
      prev = prev.next;
    }
  }

  return dummy.next; // the possibly new head
}
// O(n) time, O(1) space
```

**Con trỏ nhanh và chậm (fast & slow pointers).** Mỗi vòng lặp, `slow` đi một bước, `fast` đi hai bước. Khi `fast` tới cuối thì `slow` đang ở giữa — chỉ một lượt duyệt, O(1) bộ nhớ. Cùng ý tưởng đó (thuật toán Floyd) phát hiện **chu trình** (cycle): nếu `fast` gặp `slow` thì list bị vòng lặp.

```js
function middle(head) {
  let slow = head;
  let fast = head;

  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }

  return slow; // for even length, the second of the two middles
}

function hasCycle(head) {
  let slow = head;
  let fast = head;

  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;

    if (slow === fast) return true;
  }

  return false;
}
// Both O(n) time, O(1) space (a Set of visited nodes would be O(n) space)
```

**Các bug kinh điển khác:** không xoá `head`/`tail` khi list trở nên rỗng (lần `pop` thứ hai lại "xoá" đúng node đó lần nữa và `length` thành -1), quên `length++/--`, và nối lại con trỏ sai thứ tự (làm mất phần còn lại của list).

---

## Điểm cần nhớ khi phỏng vấn

- Danh sách liên kết đơn gồm các node `{ val, next }` cùng `head`, `tail`, `length`; `next` của node cuối là `null`.
- **Không có random access**: `get(i)` là O(n). Array thắng về truy cập theo index và cache locality.
- **O(1)**: push (khi có con trỏ tail), unshift, shift. **O(n)**: pop, get, set, insert, remove, tìm kiếm.
- pop là O(n) vì không thể **đi lùi** về node áp chót.
- insert/remove dùng `get(index - 1)`; gán `newNode.next` **trước** `prev.next`.
- Điều kiện chặn khác nhau: insert cho phép `index === length`, còn remove/get/set thì không.
- Luôn xử lý list rỗng và list một node, giữ `head`/`tail`/`length` nhất quán.
- Đảo ngược tại chỗ bằng `prev / node / next`: O(n) thời gian, O(1) bộ nhớ.
- Con trỏ nhanh/chậm tìm node giữa và phát hiện chu trình với O(1) bộ nhớ.

## Tóm tắt

- Linked list đánh đổi việc truy cập theo index O(1) để có chèn và xoá ở đầu O(1).
- Mọi method đều được xây từ một vòng duyệt cộng với việc nối lại con trỏ cẩn thận.
- Con trỏ tail giúp push là O(1), nhưng pop vẫn là O(n) với danh sách liên kết đơn.
- insert và remove quy về "tìm node đứng trước rồi nối lại con trỏ", tổng cộng O(n).
- Đảo ngược tại chỗ lật từng con trỏ `next` trong một lượt duyệt.
- Linked list là nền tảng cho stack, queue và danh sách liên kết đôi.
