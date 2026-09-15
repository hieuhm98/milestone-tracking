# Singly Linked Lists

## 1. What is a singly linked list?

A **singly linked list** is a sequence of **nodes**. Each node stores a **value** and a **pointer** (`next`) to the following node; the last node points to `null`. The list object itself only keeps three things:

- **head** — the first node,
- **tail** — the last node,
- **length** — how many nodes there are.

```text
 HEAD                                   TAIL
  |                                      |
  v                                      v
+---+---+    +---+---+    +---+---+    +---+---+
| 4 | *-+--> | 6 | *-+--> | 8 | *-+--> | 2 | / |--> null
+---+---+    +---+---+    +---+---+    +---+---+
 val next                               length = 4
```

There are no indexes. To reach the third node you must start at `head` and follow `next` twice. "Singly" means each node knows only its successor — you can walk forward, never backward (the doubly linked list in the next topic adds a `prev` pointer).

---

## 2. Linked lists vs arrays

An array is one **contiguous block** of memory, so `arr[i]` is a single address calculation. Linked list nodes are **separate objects scattered around the heap**, glued together only by references.

```text
Array (contiguous):   [ 4 | 6 | 8 | 2 ]   arr[2] = base + 2 * slot  -> O(1)

Linked list (scattered):
  0x10: {4, next: 0x88}   0x88: {6, next: 0x3C}   0x3C: {8, next: 0x51}   0x51: {2, next: null}
```

| Aspect | Array | Singly linked list |
|---|---|---|
| Indexes | Yes, `arr[i]` | No |
| Access i-th element | O(1) | O(n) — walk from head |
| Insert / remove at front | O(n) — every element shifts | O(1) |
| Insert / remove at end | O(1) amortized | O(1) insert, O(n) remove |
| Insert after a node you already hold | O(n) shift | O(1) — rewire two pointers |
| Extra memory | None per element | One `next` pointer per node |
| CPU cache friendliness | Excellent (contiguous) | Poor (pointer chasing) |

Rule of thumb: pick a linked list when you **add and remove at the front** a lot and **rarely need random access**. It is also the building block for stacks and queues.

---

## 3. The Node and SinglyLinkedList classes

Using the ES2015 class syntax from the previous topic:

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

The `while (current)` loop is the **traversal pattern** every other method reuses: start at `head`, do something, move to `current.next`, stop at `null`. Time O(n); `toArray` uses O(n) space for its output, while a traversal that only prints uses O(1).

Two invariants must hold after **every** method:

1. The list is empty ⇔ `head === null` ⇔ `tail === null` ⇔ `length === 0`.
2. `tail.next === null`.

Most linked list bugs are an edge case (empty list, single node) that breaks one of these.

---

## 4. push — add to the end

1. Create a new node.
2. If the list is empty, the node becomes both `head` and `tail`.
3. Otherwise link the current tail to it and move `tail`.
4. Increment `length` and return the list.

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

**O(1) time, O(1) space** — thanks to the `tail` pointer. Without it you would have to walk the whole list to find the end: O(n).

---

## 5. pop — remove from the end

Removing the tail is harder: we must make the **second-to-last** node the new tail, and a singly linked node has no pointer back to it. The only way to find it is to walk from the head.

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

**O(n) time, O(1) space.** The `length === 0` block matters: popping the only node leaves `newTail` pointing at the removed node, so `head` and `tail` must be cleared explicitly.

---

## 6. shift and unshift — work at the front

**shift** removes the head: store it, move `head` to `head.next`, decrement.

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

**unshift** adds a new head: point the new node at the current head, then move `head`.

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

Both are **O(1) time, O(1) space** — no matter how long the list is. Compare `Array.prototype.shift/unshift`, which are O(n) because every element must be re-indexed. This is the linked list's signature advantage.

---

## 7. get and set — by position

`get(index)` walks `index` steps from the head. Out-of-range indexes return `null`.

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

`set(index, val)` reuses `get` and overwrites the value in place.

```js
set(index, val) {
  const node = this.get(index);

  if (!node) return false;

  node.val = val;

  return true;
}
```

Both are **O(n) time** in the worst case (O(index) exactly), **O(1) space**. Note `get(0)` is O(1) and `get(length - 1)` is O(n) even though we hold `tail` — the generic loop does not special-case it (you could add that shortcut).

---

## 8. insert — at a given position

To insert at `index` we need the node **before** that position, so we can rewire around it.

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

Note `index === this.length` is **valid** for insert (append), which is why the guard uses `>`.

```text
insert(2, 'X') on  A -> B -> C -> D
prev = get(1) = B
1. X.next = B.next   A -> B -> C -> D
                               ^
                          X ---+
2. B.next = X        A -> B -> X -> C -> D
```

**Order matters.** If you do `prev.next = newNode` first, you lose the only reference to `C`, and `newNode.next = prev.next` makes `X` point to itself. **O(n) time** (because of `get`), **O(1) space**; the rewiring itself is O(1).

---

## 9. remove — at a given position

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

Unlike insert, **`index === length` is out of range** here: there is no node to remove. A guard written as `index > this.length` lets `remove(length)` through, `prev` becomes the tail, `removed` is `null`, and `removed.next` throws a `TypeError`.

**O(n) time, O(1) space.** Removing index 0 is O(1); removing the last index delegates to `pop`, which is still O(n).

---

## 10. reverse — in place

Reverse the list without creating new nodes: flip every `next` pointer to point backwards. Three variables walk together: `prev`, `node`, `next`.

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

Trace on `13 -> 27 -> 32 -> 71`:

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

**O(n) time, O(1) space.** A recursive reverse is also O(n) time but uses **O(n) space** on the call stack. Reversing a linked list is one of the most common interview warm-ups — know the four lines by heart.

---

## 11. Big O summary

| Operation | Time | Aux. space | Why |
|---|---|---|---|
| push | O(1) | O(1) | Tail pointer |
| pop | O(n) | O(1) | Must find the second-to-last node |
| unshift | O(1) | O(1) | Rewire the head |
| shift | O(1) | O(1) | Move the head |
| get / set | O(n) | O(1) | Walk from the head |
| insert(i) | O(n) | O(1) | `get(i - 1)` is O(n); rewiring O(1) |
| remove(i) | O(n) | O(1) | Same, O(1) at index 0 |
| search by value | O(n) | O(1) | Linear scan |
| reverse | O(n) | O(1) | One pass flipping pointers |

The storage of the list itself is O(n). The usual shorthand is **"insertion O(1), removal O(1) or O(n), search O(n), access O(n)"**: insertion at either end is O(1); removal is O(1) at the head but O(n) at the tail.

Because push + shift are both O(1), a singly linked list gives an efficient **queue** (enqueue at tail, dequeue at head), and unshift + shift give a **stack** at the head. Both come in a later topic.

---

## 12. Common techniques and pitfalls

**Edge cases to test every method against:** an empty list, a single-node list, the first index, the last index, and an out-of-range index.

**Dummy (sentinel) head.** Placing a fake node before the real head removes the "is this index 0?" special case, because every real node then has a predecessor:

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

**Fast and slow pointers.** Move `slow` one step and `fast` two steps per iteration. When `fast` reaches the end, `slow` is at the middle — one pass, O(1) space. The same idea (Floyd's algorithm) detects a cycle: if `fast` ever meets `slow`, the list loops.

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

**Other classic bugs:** not clearing `head`/`tail` when the list becomes empty (a second `pop` then "removes" the same node again and `length` goes to -1), forgetting `length++/--`, and rewiring pointers in the wrong order (losing the rest of the list).

---

## Key interview points

- A singly linked list is nodes of `{ val, next }` plus `head`, `tail`, `length`; the last `next` is `null`.
- **No random access**: `get(i)` is O(n). Arrays win on indexing and cache locality.
- **O(1)**: push (with a tail pointer), unshift, shift. **O(n)**: pop, get, set, insert, remove, search.
- pop is O(n) because you cannot step **backwards** to the second-to-last node.
- insert/remove use `get(index - 1)`; set `newNode.next` **before** `prev.next`.
- Guards differ: insert allows `index === length`, remove/get/set do not.
- Always handle the empty and single-node cases and keep `head`/`tail`/`length` consistent.
- Reverse in place with `prev / node / next`: O(n) time, O(1) space.
- Fast/slow pointers find the middle and detect cycles in O(1) space.

## Summary

- Linked lists trade O(1) indexed access for O(1) insertion and removal at the front.
- Every method is built from one traversal loop plus careful pointer rewiring.
- The tail pointer makes push O(1), but pop stays O(n) in a singly linked list.
- insert and remove reduce to "find the previous node, then rewire", costing O(n) overall.
- In-place reversal flips each `next` pointer in a single pass.
- Linked lists are the foundation for stacks, queues and doubly linked lists.
