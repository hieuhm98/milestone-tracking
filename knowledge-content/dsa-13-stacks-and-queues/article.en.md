# Stacks & Queues – LIFO and FIFO

## 1. Stacks and queues are abstract data types

A **stack** and a **queue** are both ordered collections that only let you add and remove items at specific ends. They are best thought of as **abstract data types (ADTs)**: they are defined by *which operations exist and how they behave*, not by how the data is stored.

| | Stack | Queue |
|---|---|---|
| Rule | **LIFO** — Last In, First Out | **FIFO** — First In, First Out |
| Add | `push` (to the top) | `enqueue` (to the back) |
| Remove | `pop` (from the top) | `dequeue` (from the front) |
| Look without removing | `peek` / `top` | `peek` / `front` |
| Everyday picture | A pile of plates | A line at a ticket counter |

JavaScript has no built-in `Stack` or `Queue` class. You either use an array with the right methods or write a small class backed by a linked list. Both are valid implementations of the same ADT — but, as we will see, the wrong choice of array methods silently turns an O(1) operation into O(n).

Restricting access is the point: because you only touch the ends, every core operation can be O(1).

---

## 2. The stack: Last In, First Out

In a stack, the **last element added is the first one removed**. You can only see and remove the top item.

```text
push(10), push(2), push(22), push(7)

 top ->  |  7 |   <- last in, first out
         | 22 |
         |  2 |
         | 10 |   <- first in, last out
         +----+

pop() -> 7        pop() -> 22        peek() -> 2 (not removed)
```

Besides `push`, `pop` (returns `null`/`undefined` when empty) and `peek`, most stacks expose `isEmpty()` or `size`. A stack reverses order: push `a, b, c` and popping everything yields `c, b, a`. Whenever a problem needs "the most recent unfinished thing", think stack.

---

## 3. Where stacks are used

- **The call stack.** Each function call pushes a frame; returning pops it. This is why deep recursion can overflow the stack.
- **Undo / redo.** Every edit is pushed onto an undo stack. Undo pops it and pushes it onto a redo stack; a new edit clears the redo stack.
- **Browser history.** Back and forward buttons behave like two stacks.
- **Iterative DFS** on trees and graphs uses an explicit stack instead of recursion.
- **Parsing:** matching brackets, evaluating expressions, validating HTML tags.

A classic interview problem — are the brackets balanced?

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

Each character is pushed or popped at most once: **O(n) time, O(n) space** in the worst case (all openers).

---

## 4. A stack backed by an array

A JavaScript array already behaves like a stack if you use **only the end** of it:

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

`push` and `pop` touch only the last slot, so nothing else has to move. `push` is **amortized O(1)**: occasionally the engine reallocates the backing storage and copies everything, but averaged over many pushes the cost is constant.

Using the **front** of the array (`unshift` + `shift`) is still LIFO and still correct — but every call re-indexes all other elements, so both operations become **O(n)**:

| Methods | Still LIFO? | Cost per operation |
|---|---|---|
| `push` + `pop` | Yes | O(1) amortized |
| `unshift` + `shift` | Yes | O(n) |

---

## 5. A stack backed by a linked list

A singly linked list (see the linked-list topic) gives worst-case O(1) operations if we add and remove at the **head**:

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

Why the head and not the tail? Adding at the tail is cheap if you keep a `last` pointer, but **removing** the tail of a singly linked list means walking from the head to find the new last node — O(n). The head is the only end where both insert and remove are O(1).

---

## 6. Stack Big O and choosing an implementation

| Operation | Array (`push`/`pop`) | Linked list (head) |
|---|---|---|
| push | O(1) amortized | O(1) |
| pop | O(1) | O(1) |
| peek | O(1) | O(1) |
| search for a value | O(n) | O(n) |
| access the k-th item from the top | O(n) as a stack* | O(n) |
| space | O(n) | O(n), plus one pointer per node |

\* An array *can* index directly, but doing so bypasses the stack's interface; as an ADT, a stack only exposes the top.

Trade-offs:

- **Array** — contiguous memory, cache-friendly, no per-node object, simplest code. Occasional O(n) resize spike.
- **Linked list** — every operation is O(1) in the worst case, never a resize; costs an extra object and pointer per element and more garbage-collector work.

In JavaScript, and in interviews, a plain array with `push`/`pop` is the normal choice. Reach for the linked-list version when you need guaranteed per-operation latency or are asked to implement the structure from scratch.

---

## 7. The queue: First In, First Out

In a queue, the **first element added is the first one removed**, like people waiting in line. Items join at the **back** and leave from the **front**.

```text
enqueue(10), enqueue(2), enqueue(22), enqueue(7)

 dequeue here                    enqueue here
      |                               |
      v                               v
  front: [10]  [2]  [22]  [7]  :back

dequeue() -> 10     dequeue() -> 2     peek() -> 22
```

A queue **preserves order**: items come out in exactly the order they went in. Typical uses:

- **Task and job queues** — background jobs, uploads, print spoolers, message brokers.
- **Breadth-first search (BFS)** — visit nodes level by level.
- **The JavaScript event loop** — callbacks wait in task queues and run in arrival order.
- **Buffers** — keystrokes, network packets, rate limiters.

---

## 8. A queue backed by an array — and why `shift` is O(n)

The obvious array queue is `push` to enqueue and `shift` to dequeue (or `unshift` + `pop`). Both are FIFO, but **one of the two operations always works on the front of the array**, and the front is expensive:

```text
before shift():   index:  0    1    2    3
                  value:  10   2    22   7

shift() returns 10; every remaining element slides left one index:

                  index:  0    1    2
                  value:  2    22   7        <- n - 1 elements moved
```

An array's elements live at numbered indices, so removing index 0 forces all others to be renumbered: **O(n)**. Draining a queue of `n` items with `shift` therefore costs about n + (n−1) + … + 1 = **O(n²)**. Engines sometimes optimise small cases, but you cannot rely on that.

The fix without a linked list: never remove from the front — just move a **head index** forward and compact occasionally.

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

Compaction only copies the live elements, and only once more than half of the array is dead, so its cost is paid for by the dequeues before it: **amortized O(1)** per operation.

---

## 9. A queue backed by a linked list

With a singly linked list we keep two pointers, `first` and `last`. **Enqueue at the tail, dequeue at the head** — the head is the only end where removal is O(1).

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

The classic bug is forgetting to reset `last` when the final node leaves. `last` then still points at the removed node, the next `enqueue` attaches the new node to that detached node, and `first` stays `null` — the value is effectively lost.

---

## 10. Queue Big O and queues in action

| Implementation | enqueue | dequeue | peek | Notes |
|---|---|---|---|---|
| Array `push` + `shift` | O(1) amortized | **O(n)** | O(1) | Fine only for tiny queues |
| Array + head index | O(1) amortized | O(1) amortized | O(1) | Needs occasional compaction |
| Linked list (`first`/`last`) | O(1) | O(1) | O(1) | Extra node per item |
| Circular buffer | O(1) amortized | O(1) | O(1) | See the deque section |

Searching a queue for a value, or reaching the k-th item, is **O(n)** for every implementation; space is **O(n)**.

The most important algorithmic use is **BFS**. Because a queue is FIFO, nodes are processed in order of distance from the start, so the first time BFS reaches the target it has found the **fewest hops** in an unweighted graph:

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

Swap the queue for a stack and the same loop becomes an iterative DFS: it still visits every reachable node, but it no longer guarantees the shortest path. Graph traversal itself is covered in later topics.

---

## 11. Deque: a double-ended queue

A **deque** ("deck") allows insertion and removal at **both** ends: `pushFront`, `pushBack`, `popFront`, `popBack`, all O(1). It can act as a stack (use one end) or a queue (use both ends).

A JavaScript array is **not** a real deque: `push`/`pop` are O(1) but `unshift`/`shift` are O(n). Two good implementations:

- A **doubly linked list** with `head` and `tail` — O(1) at both ends because each node knows its predecessor.
- A **circular buffer** (ring buffer) — an array whose front index wraps around with `%`.

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

Pushes are amortized O(1) (doubling copies everything rarely); pops are O(1); space O(n). Deques power the **monotonic deque** trick for "sliding window maximum" in O(n), bounded undo histories that drop the oldest entry, and work-stealing task schedulers.

---

## 12. A queue built from two stacks

A favourite interview question: implement a queue using only stack operations. Use an **inbox** stack for enqueues and an **outbox** stack for dequeues. Moving everything from inbox to outbox reverses the order — and reversing a LIFO order gives FIFO.

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

**Cost:** a single `dequeue` can be O(n) when it triggers a transfer, but each element is pushed onto the inbox once, moved once, and popped once. Over any sequence of `m` operations the total work is O(m), so enqueue and dequeue are **amortized O(1)**. Space is O(n).

The critical rule: **only refill when the outbox is empty.** Moving items while the outbox still holds older elements would put newer items on top of them and break FIFO order.

The reverse exercise — a stack from two queues — is possible too, but one of push or pop must cost O(n).

---

## Key interview points

- **Stack = LIFO** (`push`/`pop` at the top); **queue = FIFO** (`enqueue` at the back, `dequeue` at the front). Both are ADTs — defined by behaviour, not storage.
- Array stack: use **`push`/`pop`** (O(1) amortized). `unshift`/`shift` still work but are **O(n)**.
- Array queue with `shift` is **O(n) per dequeue** and O(n²) to drain; fix it with a head index, a linked list, or a circular buffer.
- Linked-list stack: push/pop at the **head**. Linked-list queue: **enqueue at the tail, dequeue at the head**; reset `last` when the queue empties.
- Insert/remove O(1); **search and access O(n)**; space O(n).
- Recognise the pattern: most recent / nesting / undo / DFS → **stack**; arrival order / level by level / BFS / scheduling → **queue**; both ends or sliding window → **deque**.
- Queue from two stacks: refill the outbox **only when it is empty**; **amortized O(1)**, worst single operation O(n).

## Summary

- Stacks and queues restrict access to their ends, which makes every core operation O(1).
- A stack reverses order and models the call stack, undo/redo, history and bracket matching.
- A queue preserves order and models task processing, buffers and BFS.
- Implementation choice matters: the right array methods or a linked list keep operations O(1); `shift`/`unshift` quietly make them O(n).
- A deque (doubly linked list or circular buffer) gives O(1) at both ends.
- Two stacks can simulate a queue with amortized O(1) operations.
