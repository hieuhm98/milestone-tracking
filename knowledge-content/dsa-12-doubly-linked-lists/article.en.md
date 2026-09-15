# Doubly Linked Lists – Two-Way Pointers

## 1. What makes a list "doubly" linked

Quick reminder: a singly linked list is a chain of nodes where each node holds a value and a `next` pointer, plus `head`, `tail` and `length` on the list. A **doubly linked list** (DLL) is almost identical — except every node carries **one more pointer, `prev`, to the node before it**.

```text
singly:   head                               tail
           12 ------> 9 ------> 5 ------> 14 ------> null

doubly:   head                               tail
null <---- 12 <=====> 9 <=====> 5 <=====> 14 ----> null
           prev/next  prev/next  prev/next
```

That single extra field changes what is cheap:

- You can walk the list **in both directions**.
- From any node you can reach its predecessor in O(1), so **removing the tail** (and removing a node you already hold) becomes O(1).
- Lookups by index can start from **whichever end is closer**.

The price is memory: every node stores an extra reference. More memory buys more flexibility — the usual trade-off.

---

## 2. The Node and DoublyLinkedList classes

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

Three states every method must handle correctly:

```text
empty:      head = null, tail = null, length = 0

one node:   null <- [7] -> null
                    head = tail  (the SAME node)

many:     null <- [12] <-> [9] <-> [5] -> null
                  head             tail
```

After every operation: `head.prev === null`, `tail.next === null`, and for every node `a` with a successor, `a.next.prev === a`. Most DLL bugs break the last rule — a link updated in one direction only.

---

## 3. push – add to the end

1. Create a node with the value.
2. If the list is empty, the node becomes both `head` and `tail`.
3. Otherwise link **both ways**: `tail.next = node` and `node.prev = tail`, then move `tail` to the node.
4. Increment `length` and return the list.

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

## 4. pop – remove from the end, now in O(1)

In a singly linked list `pop` is O(n): to find the new tail you must walk from the head. With `prev`, the new tail is simply `tail.prev`.

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

Forgetting `this.tail.next = null` leaves the new tail still pointing at the removed node, so a forward traversal would "resurrect" it. Clearing `oldTail.prev` is hygiene: the caller receives a clean node that does not hold the list in memory.

Time **O(1)**, space **O(1)**.

---

## 5. shift and unshift – working at the head

`shift` removes the first node; it is the mirror image of `pop`.

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

`unshift` adds a node to the front; it is the mirror image of `push`.

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

The `length === 1` branch in `shift`/`pop` matters: without it, `this.head.prev = null` runs on `null` and throws, or `tail` keeps pointing at a removed node. Both are **O(1)** time and space — unlike `Array.prototype.shift`/`unshift`, which are O(n) because every element is re-indexed.

---

## 6. get and set – walk from the nearer end

A linked list has no indices, so `get(index)` must walk. A DLL can at least walk **from whichever end is closer**:

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

The worst case is now about **n/2 steps** instead of n — a real speed-up, but **still O(n)**, because constants are dropped.

`set` reuses `get`:

```js
set(index, val) {
  const node = this.get(index);

  if (!node) return false;

  node.val = val;

  return true;
}
```

Both are **O(n)** time, **O(1)** space.

---

## 7. insert – splice a node into the middle

1. If `index < 0` or `index > length`, return `false` (note `>`, not `>=`: `index === length` means "append").
2. If `index === 0`, use `unshift`; if `index === length`, use `push`.
3. Otherwise `before = get(index - 1)` and `after = before.next`.
4. Wire **four pointers**, then increment `length`.

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

**Order trap:** capture `after` *before* changing `before.next`. If you write `before.next = node` first and then read `before.next` to find `after`, you get the new node itself and create a loop. The `!!` turns the list returned by `push`/`unshift` into `true`.

Time **O(n)** (dominated by `get`), space **O(1)**. The splice itself is O(1).

---

## 8. remove – unlink a node by index

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

By index this is **O(n)** because of `get`. But notice the unlink lines never needed to *search*: **if you already hold a reference to the node, removal is O(1)**. In a singly linked list, even with the node in hand, you still need its predecessor, which costs O(n). This is the real superpower of a DLL, and it is exactly what an LRU cache exploits.

---

## 9. reverse – swap next and prev on every node

Reversing a DLL in place is simpler than a singly list: swap `head`/`tail`, then for every node swap its `next` and `prev`.

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

Save `current.next` before overwriting it — that saved value is how the loop moves on. Time **O(n)**, space **O(1)**.

---

## 10. Big O: doubly vs singly linked lists vs arrays

| Operation | Array | Singly linked list | Doubly linked list |
|---|---|---|---|
| Access by index | **O(1)** | O(n) | O(n) (≤ n/2 steps) |
| Search by value | O(n) | O(n) | O(n) |
| Insert / remove at front | O(n) | O(1) | O(1) |
| Insert at end | O(1) amortized | O(1) with tail | O(1) |
| Remove at end | O(1) | **O(n)** | **O(1)** |
| Remove a node you hold | — | O(n) | **O(1)** |
| Insert / remove by index | O(n) | O(n) | O(n) |
| Extra memory per item | none | 1 pointer | 2 pointers |

"Insertion and removal are O(1)" is true only **at the ends or at a node you already have**. Anything that needs to find a position first is O(n). Arrays still win for random access and for iteration speed, because contiguous memory is cache-friendly while list nodes are scattered.

---

## 11. The memory trade-off and sentinel nodes

Each DLL node stores a value plus **two** references, so a DLL uses noticeably more memory than a singly list and far more than an array of numbers. You pay that cost when you need backward traversal, O(1) tail removal, or O(1) removal of arbitrary nodes; otherwise a singly list or an array is leaner.

A common implementation trick is **sentinel (dummy) nodes**: a permanent fake head and fake tail that never hold data.

```text
[H] <-> [12] <-> [9] <-> [5] <-> [T]
sentinel                        sentinel
empty list:   [H] <-> [T]
```

Every real node now always has a non-null `prev` and `next`, so the special cases for "empty list", "one node", "removing the head" and "removing the tail" disappear. Insert and unlink become the same four-line code everywhere, costing just two extra nodes.

---

## 12. Where doubly linked lists are used

**Browser history.** Back and forward move along `prev` and `next`; visiting a new page cuts off the forward branch.

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

**LRU cache** (Least Recently Used). Combine a **hash map** (key → node, O(1) lookup) with a **DLL ordered by recency**. On every access, unlink the node (O(1) thanks to `prev`) and move it to the front; when full, evict the node just before the tail sentinel.

```text
map: { a -> node, b -> node, c -> node }
[H] <-> [c] <-> [a] <-> [b] <-> [T]
        most recent     least recent (evicted first)
```

Result: `get` and `put` are both **O(1)**. (In JavaScript a `Map` keeps insertion order, so delete-then-set can emulate an LRU, but interviewers want the map + DLL design.)

Other uses: **deques** (O(1) at both ends), playlists with previous/next, undo/redo, and Java's `LinkedList`/`LinkedHashMap`.

---

## Key interview points

- A DLL node has `val`, `next` **and `prev`**; the list keeps `head`, `tail`, `length`.
- **pop is O(1)** in a DLL (new tail is `tail.prev`) but O(n) in a singly list.
- **Removing a node you already hold is O(1)** — the reason LRU caches use a DLL + hash map.
- `get` walks from the **nearer end**: at most ~n/2 steps, but still **O(n)**.
- Every link change must be done **in both directions**; always handle the empty and one-node cases.
- In `insert`, save `after = before.next` **before** rewiring; valid index range is `0..length`.
- `reverse` swaps `next`/`prev` on each node and swaps `head`/`tail`: O(n) time, O(1) space.
- Trade-off: **two pointers per node** of extra memory for flexibility; sentinel nodes remove edge cases.

## Summary

- A doubly linked list is a singly linked list plus a `prev` pointer on every node.
- `push`, `pop`, `shift`, `unshift` are all O(1); `get`, `set`, `insert`, `remove` by index are O(n).
- Searching is O(n); walking from the nearer end halves the steps but not the Big O.
- It costs more memory than a singly list but allows backward traversal and O(1) removal of known nodes.
- Real uses include browser history, deques, playlists and the classic hash map + DLL LRU cache.
