# Doubly Linked List – Danh sách liên kết đôi

## 1. Thế nào là danh sách liên kết "đôi"

Nhắc nhanh: singly linked list là một chuỗi node, mỗi node chứa giá trị và con trỏ `next`; bản thân list giữ `head`, `tail` và `length`. **Danh sách liên kết đôi** (doubly linked list – DLL) gần như y hệt — chỉ khác là mỗi node có **thêm một con trỏ `prev` trỏ về node đứng trước nó**.

```text
singly:   head                               tail
           12 ------> 9 ------> 5 ------> 14 ------> null

doubly:   head                               tail
null <---- 12 <=====> 9 <=====> 5 <=====> 14 ----> null
           prev/next  prev/next  prev/next
```

Chỉ thêm một field nhưng thay đổi hẳn những gì là "rẻ":

- Có thể duyệt list **theo cả hai chiều**.
- Từ bất kỳ node nào cũng tới được node đứng trước trong O(1), nên **xoá tail** (và xoá một node mà bạn đang cầm sẵn tham chiếu) trở thành O(1).
- Truy cập theo index có thể bắt đầu từ **đầu nào gần hơn**.

Cái giá phải trả là bộ nhớ: mỗi node lưu thêm một reference. Tốn bộ nhớ hơn để đổi lấy sự linh hoạt — trade-off quen thuộc.

---

## 2. Class Node và DoublyLinkedList

```js
class Node {
  constructor(val) {
    this.val = val;
    this.next = null;
    this.prev = null;
  }
}

class DoublyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }
}
```

Ba trạng thái mà mọi method đều phải xử lý đúng:

```text
empty:      head = null, tail = null, length = 0

one node:   null <- [7] -> null
                    head = tail  (the SAME node)

many:     null <- [12] <-> [9] <-> [5] -> null
                  head             tail
```

Sau mọi thao tác phải luôn đúng: `head.prev === null`, `tail.next === null`, và với mọi node `a` có node kế tiếp thì `a.next.prev === a`. Phần lớn bug của DLL phá vỡ quy tắc cuối — chỉ cập nhật liên kết theo một chiều.

---

## 3. push – thêm vào cuối

1. Tạo node mới với giá trị.
2. Nếu list rỗng, node đó vừa là `head` vừa là `tail`.
3. Ngược lại, nối **cả hai chiều**: `tail.next = node` và `node.prev = tail`, rồi dời `tail` sang node mới.
4. Tăng `length` và trả về list.

```js
push(val) {
  const node = new Node(val);

  if (this.length === 0) {
    this.head = node;
    this.tail = node;
  } else {
    this.tail.next = node;   // old tail -> new node
    node.prev = this.tail;   // new node -> old tail
    this.tail = node;
  }

  this.length++;

  return this;
}
```

```text
push(14) on  [12] <-> [9] <-> [5]
                               tail
step 3a:     [12] <-> [9] <-> [5] --> [14]
step 3b:     [12] <-> [9] <-> [5] <-> [14]
step 3c:     [12] <-> [9] <-> [5] <-> [14]
                                      tail
```

Time **O(1)**, space **O(1)**.

---

## 4. pop – xoá ở cuối, giờ chỉ O(1)

Với singly linked list, `pop` là O(n): muốn tìm tail mới phải đi từ head. Có `prev` rồi thì tail mới đơn giản là `tail.prev`.

```js
pop() {
  if (this.length === 0) return undefined;

  const oldTail = this.tail;

  if (this.length === 1) {
    this.head = null;
    this.tail = null;
  } else {
    this.tail = oldTail.prev;  // O(1): no walk from the head
    this.tail.next = null;
    oldTail.prev = null;       // detach the removed node
  }

  this.length--;

  return oldTail;
}
```

Quên dòng `this.tail.next = null` thì tail mới vẫn trỏ tới node đã xoá, và khi duyệt xuôi node đó "sống lại". Xoá `oldTail.prev` là để dọn dẹp: người gọi nhận một node sạch, không còn níu giữ cả list trong bộ nhớ.

Time **O(1)**, space **O(1)**.

---

## 5. shift và unshift – thao tác ở head

`shift` xoá node đầu tiên; nó là ảnh gương của `pop`.

```js
shift() {
  if (this.length === 0) return undefined;

  const oldHead = this.head;

  if (this.length === 1) {
    this.head = null;
    this.tail = null;
  } else {
    this.head = oldHead.next;
    this.head.prev = null;
    oldHead.next = null;
  }

  this.length--;

  return oldHead;
}
```

`unshift` thêm một node vào đầu; nó là ảnh gương của `push`.

```js
unshift(val) {
  const node = new Node(val);

  if (this.length === 0) {
    this.head = node;
    this.tail = node;
  } else {
    this.head.prev = node;
    node.next = this.head;
    this.head = node;
  }

  this.length++;

  return this;
}
```

Nhánh `length === 1` trong `shift`/`pop` rất quan trọng: thiếu nó thì `this.head.prev = null` chạy trên `null` và ném lỗi, hoặc `tail` vẫn trỏ vào node đã bị xoá. Cả hai đều **O(1)** về time và space — khác với `Array.prototype.shift`/`unshift` là O(n) vì mọi phần tử phải đánh lại index.

---

## 6. get và set – đi từ đầu gần hơn

Linked list không có index, nên `get(index)` buộc phải duyệt. Nhưng DLL ít nhất có thể duyệt **từ đầu nào gần hơn**:

```js
get(index) {
  if (index < 0 || index >= this.length) return null;

  let current;

  if (index <= this.length / 2) {
    current = this.head;

    for (let i = 0; i < index; i++) {
      current = current.next;
    }
  } else {
    current = this.tail;

    for (let i = this.length - 1; i > index; i--) {
      current = current.prev;
    }
  }

  return current;
}
```

```text
length = 10, get(7):  7 > 10/2, start at tail

index:  0    1    2    3    4    5    6    7    8    9
       [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
                                           ^<---^<---tail
                                           2 steps (a singly list needs 7)
```

Worst case giờ chỉ khoảng **n/2 bước** thay vì n — nhanh hơn thật, nhưng **vẫn là O(n)**, vì hằng số bị bỏ đi.

`set` tái sử dụng `get`:

```js
set(index, val) {
  const node = this.get(index);

  if (!node) return false;

  node.val = val;

  return true;
}
```

Cả hai đều **O(n)** time, **O(1)** space.

---

## 7. insert – chèn node vào giữa

1. Nếu `index < 0` hoặc `index > length`, trả về `false` (chú ý là `>`, không phải `>=`: `index === length` nghĩa là "thêm vào cuối").
2. Nếu `index === 0` thì dùng `unshift`; nếu `index === length` thì dùng `push`.
3. Ngược lại lấy `before = get(index - 1)` và `after = before.next`.
4. Nối **bốn con trỏ**, rồi tăng `length`.

```js
insert(index, val) {
  if (index < 0 || index > this.length) return false;

  if (index === 0) return !!this.unshift(val);

  if (index === this.length) return !!this.push(val);

  const before = this.get(index - 1);
  const after = before.next;
  const node = new Node(val);

  node.prev = before;
  node.next = after;
  before.next = node;
  after.prev = node;
  this.length++;

  return true;
}
```

```text
insert(2, 7) on [12] <-> [9] <-> [5] <-> [14]
                         before  after

                [12] <-> [9] <-> [7] <-> [5] <-> [14]
                         before  node    after
pointers set:  node.prev, node.next, before.next, after.prev
```

**Bẫy thứ tự:** phải lưu `after` **trước khi** đổi `before.next`. Nếu viết `before.next = node` trước rồi mới đọc `before.next` để tìm `after`, bạn sẽ nhận lại chính node mới và tạo ra vòng lặp. `!!` biến list mà `push`/`unshift` trả về thành `true`.

Time **O(n)** (chủ yếu do `get`), space **O(1)**. Riêng thao tác nối thì chỉ O(1).

---

## 8. remove – gỡ node theo index

```js
remove(index) {
  if (index < 0 || index >= this.length) return undefined;

  if (index === 0) return this.shift();

  if (index === this.length - 1) return this.pop();

  const removed = this.get(index);

  removed.prev.next = removed.next;  // neighbour before skips it
  removed.next.prev = removed.prev;  // neighbour after skips it
  removed.next = null;
  removed.prev = null;
  this.length--;

  return removed;
}
```

```text
remove(1):  [12] <-> [9] <-> [5]      becomes     [12] <-> [5]
                     ^ removed                     [9] detached: prev = next = null
```

Xoá theo index là **O(n)** vì phải `get`. Nhưng để ý: các dòng gỡ liên kết không hề cần *tìm kiếm* — **nếu bạn đã cầm sẵn tham chiếu tới node thì xoá chỉ tốn O(1)**. Với singly linked list, dù có node trong tay bạn vẫn cần node đứng trước nó, và việc đó tốn O(n). Đây mới là "siêu năng lực" thật sự của DLL, và chính là thứ LRU cache khai thác.

---

## 9. reverse – đổi chỗ next và prev trên mọi node

Đảo ngược DLL tại chỗ (in place) còn đơn giản hơn singly list: hoán đổi `head`/`tail`, rồi với mỗi node thì hoán đổi `next` và `prev` của nó.

```js
reverse() {
  let current = this.head;

  [this.head, this.tail] = [this.tail, this.head];

  while (current) {
    const next = current.next;

    current.next = current.prev;
    current.prev = next;
    current = next;
  }

  return this;
}
```

```text
before:  null <- [1] <-> [2] <-> [3] -> null
                 head            tail
after:   null <- [3] <-> [2] <-> [1] -> null
                 head            tail
```

Nhớ lưu `current.next` trước khi ghi đè — giá trị đã lưu là cách để vòng lặp đi tiếp. Time **O(n)**, space **O(1)**.

---

## 10. Big O: doubly vs singly linked list vs array

| Thao tác | Array | Singly linked list | Doubly linked list |
|---|---|---|---|
| Truy cập theo index | **O(1)** | O(n) | O(n) (≤ n/2 bước) |
| Tìm theo giá trị | O(n) | O(n) | O(n) |
| Thêm / xoá ở đầu | O(n) | O(1) | O(1) |
| Thêm ở cuối | O(1) amortized | O(1) nhờ tail | O(1) |
| Xoá ở cuối | O(1) | **O(n)** | **O(1)** |
| Xoá node đang cầm sẵn | — | O(n) | **O(1)** |
| Thêm / xoá theo index | O(n) | O(n) | O(n) |
| Bộ nhớ phụ mỗi phần tử | không | 1 con trỏ | 2 con trỏ |

Câu "insertion và removal là O(1)" chỉ đúng **ở hai đầu hoặc tại node bạn đã có sẵn**. Mọi thứ cần tìm vị trí trước đều là O(n). Array vẫn thắng về truy cập ngẫu nhiên và tốc độ duyệt, vì vùng nhớ liền kề thân thiện với CPU cache, còn các node của list nằm rải rác.

---

## 11. Trade-off bộ nhớ và sentinel node

Mỗi node DLL lưu một giá trị cộng **hai** reference, nên DLL tốn bộ nhớ hơn hẳn singly list và hơn rất nhiều so với một mảng số. Bạn chấp nhận chi phí đó khi cần duyệt ngược, xoá tail O(1), hoặc xoá node bất kỳ trong O(1); nếu không, singly list hay array gọn hơn.

Một mẹo cài đặt phổ biến là **sentinel node** (node lính canh, còn gọi là dummy node): một head giả và một tail giả tồn tại vĩnh viễn, không bao giờ chứa dữ liệu.

```text
[H] <-> [12] <-> [9] <-> [5] <-> [T]
sentinel                        sentinel
empty list:   [H] <-> [T]
```

Giờ mọi node thật luôn có `prev` và `next` khác null, nên các trường hợp đặc biệt "list rỗng", "một node", "xoá head", "xoá tail" biến mất. Thêm và gỡ node dùng cùng một đoạn code bốn dòng ở mọi vị trí, chỉ tốn thêm hai node.

---

## 12. DLL được dùng ở đâu

**Lịch sử trình duyệt.** Back và forward đi theo `prev` và `next`; truy cập một trang mới sẽ cắt bỏ nhánh forward.

```js
class BrowserHistory {
  constructor(homepage) {
    this.current = new Node(homepage);
  }

  visit(url) {
    const page = new Node(url);

    page.prev = this.current;
    this.current.next = page;  // drops any old "forward" pages
    this.current = page;
  }

  back(steps) {
    while (steps > 0 && this.current.prev) {
      this.current = this.current.prev;
      steps--;
    }

    return this.current.val;
  }
}
```

**LRU cache** (Least Recently Used – bỏ phần tử lâu nhất chưa dùng). Kết hợp một **hash map** (key → node, tra cứu O(1)) với một **DLL sắp theo mức độ dùng gần đây**. Mỗi lần truy cập, gỡ node ra (O(1) nhờ `prev`) và đưa lên đầu; khi đầy, loại bỏ node nằm ngay trước sentinel tail.

```text
map: { a -> node, b -> node, c -> node }
[H] <-> [c] <-> [a] <-> [b] <-> [T]
        most recent     least recent (evicted first)
```

Kết quả: `get` và `put` đều **O(1)**. (Trong JavaScript, `Map` giữ thứ tự chèn nên có thể giả lập LRU bằng cách delete rồi set lại, nhưng người phỏng vấn muốn thấy thiết kế map + DLL.)

Ứng dụng khác: **deque** (O(1) ở cả hai đầu), playlist có nút previous/next, undo/redo, và `LinkedList`/`LinkedHashMap` của Java.

---

## Điểm cần nhớ khi phỏng vấn

- Node của DLL có `val`, `next` **và `prev`**; list giữ `head`, `tail`, `length`.
- **pop là O(1)** với DLL (tail mới là `tail.prev`) nhưng O(n) với singly list.
- **Xoá một node đang cầm sẵn là O(1)** — lý do LRU cache dùng DLL + hash map.
- `get` duyệt từ **đầu gần hơn**: tối đa ~n/2 bước, nhưng vẫn **O(n)**.
- Mọi thay đổi liên kết phải làm **theo cả hai chiều**; luôn xử lý trường hợp list rỗng và list một node.
- Trong `insert`, lưu `after = before.next` **trước khi** nối lại; index hợp lệ là `0..length`.
- `reverse` hoán đổi `next`/`prev` trên từng node và hoán đổi `head`/`tail`: O(n) time, O(1) space.
- Trade-off: **hai con trỏ mỗi node** tốn thêm bộ nhớ để đổi lấy linh hoạt; sentinel node loại bỏ các edge case.

## Tóm tắt

- Doubly linked list là singly linked list cộng thêm con trỏ `prev` trên mỗi node.
- `push`, `pop`, `shift`, `unshift` đều O(1); `get`, `set`, `insert`, `remove` theo index là O(n).
- Tìm kiếm là O(n); đi từ đầu gần hơn giảm một nửa số bước nhưng không đổi Big O.
- Tốn bộ nhớ hơn singly list nhưng cho phép duyệt ngược và xoá node đã biết trong O(1).
- Ứng dụng thực tế: lịch sử trình duyệt, deque, playlist và LRU cache kinh điển dạng hash map + DLL.
