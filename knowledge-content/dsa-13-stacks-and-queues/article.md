# Stack & Queue – LIFO và FIFO

## 1. Stack và queue là kiểu dữ liệu trừu tượng

**Ngăn xếp** (stack) và **hàng đợi** (queue) đều là tập hợp có thứ tự, nhưng chỉ cho phép thêm và lấy phần tử ở những đầu nhất định. Nên xem chúng là **kiểu dữ liệu trừu tượng** (abstract data type – ADT): chúng được định nghĩa bởi *có những thao tác nào và các thao tác đó hoạt động ra sao*, chứ không phải bởi cách dữ liệu được lưu.

| | Stack | Queue |
|---|---|---|
| Quy tắc | **LIFO** — vào sau, ra trước (Last In, First Out) | **FIFO** — vào trước, ra trước (First In, First Out) |
| Thêm | `push` (lên đỉnh) | `enqueue` (vào cuối hàng) |
| Lấy ra | `pop` (từ đỉnh) | `dequeue` (từ đầu hàng) |
| Xem mà không lấy | `peek` / `top` | `peek` / `front` |
| Hình ảnh đời thường | Chồng đĩa | Hàng người xếp mua vé |

JavaScript không có sẵn class `Stack` hay `Queue`. Bạn hoặc dùng array với đúng các method, hoặc tự viết một class nhỏ dựa trên linked list. Cả hai đều là cách hiện thực (implementation) hợp lệ của cùng một ADT — nhưng như ta sẽ thấy, chọn sai method của array sẽ âm thầm biến thao tác O(1) thành O(n).

Giới hạn quyền truy cập chính là mục đích: vì chỉ đụng vào hai đầu, mọi thao tác cốt lõi đều có thể đạt O(1).

---

## 2. Stack: vào sau, ra trước

Trong stack, **phần tử được thêm vào cuối cùng sẽ bị lấy ra đầu tiên**. Bạn chỉ thấy và lấy được phần tử ở đỉnh (top).

```text
push(10), push(2), push(22), push(7)

 top ->  |  7 |   <- last in, first out
         | 22 |
         |  2 |
         | 10 |   <- first in, last out
         +----+

pop() -> 7        pop() -> 22        peek() -> 2 (not removed)
```

Ngoài `push`, `pop` (trả về `null`/`undefined` khi rỗng) và `peek`, hầu hết stack còn có `isEmpty()` hoặc `size`. Stack đảo ngược thứ tự: push `a, b, c` rồi pop hết sẽ được `c, b, a`. Hễ bài toán cần "việc dang dở gần đây nhất", hãy nghĩ tới stack.

---

## 3. Stack được dùng ở đâu

- **Call stack.** Mỗi lời gọi hàm push một frame; khi hàm return thì frame bị pop. Đó là lý do đệ quy quá sâu gây tràn stack (stack overflow).
- **Undo / redo.** Mỗi thao tác sửa được push vào stack undo. Undo sẽ pop nó ra và push sang stack redo; một thao tác sửa mới sẽ xoá sạch stack redo.
- **Lịch sử trình duyệt.** Nút Back và Forward hoạt động như hai stack.
- **DFS dạng vòng lặp** (iterative DFS) trên cây và đồ thị dùng một stack tường minh thay cho đệ quy.
- **Phân tích cú pháp (parsing):** kiểm tra ngoặc, tính giá trị biểu thức, kiểm tra thẻ HTML.

Một bài phỏng vấn kinh điển — dãy ngoặc có cân bằng không?

```js
function isBalanced(str) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];

  for (const ch of str) {
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(ch);
    } else if (ch in pairs) {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }

  return stack.length === 0;
}

isBalanced('{[()]}'); // true
isBalanced('([)]');   // false: ')' meets '[' on top
isBalanced('((');     // false: stack not empty at the end
```

Mỗi ký tự được push hoặc pop tối đa một lần: **O(n) thời gian, O(n) bộ nhớ** trong trường hợp xấu nhất (toàn ngoặc mở).

---

## 4. Stack dựa trên array

Array của JavaScript vốn đã hoạt động như một stack nếu bạn **chỉ dùng phần cuối** của nó:

```js
class ArrayStack {
  constructor() {
    this.items = [];
  }

  push(value) {
    this.items.push(value);

    return this.items.length;
  }

  pop() {
    return this.items.pop(); // undefined when empty
  }

  peek() {
    return this.items[this.items.length - 1];
  }

  isEmpty() {
    return this.items.length === 0;
  }
}
```

`push` và `pop` chỉ đụng tới ô cuối cùng, nên không phần tử nào khác phải dịch chuyển. `push` là **O(1) khấu hao** (amortized): thỉnh thoảng engine cấp phát lại vùng nhớ bên dưới và sao chép toàn bộ, nhưng tính trung bình qua nhiều lần push thì chi phí là hằng số.

Dùng **phần đầu** của array (`unshift` + `shift`) vẫn là LIFO và vẫn đúng — nhưng mỗi lần gọi phải đánh lại index cho mọi phần tử còn lại, nên cả hai thao tác thành **O(n)**:

| Method | Vẫn là LIFO? | Chi phí mỗi thao tác |
|---|---|---|
| `push` + `pop` | Có | O(1) amortized |
| `unshift` + `shift` | Có | O(n) |

---

## 5. Stack dựa trên linked list

Một singly linked list (xem bài linked list) cho các thao tác O(1) ngay cả trong worst case nếu ta thêm và lấy ở **đầu danh sách** (head):

```js
class Node {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class Stack {
  constructor() {
    this.top = null;
    this.size = 0;
  }

  push(value) {
    const node = new Node(value);
    node.next = this.top;
    this.top = node;

    return ++this.size;
  }

  pop() {
    if (!this.top) return null;

    const removed = this.top;
    this.top = removed.next;
    this.size--;

    return removed.value;
  }

  peek() {
    return this.top ? this.top.value : null;
  }
}
```

```text
after push(10), push(2), push(22), push(7):

 top
  |
  v
 [7] -> [22] -> [2] -> [10] -> null        size = 4

pop() returns 7, top moves one node along:

 top
  |
  v
 [22] -> [2] -> [10] -> null               size = 3
```

Vì sao là head mà không phải tail? Thêm vào tail thì rẻ nếu giữ con trỏ `last`, nhưng **xoá** tail của singly linked list buộc phải đi từ head để tìm node cuối mới — O(n). Head là đầu duy nhất mà cả thêm lẫn xoá đều O(1).

---

## 6. Big O của stack và chọn cách hiện thực

| Thao tác | Array (`push`/`pop`) | Linked list (head) |
|---|---|---|
| push | O(1) amortized | O(1) |
| pop | O(1) | O(1) |
| peek | O(1) | O(1) |
| tìm một giá trị (search) | O(n) | O(n) |
| truy cập phần tử thứ k tính từ đỉnh | O(n) khi dùng như stack* | O(n) |
| bộ nhớ | O(n) | O(n), cộng thêm một con trỏ mỗi node |

\* Array *có thể* truy cập trực tiếp theo index, nhưng làm vậy là đi vòng qua interface của stack; với tư cách một ADT, stack chỉ lộ ra phần tử ở đỉnh.

Đánh đổi:

- **Array** — bộ nhớ liền mạch, thân thiện với cache, không tốn một object cho mỗi phần tử, code đơn giản nhất. Thỉnh thoảng có đột biến O(n) khi resize.
- **Linked list** — mọi thao tác O(1) kể cả worst case, không bao giờ resize; nhưng tốn thêm một object và một con trỏ cho mỗi phần tử, và garbage collector phải làm việc nhiều hơn.

Trong JavaScript và trong phỏng vấn, array với `push`/`pop` là lựa chọn mặc định. Chỉ dùng bản linked list khi cần đảm bảo độ trễ của từng thao tác, hoặc khi được yêu cầu tự cài đặt cấu trúc từ đầu.

---

## 7. Queue: vào trước, ra trước

Trong queue, **phần tử được thêm vào đầu tiên sẽ bị lấy ra đầu tiên**, giống người xếp hàng. Phần tử vào ở **cuối hàng** (back) và rời đi ở **đầu hàng** (front).

```text
enqueue(10), enqueue(2), enqueue(22), enqueue(7)

 dequeue here                    enqueue here
      |                               |
      v                               v
  front: [10]  [2]  [22]  [7]  :back

dequeue() -> 10     dequeue() -> 2     peek() -> 22
```

Queue **giữ nguyên thứ tự**: phần tử ra đúng theo thứ tự đã vào. Các ứng dụng điển hình:

- **Hàng đợi tác vụ (task/job queue)** — job chạy nền, upload file, hàng đợi máy in, message broker.
- **Tìm kiếm theo chiều rộng (BFS)** — duyệt node theo từng tầng.
- **Event loop của JavaScript** — callback chờ trong các task queue và chạy theo thứ tự đến.
- **Bộ đệm (buffer)** — phím bấm, gói tin mạng, bộ giới hạn tốc độ (rate limiter).

---

## 8. Queue dựa trên array — và vì sao `shift` là O(n)

Cách hiển nhiên là `push` để enqueue và `shift` để dequeue (hoặc `unshift` + `pop`). Cả hai đều là FIFO, nhưng **một trong hai thao tác luôn làm việc ở đầu array**, và đầu array thì đắt:

```text
before shift():   index:  0    1    2    3
                  value:  10   2    22   7

shift() returns 10; every remaining element slides left one index:

                  index:  0    1    2
                  value:  2    22   7        <- n - 1 elements moved
```

Phần tử của array nằm ở các index được đánh số, nên xoá index 0 buộc mọi phần tử khác phải đánh số lại: **O(n)**. Rút cạn một queue `n` phần tử bằng `shift` vì thế tốn khoảng n + (n−1) + … + 1 = **O(n²)**. Engine đôi khi tối ưu các trường hợp nhỏ, nhưng bạn không thể trông cậy vào điều đó.

Cách sửa mà không cần linked list: không bao giờ xoá ở đầu — chỉ dời một **chỉ số head** (head index) về phía trước và thỉnh thoảng thu gọn (compact) array.

```js
class ArrayQueue {
  constructor() {
    this.items = [];
    this.head = 0; // index of the front element
  }

  enqueue(value) {
    this.items.push(value);
  }

  dequeue() {
    if (this.head === this.items.length) return undefined;

    const value = this.items[this.head];
    this.items[this.head] = undefined; // release the reference
    this.head++;

    if (this.head > 1024 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }

    return value;
  }

  get size() {
    return this.items.length - this.head;
  }
}
```

Việc compact chỉ sao chép các phần tử còn sống, và chỉ xảy ra khi hơn một nửa array đã "chết", nên chi phí của nó được các lần dequeue trước đó trả thay: **O(1) amortized** cho mỗi thao tác.

---

## 9. Queue dựa trên linked list

Với singly linked list, ta giữ hai con trỏ `first` và `last`. **Enqueue ở tail, dequeue ở head** — head là đầu duy nhất mà thao tác xoá là O(1).

```js
class Queue {
  constructor() {
    this.first = null; // front: dequeue here
    this.last = null;  // back: enqueue here
    this.size = 0;
  }

  enqueue(value) {
    const node = new Node(value);

    if (!this.last) {
      this.first = node;
      this.last = node;
    } else {
      this.last.next = node;
      this.last = node;
    }

    return ++this.size;
  }

  dequeue() {
    if (!this.first) return null;

    const removed = this.first;
    this.first = removed.next;

    if (!this.first) {
      this.last = null; // the queue is now empty
    }

    this.size--;

    return removed.value;
  }

  peek() {
    return this.first ? this.first.value : null;
  }
}
```

```text
 first                         last
   |                             |
   v                             v
 [10] -> [2] -> [22] -> [7] -> null

enqueue(5):   last.next = node; last = node
 [10] -> [2] -> [22] -> [7] -> [5] -> null

dequeue() returns 10:   first = first.next
 [2] -> [22] -> [7] -> [5] -> null
```

Bug kinh điển là quên reset `last` khi node cuối cùng rời queue. Khi đó `last` vẫn trỏ vào node đã bị xoá, lần `enqueue` tiếp theo gắn node mới vào node "mồ côi" đó, còn `first` vẫn là `null` — giá trị coi như bị mất.

---

## 10. Big O của queue và queue trong thực tế

| Cách hiện thực | enqueue | dequeue | peek | Ghi chú |
|---|---|---|---|---|
| Array `push` + `shift` | O(1) amortized | **O(n)** | O(1) | Chỉ ổn với queue rất nhỏ |
| Array + head index | O(1) amortized | O(1) amortized | O(1) | Cần compact định kỳ |
| Linked list (`first`/`last`) | O(1) | O(1) | O(1) | Tốn thêm một node mỗi phần tử |
| Circular buffer | O(1) amortized | O(1) | O(1) | Xem phần deque |

Tìm một giá trị trong queue, hay lấy phần tử thứ k, là **O(n)** với mọi cách hiện thực; bộ nhớ là **O(n)**.

Ứng dụng thuật toán quan trọng nhất là **BFS**. Vì queue là FIFO, các node được xử lý theo thứ tự khoảng cách từ điểm xuất phát, nên lần đầu tiên BFS chạm tới đích cũng là lúc nó tìm được **số bước ít nhất** trong đồ thị không trọng số:

```js
function fewestHops(graph, start, target) {
  const queue = [[start, 0]];
  const seen = new Set([start]);
  let head = 0; // avoid O(n) shift

  while (head < queue.length) {
    const [node, dist] = queue[head++];

    if (node === target) return dist;

    for (const next of graph[node]) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([next, dist + 1]);
      }
    }
  }

  return -1;
}
// O(V + E) time, O(V) space
```

Thay queue bằng stack thì cùng vòng lặp đó thành DFS dạng vòng lặp: vẫn thăm mọi node đi tới được, nhưng không còn đảm bảo đường đi ngắn nhất. Chi tiết về duyệt đồ thị sẽ có ở các bài sau.

---

## 11. Deque: hàng đợi hai đầu

**Deque** (đọc là "deck", double-ended queue – hàng đợi hai đầu) cho phép thêm và lấy ở **cả hai** đầu: `pushFront`, `pushBack`, `popFront`, `popBack`, tất cả O(1). Nó có thể đóng vai stack (chỉ dùng một đầu) hoặc queue (dùng cả hai đầu).

Array của JavaScript **không phải** deque thực thụ: `push`/`pop` là O(1) nhưng `unshift`/`shift` là O(n). Hai cách hiện thực tốt:

- **Doubly linked list** với `head` và `tail` — O(1) ở cả hai đầu vì mỗi node biết node đứng trước nó.
- **Circular buffer** (ring buffer – bộ đệm vòng) — một array có chỉ số đầu "quay vòng" nhờ phép `%`.

```text
capacity 8, head = 6, size = 4

index:   0     1     2     3     4     5     6     7
value:  [c]   [d]   [ ]   [ ]   [ ]   [ ]   [a]   [b]
               ^ back                        ^ front

back index = (head + size - 1) % capacity = 1
order front -> back: a, b, c, d
```

```js
class Deque {
  constructor(capacity = 8) {
    this.buf = new Array(capacity);
    this.head = 0; // index of the front element
    this.size = 0;
  }

  #grow() {
    const bigger = new Array(this.buf.length * 2);

    for (let i = 0; i < this.size; i++) {
      bigger[i] = this.buf[(this.head + i) % this.buf.length];
    }

    this.buf = bigger;
    this.head = 0;
  }

  pushBack(value) {
    if (this.size === this.buf.length) this.#grow();

    this.buf[(this.head + this.size) % this.buf.length] = value;
    this.size++;
  }

  pushFront(value) {
    if (this.size === this.buf.length) this.#grow();

    this.head = (this.head - 1 + this.buf.length) % this.buf.length;
    this.buf[this.head] = value;
    this.size++;
  }

  popFront() {
    if (this.size === 0) return undefined;

    const value = this.buf[this.head];
    this.buf[this.head] = undefined;
    this.head = (this.head + 1) % this.buf.length;
    this.size--;

    return value;
  }

  popBack() {
    if (this.size === 0) return undefined;

    const tail = (this.head + this.size - 1) % this.buf.length;
    const value = this.buf[tail];
    this.buf[tail] = undefined;
    this.size--;

    return value;
  }
}
```

Các thao tác push là O(1) amortized (việc nhân đôi dung lượng thỉnh thoảng mới sao chép toàn bộ); pop là O(1); bộ nhớ O(n). Deque là nền tảng của kỹ thuật **monotonic deque** cho bài "giá trị lớn nhất trong cửa sổ trượt" (sliding window maximum) trong O(n), của lịch sử undo có giới hạn (bỏ bớt mục cũ nhất), và của các bộ lập lịch work-stealing.

---

## 12. Queue xây từ hai stack

Câu hỏi phỏng vấn được ưa chuộng: cài đặt queue chỉ bằng các thao tác của stack. Dùng một stack **inbox** cho enqueue và một stack **outbox** cho dequeue. Chuyển toàn bộ từ inbox sang outbox sẽ đảo ngược thứ tự — mà đảo ngược thứ tự LIFO thì được FIFO.

```js
class TwoStackQueue {
  constructor() {
    this.inbox = [];
    this.outbox = [];
  }

  enqueue(value) {
    this.inbox.push(value);
  }

  #refill() {
    if (this.outbox.length === 0) {
      while (this.inbox.length > 0) {
        this.outbox.push(this.inbox.pop());
      }
    }
  }

  dequeue() {
    this.#refill();

    return this.outbox.pop(); // undefined when both are empty
  }

  peek() {
    this.#refill();

    return this.outbox[this.outbox.length - 1];
  }
}
```

```text
enqueue 1, 2, 3   inbox [1, 2, 3]   outbox []
dequeue()         outbox empty -> move all: inbox []   outbox [3, 2, 1]
                  pop -> 1                              outbox [3, 2]
enqueue 4         inbox [4]         outbox [3, 2]
dequeue()         outbox not empty -> pop -> 2
dequeue()         pop -> 3
dequeue()         outbox empty -> move: outbox [4] -> pop -> 4
```

**Chi phí:** một lần `dequeue` riêng lẻ có thể tốn O(n) khi nó kích hoạt việc chuyển phần tử, nhưng mỗi phần tử chỉ được push vào inbox một lần, chuyển sang outbox một lần và pop ra một lần. Với bất kỳ chuỗi `m` thao tác nào, tổng công việc là O(m), nên enqueue và dequeue đều **O(1) amortized**. Bộ nhớ O(n).

Quy tắc sống còn: **chỉ refill khi outbox rỗng.** Nếu chuyển phần tử sang khi outbox vẫn còn các phần tử cũ hơn, phần tử mới sẽ nằm đè lên chúng và phá vỡ thứ tự FIFO.

Bài ngược lại — stack từ hai queue — cũng làm được, nhưng một trong hai thao tác push hoặc pop buộc phải tốn O(n).

---

## Điểm cần nhớ khi phỏng vấn

- **Stack = LIFO** (`push`/`pop` ở đỉnh); **queue = FIFO** (`enqueue` ở cuối, `dequeue` ở đầu). Cả hai là ADT — định nghĩa bởi hành vi, không phải cách lưu trữ.
- Stack bằng array: dùng **`push`/`pop`** (O(1) amortized). `unshift`/`shift` vẫn chạy đúng nhưng là **O(n)**.
- Queue bằng array với `shift` tốn **O(n) mỗi lần dequeue** và O(n²) để rút cạn; sửa bằng head index, linked list hoặc circular buffer.
- Stack bằng linked list: push/pop ở **head**. Queue bằng linked list: **enqueue ở tail, dequeue ở head**; nhớ reset `last` khi queue rỗng.
- Thêm/xoá O(1); **search và access O(n)**; bộ nhớ O(n).
- Nhận diện pattern: gần đây nhất / lồng nhau / undo / DFS → **stack**; theo thứ tự đến / theo từng tầng / BFS / lập lịch → **queue**; cả hai đầu hoặc cửa sổ trượt → **deque**.
- Queue từ hai stack: chỉ refill outbox **khi nó rỗng**; **O(1) amortized**, một thao tác riêng lẻ xấu nhất O(n).

## Tóm tắt

- Stack và queue giới hạn truy cập ở hai đầu, nhờ đó mọi thao tác cốt lõi đều O(1).
- Stack đảo ngược thứ tự, mô hình hoá call stack, undo/redo, lịch sử duyệt web và kiểm tra ngoặc.
- Queue giữ nguyên thứ tự, mô hình hoá xử lý tác vụ, bộ đệm và BFS.
- Cách hiện thực rất quan trọng: đúng method của array hoặc linked list giữ thao tác ở O(1); `shift`/`unshift` âm thầm biến chúng thành O(n).
- Deque (doubly linked list hoặc circular buffer) cho O(1) ở cả hai đầu.
- Hai stack có thể giả lập một queue với các thao tác O(1) amortized.
