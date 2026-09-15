# Binary Heaps & Priority Queues

## 1. What is a binary heap?

A **binary heap** is a binary tree, much like a binary search tree, but it follows different rules. It must satisfy two properties at all times:

1. **Heap property (order):** in a **max heap** every parent is greater than or equal to its children; in a **min heap** every parent is less than or equal to its children.
2. **Shape property:** the tree is **complete** — every level is completely full except possibly the last, and the last level is filled **from left to right** with no gaps.

```text
Valid max heap                 NOT a heap (41 is larger than its parent 33)

         41                              33
       /    \                          /    \
     39      33                      18      41
    /  \    /                       /  \    /
  18    27 12                     12    27 39
```

Consequences of the two rules:

- The **root always holds the largest** (max heap) or **smallest** (min heap) value, so you can read it in O(1).
- A complete tree with `n` nodes has height `⌊log₂ n⌋`, so a heap **can never degenerate** into a long chain.

---

## 2. Max heap vs min heap, and heap vs BST

The two variants are mirror images:

```text
Max heap                        Min heap

         41                              12
       /    \                          /    \
     39      33                      18      23
    /  \    /                       /  \    /
  18    27 12                     29    51 44
```

The heap property only relates a **parent to its children**. There is **no implied ordering between siblings** or between different subtrees: in the max heap above, 39 is on the left and 33 on the right, but 18 (left subtree) is smaller than 33 (right subtree). Swapping the two subtrees would still be a valid heap.

That is the key difference from a binary search tree:

| | Binary search tree | Binary heap |
|---|---|---|
| Ordering rule | left < node < right | parent ≥ children (max) or ≤ (min) |
| Siblings ordered? | Yes | No |
| Shape | Any (can become a chain) | Always complete |
| Fast query | Find any value in O(log n) if balanced | Read the max/min in O(1) |
| Search for arbitrary value | O(log n) balanced, O(n) worst | O(n) |
| Sorted traversal | In-order traversal | Not available directly |

A heap is **weakly ordered**: it gives up full ordering in exchange for cheap access to the extreme value.

---

## 3. Why heaps matter

Heaps shine whenever you repeatedly need "the most important item right now" while new items keep arriving:

- **Priority queues** — the heap is the standard implementation (JavaScript has none built in; Java has `PriorityQueue`, Python has `heapq`, C++ has `priority_queue`).
- **Graph algorithms** — Dijkstra's shortest path and Prim's minimum spanning tree repeatedly extract the closest vertex.
- **Scheduling** — OS process schedulers, job queues, timers, event simulations.
- **Top-k problems** — the k largest scores in a stream, the k closest points, merging k sorted lists.
- **Running median** — two heaps (a max heap for the lower half, a min heap for the upper half).
- **Heap sort** — an in-place O(n log n) sort.

---

## 4. Storing a heap in an array

Because a heap is always complete, we do not need node objects with `left`/`right` pointers. Read the tree **level by level, left to right**, and write the values into an array:

```text
index:     0    1    2    3    4    5
values: [ 41,  39,  33,  18,  27,  12 ]

level 0:          41 (0)
level 1:     39 (1)     33 (2)
level 2:  18 (3) 27 (4) 12 (5)
```

For a node at index `n`:

| Relationship | Index |
|---|---|
| Left child | `2n + 1` |
| Right child | `2n + 2` |
| Parent | `Math.floor((n - 1) / 2)` |

Check: index 1 (39) has children at 3 (18) and 4 (27); index 5 (12) has parent `⌊4 / 2⌋ = 2` (33). A child index `≥ length` means that child does not exist.

This only works **because** the tree is complete: there are never holes in the array. Benefits: no pointer overhead, excellent cache locality, and O(1) navigation to parent or child with plain arithmetic.

---

## 5. Insert: add to the end, then bubble up

To insert into a max heap:

1. **Push** the value to the end of the array. This keeps the tree complete, but may break the heap property.
2. **Bubble up** (also called sift up, percolate up, heapify up): while the new value is larger than its parent, swap them.

Trace — insert 55 into `[41, 39, 33, 18, 27, 12]`:

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

The value climbs at most one level per iteration, so insert is **O(log n) time** and **O(1) extra space** (amortized, since `push` occasionally resizes the array).

---

## 6. Extract max: swap in the last element, then sink down

Removing the root (the maximum) needs the tree to stay complete, so we cannot just delete index 0. Instead:

1. Save the root.
2. **Pop** the last element and put it at the root.
3. **Sink down** (also sift down, bubble down, percolate down, heapify down): while the element is smaller than one of its children, swap it with the **larger** child.

Trace — extractMax on `[41, 39, 33, 18, 27, 12]`:

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

Why the **larger** child? If 12 were swapped with 33 instead of 39, then 33 would become the parent of 39 — a new violation. Promoting the larger child guarantees the new parent beats both children.

---

## 7. Implementing extractMax

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

Two classic bugs this version avoids:

- **Single-element heap.** After `pop()` the array is empty; writing `values[0] = end` unconditionally would put the removed value straight back, and the heap would never empty.
- **Comparing the right child with the element instead of the current largest.** Tracking `largest` makes sure that when both children are bigger, you swap with the bigger one.

Extract max is **O(log n) time** and **O(1) extra space**: the element sinks at most the height of the tree.

---

## 8. Min heaps and a reusable comparator

A min heap is the same code with the comparisons flipped. Rather than writing two classes, pass a **comparator**: `compare(a, b) < 0` means `a` belongs closer to the root.

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

## 9. Priority queues

A **priority queue** is an abstract data type: every element has a priority, and elements with **higher priority are served first**, regardless of insertion order. It supports `enqueue(value, priority)`, `dequeue()` and usually `peek()`.

A heap is one way to implement it. Compare the options:

| Implementation | enqueue | dequeue | peek |
|---|---|---|---|
| Unsorted array (scan for the best) | O(1) | O(n) | O(n) |
| Sorted array | O(n) | O(1) (pop from the end) | O(1) |
| **Binary heap** | **O(log n)** | **O(log n)** | **O(1)** |

The naive list forces a full scan on every dequeue; the heap balances both operations. A common convention (used by Dijkstra) is a **min heap where a lower number means higher priority**:

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

A heap is **not stable**: two nodes with equal priority can come out in any order. If FIFO order among ties matters, store an increasing insertion counter and compare it when priorities are equal.

**Top-k pattern:** to keep the k largest values from a stream of n items, maintain a **min heap of size k**; when it exceeds k, pop the smallest. That is O(n log k) time and O(k) space — much better than sorting everything when k is small.

---

## 10. Big O of binary heaps

| Operation | Time | Why |
|---|---|---|
| peek (max/min) | O(1) | It is always `values[0]` |
| insert | O(log n) | Bubbles up at most the height |
| extract max/min | O(log n) | Sinks down at most the height |
| search for a value | O(n) | Siblings are unordered, so no half can be skipped |
| build heap (bottom-up) | O(n) | See next section |
| Space | O(n) | One array slot per element |

**Why log n?** A complete tree doubles its capacity with each level: 1 + 2 + 4 + 8 = 15 nodes fit in 4 levels. With 16 elements the new value sits at depth 4, so inserting a new maximum takes at most 4 comparisons and swaps; with a million elements, about 20.

```text
level 0:  1 node
level 1:  2 nodes
level 2:  4 nodes
level 3:  8 nodes
level 4:  16 nodes      height ~ log2(n)
```

**What about the worst case?** A BST fed sorted input turns into a linked list and every operation becomes O(n). That cannot happen with a heap: the shape property forces the tree to stay complete, so O(log n) is the **worst case**, not just the average.

---

## 11. Building a heap from an array (heapify)

**Naive approach:** create an empty heap and `insert` each of the n elements. Each insert is O(log n), so the total is **O(n log n)**.

**Bottom-up heapify (Floyd's method):** treat the array as a complete tree already, then call `sinkDown` on every non-leaf node from the **last parent back to the root**. Leaves (the second half of the array) are already valid one-node heaps, so the loop starts at index `Math.floor(n / 2) - 1`.

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

Trace on `[3, 9, 2, 1, 4, 5]` (n = 6, start at index 2):

```text
i = 2 (value 2): child 5 is larger    -> [3, 9, 5, 1, 4, 2]
i = 1 (value 9): children 1, 4        -> no swap
i = 0 (value 3): larger child 9       -> [9, 3, 5, 1, 4, 2]
     continue at index 1: child 4     -> [9, 4, 5, 1, 3, 2]
```

**Why O(n)?** Most nodes are near the bottom and sink only a little. About n/2 nodes are leaves (0 work), n/4 sink at most 1 level, n/8 at most 2, and so on. The total is `n · (1/4 + 2/8 + 3/16 + …) ≤ n`, so building a heap is **O(n) time**, O(1) extra space (in place). Only the single root can sink the full log n levels.

---

## 12. Heap sort

Heap sort turns an array into a max heap, then repeatedly moves the maximum to the end:

1. `buildMaxHeap(arr)` — O(n).
2. For `end` from `n - 1` down to 1: swap `arr[0]` (the max) with `arr[end]`, then `siftDown(arr, 0, end)` to restore the heap in the shrinking prefix.

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

| Property | Heap sort |
|---|---|
| Time (best, average, worst) | O(n log n) |
| Extra space | O(1) — in place |
| Stable? | No — long-distance swaps reorder equal keys |

Heap sort guarantees O(n log n) with O(1) space, which merge sort (O(n) space) and quick sort (O(n²) worst case) do not. In practice it is often slower than quick sort because it jumps around the array and uses the CPU cache poorly.

---

## Key interview points

- A binary heap = **heap property** (parent vs children only) + **complete shape**. Siblings are unordered.
- Array layout: children at **2i + 1** and **2i + 2**, parent at **⌊(i − 1) / 2⌋**; no pointers needed because the tree has no gaps.
- **Insert**: push, then bubble up — O(log n). **Extract**: move last to root, sink down swapping with the **larger** (max heap) / **smaller** (min heap) child — O(log n).
- **Peek O(1), search O(n)**; a heap cannot degenerate, so O(log n) is the worst case.
- **Build heap bottom-up in O(n)**, starting at index ⌊n/2⌋ − 1; repeated inserts cost O(n log n).
- Priority queue → heap. **Top-k largest → min heap of size k**, O(n log k). Dijkstra/Prim → min heap.
- **Heap sort**: O(n log n) always, O(1) space, **not stable**.
- Watch the edge cases: empty heap, single-element extract, and indices past the end of the array.

## Summary

- Max heaps keep the largest value at the root, min heaps the smallest; the tree is always complete.
- A heap lives in a plain array, navigated with index arithmetic.
- Insert bubbles up and extract sinks down, each bounded by the height, O(log n).
- A priority queue built on a heap serves the highest-priority item in O(log n), versus O(n) for a naive list.
- Bottom-up heapify builds a heap in O(n), and heap sort uses it to sort in place in O(n log n).
